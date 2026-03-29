// components/ChatRoom.jsx
"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import useChatStore from '@/store/chat-store';
import { useChatData } from '@/hooks/useChatData';
import { useInfiniteScrollMessages } from '@/hooks/useInfiniteScrollMessages';
import { useBot } from '@/hooks/useBot';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useBotStatus } from '@/hooks/useBotStatus';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useUiSettings } from '@/hooks/useUiSettings';
import { sendMessage, deleteMessage, compressAndUploadImage, markMessagesAsRead, subscribeToNotice } from '@/lib/firebase/firebaseService'; // 💡 subscribeToNotice 추가
import { signOut, auth } from '@/lib/firebase/clientApp';
import { formatDateSeparator } from '@/lib/utils';

// UI Components
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuCheckboxItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, LogOut, Loader2, Smile, User, X, Keyboard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Megaphone } from 'lucide-react'; // 💡 Megaphone 아이콘 추가

// Other Components
import CameraCapture from './CameraCapture';
import MessageItem from './MessageItem';
import ImageModal from './ImageModal';
import EmoticonPicker from './EmoticonPicker';
import ProfileModal from './ProfileModal';

const ChatRoom = () => {
  const { authUser, chatUser, users, replyingToMessage, setReplyingToMessage, highlightedMessageId, setHighlightedMessageId, unreadCount } = useChatStore();
  
  const { messages, isLoading: isLoadingMore, isInitialLoad, hasMore, loadMore } = useInfiniteScrollMessages();
  
  const [newMessage, setNewMessage] = useState('');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState(null);
  const [isEmoticonPickerOpen, setIsEmoticonPickerOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  
  // 💡 공지사항 상태
  const [notice, setNotice] = useState({ text: "", isVisible: false });
  
  // 외부 키보드 모드 상태 및 입력창 Ref
  const [isExternalKeyboardMode, setIsExternalKeyboardMode] = useState(false);
  const inputRef = useRef(null);

  const scrollViewportRef = useRef(null);
  const scrollTargetRef = useRef(null);
  const emoticonPickerRef = useRef(null);
  const emoticonButtonRef = useRef(null);
  
  const didInitialScroll = useRef(false);
  const lastMessageIdRef = useRef(null);
  const scrollInfoRef = useRef({ previousScrollHeight: 0 });

  useChatData();
  useBot();
  useUnreadMessages();
  useUiSettings();
  
  usePushNotifications();
  const { isBotActive, handleToggleBot } = useBotStatus();

  // 💡 공지사항 구독
  useEffect(() => {
    const unsubscribe = subscribeToNotice((data) => {
      if (data) setNotice(data);
    });
    return () => unsubscribe();
  }, []);

  const currentUserProfile = users.find(u => u.id === authUser?.uid) || authUser;
  
  useEffect(() => {
    if (authUser?.uid) {
        markMessagesAsRead(authUser?.uid);
    }
  }, [authUser?.uid]);

  // [설정 로드] 로컬 스토리지에서 외부 키보드 모드 불러오기
  useEffect(() => {
    const savedMode = localStorage.getItem('musclecat_external_keyboard_mode');
    if (savedMode === 'true') {
      setIsExternalKeyboardMode(true);
    }
  }, []);

  // 💡 [수정] 통합된 포커스 복구 로직
  // 이모티콘뿐만 아니라 카메라, 사진, 프로필 등 '모든 모달'이 닫히는 순간을 감지합니다.
  useEffect(() => {
    const isAnyModalOpen = isCameraOpen || isEmoticonPickerOpen || selectedImageUrl || isProfileModalOpen;

    // 외부 키보드 모드이고, 모든 모달이 닫힌 상태라면 입력창에 포커스
    if (isExternalKeyboardMode && !isAnyModalOpen) {
      // 상태 변경 직후 DOM 렌더링을 확실히 기다리기 위해 약간의 지연(50ms)을 둡니다.
      setTimeout(() => {
        // 모달이 닫힌 후 다른 요소로 포커스가 튀는 것을 방지하고 입력창으로 강제 이동
        inputRef.current?.focus();
      }, 50);
    }
  }, [isExternalKeyboardMode, isCameraOpen, isEmoticonPickerOpen, selectedImageUrl, isProfileModalOpen]);

  // 외부 키보드 모드 토글 핸들러
  const toggleExternalKeyboardMode = () => {
    const newMode = !isExternalKeyboardMode;
    setIsExternalKeyboardMode(newMode);
    localStorage.setItem('musclecat_external_keyboard_mode', newMode);
    
    if (newMode) {
      setTimeout(() => inputRef.current?.focus(), 100);
      alert("⌨️ 외부 키보드 모드가 켜졌습니다.\n배경을 눌러도 입력창 포커스가 유지됩니다.");
    }
  };

  // 외부 키보드 모드일 때: 배경 클릭 시 입력창으로 포커스 되돌리기
  useEffect(() => {
    if (!isExternalKeyboardMode) return;

    const handleGlobalClick = (e) => {
      // 입력창, 버튼, 링크 등 상호작용 요소를 클릭한 경우는 무시
      if (e.target.closest('button, a, [role="button"], textarea, input, .lucide')) return;

      setTimeout(() => {
        if (document.activeElement !== inputRef.current) {
          inputRef.current?.focus();
        }
      }, 50);
    };

    window.addEventListener('click', handleGlobalClick);
    return () => window.removeEventListener('click', handleGlobalClick);
  }, [isExternalKeyboardMode]);

  // 1분 비활성 감지 로직 (타임아웃 시 모달 자동 닫기)
  useEffect(() => {
    const isAnyModeOpen = isCameraOpen || isEmoticonPickerOpen || selectedImageUrl || isProfileModalOpen;
    if (!isAnyModeOpen) return;

    // 💡 개발자님 요청하신 '자동 닫힘' 시간이 여기서 설정됩니다 (현재 1분 = 60000ms)
    const INACTIVITY_TIMEOUT = 60000; 
    let timeoutId;

    const closeAllModes = () => {
      // 여기서 상태가 false로 바뀌면 위쪽의 '통합 포커스 복구 로직' useEffect가 감지하고 포커스를 줍니다.
      setIsCameraOpen(false);
      setIsEmoticonPickerOpen(false);
      setSelectedImageUrl(null);
      setIsProfileModalOpen(false);
    };

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(closeAllModes, INACTIVITY_TIMEOUT);
    };

    resetTimer();
    const activityEvents = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'click', 'scroll'];
    activityEvents.forEach((event) => window.addEventListener(event, resetTimer));

    return () => {
      clearTimeout(timeoutId);
      activityEvents.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [isCameraOpen, isEmoticonPickerOpen, selectedImageUrl, isProfileModalOpen]);


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
      return;
    }
    
    if (!didInitialScroll.current && messages.length > 0) {
      viewport.scrollTop = viewport.scrollHeight;
      didInitialScroll.current = true;
      lastMessageIdRef.current = messages[messages.length - 1]?.id;
      return;
    }

    const newLastMessage = messages[messages.length - 1];
    if (newLastMessage?.id !== lastMessageIdRef.current) {
        if (authUser?.uid) {
            markMessagesAsRead(authUser.uid);
        }
      if (viewport.scrollHeight - viewport.clientHeight <= viewport.scrollTop + 100) {
        setTimeout(() => {
            scrollTargetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 100);
      }
      lastMessageIdRef.current = newLastMessage?.id;
    } 
    else if (scrollInfoRef.current.isLoadingMore) {
      const newScrollHeight = viewport.scrollHeight;
      viewport.scrollTop = newScrollHeight - scrollInfoRef.current.previousScrollHeight;
      scrollInfoRef.current.isLoadingMore = false;
    }
  }, [messages, isInitialLoad, authUser?.uid]);

  const handleScroll = useCallback(() => {
    const viewport = scrollViewportRef.current;
    if (viewport) {
      if (viewport.scrollTop === 0 && hasMore && !isLoadingMore) {
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

  const handleSendMessage = async (text, imagePayload = null, type = 'text') => {
    if (!text?.trim() && !imagePayload) return;

    const messageData = {
      text,
      type,
      sender: chatUser.name,
      uid: chatUser.uid,
      authUid: authUser.uid,
      replyTo: replyingToMessage ? replyingToMessage.id : null,
    };

    if (imagePayload) {
      messageData.imageUrl = imagePayload.downloadURL;
      messageData.storagePath = imagePayload.storagePath;
    }
    
    await sendMessage(messageData);
    
    setReplyingToMessage(null);
    if (type === 'text') {
      setNewMessage('');
    }

    if (isExternalKeyboardMode) {
        setTimeout(() => inputRef.current?.focus(), 10);
    }
  };
  
  const handleTextSubmit = (e) => {
    e.preventDefault();
    handleSendMessage(newMessage, null, 'text');
    
    if (isExternalKeyboardMode) {
        setTimeout(() => inputRef.current?.focus(), 10);
    }
  };

  const handleEmoticonSend = (emoticon) => {
    setIsEmoticonPickerOpen(false);
    const imagePayload = { 
      downloadURL: emoticon.url, 
      storagePath: emoticon.storagePath || null 
    };
    handleSendMessage(null, imagePayload, 'emoticon');
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
      const imagePayload = await compressAndUploadImage(imageBlob, `chat_images/${authUser.uid}`);
      await handleSendMessage('', imagePayload, 'photo');
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
            <DropdownMenuTrigger asChild>
                <div className="relative">
                    <Avatar className="size-8 cursor-pointer">
                        <AvatarImage src={currentUserProfile?.photoURL} alt={currentUserProfile?.displayName} />
                        <AvatarFallback>{currentUserProfile?.displayName?.charAt(0) || '?'}</AvatarFallback>
                    </Avatar>
                    {unreadCount > 0 && (
                        <Badge variant="destructive" className="absolute -top-1 -right-2 h-5 w-5 p-0 flex items-center justify-center">
                            {unreadCount}
                        </Badge>
                    )}
                </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setIsProfileModalOpen(true)}>
                <User className="mr-2 h-4 w-4" />
                <span>프로필 수정</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuCheckboxItem 
                checked={isExternalKeyboardMode}
                onCheckedChange={toggleExternalKeyboardMode}
              >
                <Keyboard className="mr-2 h-4 w-4" />
                <span>외부 키보드 모드</span>
              </DropdownMenuCheckboxItem>
              
              <DropdownMenuSeparator />

              <DropdownMenuItem onClick={() => signOut(auth)}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>로그아웃</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </header>

      {/* 💡 [추가] 공지사항 배너 */}
      {notice.isVisible && notice.text && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2.5 flex items-center gap-3 shadow-sm animate-in fade-in slide-in-from-top duration-300">
          <Megaphone className="size-4 text-yellow-600 flex-shrink-0" />
          <div className="flex-1 text-sm text-yellow-800 font-medium overflow-hidden">
            <p className="truncate whitespace-pre-wrap">{notice.text}</p>
          </div>
        </div>
      )}

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
                  isMyMessage={msg.authUid === authUser.uid || (['1호점', '2호점', '3호점'].includes(msg.sender) && msg.sender === chatUser.name)}
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
              ref={inputRef}
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
      {selectedImageUrl && <ImageModal imageUrl={selectedImageUrl} onClose={() => setSelectedImageUrl(null)} />}
      {isProfileModalOpen && <ProfileModal onClose={() => setIsProfileModalOpen(false)} />}
    </div>
  );
};

export default ChatRoom;