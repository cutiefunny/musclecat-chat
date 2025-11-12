// components/EmoticonManager.jsx
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { subscribeToEmoticons, addEmoticon, deleteEmoticon, updateEmoticonOrder } from '@/lib/firebase/firebaseService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { PlusCircle, Trash2, Loader2, GripVertical } from 'lucide-react';
import Image from 'next/image';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const EmoticonManager = () => {
    const [emoticons, setEmoticons] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [newCategory, setNewCategory] = useState('');
    
    // 💡 [수정] 현재 선택된 카테고리를 저장할 state 추가
    const [selectedCategory, setSelectedCategory] = useState(null); 
    
    // 💡 [수정] 파일 입력 ref는 하나만 유지
    const fileInputRef = useRef(null); 
    
    const dragItem = useRef(null);
    const dragOverItem = useRef(null);

    useEffect(() => {
        const unsubscribe = subscribeToEmoticons((emoticonsData) => {
            const grouped = emoticonsData.reduce((acc, emo) => {
                acc[emo.category] = acc[emo.category] || [];
                acc[emo.category].push(emo);
                return acc;
            }, {});
            setEmoticons(grouped);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // 💡 [수정] handleFileUpload가 category 인자 대신 selectedCategory state를 사용하도록 변경
    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        // 💡 [수정] 선택된 카테고리가 없으면 중단
        if (!file || !selectedCategory) return;

        setIsUploading(true);
        try {
            // 💡 [수정] state에서 카테고리 이름을 가져옴
            const order = emoticons[selectedCategory]?.length || 0;
            await addEmoticon(file, selectedCategory, order);
        } catch (error) {
            console.error("Error uploading emoticon:", error);
            alert("이모티콘 업로드에 실패했습니다.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
            setSelectedCategory(null); // 💡 [수정] 완료 후 state 초기화
        }
    };

    const handleDelete = async (emoticon) => {
        if (!confirm("정말로 이모티콘을 삭제하시겠습니까?")) return;
        try {
            await deleteEmoticon(emoticon);
        } catch (error) {
            console.error("Error deleting emoticon:", error);
            alert("이모티콘 삭제에 실패했습니다.");
        }
    };
    
    const handleSortUpdate = async (category) => {
        const categoryEmoticons = [...emoticons[category]];
        const draggedItemContent = categoryEmoticons.splice(dragItem.current, 1)[0];
        categoryEmoticons.splice(dragOverItem.current, 0, draggedItemContent);
        
        dragItem.current = null;
        dragOverItem.current = null;

        const newEmoticonsState = { ...emoticons, [category]: categoryEmoticons };
        setEmoticons(newEmoticonsState); // Optimistic UI update
        
        try {
            await updateEmoticonOrder(categoryEmoticons);
        } catch (err) {
            console.error("순서 업데이트 실패:", err);
            // Revert UI if update fails
            // For simplicity, we can just refetch or notify user
        }
    };

    const handleAddCategory = (e) => {
        e.preventDefault();
        if (newCategory.trim() && !emoticons[newCategory.trim()]) {
            setEmoticons(prev => ({ ...prev, [newCategory.trim()]: [] }));
            setNewCategory('');
        }
    };

    if (isLoading) {
        return <div className="flex justify-center items-center p-8"><Loader2 className="animate-spin h-8 w-8" /></div>;
    }

    return (
        <Card className="w-full max-w-4xl mx-auto border-0 shadow-none">
            <CardHeader className="pt-0">
                {/* Title is now in the parent component */}
            </CardHeader>
            <CardContent>
                {/* 💡 [수정] 단일 파일 입력 엘리먼트를 컴포넌트 최상단 (map 바깥)으로 이동 */}
                <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileUpload} // 💡 [수정] category 인자 제거
                    className="hidden"
                />

                <form onSubmit={handleAddCategory} className="flex items-center gap-2 mb-6">
                    <Label htmlFor="new-category-input" className="sr-only">새 카테고리</Label>
                    <Input
                        id="new-category-input"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="새 카테고리 이름"
                    />
                    <Button type="submit">카테고리 추가</Button>
                </form>

                <div className="space-y-6">
                    {Object.keys(emoticons).length === 0 ? (
                         <div className="text-center py-12 border-2 border-dashed rounded-lg">
                            <p>등록된 이모티콘이 없습니다.</p>
                        </div>
                    ) : (
                        Object.entries(emoticons).map(([category, items]) => (
                            <div key={category}>
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-semibold">{category}</h3>
                                    {/* 💡 [수정] 루프 내의 input 태그 제거 */}
                                    {/* 💡 [수정] 버튼 클릭 시 state를 설정하고 ref를 클릭하도록 변경 */}
                                    <Button 
                                        onClick={() => {
                                            setSelectedCategory(category);
                                            fileInputRef.current.click();
                                        }} 
                                        disabled={isUploading} 
                                        size="sm"
                                    >
                                        {isUploading && selectedCategory === category ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                                        추가
                                    </Button>
                                </div>
                                {items.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">이 카테고리에 이모티콘이 없습니다.</p>
                                ) : (
                                    <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-4">
                                        {items.map((emo, index) => (
                                            <div
                                                key={emo.id}
                                                draggable
                                                onDragStart={() => dragItem.current = index}
                                                onDragEnter={() => dragOverItem.current = index}
                                                onDragEnd={() => handleSortUpdate(category)}
                                                onDragOver={(e) => e.preventDefault()}
                                                className="relative group p-2 border rounded-lg flex flex-col items-center justify-center aspect-square cursor-grab active:cursor-grabbing"
                                            >
                                                <Image
                                                    src={emo.url}
                                                    alt={`emoticon-${index}`}
                                                    width={100}
                                                    height={100}
                                                    className="object-contain w-full h-full"
                                                    unoptimized
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
                            </div>
                        ))
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default EmoticonManager;