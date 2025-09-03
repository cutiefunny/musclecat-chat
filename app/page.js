"use client";

import React, { useEffect, useState } from "react";
import useChatStore from "@/store/chat-store";
import ChatRoom from "@/components/ChatRoom";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { auth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, db, doc, setDoc, getDoc } from "@/lib/firebase/clientApp";

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

// --- 메인 페이지 ---

export default function Home() {
  const { authUser, setAuthUser, chatUser, setChatUser } = useChatStore();
  const [loading, setLoading] = useState(true);

  // Firebase 인증 상태 감지
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Firestore에서 사용자 정보 가져오기 또는 생성
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            displayName: user.displayName,
            photoURL: user.photoURL,
            email: user.email
          });
        }
        const userData = userSnap.exists() ? userSnap.data() : { displayName: user.displayName, photoURL: user.photoURL };

        setAuthUser({ 
          uid: user.uid, 
          email: user.email, 
          displayName: userData.displayName, 
          photoURL: userData.photoURL 
        });

        // 이메일 주소에 따라 역할 자동 할당
        const role = user.email === 'cutiefunny@gmail.com' ? 'owner' : 'customer';
        setChatUser({ 
          uid: role, 
          name: userData.displayName, 
          authUid: user.uid 
        });
        
      } else {
        setAuthUser(null);
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
      // onAuthStateChanged가 나머지를 처리합니다.
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

  // 2. 로그인 됨 -> 채팅방 (chatUser는 자동으로 설정됨)
  if (chatUser) {
    return (
      <main className="h-screen w-screen overflow-hidden">
        <ChatRoom />
      </main>
    );
  }

  // chatUser가 설정되기를 기다리는 동안 로딩 표시
  return <main className="flex items-center justify-center min-h-screen"><p>사용자 정보를 설정하는 중...</p></main>;
}