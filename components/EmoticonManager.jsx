"use client";

import React, { useState, useEffect, useRef } from 'react';
import { db, storage, collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, ref, uploadBytes, getDownloadURL, deleteObject, writeBatch, serverTimestamp } from '@/lib/firebase/clientApp';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, Trash2, Loader2, GripVertical } from 'lucide-react';
import Image from 'next/image';
import imageCompression from 'browser-image-compression';

const EmoticonManager = () => {
    const [emoticons, setEmoticons] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);
    const dragItem = useRef(null);
    const dragOverItem = useRef(null);

    // Firestore에서 이모티콘 데이터 실시간 수신
    useEffect(() => {
        const q = query(collection(db, "emoticons"), orderBy("order", "asc"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const emoticonsData = [];
            querySnapshot.forEach((doc) => {
                emoticonsData.push({ id: doc.id, ...doc.data() });
            });
            setEmoticons(emoticonsData);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // 이미지 파일 업로드 핸들러
    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const options = {
                maxSizeKB: 100,
                maxWidthOrHeight: 200, // 최대 길이 200px
                useWebWorker: true,
                fileType: 'image/avif', // AVIF 형식으로 압축
            };
            const compressedFile = await imageCompression(file, options);
            const storageRef = ref(storage, `emoticons/${Date.now()}_${compressedFile.name}`);
            const snapshot = await uploadBytes(storageRef, compressedFile);
            const downloadURL = await getDownloadURL(snapshot.ref);

            await addDoc(collection(db, "emoticons"), {
                url: downloadURL,
                order: emoticons.length, // 현재 이모티콘 개수를 순서로 지정
                createdAt: serverTimestamp(),
            });
        } catch (error) {
            console.error("Error uploading emoticon:", error);
            alert("이모티콘 업로드에 실패했습니다.");
        } finally {
            setIsUploading(false);
            // 파일 입력 값 초기화
            if(fileInputRef.current) fileInputRef.current.value = "";
        }
    };
    
    // 이모티콘 삭제 핸들러
    const handleDelete = async (emoticon) => {
        if (!confirm("정말로 이모티콘을 삭제하시겠습니까?")) return;
        try {
            // Firestore 문서 삭제
            await deleteDoc(doc(db, "emoticons", emoticon.id));
            // Storage 파일 삭제
            const imageRef = ref(storage, emoticon.url);
            await deleteObject(imageRef);
        } catch (error) {
            console.error("Error deleting emoticon:", error);
            alert("이모티콘 삭제에 실패했습니다.");
        }
    };
    
    // 드래그 순서 변경 후 Firestore에 순서 업데이트
    const handleSortUpdate = async () => {
        const batch = writeBatch(db);
        emoticons.forEach((emoticon, index) => {
            const docRef = doc(db, "emoticons", emoticon.id);
            batch.update(docRef, { order: index });
        });
        await batch.commit();
    };

    // 드래그 앤 드롭 이벤트 핸들러
    const handleDragEnd = () => {
        const newEmoticons = [...emoticons];
        const draggedItemContent = newEmoticons.splice(dragItem.current, 1)[0];
        newEmoticons.splice(dragOverItem.current, 0, draggedItemContent);
        
        dragItem.current = null;
        dragOverItem.current = null;

        setEmoticons(newEmoticons);
        // 상태 업데이트 후 바로 Firestore 업데이트
        const batch = writeBatch(db);
        newEmoticons.forEach((emoticon, index) => {
            const docRef = doc(db, "emoticons", emoticon.id);
            batch.update(docRef, { order: index });
        });
        batch.commit().catch(err => console.error("순서 업데이트 실패:", err));
    };


    if (isLoading) {
        return <div className="flex justify-center items-center"><Loader2 className="animate-spin h-8 w-8" /></div>;
    }

    return (
        <Card className="w-full max-w-4xl mx-auto mt-8">
            <CardHeader>
                <CardTitle className="flex justify-between items-center">
                    <span>이모티콘 관리</span>
                    <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                    />
                    <Button onClick={() => fileInputRef.current.click()} disabled={isUploading}>
                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                        이모티콘 추가
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                    이미지를 드래그하여 순서를 변경할 수 있습니다. 이미지는 최대 200px 길이의 AVIF 형식으로 자동 변환됩니다.
                </p>
                {emoticons.length === 0 ? (
                    <div className="text-center py-12 border-2 border-dashed rounded-lg">
                        <p>등록된 이모티콘이 없습니다.</p>
                        <p className="text-sm text-muted-foreground">오른쪽 위 버튼을 눌러 추가해주세요.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4">
                        {emoticons.map((emo, index) => (
                            <div
                                key={emo.id}
                                draggable
                                onDragStart={() => dragItem.current = index}
                                onDragEnter={() => dragOverItem.current = index}
                                onDragEnd={handleSortUpdate}
                                onDragOver={(e) => e.preventDefault()}
                                className="relative group p-2 border rounded-lg flex flex-col items-center justify-center aspect-square cursor-grab active:cursor-grabbing"
                            >
                                <Image
                                    src={emo.url}
                                    alt={`emoticon-${index}`}
                                    width={100}
                                    height={100}
                                    className="object-contain w-full h-full"
                                    unoptimized // AVIF, GIF 등 최적화 없이 원본 사용
                                />
                                <Button
                                    variant="destructive"
                                    size="icon"
                                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleDelete(emo)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                                <GripVertical className="absolute bottom-1 right-1 h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default EmoticonManager;
