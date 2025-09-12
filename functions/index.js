// functions/index.js

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");
const { setGlobalOptions } = require("firebase-functions/v2");
const fetch = require("node-fetch");

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

    if (newMessage.uid !== "customer") {
        console.log("Message is not from a customer. Skipping actions.");
        return;
    }
    
    await Promise.all([
        sendPushNotificationToOwner(newMessage),
        sendBotReply(newMessage)
    ]);
});

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

        // 💡 푸시 알림 payload 구조를 FCM Admin SDK 사양에 맞게 수정합니다.
        const messagePayload = {
            token: fcmToken,
            notification: {
                title: `${message.sender}님의 새 메시지`,
                body: message.text || (message.type === 'photo' ? '사진' : '이모티콘') + '을 보냈습니다.',
            },
            webpush: {
                notification: {
                    // 💡 icon 필드를 webpush.notification 안으로 이동하고, 전체 URL로 변경합니다.
                    icon: "https://musclecat-chat.vercel.app/images/icon-144.png",
                },
                fcmOptions: {
                    link: "https://musclecat-chat.vercel.app/"
                }
            }
        };

        console.log(`Sending notification to token: ${fcmToken.substring(0, 20)}...`);
        console.log("Payload:", JSON.stringify(messagePayload, null, 2));

        const response = await getMessaging().send(messagePayload);
        
        console.log("Successfully sent push notification:", response);

    } catch (error) {
        console.error("Error sending push notification:", error);
    }
}

async function sendBotReply(message) {
    // ... (이하 동일)
    const db = getFirestore();
    const botStatusRef = db.doc("settings/bot");
    
    try {
        const docSnap = await botStatusRef.get();
        
        if (!docSnap.exists() || docSnap.data().isActive === false) {
            console.log("Bot is disabled. No reply will be sent.");
            return;
        }

        if (message.type !== 'text' || !message.text) {
            return;
        }

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