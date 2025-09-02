"use client";

import React, { useEffect, useRef, useState } from 'react';
import { db, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, signOut, auth, storage, ref, uploadBytes, getDownloadURL, doc, deleteDoc, deleteObject } from '@/lib/firebase/clientApp';
import useChatStore from '@/store/chat-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Camera, LogOut, Loader2 } from 'lucide-react';
import CameraCapture from './CameraCapture';
import imageCompression from 'browser-image-compression';
import MessageItem from './MessageItem';
import ImageModal from './ImageModal'; // 💡 ImageModal 컴포넌트 import

const ChatRoom = () => {
  const { authUser, chatUser, messages, setMessages } = useChatStore();
  const [newMessage, setNewMessage] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null); // 💡 이미지 모달 상태
  const scrollTargetRef = useRef(null);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, 'messages'), orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
    }, (error) => {
        console.error("Error fetching messages: ", error);
    });
    return () => unsubscribe();
  }, [setMessages]);

  useEffect(() => {
    if (scrollTargetRef.current) {
      scrollTargetRef.current.scrollIntoView({ behavior: 'auto' });
    }
  }, [messages]);
    
  // 💡 이미지 클릭 핸들러
  const handleImageClick = (imageUrl) => {
    setSelectedImageUrl(imageUrl);
  };

  // 💡 모달 닫기 핸들러
  const handleCloseModal = () => {
    setSelectedImageUrl(null);
  };

  const handleSendMessage = async (text, imageUrl = null) => {
    if (!text?.trim() && !imageUrl) return;
    if (!chatUser || !authUser) return;
    try {
      await addDoc(collection(db, 'messages'), { text, imageUrl, sender: chatUser.name, uid: chatUser.uid, authUid: authUser.uid, timestamp: serverTimestamp() });
      if (!imageUrl) setNewMessage('');
    } catch (error) { console.error("Error sending message: ", error); }
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    handleSendMessage(newMessage);
  };
  
  const handleDeleteMessage = async (msgToDelete) => {
    if (!msgToDelete || !msgToDelete.id) return;
    if (confirm("메시지를 삭제하시겠습니까?")) {
      try {
        await deleteDoc(doc(db, 'messages', msgToDelete.id));
        if (msgToDelete.imageUrl) {
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
      console.log(`Original image size: ${(imageBlob.size / 1024).toFixed(2)} KB`);
      
      const compressedBlob = await imageCompression(imageBlob, options);
      console.log(`Compressed AVIF image size: ${(compressedBlob.size / 1024).toFixed(2)} KB`);

      const finalBlob = compressedBlob.size < imageBlob.size ? compressedBlob : imageBlob;
      const fileExtension = finalBlob.type === 'image/avif' ? 'avif' : 'jpeg';
      
      console.log(`Final upload size: ${(finalBlob.size / 1024).toFixed(2)} KB with extension .${fileExtension}`);

      const storageRef = ref(storage, `chat_images/${authUser.uid}/${Date.now()}.${fileExtension}`);
      const snapshot = await uploadBytes(storageRef, finalBlob);
      const imageUrl = await getDownloadURL(snapshot.ref);
      
      await handleSendMessage('', imageUrl);

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
          <p className="text-sm text-gray-500"><span className="font-semibold">{chatUser.name}</span>님으로 접속</p>
          <Button variant="ghost" size="icon" onClick={() => signOut(auth)} title="로그아웃"><LogOut className="size-4" /></Button>
        </div>
      </header>

      <ScrollArea className="flex-1 min-h-0 p-4">
        <div className="space-y-4">
          {messages.map((msg, index) => (
            <MessageItem
              key={msg.id}
              msg={msg}
              isMyMessage={msg.uid === chatUser.uid}
              showAvatar={index === 0 || messages[index - 1].uid !== msg.uid}
              onDelete={handleDeleteMessage}
              onImageClick={handleImageClick} // 💡 핸들러 전달
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
          <Textarea value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="메시지를 입력하세요..." className="flex-1 resize-none rounded-xl border-gray-300 focus:border-yellow-400 focus:ring-yellow-400 bg-white" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSubmit(e); } }} rows={1} style={{ maxHeight: '100px', minHeight: '40px' }} />
          <Button type="submit" className="rounded-xl px-4 py-2 bg-[#ffe812] text-gray-900 hover:bg-[#fdd800] focus:ring-yellow-400" disabled={newMessage.trim() === ''}>전송</Button>
        </form>
      </div>

      {isCameraOpen && <CameraCapture onCapture={handleCapture} onClose={() => setIsCameraOpen(false)} />}
      
      {/* 💡 이미지 모달 렌더링 */}
      <ImageModal imageUrl={selectedImageUrl} onClose={handleCloseModal} />
    </div>
  );
};

export default ChatRoom;