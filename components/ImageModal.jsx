"use client";

import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ImageModal = ({ imageUrl, onClose }) => {
  if (!imageUrl) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div 
        className="relative max-w-[90vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <img 
          src={imageUrl} 
          alt="확대된 이미지" 
          className="max-w-full max-h-full object-contain"
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