// hooks/useChatData.js
import { useEffect } from 'react';
import useChatStore from '@/store/chat-store';
import { subscribeToUsers } from '@/lib/firebase/firebaseService';

export const useChatData = () => {
    const { setUsers } = useChatStore();

    useEffect(() => {
        // 사용자 정보만 구독하도록 변경
        const unsubscribeUsers = subscribeToUsers(setUsers);

        return () => {
            unsubscribeUsers();
        };
    }, [setUsers]);
};