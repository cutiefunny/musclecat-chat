"use client";

import React, { useEffect, useRef, useState } from 'react';
import { db, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from '@/lib/firebase/clientApp';
import useChatStore from '@/store/chat-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn, formatKakaoTime } from '@/lib/utils'; // formatKakaoTime import

const ChatRoom = () => {
  const { user, messages, setMessages } = useChatStore();
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef(null);

  // Firestore에서 메시지 실시간 불러오기
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'messages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [setMessages]);

  // 새 메시지가 추가될 때마다 스크롤을 맨 아래로 이동
  useEffect(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-slot="scroll-area-viewport"]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim() === '' || !user) return;

    try {
      await addDoc(collection(db, 'messages'), {
        text: newMessage,
        sender: user.name,
        uid: user.uid,
        timestamp: serverTimestamp(),
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message: ", error);
    }
  };

  if (!user) {
    return <div className="text-center p-4 text-muted-foreground">사용자를 선택해주세요.</div>;
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#b2c7dc]">
      <header className="p-4 border-b bg-white flex items-center justify-between shadow-sm">
        <h1 className="text-lg font-bold text-gray-800">근육고양이 채팅방</h1>
        <p className="text-sm text-gray-500">
          <span className="font-semibold">{user.name}</span>님으로 접속
        </p>
      </header>

      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((msg, index) => {
            const isMyMessage = msg.uid === user.uid;
            // 이전 메시지와 보낸 사람이 같은지 확인 (시간만 표시)
            const showAvatar = index === 0 || messages[index - 1].uid !== msg.uid;
            // 시간은 항상 표시하지만, 정렬을 위해 그룹화
            const formattedTime = msg.timestamp ? formatKakaoTime(msg.timestamp) : '';

            return (
              <div
                key={msg.id}
                className={cn(
                  'flex gap-2',
                  isMyMessage ? 'justify-end' : 'justify-start'
                )}
              >
                {!isMyMessage && showAvatar && (
                  <Avatar className="size-8 mt-1">
                    <AvatarImage src={`/images/icon.png`} alt={msg.sender} /> {/* 상대방 아바타 */}
                    <AvatarFallback>{msg.sender.charAt(0)}</AvatarFallback>
                  </Avatar>
                )}
                <div className={cn("flex", isMyMessage ? "flex-row-reverse" : "flex-row", "items-end gap-1")}>
                    <Card
                      className={cn(
                        'max-w-[70%] p-3 rounded-xl break-words whitespace-pre-wrap text-base relative',
                        isMyMessage
                          ? 'bg-[#ffe812] text-gray-900 rounded-br-sm' // 내 메시지 카톡 노란색
                          : 'bg-white text-gray-900 rounded-bl-sm' // 상대방 메시지 카톡 흰색
                      )}
                    >
                      <p>{msg.text}</p>
                    </Card>
                    <span className="text-xs text-gray-600 mb-1">
                        {formattedTime}
                    </span>
                </div>
                {isMyMessage && showAvatar && (
                    // 내 메시지에는 아바타를 보통 표시하지 않지만, 디자인에 따라 추가할 수도 있습니다.
                    // 현재 카톡 스타일은 내 메시지에는 아바타가 없습니다.
                    // <Avatar className="size-8">
                    //   <AvatarImage src={`/images/icon-144.png`} alt={user.name} />
                    //   <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    // </Avatar>
                    <div className="size-8"></div> // 아바타 자리 비워두기 (간격 유지용)
                )}
                {!isMyMessage && !showAvatar && (
                    <div className="size-8"></div> // 아바타 자리 비워두기 (연속 메시지일 때)
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-3 border-t bg-gray-100 sticky bottom-0"> {/* 입력창 배경색, 하단 고정 */}
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="메시지를 입력하세요..."
            className="flex-1 resize-none rounded-xl border-gray-300 focus:border-yellow-400 focus:ring-yellow-400 bg-white"
            onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault(); // 기본 개행 방지
                    handleSendMessage(e);
                }
            }}
            rows={1} // 최소 1줄
            style={{ maxHeight: '100px', minHeight: '40px' }} // 높이 제한
          />
          <Button
            type="submit"
            className="rounded-xl px-4 py-2 bg-[#ffe812] text-gray-900 hover:bg-[#fdd800] focus:ring-yellow-400"
            disabled={newMessage.trim() === ''}
          >
            전송
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ChatRoom;