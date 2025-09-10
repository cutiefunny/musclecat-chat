// functions/index.js

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { setGlobalOptions } = require("firebase-functions/v2");
setGlobalOptions({ region: "asia-northeast3" });

initializeApp();

exports.sendPushNotificationOnNewMessage = onDocumentCreated("messages/{messageId}", async (event) => {
    // 이벤트 데이터에서 새로 생성된 메시지 스냅샷을 가져옵니다.
    const snapshot = event.data;
    if (!snapshot) {
        console.log("No data associated with the event");
        return;
    }
    const newMessage = snapshot.data();

    // 고객이 보낸 메시지일 경우에만 알림을 보냅니다.
    if (newMessage.uid !== "customer") {
        console.log("Not a customer message, skipping notification.");
        return;
    }

    // 1. 사장님(owner)의 사용자 정보를 가져옵니다.
    const db = getFirestore();
    const usersRef = db.collection("users");
    // 'owner' 역할을 가진 사용자를 쿼리하는 것이 더 안정적이지만, 여기서는 이메일로 찾습니다.
    const ownerQuery = usersRef.where("email", "==", "cutiefunny@gmail.com").limit(1);
    
    try {
        const ownerSnapshot = await ownerQuery.get();

        if (ownerSnapshot.empty) {
            console.log("Owner user not found.");
            return;
        }

        const ownerData = ownerSnapshot.docs[0].data();
        const fcmToken = ownerData.fcmToken;

        if (!fcmToken) {
            console.log("Owner does not have a FCM token.");
            return;
        }

        // 2. 푸시 알림 페이로드를 구성합니다.
        const payload = {
            notification: {
                title: `${newMessage.sender}님의 새 메시지`,
                body: newMessage.text || (newMessage.type === 'photo' ? '사진' : '이모티콘') + '을 보냈습니다.',
                icon: "/images/icon-144.png", // PWA 아이콘 경로
            },
            webpush: {
                fcmOptions: {
                    link: "https://your-chat-app-url.com/" // 알림 클릭 시 이동할 웹사이트 주소
                }
            }
        };

        // 3. FCM으로 알림을 전송합니다.
        const response = await getMessaging().send({
            token: fcmToken,
            notification: payload.notification,
            webpush: payload.webpush,
        });
        console.log("Successfully sent message:", response);

    } catch (error) {
        console.error("Error sending push notification:", error);
    }
});