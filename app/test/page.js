// app/test/page.js
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Camera, 
  Smile, 
  Send, 
  User, 
  Bot, 
  Settings, 
  Trash2, 
  RotateCcw,
  MessageSquare,
  ShieldCheck,
  Store,
  Monitor
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock Data & Constants
const MOCK_USERS = {
  owner: { uid: 'owner', authUid: 'owner-id', name: '사장님', displayName: '사장님', photoURL: '/images/nyanya.jpg', role: 'owner' },
  branch1: { uid: 'branch1', authUid: 'branch1-id', name: '1호점', displayName: '1호점', photoURL: '/images/icon.png', role: 'customer' },
  branch2: { uid: 'branch2', authUid: 'branch2-id', name: '2호점', displayName: '2호점', photoURL: '/images/icon.png', role: 'customer' },
  branch3: { uid: 'branch3', authUid: 'branch3-id', name: '3호점', displayName: '3호점', photoURL: '/images/icon.png', role: 'customer' },
  guest: { uid: 'guest', authUid: 'guest-id', name: '손님', displayName: '손님', photoURL: '/images/icon.png', role: 'customer' },
};

const INITIAL_MESSAGES = [
  { id: '1', text: '안녕하세요! 근육고양이 테스트 모드입니다.', sender: '근육고양이봇', uid: 'bot-01', authUid: 'bot-01', timestamp: new Date(), type: 'text' },
  { id: '2', text: '이 페이지에서의 대화는 DB에 저장되지 않습니다.', sender: '사장님', uid: 'owner', authUid: 'owner-id', timestamp: new Date(), type: 'text' },
];

const renderMessageText = (text) => {
  if (!text) return null;
  const imageRegex = /!\[([^\]]*)\]\((.*?)\)/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = imageRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex, match.index)}</span>);
    }
    parts.push(
      <img key={`img-${match.index}`} src={match[2]} alt={match[1] || 'attached'} className="max-w-[200px] my-2 rounded border border-gray-100 object-cover block" />
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(<span key={`text-${lastIndex}`}>{text.substring(lastIndex)}</span>);
  }

  return <>{parts}</>;
};

export default function TestSimulationPage() {
  const [messages, setMessages] = useState(INITIAL_MESSAGES);
  const [activeUser, setActiveUser] = useState(MOCK_USERS.owner);
  const [newMessage, setNewMessage] = useState("");
  const [isBotActive, setIsBotActive] = useState(true);
  const [showConfig, setShowConfig] = useState(true);
  const [backendEnv, setBackendEnv] = useState("local");
  
  const scrollViewportRef = useRef(null);
  const inputRef = useRef(null);

  // Auto scroll to bottom
  useEffect(() => {
    if (scrollViewportRef.current) {
      const scrollElement = scrollViewportRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = (text, senderOverride = null) => {
    if (!text.trim()) return;

    const user = senderOverride || activeUser;
    const newMsg = {
      id: Date.now().toString(),
      text,
      sender: user.displayName,
      uid: user.uid,
      authUid: user.authUid,
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, newMsg]);
    setNewMessage("");

    // Simulate Bot Response if active
    if (user.uid !== 'bot-01') {
      setTimeout(() => {
        simulateBotResponse(text, user);
      }, 500);
    }
  };

  const simulateBotResponse = async (userText, user) => {
    const baseUrl = backendEnv === 'local' ? 'http://localhost:8000' : 'https://musclecat.co.kr';

    // 1호점, 2호점, 3호점에서 "얼마"라는 단어가 포함된 메시지 감지
    if ((user.uid === 'branch1' || user.uid === 'branch2' || user.uid === 'branch3') && userText.includes('얼마')) {
      try {
        const productResponse = await fetch(`${baseUrl}/productinfo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: userText }),
        });

        if (productResponse.ok) {
          const productData = await productResponse.json();
          if (productData && (productData.text || productData.image)) {
            const botMsg = {
              id: (Date.now() + 1).toString(),
              sender: '근육고양이봇',
              uid: 'bot-01',
              authUid: 'bot-01',
              timestamp: new Date()
            };
            if (productData.text) {
              botMsg.text = productData.text;
              botMsg.type = 'text';
            }
            if (productData.image) {
              botMsg.imageUrl = productData.image;
              botMsg.type = 'photo';
            }
            setMessages(prev => [...prev, botMsg]);
          }
        }
      } catch (error) {
        console.error("Error calling product info API:", error);
      }
      return; 
    }

    if (!isBotActive) return;

    try {
      let prompt = '넌 근육고양이봇이야. 반말로 짧게 대답해줘. ';
      prompt += '질문 : ' + userText;
      const response = await fetch(`${baseUrl}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (response.ok) {
        const botResponseText = await response.text();
        if (botResponseText && botResponseText.trim() && !botResponseText.trim().toLowerCase().includes('fail')) {
          const botMsg = {
            id: (Date.now() + 1).toString(),
            text: botResponseText.trim(),
            sender: '근육고양이봇',
            uid: 'bot-01',
            authUid: 'bot-01',
            timestamp: new Date(),
            type: 'text'
          };
          setMessages(prev => [...prev, botMsg]);
        }
      }
    } catch (error) {
      console.error("Error calling bot API:", error);
    }
  };

  const clearMessages = () => {
    setMessages(INITIAL_MESSAGES);
  };

  const formatTime = (date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? '오후' : '오전';
    const displayHours = hours % 12 === 0 ? 12 : hours % 12;
    const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
    return `${ampm} ${displayHours}:${displayMinutes}`;
  };

  return (
    <div className="flex flex-col h-screen w-full bg-[#b2c7dc] overflow-hidden">
      {/* Simulation Banner */}
      <div className="bg-yellow-500 text-yellow-950 text-[10px] font-bold py-0.5 px-2 flex items-center justify-center gap-2 uppercase tracking-widest z-50">
        <Monitor size={10} /> Local Simulation Mode - No Data Persistence
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header (Same as real UI) */}
          <header className="p-4 border-b bg-white flex items-center justify-between shadow-sm z-10">
            <div className="flex items-center gap-2">
               <h1 className="text-lg font-bold text-gray-800">근육고양이 채팅방</h1>
               <Badge variant="outline" className="text-[10px] py-0 px-1 border-blue-200 text-blue-500">TEST</Badge>
            </div>
            <div className="flex items-center gap-4">
              {activeUser.uid === 'owner' && (
                <Button onClick={() => setIsBotActive(!isBotActive)} variant="outline" size="sm" className="h-8">
                  {isBotActive ? '봇 ON' : '봇 OFF'}
                </Button>
              )}
              <p className="text-sm text-gray-500 hidden sm:block">
                <span className="font-semibold">{activeUser.displayName}</span>
                ({activeUser.uid === 'owner' ? '사장' : '고객'})님
              </p>
              <Avatar className="size-8">
                <AvatarImage src={activeUser.photoURL} alt={activeUser.displayName} />
                <AvatarFallback>{activeUser.displayName.charAt(0)}</AvatarFallback>
              </Avatar>
            </div>
          </header>

          {/* Messages Area */}
          <ScrollArea ref={scrollViewportRef} className="flex-1 min-h-0 p-4 bg-[#b2c7dc]">
            <div className="space-y-4 max-w-3xl mx-auto">
              {messages.map((msg, index) => {
                const isMyMessage = msg.authUid === activeUser.authUid;
                const showAvatar = index === 0 || messages[index - 1].authUid !== msg.authUid;
                const isBot = msg.uid === 'bot-01';
                const isOwner = msg.uid === 'owner';

                return (
                  <div key={msg.id} className={cn('flex gap-2', isMyMessage ? 'justify-end' : 'justify-start')}>
                    {!isMyMessage && showAvatar && (
                      <Avatar className={cn("mt-1 flex-shrink-0", isBot ? "size-10 border-2 border-yellow-400" : "size-8")}>
                        <AvatarImage src={isBot ? "/images/nyanya.jpg" : msg.photoURL || "/images/icon.png"} />
                        <AvatarFallback>{msg.sender.charAt(0)}</AvatarFallback>
                      </Avatar>
                    )}
                    {(!isMyMessage && !showAvatar) && <div className="w-8 flex-shrink-0" />}

                    <div className={cn("flex flex-col gap-1 max-w-[80%] sm:max-w-[70%]", isMyMessage ? "items-end" : "items-start")}>
                      {!isMyMessage && showAvatar && (
                        <span className={cn("text-xs text-gray-600 ml-1", isBot && "text-blue-700 font-bold")}>
                          {msg.sender}
                        </span>
                      )}
                      <div className={cn("flex items-end gap-1", isMyMessage ? "flex-row-reverse" : "flex-row")}>
                        <Card className={cn(
                          'w-fit p-3 rounded-xl break-words whitespace-pre-wrap text-base border-none shadow-sm',
                          isMyMessage ? 'bg-[#ffe812] text-gray-900 rounded-br-sm' : 'bg-white text-gray-900 rounded-bl-sm'
                        )}>
                          {msg.imageUrl && (
                             <img src={msg.imageUrl} alt="attached" className="max-w-[200px] mb-1 rounded border border-gray-100 object-cover block" />
                          )}
                          {msg.text && <div className="leading-snug">{renderMessageText(msg.text)}</div>}
                        </Card>
                        <span className="text-[10px] text-gray-500 mb-1">{formatTime(msg.timestamp)}</span>
                      </div>
                    </div>
                    
                    {isMyMessage && showAvatar && (
                      <Avatar className="mt-1 flex-shrink-0 size-8">
                        <AvatarImage src={activeUser.photoURL} />
                        <AvatarFallback>{activeUser.displayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                    )}
                    {(isMyMessage && !showAvatar) && <div className="w-8 flex-shrink-0" />}
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="p-3 border-t bg-gray-100 sticky bottom-0">
            <div className="max-w-3xl mx-auto flex items-center gap-2">
              <Button variant="ghost" size="icon" className="rounded-full size-10">
                <Camera className="size-5 text-gray-600" />
              </Button>
              <div className="relative flex-1">
                <Textarea 
                  ref={inputRef}
                  value={newMessage} 
                  onChange={(e) => setNewMessage(e.target.value)} 
                  placeholder="메시지를 입력하세요..." 
                  className="pr-12 resize-none rounded-xl border-gray-300 focus:ring-yellow-400 bg-white min-h-[40px] max-h-[100px]" 
                  onKeyDown={(e) => { 
                    if (e.key === 'Enter' && !e.shiftKey) { 
                      e.preventDefault(); 
                      handleSendMessage(newMessage); 
                    } 
                  }} 
                  rows={1} 
                />
                <Button variant="ghost" size="icon" className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full size-8">
                  <Smile className="size-5 text-gray-500" />
                </Button>
              </div>
              <Button 
                onClick={() => handleSendMessage(newMessage)}
                className="rounded-xl px-4 py-2 bg-[#ffe812] text-gray-900 hover:bg-[#fdd800] border-none"
                disabled={!newMessage.trim()}
              >
                전송
              </Button>
            </div>
          </div>
        </div>

        {/* Developer / Control Sidebar */}
        {showConfig && (
          <aside className="w-80 border-l bg-zinc-900 text-zinc-100 p-6 flex flex-col gap-6 z-20 shadow-2xl">
             <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold flex items-center gap-2 text-yellow-500">
                    <Settings size={16} /> SIMULATION PANEL
                </h2>
                <Button variant="ghost" size="icon" className="size-6 text-zinc-500" onClick={() => setShowConfig(false)}>
                    <Trash2 size={14} />
                </Button>
             </div>

             <div className="space-y-4">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Switch User Identity</label>
                <div className="grid grid-cols-1 gap-2">
                  {Object.values(MOCK_USERS).map(user => (
                    <Button 
                      key={user.uid}
                      variant="outline" 
                      className={cn(
                        "justify-start gap-3 h-12 border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800 text-left px-3",
                        activeUser.uid === user.uid && "border-yellow-500 ring-1 ring-yellow-500 bg-yellow-500/10 text-yellow-500"
                      )}
                      onClick={() => setActiveUser(user)}
                    >
                      <Avatar className="size-6">
                        <AvatarImage src={user.photoURL} />
                        <AvatarFallback>{user.displayName.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold leading-none">{user.displayName}</span>
                        <span className="text-[10px] text-zinc-500 leading-none mt-1">{user.role === 'owner' ? 'Owner' : 'Client'}</span>
                      </div>
                    </Button>
                  ))}
                </div>
             </div>

             <div className="space-y-4">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Backend Target</label>
                <div className="grid grid-cols-2 gap-2">
                    <Button 
                        size="sm" 
                        variant="outline" 
                        className={cn("h-8 text-xs border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800", backendEnv === 'local' && "border-blue-500 ring-1 ring-blue-500 bg-blue-500/10 text-blue-500 text-white")}
                        onClick={() => setBackendEnv('local')}
                    >
                        Local
                    </Button>
                    <Button 
                        size="sm" 
                        variant="outline" 
                        className={cn("h-8 text-xs border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800", backendEnv === 'server' && "border-blue-500 ring-1 ring-blue-500 bg-blue-500/10 text-blue-500 text-white")}
                        onClick={() => setBackendEnv('server')}
                    >
                        Server
                    </Button>
                </div>
                <div className="text-[9px] text-zinc-500 font-mono bg-zinc-950 p-2 rounded border border-zinc-800">
                    {backendEnv === 'local' ? 'http://localhost:8000' : 'https://musclecat.co.kr'}
                </div>
             </div>

             <div className="space-y-4">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">Bot Behavior</label>
                <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Bot size={14} className={isBotActive ? "text-emerald-500" : "text-zinc-600"} />
                        <span className="text-xs">AI Auto-Reply</span>
                    </div>
                    <Button 
                        size="sm" 
                        variant={isBotActive ? "default" : "secondary"} 
                        className={cn("h-6 text-[10px] px-2", isBotActive ? "bg-emerald-600" : "")}
                        onClick={() => setIsBotActive(!isBotActive)}
                    >
                        {isBotActive ? 'ACTIVE' : 'DISABLED'}
                    </Button>
                </div>
             </div>

             <div className="mt-auto space-y-2">
                <Button 
                    variant="outline" 
                    className="w-full gap-2 border-zinc-800 text-zinc-400 hover:text-white"
                    onClick={clearMessages}
                >
                    <RotateCcw size={14} /> Reset Simulation
                </Button>
                <p className="text-[9px] text-zinc-600 text-center px-4">
                    모든 상태는 로컬 메모리에만 유지되며 페이지 새로고침 시 초기화됩니다.
                </p>
             </div>
          </aside>
        )}

        {/* Floating Toggle for Sidebar */}
        {!showConfig && (
            <Button 
                className="absolute top-20 right-4 size-10 rounded-full bg-zinc-900 border border-zinc-700 shadow-xl z-30" 
                onClick={() => setShowConfig(true)}
            >
                <Settings size={18} />
            </Button>
        )}
      </div>
    </div>
  );
}
