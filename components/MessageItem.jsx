"use client";

import React from 'react';
import useChatStore from '@/store/chat-store';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import NextImage from 'next/image';
import { cn, formatKakaoTime } from '@/lib/utils';
import { SmilePlus, MessageSquareReply, CornerDownRight } from 'lucide-react';
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
  const { users, messages } = useChatStore();
  const formattedTime = msg.timestamp ? formatKakaoTime(msg.timestamp) : '';
  const isEmoticon = msg.type === 'emoticon';

  const userProfile = users.find(u => u.id === msg.authUid);
  const isOwner = msg.uid === 'owner';

  let senderName, avatarSrc;

  if (msg.uid === 'bot-01') {
    senderName = '근육고양이봇';
    avatarSrc = '/images/nyanya.jpg';
  } else {
    senderName = userProfile?.displayName || msg.sender;
    avatarSrc = userProfile?.photoURL || '/images/icon.png';
  }
  
  const canDelete = isMyMessage || (chatUser?.uid === 'owner' && msg.uid === 'bot-01');

  // 답장하는 메시지 정보 찾기
  const repliedToMessage = msg.replyTo ? messages.find(m => m.id === msg.replyTo) : null;
  const repliedToUserProfile = repliedToMessage ? users.find(u => u.id === repliedToMessage.authUid) : null;
  const repliedToSenderName = repliedToUserProfile?.displayName || repliedToMessage?.sender;


  const handleReactionSelect = async (messageId, reaction) => {
    try {
      await addReaction(messageId, reaction);
    } catch (error) {
      console.error("Error adding reaction:", error);
    }
  };

  /**
   * 답장 클릭 핸들러: 스크롤 후 애니메이션을 트리거합니다.
   */
  const handleReplyClick = (messageId) => {
    const targetElement = document.getElementById(`message-${messageId}`);
    if (targetElement) {
      // 1. 원본 메시지로 스크롤
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // 2. 스크롤이 끝날 시간을 기다린 후 애니메이션 시작
      const scrollTransitionTime = 500; // 0.5초 (스크롤 시간)
      setTimeout(() => {
        setHighlightedMessageId(messageId);
        
        // 3. 애니메이션이 끝난 후 강조 상태 해제
        const animationDuration = 1000; // 1초 (애니메이션 시간)
        setTimeout(() => {
          setHighlightedMessageId(null);
        }, animationDuration);
      }, scrollTransitionTime);
    }
  };

  const ReactionsDisplay = ({ reactions }) => {
    if (!reactions || reactions.length === 0) return null;

    // 반응을 이모지별로 그룹화하고 각 사용자 이름을 툴팁으로 표시
    const reactionSummary = reactions.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = [];
      }
      const reactorProfile = users.find(u => u.id === reaction.user);
      acc[reaction.emoji].push(reactorProfile?.displayName || 'Unknown');
      return acc;
    }, {});
  
    return (
      <div className="flex gap-1 mt-1">
        {Object.entries(reactionSummary).map(([emoji, users]) => (
          <div key={emoji} title={users.join(', ')} className="bg-gray-200 rounded-full px-2 py-0.5 text-xs flex items-center">
            <span>{emoji}</span>
            <span className="ml-1 text-gray-600">{users.length}</span>
          </div>
        ))}
      </div>
    );
  };
  
  const messageContainerId = `message-${msg.id}`;
  const isHighlighted = highlightedMessageId === msg.id;

  if (isEmoticon) {
    return (
      <div id={messageContainerId} className={cn('flex items-start gap-2', isMyMessage ? 'justify-end' : 'justify-start', isHighlighted && 'animate-shake')}>
        {!isMyMessage && showAvatar && (
          <Avatar className={cn("mt-1 flex-shrink-0", isOwner ? "size-10" : "size-8")}>
            <AvatarImage src={avatarSrc} alt={senderName} />
            <AvatarFallback>{senderName.charAt(0)}</AvatarFallback>
          </Avatar>
        )}
        
        <div className={cn("flex flex-col gap-1", isMyMessage ? "items-end" : "items-start")}>
          {!isMyMessage && showAvatar && <span className={cn("text-xs text-gray-600 ml-1", isOwner && "font-bold")}>{senderName}</span>}
          <div className={cn("flex items-end gap-1", isMyMessage ? "flex-row-reverse" : "flex-row")}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="relative w-[150px] h-[150px] cursor-pointer">
                  <NextImage
                    src={msg.imageUrl}
                    alt="emoticon"
                    layout="fill"
                    className="object-contain"
                    unoptimized
                  />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onReply(msg)} className="cursor-pointer">
                  <MessageSquareReply className="mr-2 h-4 w-4" />
                  답장하기
                </DropdownMenuItem>
                {canDelete && (
                  <DropdownMenuItem onClick={() => onDelete(msg)} className="text-red-500 cursor-pointer">
                    삭제하기
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <span className="text-xs text-gray-600 mb-1">{formattedTime}</span>
          </div>
           <ReactionsDisplay reactions={msg.reactions} />
        </div>

        {(!isMyMessage && !showAvatar) && <div className="w-10 flex-shrink-0" />}
      </div>
    );
  }

  return (
    <div id={messageContainerId} className={cn('flex gap-2', isMyMessage ? 'justify-end' : 'justify-start', isHighlighted && 'animate-shake')}>
      {!isMyMessage && showAvatar && (
        <Avatar className={cn("mt-1 flex-shrink-0", isOwner ? "size-10" : "size-8")}>
          <AvatarImage src={avatarSrc} alt={senderName} />
          <AvatarFallback>{senderName.charAt(0)}</AvatarFallback>
        </Avatar>
      )}

      <div className={cn("flex flex-col gap-1", isMyMessage ? "items-end" : "items-start")}>
        {!isMyMessage && showAvatar && <span className={cn("text-xs text-gray-600 ml-1", isOwner && "font-bold")}>{senderName}</span>}
        
        {repliedToMessage && (
          <div onClick={() => handleReplyClick(repliedToMessage.id)} className="text-xs text-gray-500 bg-gray-100/80 px-2 py-1 rounded-md max-w-full flex items-center gap-1.5 cursor-pointer">
            <CornerDownRight className="size-3.5 flex-shrink-0" />
            <span className="font-semibold">{repliedToSenderName}</span>
            <div className="text-gray-500 truncate flex-1">
              {repliedToMessage.type === 'emoticon' ? (
                <div className="relative w-5 h-5 inline-block align-middle">
                  <NextImage
                    src={repliedToMessage.imageUrl}
                    alt="replied emoticon"
                    layout="fill"
                    className="object-contain"
                    unoptimized
                  />
                </div>
              ) : (
                <span className="truncate">{repliedToMessage.text || (repliedToMessage.type === 'photo' ? '사진' : '이전 메시지')}</span>
              )}
            </div>
          </div>
        )}

        <div className={cn("flex items-end gap-1", isMyMessage ? "flex-row-reverse" : "flex-row")}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Card
                className={cn(
                  'max-w-[70%] p-3 rounded-xl break-words whitespace-pre-wrap text-base relative cursor-pointer',
                  isMyMessage ? 'bg-[#ffe812] text-gray-900 rounded-br-sm' : 'bg-white text-gray-900 rounded-bl-sm'
                )}
              >
                {msg.imageUrl && (
                  <div onClick={() => onImageClick(msg.imageUrl)} className="cursor-pointer">
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
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => onReply(msg)} className="cursor-pointer">
                <MessageSquareReply className="mr-2 h-4 w-4" />
                답장하기
              </DropdownMenuItem>
              <DropdownMenuItem>
                 <ReactionPicker onSelect={handleReactionSelect} messageId={msg.id} authUser={chatUser}/>
              </DropdownMenuItem>
              {canDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(msg)}
                  className="text-red-500 cursor-pointer"
                >
                  삭제하기
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <span className="text-xs text-gray-600 mb-1">{formattedTime}</span>
        </div>
        <ReactionsDisplay reactions={msg.reactions} />
      </div>
      
      {(!isMyMessage && !showAvatar) && <div className="w-10 flex-shrink-0" />}
    </div>
  );
};

export default MessageItem;