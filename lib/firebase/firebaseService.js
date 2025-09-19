// lib/firebase/firebaseService.js
import {
  db,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  doc,
  deleteDoc,
  setDoc,
  getDoc,
  updateDoc,
  writeBatch,
  where,
  app,
  runTransaction,
  limit,
  startAfter,
  getDocs,
} from "./clientApp";
import {
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "./clientApp";
import imageCompression from "browser-image-compression";
import { getMessaging, getToken } from "firebase/messaging";

// --- Message Service ---

const MESSAGES_PER_PAGE = 20; // 한 번에 불러올 메시지 수

/**
 * 최신 메시지 목록을 실시간으로 가져옵니다. (초기 로딩 및 새 메시지)
 * @param {function} onNewMessages - 새 메시지 목록을 인자로 받는 콜백 함수
 * @returns {function} - Unsubscribe 함수
 */
export const subscribeToLatestMessages = (onNewMessages) => {
  const q = query(
    collection(db, "messages"),
    orderBy("timestamp", "desc"),
    limit(MESSAGES_PER_PAGE)
  );

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).reverse();
    const lastVisible = snapshot.docs[snapshot.docs.length - 1];
    onNewMessages(messages, lastVisible);
  });
};

/**
 * 특정 메시지 이전의 메시지들을 가져옵니다. (무한 스크롤)
 * @param {DocumentSnapshot} lastVisible - 마지막으로 보였던 메시지의 스냅샷
 * @returns {Promise<{messages: Array, lastVisible: DocumentSnapshot}>}
 */
export const fetchPreviousMessages = async (lastVisible) => {
  if (!lastVisible) {
    console.log("No last visible message to fetch previous from.");
    return { messages: [], lastVisible: null };
  }
  
  const q = query(
    collection(db, "messages"),
    orderBy("timestamp", "desc"),
    startAfter(lastVisible),
    limit(MESSAGES_PER_PAGE)
  );

  const snapshot = await getDocs(q);
  const messages = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).reverse();
  const newLastVisible = snapshot.docs[snapshot.docs.length - 1];
  
  return { messages, lastVisible: newLastVisible };
};

/**
 * [관리자용] 모든 메시지 목록을 실시간으로 가져옵니다.
 * @param {function} onNewMessages - 새 메시지 목록을 인자로 받는 콜백 함수
 * @returns {function} - Unsubscribe 함수
 */
export const subscribeToAllMessages = (onNewMessages) => {
  const q = query(collection(db, "messages"), orderBy("timestamp", "desc"));

  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    onNewMessages(messages);
  });
};


/**
 * 새로운 메시지를 전송합니다.
 * @param {object} messageData - { text, imageUrl, type, sender, uid, authUid, replyTo }
 * @returns {Promise<void>}
 */
export const sendMessage = async (messageData) => {
  await addDoc(collection(db, "messages"), {
    ...messageData,
    timestamp: serverTimestamp(),
    reactions: [],
    readBy: [messageData.authUid],
  });
};

/**
 * 메시지를 삭제합니다.
 * @param {object} message - 삭제할 메시지 객체
 * @returns {Promise<void>}
 */
export const deleteMessage = async (message) => {
  await deleteDoc(doc(db, "messages", message.id));
  if (message.imageUrl && (message.type === "photo" || message.type === "emoticon")) {
     try {
        const imagePath = new URL(message.imageUrl).pathname.split('/o/')[1].split('?')[0];
        const decodedPath = decodeURIComponent(imagePath);
        const imageRef = ref(storage, decodedPath);
        await deleteObject(imageRef);
     } catch (e) {
        console.error("Error parsing storage URL or deleting object:", e)
     }
  }
};

/**
 * 메시지에 반응을 추가하거나 업데이트/제거합니다.
 * @param {string} messageId - 메시지 ID
 * @param {object} reaction - { emoji, user }
 * @returns {Promise<void>}
 */
export const addReaction = async (messageId, reaction) => {
    const messageRef = doc(db, "messages", messageId);
    try {
        await runTransaction(db, async (transaction) => {
            const messageDoc = await transaction.get(messageRef);
            if (!messageDoc.exists()) {
                throw "Document does not exist!";
            }

            const currentReactions = messageDoc.data().reactions || [];
            const existingReactionIndex = currentReactions.findIndex(r => r.user === reaction.user);

            if (existingReactionIndex > -1) {
                if (currentReactions[existingReactionIndex].emoji === reaction.emoji) {
                    currentReactions.splice(existingReactionIndex, 1);
                } else {
                    currentReactions[existingReactionIndex] = reaction;
                }
            } else {
                currentReactions.push(reaction);
            }

            transaction.update(messageRef, { reactions: currentReactions });
        });
    } catch (e) {
        console.error("Transaction failed: ", e);
    }
};

/**
 * 읽지 않은 메시지 수를 실시간으로 구독합니다.
 * @param {string} currentAuthUid - 현재 사용자 Auth UID
 * @param {function} onUnreadCountChange - 읽지 않은 메시지 수를 인자로 받는 콜백
 * @returns {function} - Unsubscribe 함수
 */
export const subscribeToUnreadMessages = (currentAuthUid, onUnreadCountChange) => {
  if (!currentAuthUid) return () => {};

  const messagesRef = collection(db, "messages");
  const q = query(
    messagesRef,
    where("authUid", "!=", currentAuthUid)
  );

  return onSnapshot(q, (snapshot) => {
    let unreadCount = 0;
    snapshot.forEach((doc) => {
      const message = doc.data();
      if (!message.readBy || !message.readBy.includes(currentAuthUid)) {
        unreadCount++;
      }
    });
    onUnreadCountChange(unreadCount);
  });
};


/**
 * 내가 받지 않은 모든 메시지를 읽음으로 표시합니다.
 * @param {string} currentAuthUid - 현재 사용자 Auth UID
 */
export const markMessagesAsRead = async (currentAuthUid) => {
  if (!currentAuthUid) return;

  const messagesRef = collection(db, "messages");
  const q = query(messagesRef, where("authUid", "!=", currentAuthUid));

  try {
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    let updates = 0;

    snapshot.forEach(docSnap => {
      const message = docSnap.data();
      if (!message.readBy || !message.readBy.includes(currentAuthUid)) {
        const currentReadBy = message.readBy || [];
        batch.update(doc(db, "messages", docSnap.id), {
          readBy: [...currentReadBy, currentAuthUid]
        });
        updates++;
      }
    });

    if (updates > 0) {
      await batch.commit();
      console.log(`${updates} messages marked as read.`);
    }
  } catch (error) {
    console.error("Error marking messages as read: ", error);
  }
};


// --- User Service ---

/**
 * 사용자 목록을 실시간으로 가져옵니다.
 * @param {function} onNewUsers - 사용자 목록을 인자로 받는 콜백 함수
 * @returns {function} - Unsubscribe 함수
 */
export const subscribeToUsers = (onNewUsers) => {
  const q = query(collection(db, "users"));
  return onSnapshot(q, (snapshot) => {
    const users = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    onNewUsers(users);
  });
};

/**
 * 사용자 프로필을 업데이트합니다.
 * @param {string} uid - 사용자 UID
 * @param {object} data - { displayName, photoURL }
 * @returns {Promise<void>}
 */
export const updateUserProfile = async (uid, data) => {
  const userDocRef = doc(db, "users", uid);
  await setDoc(userDocRef, data, { merge: true });
};

/**
 * 사용자 정보를 가져오거나 생성합니다.
 * @param {object} user - Firebase Auth 사용자 객체
 * @returns {Promise<object>} - 사용자 데이터
 */
export const getUserProfile = async (user) => {
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      const newUser = {
        displayName: user.displayName || null,
        photoURL: user.photoURL,
        email: user.email,
      };
      await setDoc(userRef, newUser);
      return newUser;
    }
    return userSnap.data();
};


// --- Storage Service ---

/**
 * 이미지를 압축하고 업로드합니다.
 * @param {File} imageFile - 이미지 파일
 * @param {string} path - 업로드 경로 (e.g., 'chat_images/uid')
 * @param {object} customOptions - browser-image-compression에 전달할 커스텀 옵션
 * @returns {Promise<string>} - 업로드된 이미지 URL
 */
export const compressAndUploadImage = async (imageFile, path, customOptions = {}) => {
  const defaultOptions = {
    maxSizeMB: 0.2,
    maxWidthOrHeight: 800,
    useWebWorker: true,
  };

  const options = { ...defaultOptions, ...customOptions };

  const compressionAttempts = [
    { type: 'image/avif', extension: 'avif' },
    { type: 'image/webp', extension: 'webp' },
    { type: 'image/jpeg', extension: 'jpeg' },
  ];

  for (const attempt of compressionAttempts) {
    try {
      const compressedFile = await imageCompression(imageFile, { ...options, fileType: attempt.type });
      return await uploadImage(compressedFile, `${path}/${Date.now()}.${attempt.extension}`);
    } catch (error) {
      console.warn(`${attempt.type} compression failed, trying next format...`, error);
    }
  }

  // 모든 압축 시도가 실패하면 원본 이미지 업로드 시도 (혹은 에러 처리)
  console.warn('All image compression attempts failed. Uploading original image.');
  return await uploadImage(imageFile, `${path}/${Date.now()}`);
};


/**
 * 파일을 Storage에 업로드합니다.
 * @param {File} file - 업로드할 파일
 * @param {string} fullPath - 전체 저장 경로 (e.g., 'chat_images/uid/timestamp.jpg')
 * @returns {Promise<string>} - 업로드된 파일 URL
 */
export const uploadImage = async (file, fullPath) => {
  const storageRef = ref(storage, fullPath);
  await uploadBytes(storageRef, file);
  return await getDownloadURL(storageRef);
};


// --- Emoticon Service ---

/**
 * 이모티콘 목록을 실시간으로 가져옵니다.
 * @param {function} onNewEmoticons - 이모티콘 목록을 인자로 받는 콜백 함수
 * @returns {function} - Unsubscribe 함수
 */
export const subscribeToEmoticons = (onNewEmoticons) => {
    const q = query(collection(db, "emoticons"), orderBy("category"), orderBy("order", "asc"));
    return onSnapshot(q, (snapshot) => {
        const emoticons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        onNewEmoticons(emoticons);
    });
};

/**
 * 새 이모티콘을 추가합니다.
 * @param {File} imageFile - 이모티콘 이미지 파일
 * @param {string} category - 카테고리
 * @param {number} order - 정렬 순서
 * @returns {Promise<void>}
 */
export const addEmoticon = async (imageFile, category, order) => {
    const emoticonOptions = {
        maxSizeMB: 0.1,
        maxWidthOrHeight: 200,
    };
    const url = await compressAndUploadImage(imageFile, `emoticons/${category}`, emoticonOptions);
    await addDoc(collection(db, "emoticons"), {
        url,
        category,
        order,
        createdAt: serverTimestamp(),
    });
};

/**
 * 이모티콘을 삭제합니다.
 * @param {object} emoticon - 삭제할 이모티콘 객체
 * @returns {Promise<void>}
 */
export const deleteEmoticon = async (emoticon) => {
    await deleteDoc(doc(db, "emoticons", emoticon.id));
    const imageRef = ref(storage, emoticon.url);
    await deleteObject(imageRef);
};

/**
 * 이모티콘 순서를 업데이트합니다.
 * @param {Array<object>} emoticons - 순서가 변경된 이모티콘 목록
 * @returns {Promise<void>}
 */
export const updateEmoticonOrder = async (emoticons) => {
    const batch = writeBatch(db);
    emoticons.forEach((emoticon, index) => {
        const docRef = doc(db, "emoticons", emoticon.id);
        batch.update(docRef, { order: index });
    });
    await batch.commit();
};

// --- Typing Status Service ---

/**
 * 현재 사용자의 타이핑 상태를 Firestore에 설정/해제합니다.
 * @param {string} uid - 현재 사용자 Auth UID
 * @param {string} displayName - 현재 사용자 이름
 * @param {boolean} isTyping - 타이핑 중인지 여부
 */
export const setUserTypingStatus = async (uid, displayName, isTyping) => {
    const typingRef = doc(db, 'typing_status', uid);
    if (isTyping) {
        await setDoc(typingRef, { displayName, timestamp: serverTimestamp() });
    } else {
        await deleteDoc(typingRef);
    }
};

/**
 * 타이핑 중인 다른 사용자 목록을 실시간으로 구독합니다.
 * @param {string} currentUid - 현재 사용자의 Auth UID
 * @param {function} onTypingUsersChange - 타이핑 중인 사용자 목록을 인자로 받는 콜백
 * @returns {function} - Unsubscribe 함수
 */
export const subscribeToTypingStatus = (currentUid, onTypingUsersChange) => {
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const q = query(
        collection(db, 'typing_status'),
        where('timestamp', '>', oneMinuteAgo)
    );

    return onSnapshot(q, (snapshot) => {
        const typingUsers = [];
        snapshot.forEach((doc) => {
            if (doc.id !== currentUid) {
                typingUsers.push({ id: doc.id, ...doc.data() });
            }
        });
        onTypingUsersChange(typingUsers);
    });
};

// --- FCM (Push Notification) Service ---

/**
 * FCM 메시징 객체를 가져옵니다.
 * @returns {import("firebase/messaging").Messaging | null}
 */
export const getFCM = () => {
    if (typeof window !== 'undefined' && "serviceWorker" in navigator) {
        return getMessaging(app);
    }
    return null;
}

/**
 * 사용자에게 알림 권한을 요청하고 FCM 토큰을 가져옵니다.
 * @returns {Promise<string|null>} FCM 토큰 또는 null
 */
export const requestNotificationPermission = async () => {
    try {
        const messaging = getFCM();
        if (!messaging) return null;

        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            const token = await getToken(messaging, {
                vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
            });
            return token;
        } else {
            console.log("알림 권한이 거부되었습니다.");
            return null;
        }
    } catch (error) {
        console.error("FCM 토큰을 가져오는 중 오류 발생:", error);
        return null;
    }
};

/**
 * Firestore에 사용자의 FCM 토큰을 저장합니다.
 * @param {string} userId - 사용자 UID
 * @param {string} token - FCM 토큰
 */
export const saveFcmToken = async (userId, token) => {
    if (!userId || !token) return;
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, { fcmToken: token });
};

// --- Bot Status Service ---

/**
 * Firestore에서 봇의 현재 상태를 가져옵니다.
 * @returns {Promise<boolean>} 봇의 활성화 상태 (기본값: true)
 */
export const getBotStatus = async () => {
  const statusRef = doc(db, "settings", "bot");
  const docSnap = await getDoc(statusRef);
  if (docSnap.exists()) {
    return docSnap.data().isActive;
  }
  await setDoc(statusRef, { isActive: true });
  return true;
};

/**
 * Firestore에 봇의 상태를 업데이트합니다.
 * @param {boolean} isActive - 새로운 봇 활성화 상태
 * @returns {Promise<void>}
 */
export const setBotStatus = async (isActive) => {
  const statusRef = doc(db, "settings", "bot");
  await setDoc(statusRef, { isActive });
};