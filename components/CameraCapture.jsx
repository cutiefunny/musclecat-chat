"use client";

import React, { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, RotateCcw, X, Send, RefreshCw } from 'lucide-react';

const CameraCapture = ({ onCapture, onClose }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [devices, setDevices] = useState([]);
  const [currentDeviceIndex, setCurrentDeviceIndex] = useState(0);
  const [capturedImage, setCapturedImage] = useState(null);

  useEffect(() => {
    if (capturedImage) {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      return;
    }

    let currentStream;

    const setupCamera = async () => {
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
        if (videoDevices.length === 0) throw new Error('사용 가능한 카메라가 없습니다.');

        videoDevices.sort((a, b) => {
            if (a.label.toLowerCase().includes('front')) return -1;
            if (b.label.toLowerCase().includes('front')) return 1;
            return 0;
        });
        
        setDevices(videoDevices);

        const currentDevice = videoDevices[currentDeviceIndex % videoDevices.length];
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: currentDevice.deviceId } },
        });
        
        currentStream = newStream;

        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
        }
        setStream(newStream);
      } catch (error) {
        console.error("카메라 설정 오류:", error);
        alert("카메라를 시작할 수 없습니다. 권한을 확인해주세요.");
        onClose();
      }
    };

    setupCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [currentDeviceIndex, capturedImage, onClose]);

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const currentDevice = devices[currentDeviceIndex];
    const isFrontCamera = currentDevice?.label.toLowerCase().includes('front') || currentDevice?.label.toLowerCase().includes('user');

    if (video && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');

      if (isFrontCamera) {
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        setCapturedImage({
          blob: blob,
          url: URL.createObjectURL(blob)
        });
      }, 'image/jpeg', 0.9);
    }
  };
  
  const handleRetake = () => {
    URL.revokeObjectURL(capturedImage.url);
    setCapturedImage(null);
  };
  
  const handleSend = () => {
    onCapture(capturedImage.blob);
    onClose();
  };

  const toggleCamera = () => {
    setCurrentDeviceIndex((prevIndex) => (prevIndex + 1) % devices.length);
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
      {capturedImage ? (
        <img src={capturedImage.url} alt="캡처된 이미지 미리보기" className="w-full max-h-screen object-contain" />
      ) : (
        <>
          <video ref={videoRef} autoPlay playsInline className="w-full max-h-screen object-contain" />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </>
      )}
      
      {/* 💡 버튼 레이아웃 수정 */}
      <div className="absolute bottom-8 w-full px-8 flex justify-between items-center">
        {capturedImage ? (
          // 미리보기 화면 버튼
          <>
            <Button onClick={handleRetake} variant="ghost" className="size-20 rounded-full flex-col gap-1 text-white">
              <RefreshCw className="size-6" />
              다시 찍기
            </Button>
            <Button onClick={handleSend} className="size-20 rounded-full bg-yellow-400 hover:bg-yellow-500 text-black flex items-center justify-center p-0">
              <Send className="size-8" />
            </Button>
            {/* 오른쪽 공간을 채우기 위한 보이지 않는 div */}
            <div className="size-20" /> 
          </>
        ) : (
          // 카메라 촬영 화면 버튼
          <>
            {/* 왼쪽 공간을 채우기 위한 보이지 않는 div */}
            <div className="size-14" /> 
            <Button onClick={handleCapture} className="size-20 rounded-full bg-white hover:bg-gray-200 text-gray-800 flex items-center justify-center p-0 border-4 border-gray-400" aria-label="사진 촬영">
              <div className="size-[60px] bg-white rounded-full" />
            </Button>
            {devices.length > 1 ? (
              <Button onClick={toggleCamera} className="size-14 rounded-full bg-gray-700/60 hover:bg-gray-600/60 text-white flex items-center justify-center" aria-label="카메라 전환">
                <RotateCcw className="size-6" />
              </Button>
            ) : (
              // 카메라가 하나일 때 공간을 채우기 위한 보이지 않는 div
              <div className="size-14" />
            )}
          </>
        )}
      </div>
      
      <Button onClick={onClose} variant="ghost" className="absolute top-4 left-4 size-12 rounded-full bg-black/50 hover:bg-black/70 text-white" aria-label="닫기">
        <X className="size-8" />
      </Button>
    </div>
  );
};

export default CameraCapture;