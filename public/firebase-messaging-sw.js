// public/firebase-messaging-sw.js

importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js");

// 💡 URLSearchParams를 사용하여 쿼리 문자열에서 설정 값을 가져옵니다.
const urlParams = new URLSearchParams(location.search);
const firebaseConfig = Object.fromEntries(urlParams.entries());

if (firebaseConfig.projectId) {
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
} else {
  console.error('Firebase config not found in service worker.');
}