"use client";

import React, { useState, useEffect, forwardRef } from 'react';
import { db, collection, query, orderBy, onSnapshot } from '@/lib/firebase/clientApp';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { Loader2 } from 'lucide-react';

const EmoticonPicker = forwardRef(({ onEmoticonSelect, onClose }, ref) => {
    const [emoticons, setEmoticons] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

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

    const handleSelect = (url) => {
        onEmoticonSelect(url);
        onClose();
    };

    return (
        <div ref={ref} className="absolute bottom-full right-0 mb-2 z-20">
            <Card className="w-80 shadow-lg">
                <ScrollArea className="h-64">
                    <CardContent className="p-2">
                        {isLoading ? (
                            <div className="flex justify-center items-center h-full py-4">
                                <Loader2 className="animate-spin h-6 w-6" />
                            </div>
                        ) : (
                            <div className="grid grid-cols-4 gap-2">
                                {emoticons.map((emo) => (
                                    <button
                                        key={emo.id}
                                        onClick={() => handleSelect(emo.url)}
                                        className="p-2 rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring aspect-square"
                                    >
                                        <div className="relative w-full h-full">
                                            <Image
                                                src={emo.url}
                                                alt="emoticon"
                                                layout="fill"
                                                className="object-contain"
                                                unoptimized
                                            />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </ScrollArea>
            </Card>
        </div>
    );
});

EmoticonPicker.displayName = "EmoticonPicker";

export default EmoticonPicker;

