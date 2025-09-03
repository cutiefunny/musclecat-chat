// components/TypingIndicator.jsx
"use client";

import React from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import useChatStore from '@/store/chat-store';

const TypingIndicator = ({ users: typingUsers }) => {
    const { users: allUsers } = useChatStore();

    // 타이핑 중인 사용자의 프로필 정보를 찾습니다.
    const typingProfiles = typingUsers.map(typingUser => {
        return allUsers.find(u => u.id === typingUser.id) || { displayName: typingUser.displayName };
    }).filter(Boolean);


    if (typingProfiles.length === 0) {
        return null;
    }

    const typingText = `${typingProfiles.map(p => p.displayName).join(', ')} 님이 입력 중...`;

    return (
        <div className="flex items-center gap-2 p-2">
            <Avatar className="size-8">
                <AvatarImage src={typingProfiles[0].photoURL} />
                <AvatarFallback>{typingProfiles[0].displayName?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="bg-white px-4 py-2 rounded-xl rounded-bl-sm shadow-sm">
                <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-600">{typingText}</span>
                    <div className="flex gap-0.5 items-center">
                        <span className="animate-bounce delay-0 w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                        <span className="animate-bounce delay-150 w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                        <span className="animate-bounce delay-300 w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TypingIndicator;