"use client";

import React from 'react';
import NextImage from 'next/image';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ImageModal = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose} // 배경 클릭 시 닫기
    >
      <div className="relative max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={imageUrl} 
          alt="확대된 이미지" 
          className="max-w-full max-h-[90vh] object-contain"
        />
      </div>
      <Button 
        onClick={onClose} 
        variant="ghost" 
        className="absolute top-4 right-4 size-12 rounded-full bg-black/50 hover:bg-black/70 text-white"
        aria-label="닫기"
      >
        <X className="size-8" />
      </Button>
    </div>
  );
};

export default ImageModal;