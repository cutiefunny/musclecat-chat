// app/admin/page.js
"use client";

import React, { useState } from "react";
import { useAuth } from "@/hooks/useAuth"; // useAuth 훅 import
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { signOut, auth } from "@/lib/firebase/clientApp";
import EmoticonManager from "@/components/EmoticonManager";
import ChatMessageManager from "@/components/ChatMessageManager";
import { ChevronDown } from "lucide-react";

// 로그인 화면 컴포넌트
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
      <h1 className="text-2xl font-bold mb-2 text-gray-800">어드민 페이지</h1>
      <p className="mb-8 text-gray-500">관리자 계정으로 로그인하세요.</p>
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

// 어드민 대시보드 컴포넌트 (로그인 후)
const AdminDashboard = ({ user }) => {
    const [isOpen, setIsOpen] = useState({
        chat: true, // 기본적으로 열려있도록 변경
        emoticon: false,
    });

    const toggleSection = (section) => {
        setIsOpen(prev => ({ ...prev, [section]: !prev[section] }));
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-xl font-bold text-gray-900">어드민 대시보드</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-600">환영합니다, {user.displayName}님</span>
                        <Button variant="outline" size="sm" onClick={() => signOut(auth)}>
                            로그아웃
                        </Button>
                    </div>
                </div>
            </header>
            <main className="py-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                        <button
                            className="w-full flex justify-between items-center p-4 text-left"
                            onClick={() => toggleSection('chat')}
                            aria-expanded={isOpen.chat}
                        >
                            <h2 className="text-lg font-semibold">전체 대화 관리</h2>
                            <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isOpen.chat ? 'rotate-180' : ''}`} />
                        </button>
                        {isOpen.chat && (
                            <div className="border-t">
                                <ChatMessageManager />
                            </div>
                        )}
                    </div>

                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                        <button
                            className="w-full flex justify-between items-center p-4 text-left"
                            onClick={() => toggleSection('emoticon')}
                            aria-expanded={isOpen.emoticon}
                        >
                            <h2 className="text-lg font-semibold">이모티콘 관리</h2>
                            <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isOpen.emoticon ? 'rotate-180' : ''}`} />
                        </button>
                        {isOpen.emoticon && (
                            <div className="border-t p-6">
                                <EmoticonManager />
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

// 어드민 메인 페이지
export default function AdminPage() {
  const { authUser, loading, handleLogin } = useAuth(); // useAuth 훅 사용

  if (loading) {
    return <main className="flex items-center justify-center min-h-screen"><p>인증 정보를 확인하는 중...</p></main>;
  }

  // 관리자 이메일인지 확인합니다.
  const isAdmin = authUser && authUser.email === 'cutiefunny@gmail.com';

  if (!authUser) {
    return <LoginScreen handleLogin={handleLogin} />;
  }
  
  if (!isAdmin) {
      return (
          <main className="flex flex-col items-center justify-center min-h-screen">
              <p className="text-2xl font-bold mb-4">접근 권한이 없습니다.</p>
              <Button onClick={() => signOut(auth)}>로그아웃</Button>
          </main>
      )
  }

  return <AdminDashboard user={authUser} />;
}