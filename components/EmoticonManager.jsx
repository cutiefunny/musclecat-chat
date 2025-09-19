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

    const handleFileUpload = async (event, category) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const order = emoticons[category]?.length || 0;
            await addEmoticon(file, category, order);
        } catch (error) {
            console.error("Error uploading emoticon:", error);
            alert("이모티콘 업로드에 실패했습니다.");
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
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
                                    <input
                                        type="file"
                                        accept="image/*"
                                        ref={fileInputRef}
                                        onChange={(e) => handleFileUpload(e, category)}
                                        className="hidden"
                                    />
                                    <Button onClick={() => fileInputRef.current.click()} disabled={isUploading} size="sm">
                                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
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