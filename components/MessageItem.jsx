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

const MessageItem = ({ msg, isMyMessage, showAvatar, onDelete, onImageClick }) => {
  const formattedTime = msg.timestamp ? formatKakaoTime(msg.timestamp) : '';
  const avatarSrc = msg.uid === 'owner-01' ? '/images/nyanya.jpg' : '/images/icon.png';
  
  // 💡 이모티콘 메시지인지 확인 (이미지만 있고, 텍스트는 null인 경우)
  const isEmoticon = msg.imageUrl && msg.text === null;

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
                'max-w-[70%] rounded-xl break-words whitespace-pre-wrap text-base relative',
                // 💡 이모티콘일 경우 카드 스타일 제거, 아닐 경우 기존 스타일 유지
                isEmoticon
                  ? 'p-0 bg-transparent shadow-none border-none'
                  : `cursor-pointer ${isMyMessage ? 'bg-[#ffe812] text-gray-900 rounded-br-sm' : 'bg-white text-gray-900 rounded-bl-sm'} p-3`
              )}
            >
              {msg.imageUrl && (
                <div 
                  // 💡 이모티콘이 아닐 때만 이미지 확대 기능 적용
                  onClick={!isEmoticon ? () => onImageClick(msg.imageUrl) : undefined} 
                  className={cn(!isEmoticon && "cursor-pointer")}
                >
                  <NextImage
                    src={msg.imageUrl}
                    alt={isEmoticon ? "emoticon" : "채팅 이미지"}
                    // 💡 이모티콘과 일반 이미지의 기본 크기를 다르게 설정
                    width={isEmoticon ? 150 : 200}
                    height={isEmoticon ? 150 : 200}
                    className={cn(
                      "rounded-lg",
                      // 💡 이모티콘일 경우 긴 축을 150px로 고정하고, 일반 이미지는 기존 스타일 유지
                      isEmoticon
                        ? "object-contain max-w-[150px] max-h-[150px] w-auto h-auto"
                        : "object-cover max-h-[200px] w-auto",
                      // 💡 텍스트가 있을 때만 이미지 하단에 여백 추가
                      { "mb-2": msg.text } 
                    )}
                    // 💡 이모티콘은 이미 최적화된 AVIF이므로 Next.js 이미지 최적화 비활성화
                    unoptimized={isEmoticon}
                  />
                </div>
              )}
              {/* 💡 텍스트가 있는 경우에만 p 태그 렌더링 */}
              {msg.text && <p>{msg.text}</p>}
            </Card>
          </DropdownMenuTrigger>
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
