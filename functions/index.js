// functions/index.js

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { setGlobalOptions } = require("firebase-functions/v2");
const fetch = require("node-fetch");

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

    console.log(`New message received from UID: ${newMessage.uid}. Triggering functions.`);

    // 고객이 보낸 메시지가 아니면 아무 작업도 하지 않음
    if (newMessage.uid !== "customer") {
        console.log("Message is not from a customer. Skipping push notification and bot reply.");
        return;
    }
    
    // 두 가지 작업을 동시에 처리: 푸시 알림과 봇 응답
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
    console.log("Attempting to send push notification...");
    const db = getFirestore();
    const ownerEmail = "cutiefunny@gmail.com";
    const ownerQuery = db.collection("users").where("email", "==", ownerEmail).limit(1);

    try {
        const ownerSnapshot = await ownerQuery.get();
        if (ownerSnapshot.empty) {
            console.error(`Owner user with email '${ownerEmail}' not found in Firestore.`);
            return;
        }

        const ownerData = ownerSnapshot.docs[0].data();
        const fcmToken = ownerData.fcmToken;
        
        console.log(`Owner found: ${ownerData.displayName}. FCM Token present: ${!!fcmToken}`);

        if (!fcmToken) {
            console.error("Owner does not have a FCM token. Cannot send notification.");
            return;
        }

        // 'notification' 속성을 제거하고 모든 정보를 'data' 속성으로 옮깁니다.
        const messagePayload = {
            token: fcmToken,
            data: {
                title: `${message.sender}님의 새 메시지`,
                body: message.text || (message.type === 'photo' ? '사진' : '이모티콘') + '을 보냈습니다.',
                icon: "https://musclecat-chat.vercel.app/images/icon-144.png",
                link: "https://musclecat-chat.vercel.app/"
            }
        };

        console.log(`Sending data-only message to token: ${fcmToken.substring(0, 20)}...`);
        console.log("Payload:", JSON.stringify(messagePayload, null, 2));

        const response = await getMessaging().send(messagePayload);
        
        console.log("Successfully sent data message:", response);

    } catch (error) {
        console.error("Error sending data message:", error);
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
        
        // ✨ 이 부분이 수정되었습니다. docSnap.exists() -> docSnap.exists
        if (!docSnap.exists || docSnap.data().isActive === false) {
            console.log("Bot is disabled. No reply will be sent.");
            return;
        }

        if (message.type !== 'text' || !message.text) {
            return;
        }

        let prompt = '넌 근육고양이봇이야. 반말로 짧게 대답해줘. ';
        prompt += '가격이나 제품에 대한 질문에는 "가격 안내는 개발중이다! 냐사장을 불러주겠따!"라고 답해줘. ';
        prompt += '제품을 누가 만들었냐고 물어보면 "냐사장이 직접 만들었다!"라고 답해. ';
        prompt += '가게가 귀엽다고 칭찬하면 감사의 인사를 전해. ';
        prompt += '질문 : ' + message.text;
        const response = await fetch('https://musclecat.co.kr/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
        });

        if (!response.ok) {
            throw new Error(`Bot API request failed with status ${response.status}`);
        }

        const botResponseText = await response.text();

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