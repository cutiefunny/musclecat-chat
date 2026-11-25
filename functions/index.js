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

// 백엔드 API 엔드포인트 설정
const API_BASE_URL = process.env.API_BASE_URL || "https://musclecat-hono.musclecat.workers.dev/api";

exports.handleNewMessage = onDocumentCreated("messages/{messageId}", async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        console.log("No data associated with the event");
        return;
    }
    const newMessage = snapshot.data();

    // 고객이 보낸 메시지: 푸시 알림 + 봇 응답
    if (newMessage.uid === "customer") {
        console.log(`Customer message received. Triggering push notification and bot reply.`);
        await Promise.all([
            sendPushNotificationToOwner(newMessage),
            sendBotReply(newMessage, event.params.messageId)
        ]);
    }
    // 사장님이 보낸 메시지: 봇 응답만 실행 (본인에게 푸시 알림은 보내지 않음)
    else if (newMessage.uid === "owner") {
        console.log(`Owner message received. Triggering bot reply.`);
        await sendBotReply(newMessage, event.params.messageId);
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
    const callStateRef = db.doc("settings/bot_call_state");

    try {
        // 봇 ON 상태 확인 (OFF면 모든 봇 응답 중단)
        const docSnap = await botStatusRef.get();
        if (!docSnap.exists || docSnap.data().isActive === false) {
            console.log("Bot is disabled. No reply will be sent.");
            return;
        }

        if (message.type !== 'text' || !message.text) {
            console.log("Message is not a text type or has no content. Skipping bot reply.");
            return;
        }

        // 0. 'call' 대기 상태 확인 (사장 제외, 1분 이내 다음 대답이면 무조건 /answer 호출)
        const isOwner = message.uid === 'owner' || message.senderEmail === 'cutiefunny@gmail.com';
        if (!isOwner) {
            const callStateSnap = await callStateRef.get();
            if (callStateSnap.exists) {
                const callState = callStateSnap.data();
                const expiresAt = callState.expiresAt || 0;

                if (callState.category === 'call' && Date.now() < expiresAt) {
                    console.log("Active 'call' state detected. Forwarding user reply to /answer with category: 'call'...");
                    // 1회 응답 처리 후 상태 해제 (응답이 다시 category: 'call'이면 아래에서 재설정됨)
                    await callStateRef.delete();

                    try {
                        const response = await fetch(`${API_BASE_URL}/answer`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ prompt: message.text, category: 'call' }),
                        });

                        if (response.ok) {
                            const data = await response.json();
                            console.log("/answer (call follow-up) API response received:", data);

                            if (data && data.category === 'call') {
                                await callStateRef.set({
                                    category: 'call',
                                    expiresAt: Date.now() + 60 * 1000,
                                    updatedAt: FieldValue.serverTimestamp()
                                });
                            }

                            if (data && data.needsAnswer !== false && data.answer && data.answer.trim()) {
                                await db.collection("messages").add({
                                    text: data.answer.trim(),
                                    type: 'text',
                                    sender: '근육고양이봇',
                                    uid: 'bot-01',
                                    authUid: 'bot-01',
                                    timestamp: FieldValue.serverTimestamp()
                                });
                                console.log("Call follow-up answer reply sent successfully.");
                            }
                        } else {
                            console.error(`/answer (call follow-up) API failed with status ${response.status}`);
                        }
                    } catch (error) {
                        console.error("Error calling /answer (call follow-up) API:", error);
                    }
                    return;
                } else if (callState.category === 'call') {
                    // 1분 만료된 상태 정리
                    await callStateRef.delete();
                }
            }
        }

        // 1. 메시지에 "바코드", "얼마", "가격"이 포함된 경우 /product API 호출로 일원화
        if (message.text && (message.text.includes('바코드') || message.text.includes('얼마') || message.text.includes('가격'))) {
            const isBarcodeInquiry = message.text.includes('바코드');
            console.log(`Product inquiry detected (${isBarcodeInquiry ? '바코드' : '얼마/가격'}). Calling /product API...`);
            try {
                const response = await fetch(`${API_BASE_URL}/product`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: message.text }),
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log("/product API response received:", data);

                    const messageToSave = {
                        sender: '근육고양이봇',
                        uid: 'bot-01',
                        authUid: 'bot-01',
                        timestamp: FieldValue.serverTimestamp(),
                        type: 'text'
                    };

                    // products 목록 파싱: [{ id: "키링", "패브릭 키링": {...}, ... }] 또는 [{ name, price, barcode }] 모두 지원
                    if (data.products && Array.isArray(data.products) && data.products.length > 0) {
                        const parsedProducts = [];

                        data.products.forEach(item => {
                            if (!item || typeof item !== 'object') return;

                            // 형태 A: 이미 flat한 객체인 경우 ({ name: "패브릭 키링", price: "3,000", barcode: "..." })
                            if (item.name) {
                                parsedProducts.push(item);
                                return;
                            }

                            // 형태 B: Firestore 원본 문서 객체인 경우 ({ id: "키링", "패브릭 키링": { price, barcode }, ... })
                            Object.entries(item).forEach(([key, val]) => {
                                if (key === 'id' || key === 'createTime' || key === 'updateTime') return;
                                if (val && typeof val === 'object') {
                                    parsedProducts.push({
                                        name: key,
                                        price: val.price ? (val.price.includes('원') ? val.price : `${val.price}원`) : '',
                                        barcode: val.barcode || '',
                                        image: val.image || null,
                                        category: item.id || ''
                                    });
                                }
                            });
                        });

                        if (parsedProducts.length > 0) {
                            messageToSave.products = parsedProducts;
                            messageToSave.productDisplayMode = isBarcodeInquiry ? 'barcode' : 'price';
                            messageToSave.text = ""; // reason 생략하고 목록만 표시
                        } else {
                            messageToSave.text = "어떤 제품의 정보를 찾고 있냥?";
                        }
                    } else {
                        messageToSave.text = "어떤 제품의 정보를 찾고 있냥?";
                    }

                    await db.collection("messages").add(messageToSave);
                    console.log("Barcode product reply sent successfully.");
                } else {
                    console.error(`/product API failed with status ${response.status}`);
                    // API 실패 시 기본 안내 멘트 전송
                    await db.collection("messages").add({
                        text: "어떤 제품의 정보를 찾고 있냥?",
                        type: 'text',
                        sender: '근육고양이봇',
                        uid: 'bot-01',
                        authUid: 'bot-01',
                        timestamp: FieldValue.serverTimestamp()
                    });
                }
            } catch (error) {
                console.error("Error calling /product API:", error);
                await db.collection("messages").add({
                    text: "어떤 제품의 정보를 찾고 있냥?",
                    type: 'text',
                    sender: '근육고양이봇',
                    uid: 'bot-01',
                    authUid: 'bot-01',
                    timestamp: FieldValue.serverTimestamp()
                });
            }
            return;
        }

        // 2. 메시지에 "안녕", "?", "사장"이 포함된 경우 /answer API 호출 (사장님 제외)
        if (!isOwner && message.text && (message.text.includes('안녕') || message.text.includes('?') || message.text.includes('사장'))) {
            console.log("Question/Greeting detected ('안녕' or '?' or '사장'). Calling /answer API...");
            try {
                const response = await fetch(`${API_BASE_URL}/answer`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt: message.text }),
                });

                if (response.ok) {
                    const data = await response.json();
                    console.log("/answer API response received:", data);

                    // 응답 category가 'call'이면 1분간 대기 상태 저장
                    if (data && data.category === 'call') {
                        await callStateRef.set({
                            category: 'call',
                            expiresAt: Date.now() + 60 * 1000,
                            updatedAt: FieldValue.serverTimestamp()
                        });
                        console.log("Bot 'call' state activated for 1 minute.");
                    }

                    if (data && data.needsAnswer !== false && data.answer && data.answer.trim()) {
                        await db.collection("messages").add({
                            text: data.answer.trim(),
                            type: 'text',
                            sender: '근육고양이봇',
                            uid: 'bot-01',
                            authUid: 'bot-01',
                            timestamp: FieldValue.serverTimestamp()
                        });
                        console.log("Answer reply sent successfully.");
                    } else {
                        console.log("No answer needed or empty answer from /answer API.");
                    }
                } else {
                    console.error(`/answer API failed with status ${response.status}`);
                }
            } catch (error) {
                console.error("Error calling /answer API:", error);
            }
            return;
        }
    } catch (error) {
        console.error("Error sending bot reply:", error);
    }
}