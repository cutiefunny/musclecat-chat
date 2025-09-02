"use client";

import React, { useEffect, useRef, useState } from 'react';
import { db, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, signOut, auth } from '@/lib/firebase/clientApp';
import useChatStore from '@/store/chat-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn, formatKakaoTime } from '@/lib/utils';
import { LogOut } from 'lucide-react';

const ChatRoom = () => {
  const { authUser, chatUser, messages, setMessages } = useChatStore();
  const [newMessage, setNewMessage] = useState('');
  const scrollAreaRef = useRef(null);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'messages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    });
    return () => unsubscribe();
  }, [setMessages]);

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
    if (newMessage.trim() === '' || !chatUser || !authUser) return;

    try {
      await addDoc(collection(db, 'messages'), {
        text: newMessage,
        sender: chatUser.name,
        uid: chatUser.uid,
        authUid: authUser.uid,
        timestamp: serverTimestamp(),
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message: ", error);
    }
  };

  if (!chatUser) {
    return <div className="flex items-center justify-center h-full">사용자 정보를 불러오는 중...</div>;
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#b2c7dc]">
      <header className="p-4 border-b bg-white flex items-center justify-between shadow-sm z-10">
        <h1 className="text-lg font-bold text-gray-800">근육고양이 채팅방</h1>
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-500">
            <span className="font-semibold">{chatUser.name}</span>님으로 접속
          </p>
          <Button variant="ghost" size="icon" onClick={() => signOut(auth)} title="로그아웃">
            <LogOut className="size-4" />
          </Button>
        </div>
      </header>

      <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((msg, index) => {
            const isMyMessage = msg.uid === chatUser.uid;
            const showAvatar = index === 0 || messages[index - 1].uid !== msg.uid;
            const formattedTime = msg.timestamp ? formatKakaoTime(msg.timestamp) : '';

            return (
              <div
                key={msg.id}
                className={cn('flex gap-2', isMyMessage ? 'justify-end' : 'justify-start')}
              >
                {!isMyMessage && showAvatar && (
                  <Avatar className="size-8 mt-1">
                    <AvatarImage src={`/images/icon.png`} alt={msg.sender} />
                    <AvatarFallback>{msg.sender.charAt(0)}</AvatarFallback>
                  </Avatar>
                )}
                <div className={cn("flex", isMyMessage ? "flex-row-reverse" : "flex-row", "items-end gap-1")}>
                  <Card
                    className={cn(
                      'max-w-[70%] p-3 rounded-xl break-words whitespace-pre-wrap text-base relative',
                      isMyMessage ? 'bg-[#ffe812] text-gray-900 rounded-br-sm' : 'bg-white text-gray-900 rounded-bl-sm'
                    )}
                  >
                    <p>{msg.text}</p>
                  </Card>
                  <span className="text-xs text-gray-600 mb-1">{formattedTime}</span>
                </div>
                {(!isMyMessage && !showAvatar) && <div className="w-8" />}
              </div>
            );
          })}
        </div>
      </ScrollArea>

      <div className="p-3 border-t bg-gray-100 sticky bottom-0">
        <form onSubmit={handleSendMessage} className="flex items-center gap-2">
          <Textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="메시지를 입력하세요..."
            className="flex-1 resize-none rounded-xl border-gray-300 focus:border-yellow-400 focus:ring-yellow-400 bg-white"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
            rows={1}
            style={{ maxHeight: '100px', minHeight: '40px' }}
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