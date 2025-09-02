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

const MessageItem = ({ msg, isMyMessage, showAvatar, onDelete }) => {
  const formattedTime = msg.timestamp ? formatKakaoTime(msg.timestamp) : '';

  return (
    <div className={cn('flex gap-2', isMyMessage ? 'justify-end' : 'justify-start')}>
      {!isMyMessage && showAvatar && (
        <Avatar className="size-8 mt-1">
          <AvatarImage src={`/images/icon.png`} alt={msg.sender} />
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
                <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer">
                  <NextImage
                    src={msg.imageUrl}
                    alt="채팅 이미지"
                    width={200}
                    height={200}
                    className="rounded-lg mb-2 object-cover max-h-[200px] w-auto"
                  />
                </a>
              )}
              <p>{msg.text}</p>
            </Card>
          </DropdownMenuTrigger>
          {/* 내가 보낸 메시지만 삭제 가능하도록 설정 */}
          {isMyMessage && (
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