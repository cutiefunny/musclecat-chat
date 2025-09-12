// next.config.mjs
import withPWA from "@ducanh2912/next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '**',
      },
    ],
  },
};

// 💡 Firebase 설정을 환경 변수에서 가져옵니다.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 💡 설정 객체를 URL 쿼리 파라미터로 변환합니다.
const configParams = new URLSearchParams(firebaseConfig).toString();

export default withPWA({
  dest: "public",
  // 💡 서비스 워커 URL에 Firebase 설정을 쿼리 파라미터로 추가합니다.
  sw: `/firebase-messaging-sw.js?${configParams}`,
})(nextConfig);