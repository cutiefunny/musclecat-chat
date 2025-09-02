"use client";

import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, RotateCcw } from 'lucide-react'; // 아이콘 추가

const CameraCapture = ({ onCapture, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' for front, 'environment' for back

  useEffect(() => {
    const startCamera = async () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facingMode }, // 전면 카메라 ('user') 사용
        });
        videoRef.current.srcObject = newStream;
        setStream(newStream);
      } catch (error) {
        console.error("카메라 접근 오류:", error);
        alert("카메라에 접근할 수 없습니다. 권한을 확인해주세요.");
        onClose();
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [facingMode, onClose]); // facingMode 변경 시 카메라 재시작

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (video && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      // 전면 카메라는 좌우 반전되므로, 좌우 반전 효과를 적용하여 실제 보이는대로 저장
      context.translate(canvas.width, 0);
      context.scale(-1, 1);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        onCapture(blob); // 캡쳐된 이미지를 Blob 형태로 전달
        onClose(); // 캡쳐 후 카메라 닫기
      }, 'image/jpeg', 0.9);
    }
  };

  const toggleFacingMode = () => {
    setFacingMode(prevMode => (prevMode === 'user' ? 'environment' : 'user'));
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
      <video ref={videoRef} autoPlay playsInline className="w-full max-h-screen object-contain"></video>
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas> {/* 캡쳐용 캔버스, 숨김 */}
      <div className="absolute bottom-4 flex gap-4">
        <Button onClick={handleCapture} className="size-16 rounded-full bg-white hover:bg-gray-200 text-gray-800 flex items-center justify-center">
          <Camera className="size-8" />
        </Button>
        <Button onClick={toggleFacingMode} className="size-16 rounded-full bg-gray-700 hover:bg-gray-600 text-white flex items-center justify-center">
          <RotateCcw className="size-6" /> {/* 카메라 전환 아이콘 */}
        </Button>
        <Button onClick={onClose} variant="destructive" className="absolute top-4 right-4 bg-red-500 hover:bg-red-600">닫기</Button>
      </div>
    </div>
  );
};

export default CameraCapture;