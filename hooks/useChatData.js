// hooks/useChatData.js
import { useEffect } from 'react';
import useChatStore from '@/store/chat-store';
import { subscribeToMessages, subscribeToUsers } from '@/lib/firebase/firebaseService';

export const useChatData = () => {
    const { setMessages, setUsers } = useChatStore();

    useEffect(() => {
        const unsubscribeMessages = subscribeToMessages(setMessages);
        const unsubscribeUsers = subscribeToUsers(setUsers);

        return () => {
            unsubscribeMessages();
            unsubscribeUsers();
        };
    }, [setMessages, setUsers]);
};