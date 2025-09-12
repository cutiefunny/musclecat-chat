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

export default withPWA({
  dest: "public",
  // 💡 다음 코드를 추가하여 PWA가 생성하는 서비스 워커에
  // 💡 Firebase 메시징 스크립트를 포함시키세요.
  importScripts: ["/firebase-messaging-sw.js"], 
})(nextConfig);