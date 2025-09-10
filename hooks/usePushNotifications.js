// hooks/usePushNotifications.js
import { useEffect } from 'react';
import useChatStore from '@/store/chat-store';
import { requestNotificationPermission, saveFcmToken } from '@/lib/firebase/firebaseService';

export const usePushNotifications = () => {
    const { authUser, chatUser } = useChatStore();

    useEffect(() => {
        const setupNotifications = async () => {
            // 사장님이고, 브라우저 환경일 때만 실행
            if (chatUser?.uid === 'owner' && typeof window !== 'undefined') {
                try {
                    const token = await requestNotificationPermission();
                    if (token && authUser?.uid) {
                        await saveFcmToken(authUser.uid, token);
                        console.log('FCM token has been saved for the owner.');
                    }
                } catch (error) {
                    console.error("Failed to setup push notifications:", error);
                }
            }
        };

        // authUser와 chatUser 정보가 모두 준비되면 알림 설정을 시도합니다.
        if (authUser && chatUser) {
            setupNotifications();
        }
    }, [authUser, chatUser]);
};