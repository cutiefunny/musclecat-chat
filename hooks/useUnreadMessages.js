// hooks/useUnreadMessages.js
import { useEffect } from 'react';
import useChatStore from '@/store/chat-store';
import { subscribeToUnreadMessages, markMessagesAsRead } from '@/lib/firebase/firebaseService';

export const useUnreadMessages = () => {
    const { authUser, setUnreadCount } = useChatStore();

    // 읽지 않은 메시지 수 실시간 구독
    useEffect(() => {
        if (!authUser?.uid) return;

        const unsubscribe = subscribeToUnreadMessages(authUser.uid, (count) => {
            setUnreadCount(count);
            
            // PWA 뱃지 업데이트
            if ('setAppBadge' in navigator) {
                if (count > 0) {
                    navigator.setAppBadge(count);
                } else {
                    navigator.clearAppBadge();
                }
            }
        });

        return () => unsubscribe();
    }, [authUser, setUnreadCount]);

    // 채팅방이 활성화되거나 보일 때 메시지를 읽음으로 처리
    useEffect(() => {
        const handleFocus = () => {
            if (authUser?.uid) {
                markMessagesAsRead(authUser.uid);
            }
        };

        // 페이지가 처음 로드될 때, 그리고 창이 포커스될 때 실행
        handleFocus(); 
        window.addEventListener('focus', handleFocus);
        
        // 페이지가 다시 보여질 때 (예: 다른 탭에서 돌아왔을 때)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible' && authUser?.uid) {
                markMessagesAsRead(authUser.uid);
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);


        return () => {
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [authUser]);
};