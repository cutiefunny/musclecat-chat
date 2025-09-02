"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { auth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from "@/lib/firebase/clientApp";
import EmoticonManager from "@/components/EmoticonManager";
import ChatMessageManager from "@/components/ChatMessageManager";
import { ChevronDown } from "lucide-react"; // 아이콘 import 추가

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
    // 섹션별 열림 상태를 관리하는 state
    const [isOpen, setIsOpen] = useState({
        chat: false,
        emoticon: false,
    });

    // 섹션 열림/닫힘 토글 함수
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
                    {/* 전체 대화 관리 (접기/펼치기 가능) */}
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

                    {/* 이모티콘 관리 (접기/펼치기 가능) */}
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
                            <div className="border-t">
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
  const [authUser, setAuthUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Firebase 인증 상태 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);
  
  // 구글 로그인 핸들러
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
      alert("로그인에 실패했습니다.");
    }
  };
  
  if (loading) {
    return <main className="flex items-center justify-center min-h-screen"><p>인증 정보를 확인하는 중...</p></main>;
  }

  // 로그인 되어있지 않으면 로그인 화면 표시
  if (!authUser) {
    return <LoginScreen handleLogin={handleLogin} />;
  }

  // 로그인 되어 있으면 어드민 대시보드 표시
  return <AdminDashboard user={authUser} />;
}

