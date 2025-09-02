"use client";

import React from 'react';
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

const MessageItem = ({ msg, isMyMessage, showAvatar, onDelete, onImageClick, chatUser }) => {
  const formattedTime = msg.timestamp ? formatKakaoTime(msg.timestamp) : '';
  const isOwnerOrBot = msg.uid === 'owner-01' || msg.uid === 'bot-01';
  const avatarSrc = isOwnerOrBot ? '/images/nyanya.jpg' : '/images/icon.png';
  const isEmoticon = msg.type === 'emoticon';

  const canDelete = isMyMessage || (chatUser?.uid === 'owner-01' && msg.uid === 'bot-01');

  if (isEmoticon) {
    return (
      <div className={cn('flex items-start gap-2', isMyMessage ? 'justify-end' : 'justify-start')}>
        {!isMyMessage && showAvatar && (
          <Avatar className="size-8 mt-1 flex-shrink-0">
            <AvatarImage src={avatarSrc} alt={msg.sender} />
            <AvatarFallback>{msg.sender.charAt(0)}</AvatarFallback>
          </Avatar>
        )}
        
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

        {(!isMyMessage && !showAvatar) && <div className="w-8 flex-shrink-0" />}
      </div>
    );
  }

  return (
    <div className={cn('flex gap-2', isMyMessage ? 'justify-end' : 'justify-start')}>
      {!isMyMessage && showAvatar && (
        <Avatar className="size-8 mt-1">
          <AvatarImage src={avatarSrc} alt={msg.sender} />
          <AvatarFallback>{msg.sender.charAt(0)}</AvatarFallback>
        </Avatar>
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

      {(!isMyMessage && !showAvatar) && <div className="w-8" />}
    </div>
  );
};

export default MessageItem;

