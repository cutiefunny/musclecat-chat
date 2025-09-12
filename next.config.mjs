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
  // 💡 서비스 워커의 소스로 API Route를 직접 지정합니다.
  sw: "firebase-messaging-sw.js",
  // 💡 importScripts 옵션은 제거합니다.
})(nextConfig);