"use client";

import React, { useEffect, useState } from "react";
import useChatStore from "@/store/chat-store";
import ChatRoom from "@/components/ChatRoom";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { auth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider } from "@/lib/firebase/clientApp";

// 사용자 역할 정보
const users = {
  customer: { uid: 'customer-01', name: '고객' },
  owner: { uid: 'owner-01', name: '사장' },
};

// --- 화면별 컴포넌트 ---

// 1. 로그인 화면
const LoginScreen = ({ handleLogin }) => (
  <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
    <div className="text-center p-10 bg-white rounded-2xl shadow-xl max-w-sm w-full">
      <Image 
        src="/images/icon.png" 
        alt="앱 아이콘" 
        width={80} 
        height={80} 
        className="mx-auto mb-4 rounded-full"
      />
      <h1 className="text-2xl font-bold mb-2 text-gray-800">근육고양이 채팅</h1>
      <p className="mb-8 text-gray-500">채팅을 시작하려면 로그인하세요.</p>
      <Button
        size="lg"
        className="w-full h-12 text-base bg-blue-500 hover:bg-blue-600 text-white"
        onClick={handleLogin}
      >
        Google 계정으로 로그인
      </Button>
    </div>
  </main>
);

// 2. 역할 선택 화면
const RoleSelectionScreen = () => {
  const { setChatUser } = useChatStore();
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="text-center p-10 bg-white rounded-2xl shadow-xl max-w-sm w-full">
        <h1 className="text-2xl font-bold mb-2 text-gray-800">역할 선택</h1>
        <p className="mb-8 text-gray-500">어떤 역할로 접속하시겠어요?</p>
        <div className="flex flex-col gap-4">
          <Button size="lg" className="w-full h-12 text-base" onClick={() => setChatUser(users.customer)}>
            고객으로 접속
          </Button>
          <Button size="lg" variant="secondary" className="w-full h-12 text-base" onClick={() => setChatUser(users.owner)}>
            사장으로 접속
          </Button>
        </div>
      </div>
    </main>
  );
};

// --- 메인 페이지 ---

export default function Home() {
  const { authUser, setAuthUser, chatUser, setChatUser } = useChatStore();
  const [loading, setLoading] = useState(true);

  // Firebase 인증 상태 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user ? { uid: user.uid, email: user.email, displayName: user.displayName } : null);
      if (!user) {
        // 로그아웃 시 역할도 초기화
        setChatUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [setAuthUser, setChatUser]);
  
  // 구글 로그인 핸들러
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };
  
  if (loading) {
    return <main className="flex items-center justify-center min-h-screen"><p>인증 정보를 확인하는 중...</p></main>;
  }

  // 1. 로그인 안됨 -> 로그인 화면
  if (!authUser) {
    return <LoginScreen handleLogin={handleLogin} />;
  }

  // 2. 로그인 됨, 역할 선택 안됨 -> 역할 선택 화면
  if (authUser && !chatUser) {
    return <RoleSelectionScreen />;
  }

  // 3. 로그인 됨, 역할 선택 됨 -> 채팅방
  return (
    <main className="h-screen w-screen overflow-hidden">
      <ChatRoom />
    </main>
  );
}