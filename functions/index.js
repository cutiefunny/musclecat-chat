// functions/index.js

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
// 💡 [수정] serverTimestamp 대신 FieldValue를 import합니다.
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
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
    
    // 고객이 보낸 메시지일 때만 푸시 알림과 봇 응답 로직을 실행합니다.
    if (newMessage.uid === "customer") {
        console.log(`Customer message received. Triggering push notification and bot reply.`);
        await Promise.all([
            sendPushNotificationToOwner(newMessage),
            sendBotReply(newMessage, event.params.messageId)
        ]);
    }
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

        const notificationBody = message.text || (message.type === 'photo' ? '사진' : '이모티콘') + '을 보냈습니다.';

        const messagePayload = {
            token: fcmToken,
            notification: {
                title: `${message.sender}님의 새 메시지`,
                body: notificationBody,
            },
            data: {
                title: `${message.sender}님의 새 메시지`,
                body: notificationBody,
                icon: "https://musclecat-chat.vercel.app/images/icon-144.png",
                link: "https://musclecat-chat.vercel.app/"
            },
            android: {
              priority: "high"
            },
            apns: {
              headers: {
                "apns-priority": "10",
              },
              payload: {
                aps: {
                  sound: "default",
                },
              },
            },
        };

        console.log(`Sending hybrid message to token: ${fcmToken.substring(0, 20)}...`);
        console.log("Payload:", JSON.stringify(messagePayload, null, 2));

        const response = await getMessaging().send(messagePayload);
        
        console.log("Successfully sent message:", response);

    } catch (error) {
        console.error("Error sending message:", error);
    }
}

/**
 * 봇 상태를 확인하고, 활성화 상태이면 AI 응답을 보냅니다.
 * @param {object} message - 새 메시지 데이터
 * @param {string} messageId - 새 메시지의 ID
 */
async function sendBotReply(message, messageId) {
    const db = getFirestore();
    const botStatusRef = db.doc("settings/bot");
    
    try {
        const docSnap = await botStatusRef.get();
        
        if (!docSnap.exists || docSnap.data().isActive === false) {
            console.log("Bot is disabled. No reply will be sent.");
            return;
        }
        
        const messagesRef = db.collection("messages");
        const recentMessagesQuery = messagesRef.orderBy("timestamp", "desc").limit(2);
        const recentMessagesSnapshot = await recentMessagesQuery.get();

        if (!recentMessagesSnapshot.empty) {
            const previousMessages = recentMessagesSnapshot.docs.filter(doc => doc.id !== messageId);
            if (previousMessages.length > 0 && previousMessages[0].data().uid === 'bot-01') {
                console.log("The previous message was from the bot. Skipping bot reply.");
                return;
            }
        }

        if (message.type !== 'text' || !message.text) {
            console.log("Message is not a text type or has no content. Skipping bot reply.");
            return;
        }

        console.log("Calling external bot API...");
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
            const errorBody = await response.text();
            console.error(`Bot API request failed with status ${response.status}: ${errorBody}`);
            throw new Error(`Bot API request failed with status ${response.status}`);
        }
        
        const botResponseText = await response.text();
        console.log("Bot API response received:", botResponseText);
        
        if (botResponseText && botResponseText.trim()) {
            if (botResponseText.trim().toLowerCase().includes('fail')) {
                console.log("Bot response contains 'fail'. No message will be sent.");
                return;
            }
            
            await db.collection("messages").add({
                text: botResponseText.trim(),
                type: 'text',
                sender: '근육고양이봇',
                uid: 'bot-01',
                authUid: 'bot-01',
                // 💡 [수정] FieldValue.serverTimestamp() 사용
                timestamp: FieldValue.serverTimestamp()
            });
            console.log("Successfully sent bot reply.");
        } else {
            console.log("Bot API returned an empty response text. No message will be sent.");
        }
    } catch (error) {
        console.error("Error sending bot reply:", error);
    }
}

