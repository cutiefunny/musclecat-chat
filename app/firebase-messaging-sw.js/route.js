import { NextResponse } from 'next/server';

export async function GET() {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const scriptContent = `
    importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js");
    importScripts("https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js");

    const firebaseConfig = ${JSON.stringify(firebaseConfig)};

    if (firebaseConfig && firebaseConfig.projectId) {
      firebase.initializeApp(firebaseConfig);
      const messaging = firebase.messaging();

      messaging.onBackgroundMessage((payload) => {
        console.log("[firebase-messaging-sw.js] Received background message ", payload);
        
        const notificationTitle = payload.data.title;
        const notificationOptions = {
          body: payload.data.body,
          icon: payload.data.icon,
          data: {
            url: payload.data.link
          }
        };

        self.registration.showNotification(notificationTitle, notificationOptions);
      });

      self.addEventListener('notificationclick', (event) => {
        event.notification.close();
        event.waitUntil(
            clients.openWindow(event.notification.data.url)
        );
      });

    } else {
      console.error('Service Worker: Firebase config is missing or incomplete.');
    }
  `;

  return new NextResponse(scriptContent, {
    status: 200,
    headers: {
      'Content-Type': 'application/javascript',
      'Service-Worker-Allowed': '/',
    },
  });
}