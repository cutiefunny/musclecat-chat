// hooks/useBotStatus.js
import { useEffect } from 'react';
import useChatStore from '@/store/chat-store';
import { getBotStatus, setBotStatus } from '@/lib/firebase/firebaseService';

export const useBotStatus = () => {
    const { isBotActive, setBotActiveState } = useChatStore();

    // 앱 로드 시 Firestore에서 봇 상태를 가져와 스토어에 설정
    useEffect(() => {
        const fetchStatus = async () => {
            const status = await getBotStatus();
            setBotActiveState(status);
        };
        fetchStatus();
    }, [setBotActiveState]);

    // 봇 상태를 토글하고 Firestore에 업데이트
    const handleToggleBot = async () => {
        const newStatus = !isBotActive;
        setBotActiveState(newStatus); // UI 즉시 반응
        try {
            await setBotStatus(newStatus);
        } catch (error) {
            console.error("봇 상태 업데이트 실패:", error);
            // 실패 시 UI를 원래 상태로 복구
            setBotActiveState(!newStatus); 
            alert("봇 상태 변경에 실패했습니다.");
        }
    };

    return { isBotActive, handleToggleBot };
};