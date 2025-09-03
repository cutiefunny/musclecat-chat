// components/MessageItem.jsx
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
import GifPlayer from './GifPlayer'; // ⏹️ GifPlayer 컴포넌트를 import 합니다.

const MessageItem = ({ msg, isMyMessage, showAvatar, onDelete, onImageClick, chatUser }) => {
  const { users } = useChatStore();
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

  if (isEmoticon) {
    return (
      <div className={cn('flex items-start gap-2', isMyMessage ? 'justify-end' : 'justify-start')}>
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
                {/* ⏹️ 기존 NextImage 대신 GifPlayer 컴포넌트를 사용합니다. */}
                <div className="w-[150px] h-[150px]">
                    <GifPlayer src={msg.imageUrl} alt="emoticon" />
                </div>
              </DropdownMenuTrigger>
              {canDelete && (
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => onDelete(msg)} className="text-red-500 cursor-pointer">
                    삭제하기
                  </DropdownMenuItem>
                </DropdownMenuContent>
              )}
            </DropdownMenu>
            <span className="text-xs text-gray-600 mb-1">{formattedTime}</span>
          </div>
        </div>

        {(!isMyMessage && !showAvatar) && <div className="w-10 flex-shrink-0" />}
      </div>
    );
  }

  return (
    <div className={cn('flex gap-2', isMyMessage ? 'justify-end' : 'justify-start')}>
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
            {canDelete && (
              <DropdownMenuContent>
                <DropdownMenuItem
                  onClick={() => onDelete(msg)}
                  className="text-red-500 cursor-pointer"
                >
                  삭제하기
                </DropdownMenuItem>
              </DropdownMenuContent>
            )}
          </DropdownMenu>
          <span className="text-xs text-gray-600 mb-1">{formattedTime}</span>
        </div>
      </div>
      
      {(!isMyMessage && !showAvatar) && <div className="w-10 flex-shrink-0" />}
    </div>
  );
};

export default MessageItem;