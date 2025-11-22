// hooks/useUiSettings.js
import { useEffect } from 'react';
import useChatStore from '@/store/chat-store';
import { subscribeToUiSettings } from '@/lib/firebase/firebaseService';

export const useUiSettings = () => {
    const { setMessageModalActiveState } = useChatStore();

    useEffect(() => {
        const unsubscribe = subscribeToUiSettings((settings) => {
            if (settings && typeof settings.isMessageModalActive !== 'undefined') {
                setMessageModalActiveState(settings.isMessageModalActive);
            }
        });

        return () => unsubscribe();
    }, [setMessageModalActiveState]);
};