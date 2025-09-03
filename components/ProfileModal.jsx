"use client";

import React, { useState, useRef, useEffect } from 'react';
import useChatStore from '@/store/chat-store';
import { db, storage, doc, updateDoc, ref, uploadBytes, getDownloadURL } from '@/lib/firebase/clientApp';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { X, Loader2, Edit2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';

const ProfileModal = ({ onClose }) => {
  const { authUser, users } = useChatStore();
  const currentUserProfile = users.find(u => u.id === authUser?.uid) || authUser;

  const [displayName, setDisplayName] = useState(currentUserProfile?.displayName || '');
  const [newImage, setNewImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(currentUserProfile?.photoURL || null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // newImage가 변경될 때마다 previewUrl 업데이트
    if (newImage) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result);
      };
      reader.readAsDataURL(newImage);
    } else {
      setPreviewUrl(currentUserProfile?.photoURL || null);
    }
  }, [newImage, currentUserProfile]);


  const handleImageChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setNewImage(e.target.files[0]);
    }
  };

  const handleSave = async () => {
    if (!authUser) return;
    setIsSaving(true);
    
    let photoURL = currentUserProfile?.photoURL;

    try {
      // 1. 새 이미지가 있으면 업로드
      if (newImage) {
        const options = {
            maxSizeMB: 0.2, // 200KB
            maxWidthOrHeight: 256,
            useWebWorker: true,
            fileType: 'image/webp'
        };
        const compressedFile = await imageCompression(newImage, options);
        const imageRef = ref(storage, `profile_pictures/${authUser.uid}`);
        const snapshot = await uploadBytes(imageRef, compressedFile);
        photoURL = await getDownloadURL(snapshot.ref);
      }
      
      // 2. Firestore 문서 업데이트
      const userDocRef = doc(db, 'users', authUser.uid);
      await updateDoc(userDocRef, {
        displayName: displayName,
        photoURL: photoURL
      });

      alert("프로필이 성공적으로 업데이트되었습니다.");
      onClose();

    } catch (error) {
      console.error("프로필 업데이트 오류:", error);
      alert("프로필 업데이트 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  };


  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 relative">
          <h2 className="text-xl font-bold mb-6 text-center">프로필 수정</h2>
          <Button variant="ghost" size="icon" className="absolute top-3 right-3" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>

          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <Avatar className="w-24 h-24 text-4xl">
                <AvatarImage src={previewUrl} alt={displayName} />
                <AvatarFallback>{displayName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                className="hidden" 
                onChange={handleImageChange}
              />
              <Button 
                size="icon" 
                className="absolute bottom-0 right-0 rounded-full w-8 h-8"
                onClick={() => fileInputRef.current.click()}
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="w-full">
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">닉네임</label>
              <Input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="새 닉네임을 입력하세요"
                className="w-full"
              />
            </div>
          </div>
          
          <div className="mt-8 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>취소</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              저장
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;