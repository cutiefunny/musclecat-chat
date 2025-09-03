// components/GifPlayer.jsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

const GifPlayer = ({ src, alt }) => {
    const [isFrozen, setIsFrozen] = useState(false);
    const [key, setKey] = useState(Date.now());
    
    const imageRef = useRef(null);
    const canvasRef = useRef(null);
    const containerRef = useRef(null); // 컨테이너 div의 ref 추가

    useEffect(() => {
        const timer = setTimeout(() => {
            const image = imageRef.current;
            const canvas = canvasRef.current;
            const container = containerRef.current;
            
            if (image && canvas && container && !isFrozen) {
                if (image.complete && image.naturalHeight !== 0) {
                    const { clientWidth, clientHeight, offsetTop, offsetLeft } = image;
                    
                    // ⏹️ 캔버스의 드로잉 크기를 이미지의 실제 렌더링 크기로 설정
                    canvas.width = clientWidth;
                    canvas.height = clientHeight;

                    // ⏹️ 캔버스의 CSS 크기와 위치를 이미지와 정확히 일치시킴
                    canvas.style.width = `${clientWidth}px`;
                    canvas.style.height = `${clientHeight}px`;
                    canvas.style.top = `${offsetTop}px`;
                    canvas.style.left = `${offsetLeft}px`;
                    
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(image, 0, 0, clientWidth, clientHeight);
                    }
                    setIsFrozen(true);
                }
            }
        }, 3000); 

        return () => clearTimeout(timer);
    }, [key, isFrozen]);

    const handleReplay = () => {
        if (isFrozen) {
            setIsFrozen(false);
            setKey(Date.now());
        }
    };

    return (
        <div 
            ref={containerRef} // ⏹️ 컨테이너에 ref 연결
            className="relative w-[150px] h-[150px] cursor-pointer flex items-center justify-center"
            onClick={handleReplay}
            aria-label={alt}
            role="button"
        >
            <img
                key={key}
                ref={imageRef}
                src={src}
                alt={alt}
                className={cn(
                    "object-contain max-w-full max-h-full", // ⏹️ object-contain으로 비율 유지
                    isFrozen ? 'opacity-0' : 'opacity-100'
                )}
                crossOrigin="anonymous" 
            />
            <canvas
                ref={canvasRef}
                className={cn(
                    "absolute", // ⏹️ w-full, h-full 제거
                    isFrozen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                )}
            />
        </div>
    );
};

export default GifPlayer;