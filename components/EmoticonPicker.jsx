// components/EmoticonPicker.jsx
"use client";

import React, { useState, useEffect, forwardRef } from 'react';
import { subscribeToEmoticons } from '@/lib/firebase/firebaseService';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

const EmoticonPicker = forwardRef(({ onEmoticonSelect, onClose }, ref) => {
    const [emoticonCategories, setEmoticonCategories] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = subscribeToEmoticons((emoticonsData) => {
            const grouped = emoticonsData.reduce((acc, emo) => {
                const { category } = emo;
                if (!acc[category]) {
                    acc[category] = [];
                }
                acc[category].push(emo);
                return acc;
            }, {});
            setEmoticonCategories(grouped);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleSelect = (emoticon) => {
        onEmoticonSelect(emoticon);
        onClose();
    };

    const categories = Object.keys(emoticonCategories);

    return (
        <div ref={ref} className="absolute bottom-full right-0 mb-2 z-20">
            <Card className="w-80 shadow-lg">
                {isLoading ? (
                    <div className="flex justify-center items-center h-72 py-4">
                        <Loader2 className="animate-spin h-6 w-6" />
                    </div>
                ) : (
                    <Tabs defaultValue={categories[0]} className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            {categories.map((category) => (
                                <TabsTrigger key={category} value={category}>{category}</TabsTrigger>
                            ))}
                        </TabsList>
                        {categories.map((category) => (
                            <TabsContent key={category} value={category}>
                                <ScrollArea className="h-64">
                                    <CardContent className="p-2">
                                        <div className="grid grid-cols-4 gap-1">
                                            {emoticonCategories[category].map((emo) => (
                                                <button
                                                    key={emo.id}
                                                    onClick={() => handleSelect(emo)}
                                                    className="p-0 rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring aspect-square"
                                                >
                                                    <div className="relative w-full h-full">
                                                        <Image
                                                            src={emo.url}
                                                            alt="emoticon"
                                                            fill
                                                            className="object-contain"
                                                            unoptimized
                                                        />
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </CardContent>
                                </ScrollArea>
                            </TabsContent>
                        ))}
                    </Tabs>
                )}
            </Card>
        </div>
    );
});

EmoticonPicker.displayName = "EmoticonPicker";

export default EmoticonPicker;