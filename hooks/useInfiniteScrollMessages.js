// hooks/useInfiniteScrollMessages.js
import { useState, useEffect, useCallback } from 'react';
import useChatStore from '@/store/chat-store';
import { subscribeToLatestMessages, fetchPreviousMessages } from '@/lib/firebase/firebaseService';

export const useInfiniteScrollMessages = () => {
    const { messages, setMessages, addPreviousMessages } = useChatStore();
    const [lastVisible, setLastVisible] = useState(null);
    const [hasMore, setHasMore] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // 최신 메시지 구독
    useEffect(() => {
        const unsubscribe = subscribeToLatestMessages((initialMessages, lastDoc) => {
            setMessages(initialMessages);
            setLastVisible(lastDoc);
            setHasMore(initialMessages.length > 0);
            setIsInitialLoad(false);
        });

        return () => unsubscribe();
    }, [setMessages]);

    // 이전 메시지 로드 함수
    const loadMore = useCallback(async () => {
        if (!hasMore || isLoading) return;

        setIsLoading(true);
        try {
            const { messages: olderMessages, lastVisible: newLastVisible } = await fetchPreviousMessages(lastVisible);
            if (olderMessages.length > 0) {
                addPreviousMessages(olderMessages);
                setLastVisible(newLastVisible);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error("Error fetching previous messages:", error);
        } finally {
            setIsLoading(false);
        }
    }, [lastVisible, hasMore, isLoading, addPreviousMessages]);

    return { messages, isLoading, isInitialLoad, hasMore, loadMore };
};