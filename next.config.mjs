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

export default withPWA({
  dest: "public",
  // 💡 PWA가 생성하는 기본 서비스 워커(sw.js)에 Firebase 서비스 워커 스크립트를 포함시킵니다.
  // 이렇게 하면 서비스 워커 파일 이름 충돌 문제를 해결하고 PWA와 FCM이 함께 동작할 수 있습니다.
  importScripts: ["/firebase-messaging-sw.js"],
})(nextConfig);