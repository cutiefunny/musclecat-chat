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
} from "./clientApp";
import {
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "./clientApp";
import imageCompression from "browser-image-compression";

// --- Message Service ---

/**
 * 메시지 목록을 실시간으로 가져옵니다.
 * @param {function} onNewMessages - 메시지 목록을 인자로 받는 콜백 함수
 * @returns {function} - Unsubscribe 함수
 */
export const subscribeToMessages = (onNewMessages) => {
  const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    onNewMessages(messages);
  });
};

/**
 * 새로운 메시지를 전송합니다.
 * @param {object} messageData - { text, imageUrl, type, sender, uid, authUid }
 * @returns {Promise<void>}
 */
export const sendMessage = async (messageData) => {
  await addDoc(collection(db, "messages"), {
    ...messageData,
    timestamp: serverTimestamp(),
  });
};

/**
 * 메시지를 삭제합니다.
 * @param {object} message - 삭제할 메시지 객체
 * @returns {Promise<void>}
 */
export const deleteMessage = async (message) => {
  await deleteDoc(doc(db, "messages", message.id));
  if (message.imageUrl && message.type === "photo") {
    const imageRef = ref(storage, message.imageUrl);
    await deleteObject(imageRef);
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
  await updateDoc(userDocRef, data);
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
      await setDoc(userRef, {
        displayName: user.displayName,
        photoURL: user.photoURL,
        email: user.email,
      });
      return { displayName: user.displayName, photoURL: user.photoURL, email: user.email };
    }
    return userSnap.data();
};


// --- Storage Service ---

/**
 * 이미지를 압축하고 업로드합니다.
 * @param {File} imageFile - 이미지 파일
 * @param {string} path - 업로드 경로 (e.g., 'chat_images/uid')
 * @returns {Promise<string>} - 업로드된 이미지 URL
 */
export const compressAndUploadImage = async (imageFile, path) => {
    const options = {
        maxSizeMB: 0.2,
        maxWidthOrHeight: 800,
        useWebWorker: true,
    };
    
    // AVIF를 시도하고, 실패하면 WebP, 그것도 실패하면 JPEG를 사용합니다.
    try {
        const compressedFile = await imageCompression(imageFile, {...options, fileType: 'image/avif'});
        return uploadImage(compressedFile, `${path}/${Date.now()}.avif`);
    } catch (error) {
        console.warn('AVIF compression failed, trying WebP:', error);
        try {
            const compressedFile = await imageCompression(imageFile, {...options, fileType: 'image/webp'});
            return uploadImage(compressedFile, `${path}/${Date.now()}.webp`);
        } catch (error) {
            console.warn('WebP compression failed, trying JPEG:', error);
            const compressedFile = await imageCompression(imageFile, {...options, fileType: 'image/jpeg'});
            return uploadImage(compressedFile, `${path}/${Date.now()}.jpeg`);
        }
    }
};

/**
 * 파일을 Storage에 업로드합니다.
 * @param {File} file - 업로드할 파일
 * @param {string} fullPath - 전체 저장 경로 (e.g., 'chat_images/uid/timestamp.jpg')
 * @returns {Promise<string>} - 업로드된 파일 URL
 */
export const uploadImage = async (file, fullPath) => {
  const storageRef = ref(storage, fullPath);
  const snapshot = await uploadBytes(storageRef, file);
  return await getDownloadURL(snapshot.ref);
};


// --- Emoticon Service ---

/**
 * 이모티콘 목록을 실시간으로 가져옵니다.
 * @param {function} onNewEmoticons - 이모티콘 목록을 인자로 받는 콜백 함수
 * @returns {function} - Unsubscribe 함수
 */
export const subscribeToEmoticons = (onNewEmoticons) => {
    const q = query(collection(db, "emoticons"), orderBy("order", "asc"));
    return onSnapshot(q, (snapshot) => {
        const emoticons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        onNewEmoticons(emoticons);
    });
};

/**
 * 새 이모티콘을 추가합니다.
 * @param {File} imageFile - 이모티콘 이미지 파일
 * @param {number} order - 정렬 순서
 * @returns {Promise<void>}
 */
export const addEmoticon = async (imageFile, order) => {
    const url = await compressAndUploadImage(imageFile, 'emoticons');
    await addDoc(collection(db, "emoticons"), {
        url,
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