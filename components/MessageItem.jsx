// components/MessageItem.jsx
"use client";

import React from 'react';
import useChatStore from '@/store/chat-store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import NextImage from 'next/image';
import { cn, formatKakaoTime } from '@/lib/utils';
import { MessageSquareReply, CornerDownRight, Smile } from 'lucide-react';
import { addReaction } from '@/lib/firebase/firebaseService';

const ReactionPicker = ({ onSelect, messageId, authUser }) => {
  const reactions = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
  return (
    <div className="flex gap-1 p-1 bg-white rounded-full shadow-md">
      {reactions.map(emoji => (
        <button
          key={emoji}
          onClick={() => onSelect(messageId, { emoji, user: authUser.uid })}
          className="text-lg p-1 rounded-full hover:bg-gray-200 transition-colors"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

const MessageItem = ({ msg, isMyMessage, showAvatar, onDelete, onImageClick, onReply, chatUser, highlightedMessageId, setHighlightedMessageId }) => {
  // 💡 users: 실시간 사용자 목록 (프로필 변경 시 자동 업데이트됨)
  const { authUser, users, messages, isMessageModalActive } = useChatStore();
  
  const formattedTime = msg.timestamp ? formatKakaoTime(msg.timestamp) : '';
  const isEmoticon = msg.type === 'emoticon';

  // 💡 [핵심 로직] 메시지의 authUid를 이용해 최신 사용자 프로필 찾기
  const userProfile = users.find(u => u.id === msg.authUid);
  const isOwner = msg.uid === 'owner';

  // 1. 메시지 텍스트가 https:// 로 시작하는지 확인 (이미지 URL로 간주)
  const isUrlImage = msg.text && msg.text.startsWith('https://');

  let senderName, avatarSrc;

  if (msg.uid === 'bot-01') {
    senderName = '근육고양이봇';
    avatarSrc = '/images/nyanya.jpg';
  } else {
    // 💡 최신 프로필이 있으면 그것을 사용하고, 없으면(탈퇴 등) 메시지 당시의 정보를 사용
    senderName = userProfile?.displayName || msg.sender;
    avatarSrc = userProfile?.photoURL || '/images/icon.png';
  }
  
  const canDelete = isMyMessage || (chatUser?.uid === 'owner' && msg.uid === 'bot-01');

  const repliedToMessage = msg.replyTo ? messages.find(m => m.id === msg.replyTo) : null;
  // 💡 답장 대상의 프로필도 실시간 정보로 업데이트
  const repliedToUserProfile = repliedToMessage ? users.find(u => u.id === repliedToMessage.authUid) : null;
  const repliedToSenderName = repliedToUserProfile?.displayName || repliedToMessage?.sender;


  const handleReactionSelect = async (messageId, reaction) => {
    try {
      await addReaction(messageId, reaction);
    } catch (error) {
      console.error("Error adding reaction:", error);
    }
  };

  const handleReplyClick = (messageId) => {
    const targetElement = document.getElementById(`message-${messageId}`);
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      const isVisible =
        rect.top >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight);

      const triggerAnimation = () => {
        setHighlightedMessageId(messageId);
        setTimeout(() => setHighlightedMessageId(null), 1000);
      };

      if (isVisible) {
        triggerAnimation();
      } else {
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setTimeout(triggerAnimation, 500);
      }
    }
  };

  const ReactionsDisplay = ({ reactions }) => {
    if (!reactions || reactions.length === 0) return null;
  
    const reactionSummary = reactions.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = { users: [], count: 0 };
      }
      // 💡 반응 남긴 사람의 이름도 실시간 정보 반영
      const reactorProfile = users.find(u => u.id === reaction.user);
      acc[reaction.emoji].users.push(reactorProfile?.displayName || 'Unknown');
      acc[reaction.emoji].count++;
      return acc;
    }, {});
  
    return (
      <div className={cn("flex gap-1 mt-1 z-10", isMyMessage ? "justify-end" : "justify-start")}>
        {Object.entries(reactionSummary).map(([emoji, { users: userList, count }]) => {
          const hasMyReaction = reactions.some(r => r.emoji === emoji && r.user === authUser.uid);
          return (
            <button
              key={emoji}
              title={userList.join(', ')}
              className={cn(
                "rounded-full px-2 py-0.5 text-xs flex items-center border transition-colors",
                hasMyReaction ? "bg-blue-100 border-blue-300 hover:bg-blue-200" : "bg-gray-100 border-gray-200 hover:bg-gray-200"
              )}
              onClick={() => handleReactionSelect(msg.id, { emoji, user: authUser.uid })}
            >
              <span>{emoji}</span>
              <span className="ml-1 text-gray-600">{count}</span>
            </button>
          );
        })}
      </div>
    );
  };
  
  const messageContainerId = `message-${msg.id}`;
  const isHighlighted = highlightedMessageId === msg.id;

  const myAvatarSize = "size-8";
  const mySpacerWidth = "w-8";
  const otherAvatarSize = isOwner ? "size-10" : "size-8";
  const otherSpacerWidth = isOwner ? "w-10" : "w-8";

  // 래퍼 컴포넌트: 팝업 OFF 시 클릭 이벤트도 제거
  const MessageWrapper = ({ children, isImage = false }) => {
    if (!isMessageModalActive) {
        return isImage ? (
            <div className="relative w-[150px] h-[150px]">
                {children}
            </div>
        ) : children;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                {isImage ? (
                    <div className="relative w-[150px] h-[150px] cursor-pointer">
                        {children}
                    </div>
                ) : (
                    children
                )}
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onReply(msg)} className="cursor-pointer">
                    <MessageSquareReply className="mr-2 h-4 w-4" />
                    답장하기
                </DropdownMenuItem>
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <Smile className="mr-2 h-4 w-4" />
                        반응 남기기
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                            <ReactionPicker onSelect={handleReactionSelect} messageId={msg.id} authUser={authUser} />
                        </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                </DropdownMenuSub>
                {canDelete && (
                    <DropdownMenuItem onClick={() => onDelete(msg)} className="text-red-500 cursor-pointer">
                        삭제하기
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
  };

  // 2. 이모티콘이거나 URL 이미지인 경우 처리
  if (isEmoticon || isUrlImage) {
    const displayImageUrl = isEmoticon ? msg.imageUrl : msg.text;

    return (
      <div id={messageContainerId} className={cn('flex items-start gap-2 group', isMyMessage ? 'justify-end' : 'justify-start', isHighlighted && 'animate-shake')}>
        {!isMyMessage && showAvatar && (
          <Avatar className={cn("mt-1 flex-shrink-0", otherAvatarSize)}>
            <AvatarImage src={avatarSrc} alt={senderName} />
            <AvatarFallback>{senderName.charAt(0)}</AvatarFallback>
          </Avatar>
        )}
        {(!isMyMessage && !showAvatar) && <div className={cn("flex-shrink-0", otherSpacerWidth)} />}
        
        <div className={cn("flex flex-col gap-1 flex-1", isMyMessage ? "items-end" : "items-start")}>
          {!isMyMessage && showAvatar && <span className={cn("text-xs text-gray-600 ml-1", isOwner && "font-bold")}>{senderName}</span>}
          <div className={cn("flex items-end gap-1", isMyMessage ? "flex-row-reverse" : "flex-row")}>
            <MessageWrapper isImage={true}>
                {/* URL 이미지인 경우 NextImage의 unoptimized 속성 사용 권장 (외부 URL)
                   또는 일반 img 태그 사용 고려 (NextImage 설정 필요 시)
                */}
                {isUrlImage ? (
                    <img 
                        src={displayImageUrl}
                        alt="attached image"
                        className="object-contain w-full h-full rounded-lg bg-gray-100 cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={(e) => {
                            e.stopPropagation();
                            onImageClick(displayImageUrl);
                        }}
                    />
                ) : (
                    <div>
                        <NextImage
                            src={displayImageUrl}
                            alt="emoticon"
                            fill
                            sizes="150px"
                            className="object-contain"
                            unoptimized
                        />
                    </div>
                )}
            </MessageWrapper>
            <span className="text-xs text-gray-600 mb-1">{formattedTime}</span>
          </div>
           <ReactionsDisplay reactions={msg.reactions} />
        </div>

        {isMyMessage && showAvatar && (
          <Avatar className={cn("mt-1 flex-shrink-0", myAvatarSize)}>
            <AvatarImage src={avatarSrc} alt={senderName} />
            <AvatarFallback>{senderName.charAt(0)}</AvatarFallback>
          </Avatar>
        )}
        {(isMyMessage && !showAvatar) && <div className={cn("flex-shrink-0", mySpacerWidth)} />}
      </div>
    );
  }

  return (
    <div id={messageContainerId} className={cn('flex gap-2 group', isMyMessage ? 'justify-end' : 'justify-start', isHighlighted && 'animate-shake')}>
      {!isMyMessage && showAvatar && (
        <Avatar className={cn("mt-1 flex-shrink-0", otherAvatarSize)}>
          <AvatarImage src={avatarSrc} alt={senderName} />
          <AvatarFallback>{senderName.charAt(0)}</AvatarFallback>
        </Avatar>
      )}
      {(!isMyMessage && !showAvatar) && <div className={cn("flex-shrink-0", otherSpacerWidth)} />}

      <div className={cn("flex flex-col gap-1 flex-1", isMyMessage ? "items-end" : "items-start")}>
        {!isMyMessage && showAvatar && <span className={cn("text-xs text-gray-600 ml-1", isOwner && "font-bold")}>{senderName}</span>}
        
        {repliedToMessage && (
          <div onClick={() => handleReplyClick(repliedToMessage.id)} className="text-xs text-gray-500 bg-gray-100/80 px-2 py-1 rounded-md max-w-[90%] sm:max-w-[70%] flex items-center gap-1.5 cursor-pointer">
            <CornerDownRight className="size-3.5 flex-shrink-0" />
            <span className="font-semibold">{repliedToSenderName}</span>
            <div className="text-gray-500 truncate flex-1">
              {repliedToMessage.type === 'emoticon' ? (
                <div className="relative w-5 h-5 inline-block align-middle">
                  <NextImage src={repliedToMessage.imageUrl} alt="replied emoticon" fill sizes="20px" className="object-contain" unoptimized />
                </div>
              ) : (
                <span className="truncate">{repliedToMessage.text || (repliedToMessage.type === 'photo' ? '사진' : '이전 메시지')}</span>
              )}
            </div>
          </div>
        )}

        <div className={cn("flex items-end gap-1 max-w-[90%] sm:max-w-[70%]", isMyMessage ? "flex-row-reverse" : "flex-row")}>
          <MessageWrapper>
              <Card
                className={cn(
                  'w-fit p-3 rounded-xl break-words whitespace-pre-wrap text-base relative',
                  isMessageModalActive ? 'cursor-pointer' : '', 
                  isMyMessage ? 'bg-[#ffe812] text-gray-900 rounded-br-sm' : 'bg-white text-gray-900 rounded-bl-sm'
                )}
              >
                {msg.imageUrl && (
                  <div 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      onImageClick(msg.imageUrl); 
                    }} 
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                  >
                    <NextImage
                      src={msg.imageUrl}
                      alt="채팅 이미지"
                      width={200}
                      height={200}
                      className={cn(
                        "rounded-lg object-cover max-h-[200px] w-auto",
                        { "mb-2": msg.text }
                      )}
                    />
                  </div>
                )}
                <p>{msg.text}</p>
              </Card>
          </MessageWrapper>
          <span className="text-xs text-gray-600 mb-1">{formattedTime}</span>
        </div>
        <ReactionsDisplay reactions={msg.reactions} />
      </div>
      
      {isMyMessage && showAvatar && (
        <Avatar className={cn("mt-1 flex-shrink-0", myAvatarSize)}>
          <AvatarImage src={avatarSrc} alt={senderName} />
          <AvatarFallback>{senderName.charAt(0)}</AvatarFallback>
        </Avatar>
      )}
      {(isMyMessage && !showAvatar) && <div className={cn("flex-shrink-0", mySpacerWidth)} />}
    </div>
  );
};

export default MessageItem;