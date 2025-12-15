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

  // 스트림 초기화 및 카메라 시작
  useEffect(() => {
    // 캡처된 이미지가 있으면 카메라 중지
    if (capturedImage) {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      return;
    }

    let currentStream = null;

    const startCamera = async () => {
      try {
        // 1. 초기 제약 조건 설정
        // 장치 목록을 먼저 가져오지 않고, 일단 'user'(전면) 모드로 스트림을 요청합니다.
        // 이렇게 해야 브라우저가 사용자에게 권한을 요청하고, 그 후 enumerateDevices에서 정확한 라벨을 가져올 수 있습니다.
        let constraints = {
          video: { facingMode: 'user' } // 기본적으로 전면 카메라 우선
        };

        // 만약 이미 디바이스 리스트가 있고, 특정 디바이스를 선택한 상태(카메라 전환 등)라면 해당 ID를 사용
        if (devices.length > 0) {
           const deviceId = devices[currentDeviceIndex % devices.length].deviceId;
           constraints = {
             video: { deviceId: { exact: deviceId } }
           };
        }

        // 2. 스트림 가져오기 (이 시점에서 권한 팝업 발생)
        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (videoRef.current) {
          videoRef.current.srcObject = currentStream;
        }
        setStream(currentStream);

        // 3. 권한 획득 후 장치 목록 갱신 (최초 1회 혹은 장치 변경 시)
        // 안드로이드에서는 권한을 얻은 후에야 라벨이 보입니다.
        if (devices.length === 0) {
            const allDevices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
            
            // 전면 카메라가 먼저 오도록 정렬 (편의성)
            videoDevices.sort((a, b) => {
                const labelA = a.label.toLowerCase();
                const labelB = b.label.toLowerCase();
                if (labelA.includes('front') || labelA.includes('user')) return -1;
                if (labelB.includes('front') || labelB.includes('user')) return 1;
                return 0;
            });
            
            setDevices(videoDevices);
        }

      } catch (error) {
        console.error("카메라 시작 오류:", error);
        
        // 특정 제약 조건(exact deviceId 등) 실패 시, 기본 설정으로 재시도 (Fallack)
        if (devices.length > 0) {
            try {
                console.log("제약 조건 실패로 기본 카메라로 재시도합니다.");
                currentStream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = currentStream;
                }
                setStream(currentStream);
            } catch (retryError) {
                 alert("카메라를 실행할 수 없습니다. 브라우저 설정에서 카메라 권한을 확인해주세요.");
                 onClose();
            }
        } else {
            alert("카메라를 사용할 수 없는 환경입니다.");
            onClose();
        }
      }
    };

    startCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDeviceIndex, capturedImage]); // onClose는 의존성에서 제거하여 불필요한 재실행 방지

  const handleCapture = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    if (video && canvas) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');

      // 현재 사용 중인 카메라가 전면(user)인지 확인
      // devices 배열이 비어있을 수도 있으므로 stream 설정을 통해 추측하거나 facingMode 확인
      let isFrontCamera = true;
      
      const currentTrack = stream?.getVideoTracks()[0];
      const settings = currentTrack?.getSettings();
      
      // settings.facingMode가 지원되지 않는 브라우저도 있으므로 라벨로도 체크
      if (devices.length > 0) {
          const currentDevice = devices[currentDeviceIndex % devices.length];
          const label = currentDevice.label.toLowerCase();
          isFrontCamera = label.includes('front') || label.includes('user') || (settings?.facingMode === 'user');
      }

      // 전면 카메라일 경우 좌우 반전 처리
      if (isFrontCamera) {
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        if (blob) {
            setCapturedImage({
              blob: blob,
              url: URL.createObjectURL(blob)
            });
        }
      }, 'image/jpeg', 0.9);
    }
  };
  
  const handleRetake = () => {
    if (capturedImage?.url) {
        URL.revokeObjectURL(capturedImage.url);
    }
    setCapturedImage(null);
  };
  
  const handleSend = () => {
    if (capturedImage?.blob) {
        onCapture(capturedImage.blob);
        onClose();
    }
  };

  const toggleCamera = () => {
    setStream(null); // 기존 스트림 정리 트리거
    setCurrentDeviceIndex((prevIndex) => (prevIndex + 1) % devices.length);
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
      {capturedImage ? (
        <img src={capturedImage.url} alt="캡처된 이미지 미리보기" className="w-full max-h-screen object-contain" />
      ) : (
        <>
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            muted // 모바일 자동 재생을 위해 음소거 필수
            className="w-full max-h-screen object-contain transform scale-x-[-1]" // CSS로 미리보기 좌우 반전 (전면 카메라 느낌)
            style={devices.length > 0 && !(devices[currentDeviceIndex % devices.length]?.label.toLowerCase().includes('front')) ? { transform: 'none' } : { transform: 'scaleX(-1)' }}
          />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </>
      )}
      
      {/* 💡 버튼 레이아웃 */}
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