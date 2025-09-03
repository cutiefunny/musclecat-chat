"use client";

import React, { useEffect, useRef, useState } from 'react';
import { db, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, signOut, auth, storage, ref, uploadBytes, getDownloadURL, doc, deleteDoc, deleteObject } from '@/lib/firebase/clientApp';
import useChatStore from '@/store/chat-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Camera, LogOut, Loader2, Smile, User } from 'lucide-react';
import CameraCapture from './CameraCapture';
import imageCompression from 'browser-image-compression';
import MessageItem from './MessageItem';
import ImageModal from './ImageModal';
import EmoticonPicker from './EmoticonPicker';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ProfileModal from './ProfileModal';


const ChatRoom = () => {
  const { authUser, chatUser, messages, setMessages, isBotActive, toggleBotActive, setUsers, users } = useChatStore();
  const [newMessage, setNewMessage] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [isEmoticonPickerOpen, setIsEmoticonPickerOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const scrollTargetRef = useRef(null);
  const emoticonPickerRef = useRef(null);
  const emoticonButtonRef = useRef(null);
  const lastProcessedMessageId = useRef(null);
  
  const currentUserProfile = users.find(u => u.id === authUser?.uid) || authUser;


  useEffect(() => {
    function handleClickOutside(event) {
      if (
        emoticonPickerRef.current &&
        !emoticonPickerRef.current.contains(event.target) &&
        emoticonButtonRef.current &&
        !emoticonButtonRef.current.contains(event.target)
      ) {
        setIsEmoticonPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  useEffect(() => {
    if (!db) return;
  
    // 사용자 목록 실시간 감지
    const usersQuery = query(collection(db, 'users'));
    const unsubscribeUsers = onSnapshot(usersQuery, (snapshot) => {
      const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);
    });
  
    // 메시지 목록 실시간 감지
    const messagesQuery = query(collection(db, 'messages'), orderBy('timestamp', 'asc'));
    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    }, (error) => {
      console.error("Error fetching messages: ", error);
    });
  
    return () => {
      unsubscribeUsers();
      unsubscribeMessages();
    };
  }, [setMessages, setUsers]);
  
  useEffect(() => {
    if (messages.length === 0 || !isBotActive) return;

    const lastMessage = messages[messages.length - 1];

    if (
      lastMessage &&
      lastMessage.uid === 'customer' &&
      lastMessage.type === 'text' &&
      lastMessage.id !== lastProcessedMessageId.current
    ) {
      lastProcessedMessageId.current = lastMessage.id;

      const fetchBotResponseAndSendMessage = async (prompt) => {
        try {
            prompt = '넌 근육고양이봇이야. 반말로 짧게 대답해줘. ' + prompt;
          const response = await fetch('https://musclecat.co.kr/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }),
          });

          if (!response.ok) throw new Error('Network response was not ok');
          
          const botResponseText = await response.text(); 

          if (botResponseText) {
            await addDoc(collection(db, 'messages'), {
              text: botResponseText,
              imageUrl: null,
              type: 'text',
              sender: '근육고양이봇',
              uid: 'bot-01',
              authUid: 'bot-01',
              timestamp: serverTimestamp()
            });
          }
        } catch (error) {
          console.error("Error fetching bot response: ", error);
        }
      };
      
      setTimeout(() => fetchBotResponseAndSendMessage(lastMessage.text), 1000);
    }
  }, [messages, isBotActive]);

  useEffect(() => {
    if (scrollTargetRef.current) {
      scrollTargetRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages]);
    
  const handleImageClick = (imageUrl) => {
    setSelectedImageUrl(imageUrl);
  };

  const handleCloseModal = () => {
    setSelectedImageUrl(null);
  };

  const handleSendMessage = async (text, imageUrl = null, type = 'text') => {
    if (!text?.trim() && !imageUrl) return;
    if (!chatUser || !authUser) return;
    try {
      await addDoc(collection(db, 'messages'), { 
        text, 
        imageUrl, 
        type,
        sender: chatUser.name, 
        uid: chatUser.uid, 
        authUid: authUser.uid, 
        timestamp: serverTimestamp() 
      });
      if (type === 'text') {
        setNewMessage('');
      }
    } catch (error) { console.error("Error sending message: ", error); }
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    handleSendMessage(newMessage, null, 'text');
  };

  const handleEmoticonSend = (imageUrl) => {
    handleSendMessage(null, imageUrl, 'emoticon');
  };
  
  const handleDeleteMessage = async (msgToDelete) => {
    if (!msgToDelete || !msgToDelete.id) return;
    if (confirm("메시지를 삭제하시겠습니까?")) {
      try {
        await deleteDoc(doc(db, 'messages', msgToDelete.id));
        if (msgToDelete.imageUrl && msgToDelete.type === 'photo') {
          const imageRef = ref(storage, msgToDelete.imageUrl);
          await deleteObject(imageRef);
        }
      } catch (error) {
        console.error("Error deleting message: ", error);
        alert("메시지 삭제에 실패했습니다.");
      }
    }
  };

  const handleCapture = async (imageBlob) => {
    if (!authUser || !chatUser) return;
    setIsUploading(true);
    
    const options = {
      maxSizeKB: 50,
      maxWidthOrHeight: 400,
      useWebWorker: true,
      fileType: 'image/avif',
    };

    try {
      const compressedBlob = await imageCompression(imageBlob, options);
      const finalBlob = compressedBlob.size < imageBlob.size ? compressedBlob : imageBlob;
      const fileExtension = finalBlob.type === 'image/avif' ? 'avif' : 'jpeg';
      const storageRef = ref(storage, `chat_images/${authUser.uid}/${Date.now()}.${fileExtension}`);
      const snapshot = await uploadBytes(storageRef, finalBlob);
      const imageUrl = await getDownloadURL(snapshot.ref);
      
      await handleSendMessage('', imageUrl, 'photo');

    } catch (error) {
      console.error("Image compression or upload error: ", error);
      alert("이미지 처리 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false);
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
          {chatUser.uid === 'owner' && (
            <Button onClick={toggleBotActive} variant="outline" size="sm">
              {isBotActive ? '봇 ON' : '봇 OFF'}
            </Button>
          )}
          <p className="text-sm text-gray-500 hidden sm:block">
            <span className="font-semibold">{currentUserProfile?.displayName || '사용자'}</span>
            ({chatUser.uid === 'owner' ? '사장' : '고객'})님
          </p>

          <DropdownMenu>
            <DropdownMenuTrigger>
              <Avatar className="size-8 cursor-pointer">
                <AvatarImage src={currentUserProfile?.photoURL} alt={currentUserProfile?.displayName} />
                <AvatarFallback>{currentUserProfile?.displayName?.charAt(0) || '?'}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setIsProfileModalOpen(true)}>
                <User className="mr-2 h-4 w-4" />
                <span>프로필 수정</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => signOut(auth)}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>로그아웃</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </header>

      <ScrollArea className="flex-1 min-h-0 p-4">
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <MessageItem
              key={msg.id}
              msg={msg}
              isMyMessage={msg.authUid === authUser.uid}
              showAvatar={index === 0 || messages[index - 1].authUid !== msg.authUid || messages[index - 1].uid === 'bot-01'}
              onDelete={handleDeleteMessage}
              onImageClick={handleImageClick}
              chatUser={chatUser}
            />
          ))}
          <div ref={scrollTargetRef} />
        </div>
      </ScrollArea>

      <div className="p-3 border-t bg-gray-100 sticky bottom-0">
        <form onSubmit={handleTextSubmit} className="flex items-center gap-2">
          <Button type="button" variant="ghost" size="icon" onClick={() => setIsCameraOpen(true)} disabled={isUploading} className="rounded-full size-10 flex-shrink-0">
            {isUploading ? <Loader2 className="size-5 animate-spin" /> : <Camera className="size-5 text-gray-600" />}
          </Button>
          
          <div className="relative flex-1">
            {isEmoticonPickerOpen && (
              <EmoticonPicker 
                ref={emoticonPickerRef}
                onEmoticonSelect={handleEmoticonSend}
                onClose={() => setIsEmoticonPickerOpen(false)}
              />
            )}
            <Textarea 
              value={newMessage} 
              onChange={(e) => setNewMessage(e.target.value)} 
              placeholder="메시지를 입력하세요..." 
              className="pr-12 resize-none rounded-xl border-gray-300 focus:border-yellow-400 focus:ring-yellow-400 bg-white" 
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSubmit(e); } }} 
              rows={1} 
              style={{ maxHeight: '100px', minHeight: '40px' }} 
            />
            <Button 
              ref={emoticonButtonRef}
              type="button" 
              variant="ghost" 
              size="icon" 
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full size-8"
              onClick={() => setIsEmoticonPickerOpen(prev => !prev)}
            >
              <Smile className="size-5 text-gray-500" />
            </Button>
          </div>

          <Button type="submit" className="rounded-xl px-4 py-2 bg-[#ffe812] text-gray-900 hover:bg-[#fdd800] focus:ring-yellow-400" disabled={newMessage.trim() === ''}>전송</Button>
        </form>
      </div>

      {isCameraOpen && <CameraCapture onCapture={handleCapture} onClose={() => setIsCameraOpen(false)} />}
      <ImageModal imageUrl={selectedImageUrl} onClose={handleCloseModal} />
      {isProfileModalOpen && <ProfileModal onClose={() => setIsProfileModalOpen(false)} />}
    </div>
  );
};

export default ChatRoom;