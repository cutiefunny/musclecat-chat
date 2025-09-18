// functions/index.js

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
// 💡 onSchedule을 import합니다.
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, serverTimestamp } = require("firebase-admin/firestore"); // 💡 serverTimestamp 추가
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
    const db = getFirestore();

    // 💡 사장이 메시지를 보내면 봇을 비활성화하고 마지막 활동 시간을 기록합니다.
    if (newMessage.uid === "owner") {
        console.log("Owner sent a message. Deactivating bot and updating timestamp.");
        const botStatusRef = db.doc("settings/bot");
        const ownerActivityRef = db.doc("settings/ownerActivity");
        
        await Promise.all([
            botStatusRef.set({ isActive: false }, { merge: true }),
            ownerActivityRef.set({ lastMessageTimestamp: serverTimestamp() }, { merge: true })
        ]);
        // 사장이 보낸 메시지이므로 여기서 함수를 종료합니다.
        return;
    }

    // 💡 고객이 보낸 메시지일 때만 아래 로직을 실행합니다.
    if (newMessage.uid === "customer") {
        console.log(`Customer message received. Triggering push notification and bot reply.`);
        await Promise.all([
            sendPushNotificationToOwner(newMessage),
            sendBotReply(newMessage)
        ]);
    }
});

// 💡 1분마다 실행되어 사장의 활동을 체크하고 봇을 다시 활성화하는 새로운 함수
exports.turnBotOnAfterInactivity = onSchedule("every 1 minutes", async (event) => {
    const db = getFirestore();
    const botStatusRef = db.doc("settings/bot");
    const ownerActivityRef = db.doc("settings/ownerActivity");

    const botStatusSnap = await botStatusRef.get();
    const ownerActivitySnap = await ownerActivityRef.get();

    // 봇이 이미 활성화 상태이거나, 사장 활동 기록이 없으면 아무것도 하지 않음
    if (!botStatusSnap.exists() || botStatusSnap.data().isActive === true || !ownerActivitySnap.exists()) {
        console.log("Scheduled check: Bot is already active or no owner activity recorded. Skipping.");
        return null;
    }

    const lastActiveTimestamp = ownerActivitySnap.data().lastMessageTimestamp;
    if (lastActiveTimestamp) {
        const now = new Date();
        const lastActiveDate = lastActiveTimestamp.toDate();
        const diffMinutes = (now.getTime() - lastActiveDate.getTime()) / (1000 * 60);

        if (diffMinutes >= 1) {
            console.log("Scheduled check: Owner has been inactive for over 1 minute. Re-enabling bot.");
            await botStatusRef.set({ isActive: true }, { merge: true });
        } else {
            console.log("Scheduled check: Owner was active within the last minute. Bot remains disabled.");
        }
    }
    return null;
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

        const messagePayload = {
            token: fcmToken,
            data: {
                title: `${message.sender}님의 새 메시지`,
                body: message.text || (message.type === 'photo' ? '사진' : '이모티콘') + '을 보냈습니다.',
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
            },
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
        
        if (!docSnap.exists || docSnap.data().isActive === false) {
            console.log("Bot is disabled. No reply will be sent.");
            return;
        }
        
        const messagesRef = db.collection("messages");
        const lastMessageQuery = messagesRef.orderBy("timestamp", "desc").limit(1);
        const lastMessageSnapshot = await lastMessageQuery.get();

        if (!lastMessageSnapshot.empty) {
            const lastMessage = lastMessageSnapshot.docs[0].data();
            if (lastMessage.uid === 'bot-01') {
                console.log("The last message was from the bot. Skipping bot reply.");
                return;
            }
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
        
        const botResponseData = await response.json();

        if (botResponseData && botResponseData.result === 'fail') {
          console.log("Bot response result is 'fail'. No message will be sent.");
          return;
        }
        
        const botResponseText = botResponseData.text;


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