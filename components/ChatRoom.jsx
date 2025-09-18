// components/ChatRoom.jsx
"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import useChatStore from '@/store/chat-store';
import { useChatData } from '@/hooks/useChatData';
import { useInfiniteScrollMessages } from '@/hooks/useInfiniteScrollMessages';
import { useBot } from '@/hooks/useBot';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useBotStatus } from '@/hooks/useBotStatus';
import { sendMessage, deleteMessage, compressAndUploadImage } from '@/lib/firebase/firebaseService';
import { signOut, auth } from '@/lib/firebase/clientApp';
import { formatDateSeparator } from '@/lib/utils'; // 💡 날짜 포맷 함수 import

// UI Components
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, LogOut, Loader2, Smile, User, X } from 'lucide-react';

// Other Components
import CameraCapture from './CameraCapture';
import MessageItem from './MessageItem';
import ImageModal from './ImageModal';
import EmoticonPicker from './EmoticonPicker';
import ProfileModal from './ProfileModal';
import TypingIndicator from './TypingIndicator';

const ChatRoom = () => {
  const { authUser, chatUser, users, typingUsers, replyingToMessage, setReplyingToMessage, highlightedMessageId, setHighlightedMessageId } = useChatStore();
  
  const { messages, isLoading: isLoadingMore, isInitialLoad, hasMore, loadMore } = useInfiniteScrollMessages();
  
  const [newMessage, setNewMessage] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [isEmoticonPickerOpen, setIsEmoticonPickerOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  const scrollViewportRef = useRef(null);
  const scrollTargetRef = useRef(null);
  const emoticonPickerRef = useRef(null);
  const emoticonButtonRef = useRef(null);
  
  const didInitialScroll = useRef(false);
  const lastMessageIdRef = useRef(null);
  const scrollInfoRef = useRef({ previousScrollHeight: 0 });

  useChatData();
  useBot();
  const { handleTyping } = useTypingIndicator();
  usePushNotifications();
  const { isBotActive, handleToggleBot } = useBotStatus();

  const currentUserProfile = users.find(u => u.id === authUser?.uid) || authUser;

  useEffect(() => {
    const CHAT_ROOM_STATE = { page: 'chatRoom' };
    const currentUrl = location.href;

    const preventBackNavigation = () => {
      history.pushState(CHAT_ROOM_STATE, '', currentUrl);
    };

    history.replaceState(CHAT_ROOM_STATE, '', currentUrl);

    window.addEventListener('popstate', preventBackNavigation);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        preventBackNavigation();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('popstate', preventBackNavigation);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;

    if (isInitialLoad) {
      // 초기 로딩 시에는 아무것도 하지 않음
      return;
    }
    
    // 💡 스크롤 로직 개선
    // 1. 초기 렌더링 후 맨 아래로 스크롤
    if (!didInitialScroll.current && messages.length > 0) {
      viewport.scrollTop = viewport.scrollHeight;
      didInitialScroll.current = true;
      lastMessageIdRef.current = messages[messages.length - 1]?.id;
      return;
    }

    // 2. 새로운 메시지가 도착했을 때만 맨 아래로 스크롤
    const newLastMessage = messages[messages.length - 1];
    if (newLastMessage?.id !== lastMessageIdRef.current) {
      // 사용자가 맨 아래에 있을 때만 자동으로 스크롤
      if (viewport.scrollHeight - viewport.clientHeight <= viewport.scrollTop + 100) { // 100px의 여유
        setTimeout(() => {
            scrollTargetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 100);
      }
      lastMessageIdRef.current = newLastMessage?.id;
    } 
    // 3. 이전 메시지를 불러왔을 때 스크롤 위치 유지
    else if (scrollInfoRef.current.isLoadingMore) {
      const newScrollHeight = viewport.scrollHeight;
      viewport.scrollTop = newScrollHeight - scrollInfoRef.current.previousScrollHeight;
      scrollInfoRef.current.isLoadingMore = false;
    }
  }, [messages, isInitialLoad]);

  const handleScroll = useCallback(() => {
    const viewport = scrollViewportRef.current;
    if (viewport) {
      if (viewport.scrollTop === 0 && hasMore && !isLoadingMore) {
        // 이전 메시지를 불러오기 직전의 스크롤 높이 저장
        scrollInfoRef.current = {
          isLoadingMore: true,
          previousScrollHeight: viewport.scrollHeight,
        };
        loadMore();
      }
    }
  }, [hasMore, isLoadingMore, loadMore]);

  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (viewport) {
      viewport.addEventListener('scroll', handleScroll);
      return () => viewport.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);


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

  const handleSendMessage = async (text, imageUrl = null, type = 'text') => {
    if (!text?.trim() && !imageUrl) return;
    
    await sendMessage({
        text,
        imageUrl,
        type,
        sender: chatUser.name,
        uid: chatUser.uid,
        authUid: authUser.uid,
        replyTo: replyingToMessage ? replyingToMessage.id : null,
    });
    
    setReplyingToMessage(null);
    if (type === 'text') {
      setNewMessage('');
    }
  };
  
  const handleTextSubmit = (e) => {
    e.preventDefault();
    handleSendMessage(newMessage, null, 'text');
  };

  const handleEmoticonSend = (imageUrl) => {
    setIsEmoticonPickerOpen(false);
    handleSendMessage(null, imageUrl, 'emoticon');
  };
  
  const handleDelete = async (msgToDelete) => {
    if (confirm("메시지를 삭제하시겠습니까?")) {
      try {
        await deleteMessage(msgToDelete);
      } catch (error) {
        console.error("Error deleting message: ", error);
        alert("메시지 삭제에 실패했습니다.");
      }
    }
  };

  const handleCapture = async (imageBlob) => {
    setIsUploading(true);
    try {
      const imageUrl = await compressAndUploadImage(imageBlob, `chat_images/${authUser.uid}`);
      await handleSendMessage('', imageUrl, 'photo');
    } catch (error) {
      console.error("Image processing or upload error: ", error);
      alert("이미지 처리 중 오류가 발생했습니다.");
    } finally {
      setIsUploading(false);
    }
  };

  if (!chatUser) {
    return <div className="flex items-center justify-center h-full">사용자 정보를 불러오는 중...</div>;
  }
  
  let lastMessageDate = null;

  return (
    <div className="flex flex-col h-full w-full bg-[#b2c7dc]">
       <header className="p-4 border-b bg-white flex items-center justify-between shadow-sm z-10">
        <h1 className="text-lg font-bold text-gray-800">근육고양이 채팅방</h1>
        <div className="flex items-center gap-4">
          {chatUser.uid === 'owner' && (
            <Button onClick={handleToggleBot} variant="outline" size="sm">
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

      <ScrollArea viewportRef={scrollViewportRef} className="flex-1 min-h-0 p-4">
        {isLoadingMore && (
          <div className="flex justify-center my-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          </div>
        )}
        <div className="space-y-4">
          {messages.map((msg, index) => {
            let dateSeparator = null;
            if (msg.timestamp) {
                const messageDate = msg.timestamp.toDate().toLocaleDateString();
                if (messageDate !== lastMessageDate) {
                    dateSeparator = (
                        <div className="flex justify-center my-4">
                            <div className="text-xs text-gray-500 bg-gray-200/80 rounded-full px-3 py-1">
                                {formatDateSeparator(msg.timestamp)}
                            </div>
                        </div>
                    );
                    lastMessageDate = messageDate;
                }
            }

            return (
              <React.Fragment key={msg.id}>
                {dateSeparator}
                <MessageItem
                  msg={msg}
                  isMyMessage={msg.authUid === authUser.uid}
                  showAvatar={index === 0 || messages[index - 1].authUid !== msg.authUid || messages[index - 1].uid === 'bot-01' || (messages[index-1]?.timestamp && msg.timestamp?.toDate().toLocaleDateString() !== messages[index-1].timestamp.toDate().toLocaleDateString())}
                  onDelete={handleDelete}
                  onImageClick={setSelectedImageUrl}
                  onReply={setReplyingToMessage}
                  chatUser={chatUser}
                  highlightedMessageId={highlightedMessageId}
                  setHighlightedMessageId={setHighlightedMessageId}
                />
              </React.Fragment>
            );
          })}
          {typingUsers.length > 0 && <TypingIndicator users={typingUsers} />}
          <div ref={scrollTargetRef} />
        </div>
      </ScrollArea>

      {replyingToMessage && (
        <div className="bg-gray-200 p-2 text-sm text-gray-700 flex justify-between items-center">
          <div>
            <p className="font-bold">{replyingToMessage.sender}에게 답장</p>
            <p className="truncate">{replyingToMessage.text || (replyingToMessage.type === 'photo' ? '사진' : '이모티콘')}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setReplyingToMessage(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

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
              onInput={handleTyping}
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
      <ImageModal imageUrl={selectedImageUrl} onClose={() => setSelectedImageUrl(null)} />
      {isProfileModalOpen && <ProfileModal onClose={() => setIsProfileModalOpen(false)} />}
    </div>
  );
};

export default ChatRoom;