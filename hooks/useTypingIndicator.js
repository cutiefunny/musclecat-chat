// hooks/useTypingIndicator.js
import { useEffect, useRef } from 'react';
import useChatStore from '@/store/chat-store';
import { setUserTypingStatus, subscribeToTypingStatus } from '@/lib/firebase/firebaseService';

// debounce 함수: 마지막 호출 후 일정 시간이 지나면 함수를 실행합니다.
const debounce = (func, delay) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), delay);
    };
};

export const useTypingIndicator = () => {
    const { authUser, chatUser, setTypingUsers } = useChatStore();
    const typingTimeoutRef = useRef(null);

    // 다른 사용자들의 타이핑 상태를 구독합니다.
    useEffect(() => {
        if (!authUser?.uid) return;

        const unsubscribe = subscribeToTypingStatus(authUser.uid, (typingUsers) => {
            setTypingUsers(typingUsers);
        });

        return () => unsubscribe();
    }, [authUser, setTypingUsers]);

    // 내가 타이핑을 멈췄을 때 "타이핑 중" 상태를 해제하는 함수
    const stopTyping = () => {
        if (authUser?.uid && chatUser?.name) {
            setUserTypingStatus(authUser.uid, chatUser.name, false);
        }
        typingTimeoutRef.current = null;
    };

    // 내가 타이핑을 시작했음을 알리는 함수 (debounce 적용)
    const debouncedStopTyping = useRef(debounce(stopTyping, 2000)).current;

    const handleTyping = () => {
        if (authUser?.uid && chatUser?.name) {
            // 아직 "타이핑 중" 상태가 아니라면 즉시 상태를 설정합니다.
            if (!typingTimeoutRef.current) {
                setUserTypingStatus(authUser.uid, chatUser.name, true);
            } else {
                // 이미 타이핑 중이면 기존 타임아웃을 초기화합니다.
                clearTimeout(typingTimeoutRef.current);
            }
            // 2초 후에 "타이핑 중" 상태를 해제하는 타임아웃을 설정합니다.
            typingTimeoutRef.current = setTimeout(stopTyping, 2000);
        }
    };
    
    return { handleTyping };
};