// app/page.js
"use client";

import React from "react";
import useChatStore from "@/store/chat-store";
import { useAuth } from "@/hooks/useAuth";
import ChatRoom from "@/components/ChatRoom";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { signOut, auth } from "@/lib/firebase/clientApp";


const LoginScreen = ({ handleLogin, handleBranchLogin }) => ( // 💡 handleBranchLogin prop 추가
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
      <div className="space-y-3">
          <Button
            size="lg"
            className="w-full h-12 text-base bg-blue-500 hover:bg-blue-600 text-white"
            onClick={handleLogin}
          >
            Google 계정으로 로그인
          </Button>
          {/* 💡 1호점 로그인 버튼 추가 */}
          <Button
            size="lg"
            variant="outline"
            className="w-full h-12 text-base"
            onClick={handleBranchLogin}
          >
            1호점으로 로그인
          </Button>
      </div>
    </div>
  </main>
);

export default function Home() {
  const { chatUser } = useChatStore();
  const { authUser, loading, handleLogin, handleBranchLogin } = useAuth(); // 💡 handleBranchLogin 가져오기

  if (loading) {
    return <main className="flex items-center justify-center min-h-screen"><p>인증 정보를 확인하는 중...</p></main>;
  }

  if (!authUser) {
    return <LoginScreen handleLogin={handleLogin} handleBranchLogin={handleBranchLogin} />; // 💡 prop으로 전달
  }
  
  // chatUser가 설정될 때까지 기다립니다.
  if (!chatUser) {
    return <main className="flex items-center justify-center min-h-screen"><p>사용자 정보를 설정하는 중...</p></main>;
  }

  return (
    <main className="h-screen w-screen overflow-hidden">
      <ChatRoom />
    </main>
  );
}
