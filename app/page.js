"use client";

import React from "react";
import useChatStore from "@/store/chat-store";
import ChatRoom from "@/components/ChatRoom";
import { Button } from "@/components/ui/button";
import Image from "next/image"; // Image 컴포넌트 추가

// 사용자 정보 정의 (고객과 사장)
const users = {
  customer: { uid: 'customer-01', name: '고객' },
  owner: { uid: 'owner-01', name: '사장' },
};

export default function Home() {
  const { user, setUser } = useChatStore();

  // 1. 사용자가 선택되지 않았을 때 -> 역할 선택 화면 표시
  if (!user) {
    return (
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
          <p className="mb-8 text-gray-500">어떤 역할로 접속하시겠어요?</p>
          <div className="flex flex-col gap-4">
            <Button
              size="lg"
              className="w-full h-12 text-base"
              onClick={() => setUser(users.customer)}
            >
              고객으로 접속
            </Button>
            <Button
              size="lg"
              variant="secondary"
              className="w-full h-12 text-base"
              onClick={() => setUser(users.owner)}
            >
              사장으로 접속
            </Button>
          </div>
        </div>
      </main>
    );
  }

  // 2. 사용자가 선택되었을 때 -> 전체 화면 채팅방 표시
  return (
    <main className="h-screen w-screen overflow-hidden">
      <ChatRoom />
    </main>
  );
}