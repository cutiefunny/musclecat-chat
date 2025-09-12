// functions/index.js

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { setGlobalOptions } = require("firebase-functions/v2");
const fetch = require("node-fetch"); // 💡 node-fetch 추가

// 함수의 리전을 서울(asia-northeast3)으로 설정
setGlobalOptions({ region: "asia-northeast3" });

initializeApp();

exports.handleNewMessage = onDocumentCreated("messages/{messageId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        console.log("No data associated with the event");
        return;
    }
    const newMessage = snapshot.data();

    // 고객이 보낸 메시지가 아니면 아무 작업도 하지 않음
    if (newMessage.uid !== "customer") {
        return;
    }
    
    // 💡 두 가지 작업을 동시에 처리: 푸시 알림과 봇 응답
    await Promise.all([
        sendPushNotificationToOwner(newMessage),
        sendBotReply(newMessage)
    ]);
});


/**
 * 사장님에게 푸시 알림을 보냅니다.
 * @param {object} message - 새 메시지 데이터
 */
async function sendPushNotificationToOwner(message) {
    const db = getFirestore();
    const usersRef = db.collection("users");
    const ownerQuery = usersRef.where("email", "==", "cutiefunny@gmail.com").limit(1);

    try {
        const ownerSnapshot = await ownerQuery.get();
        if (ownerSnapshot.empty) {
            console.log("Owner user not found for push notification.");
            return;
        }

        const ownerData = ownerSnapshot.docs[0].data();
        const fcmToken = ownerData.fcmToken;

        if (!fcmToken) {
            console.log("Owner does not have a FCM token.");
            return;
        }

        const payload = {
            notification: {
                title: `${message.sender}님의 새 메시지`,
                body: message.text || (message.type === 'photo' ? '사진' : '이모티콘') + '을 보냈습니다.',
                icon: "/images/icon-144.png",
            },
            webpush: {
                fcmOptions: {
                    link: "https://musclecat-chat.vercel.app/" // 예시: 실제 배포된 앱의 URL
                }
            }
        };

        await getMessaging().send({ token: fcmToken, notification: payload.notification, webpush: payload.webpush });
        console.log("Successfully sent push notification.");
    } catch (error) {
        console.error("Error sending push notification:", error);
    }
}

/**
 * 봇 상태를 확인하고, 활성화 상태이면 AI 응답을 보냅니다.
 * @param {object} message - 새 메시지 데이터
 */
async function sendBotReply(message) {
    const db = getFirestore();
    const botStatusRef = db.doc("settings/bot");
    
    try {
        const docSnap = await botStatusRef.get();
        
        // 봇이 비활성화 상태이면 여기서 함수를 종료합니다.
        if (!docSnap.exists() || docSnap.data().isActive === false) {
            console.log("Bot is disabled. No reply will be sent.");
            return;
        }

        // 텍스트 메시지가 아니면 봇이 응답하지 않습니다.
        if (message.type !== 'text' || !message.text) {
            return;
        }

        // 봇 API 호출
        const prompt = '넌 근육고양이봇이야. 반말로 짧게 대답해줘. ' + message.text;
        const response = await fetch('https://musclecat.co.kr/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
            throw new Error(`Bot API request failed with status ${response.status}`);
        }

        const botResponseText = await response.text();

        // 봇 응답 메시지 전송
        if (botResponseText) {
            await db.collection("messages").add({
                text: botResponseText,
                type: 'text',
                sender: '근육고양이봇',
                uid: 'bot-01',
                authUid: 'bot-01',
                timestamp: new Date()
            });
            console.log("Successfully sent bot reply.");
        }
    } catch (error) {
        console.error("Error sending bot reply:", error);
    }
}