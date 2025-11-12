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
import { SmilePlus, MessageSquareReply, CornerDownRight, Smile } from 'lucide-react';
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
  const { authUser, users, messages } = useChatStore();
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

  if (isEmoticon) {
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
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="relative w-[150px] h-[150px] cursor-pointer">
                  <NextImage
                    src={msg.imageUrl}
                    alt="emoticon"
                    fill
                    sizes="150px"
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
          // 💡 [수정] max-w-[70%] -> max-w-[90%] sm:max-w-[70%]
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

        {/* 💡 [수정] max-w-[70%] -> max-w-[90%] sm:max-w-[70%] */}
        <div className={cn("flex items-end gap-1 max-w-[90%] sm:max-w-[70%]", isMyMessage ? "flex-row-reverse" : "flex-row")}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Card
                className={cn(
                  // 💡 [수정] w-[70%] -> w-fit
                  'w-fit p-3 rounded-xl break-words whitespace-pre-wrap text-base relative cursor-pointer',
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