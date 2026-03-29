// app/admin/page.js
"use client";

import React, { useState, useEffect } from "react"; // useEffect 추가
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { signOut, auth } from "@/lib/firebase/clientApp";
import EmoticonManager from "@/components/EmoticonManager";
import ChatMessageManager from "@/components/ChatMessageManager";
import { ChevronDown, Settings } from "lucide-react"; // Settings 아이콘 추가
import { subscribeToUiSettings, updateUiSettings, subscribeToNotice, updateNotice } from '@/lib/firebase/firebaseService'; // 💡 공지사항 관련 함수 추가

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
      <h1 className="text-2xl font-bold mb-2 text-gray-800">어드민 로그인</h1>
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
        chat: true,
        emoticon: false,
        settings: false, // 💡 설정 섹션 state 추가
    });
    
    // 💡 UI 설정 상태 관리
    const [isMessageModalActive, setIsMessageModalActive] = useState(true);

    // 💡 공지사항 상태 관리
    const [notice, setNotice] = useState({ text: "", isVisible: false });
    const [tempNoticeText, setTempNoticeText] = useState("");

    // 💡 설정 및 공지사항 구독
    useEffect(() => {
        const unsubscribeUi = subscribeToUiSettings((settings) => {
            if (settings) setIsMessageModalActive(settings.isMessageModalActive);
        });
        
        const unsubscribeNotice = subscribeToNotice((data) => {
            if (data) {
                setNotice(data);
                setTempNoticeText(data.text);
            }
        });
        
        return () => {
            unsubscribeUi();
            unsubscribeNotice();
        };
    }, []);

    // 💡 설정 토글 핸들러
    const handleToggleModal = async () => {
        const newState = !isMessageModalActive;
        // 낙관적 업데이트
        setIsMessageModalActive(newState);
        try {
            await updateUiSettings({ isMessageModalActive: newState });
        } catch (error) {
            console.error("설정 업데이트 실패:", error);
            setIsMessageModalActive(!newState); // 실패 시 롤백
            alert("설정 변경에 실패했습니다.");
        }
    };

    // 💡 공지사항 업데이트 핸들러
    const handleUpdateNotice = async () => {
        try {
            await updateNotice({ text: tempNoticeText, isVisible: notice.isVisible });
            alert("공지사항 내용이 저장되었습니다.");
        } catch (error) {
            console.error("공지사항 업데이트 실패:", error);
            alert("공지사항 저장에 실패했습니다.");
        }
    };

    const handleToggleNoticeVisibility = async () => {
        const newState = !notice.isVisible;
        try {
            await updateNotice({ text: tempNoticeText, isVisible: newState });
        } catch (error) {
            console.error("공지사항 상태 변경 실패:", error);
            alert("공지사항 상태 변경에 실패했습니다.");
        }
    };

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
                    
                    {/* 💡 [추가] 앱 설정 관리 섹션 */}
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                        <button
                            className="w-full flex justify-between items-center p-4 text-left"
                            onClick={() => toggleSection('settings')}
                            aria-expanded={isOpen.settings}
                        >
                            <div className="flex items-center gap-2">
                                <Settings className="h-5 w-5" />
                                <h2 className="text-lg font-semibold">앱 설정 관리</h2>
                            </div>
                            <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isOpen.settings ? 'rotate-180' : ''}`} />
                        </button>
                        {isOpen.settings && (
                            <div className="border-t p-6 bg-white">
                                <div className="flex items-center justify-between max-w-md">
                                    <div>
                                        <h3 className="font-medium">메시지 답장/삭제 모달</h3>
                                        <p className="text-sm text-gray-500">채팅 말풍선 클릭 시 뜨는 메뉴 활성화</p>
                                    </div>
                                    <Button 
                                        variant={isMessageModalActive ? "default" : "outline"}
                                        onClick={handleToggleModal}
                                        className={isMessageModalActive ? "bg-green-600 hover:bg-green-700" : ""}
                                    >
                                        {isMessageModalActive ? "사용 중 (ON)" : "사용 안 함 (OFF)"}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 💡 [추가] 공지사항 관리 섹션 */}
                    <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden">
                        <button
                            className="w-full flex justify-between items-center p-4 text-left"
                            onClick={() => toggleSection('notice')}
                            aria-expanded={isOpen.notice}
                        >
                            <div className="flex items-center gap-2">
                                <Settings className="h-5 w-5" />
                                <h2 className="text-lg font-semibold">공지사항 관리</h2>
                            </div>
                            <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isOpen.notice ? 'rotate-180' : ''}`} />
                        </button>
                        {isOpen.notice && (
                            <div className="border-t p-6 bg-white space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-medium text-sm text-gray-700">공지사항 노출 여부</h3>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-xs ${notice.isVisible ? 'text-blue-600' : 'text-gray-400'}`}>
                                            {notice.isVisible ? '현재 노출 중' : '현재 숨김 중'}
                                        </span>
                                        <Button 
                                            variant={notice.isVisible ? "default" : "outline"}
                                            onClick={handleToggleNoticeVisibility}
                                            size="sm"
                                            className={notice.isVisible ? "bg-blue-600 hover:bg-blue-700" : ""}
                                        >
                                            {notice.isVisible ? "숨기기" : "노출하기"}
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-sm font-medium text-gray-700">공지 내용</label>
                                    <textarea
                                        className="w-full min-h-[100px] p-3 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                        value={tempNoticeText}
                                        onChange={(e) => setTempNoticeText(e.target.value)}
                                        placeholder="공지사항 내용을 입력하세요..."
                                    />
                                </div>
                                <div className="flex justify-end">
                                    <Button onClick={handleUpdateNotice} className="bg-blue-600 hover:bg-blue-700 text-white">저장하기</Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ... (기존 전체 대화 관리 섹션 등 유지) */}
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

// ... (AdminPage 컴포넌트는 기존과 동일)
export default function AdminPage() {
  const { authUser, loading, handleLogin } = useAuth(); 

  if (loading) {
    return <main className="flex items-center justify-center min-h-screen"><p>인증 정보를 확인하는 중...</p></main>;
  }

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