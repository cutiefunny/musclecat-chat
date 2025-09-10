// public/firebase-messaging-sw.js

importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js");

// .env.local 파일의 환경 변수와 동일하게 설정해야 합니다.
const firebaseConfig = {
    apiKey: "AIzaSyDNEdl4MN_4mxL6s3c4_tXSUiqvFPz596U",
    authDomain: "musclecat-toon.firebaseapp.com",
    projectId: "musclecat-toon",
    storageBucket: "musclecat-toon.firebasestorage.app",
    messagingSenderId: "407198970469",
    appId: "1:407198970469:web:443dce681e71019ef58c8c",
};


firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log("[firebase-messaging-sw.js] Received background message ", payload);

    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: payload.notification.icon,
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});