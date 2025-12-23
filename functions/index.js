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
            // 💡 [수정] notification 필드를 제거합니다.
            // notification: {
            //     title: `${message.sender}님의 새 메시지`,
            //     body: notificationBody,
            // },
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
                  // 💡 [수정] data-only 메시지도 iOS에서 알림을 표시하도록 content-available 추가
                  "content-available": 1, 
                },
              },
            },
        };

        console.log(`Sending data-only message to token: ${fcmToken.substring(0, 20)}...`);
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

        // if (!recentMessagesSnapshot.empty) {
        //     const previousMessages = recentMessagesSnapshot.docs.filter(doc => doc.id !== messageId);
        //     if (previousMessages.length > 0 && previousMessages[0].data().uid === 'bot-01') {
        //         console.log("The previous message was from the bot. Skipping bot reply.");
        //         return;
        //     }
        // }

        if (message.type !== 'text' || !message.text) {
            console.log("Message is not a text type or has no content. Skipping bot reply.");
            return;
        }

        console.log("Calling external bot API...");
        let prompt = message.text;
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

            // ==========================================
            // [수정] 마크다운 이미지 감지 및 분리 로직
            // ==========================================
            let replyText = botResponseText.trim();
            let imageUrl = null;

            // 정규식: ![...](URL) 패턴 찾기
            const imageRegex = /!\[.*?\]\((.*?)\)/;
            const match = replyText.match(imageRegex);

            if (match) {
                imageUrl = match[1]; // (URL) 부분 추출
                replyText = replyText.replace(match[0], "").trim(); // 원본 텍스트에서 마크다운 제거
            }

            // 1. 텍스트 메시지 전송 (텍스트가 남아있을 경우)
            if (replyText) {
                await db.collection("messages").add({
                    text: replyText,
                    type: 'text',
                    sender: '근육고양이봇',
                    uid: 'bot-01',
                    authUid: 'bot-01',
                    timestamp: FieldValue.serverTimestamp()
                });
            }

            // 2. 이미지 메시지 전송 (이미지가 발견된 경우)
            if (imageUrl) {
                // 약간의 딜레이를 주어 텍스트 뒤에 이미지가 오도록 보장 (선택 사항)
                await new Promise(r => setTimeout(r, 100)); 
                
                await db.collection("messages").add({
                    text: imageUrl, // 이미지 URL을 text 필드에 담음 (UI에서 type:'image'일 때 이를 src로 사용)
                    type: 'image',  // 타입을 image로 설정
                    sender: '근육고양이봇',
                    uid: 'bot-01',
                    authUid: 'bot-01',
                    timestamp: FieldValue.serverTimestamp()
                });
            }

            console.log("Successfully sent bot reply.");
            
        } else {
            console.log("Bot API returned an empty response text. No message will be sent.");
        }
    } catch (error) {
        console.error("Error sending bot reply:", error);
    }
}