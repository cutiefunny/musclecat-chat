// hooks/useBot.js
import { useEffect, useRef } from 'react';
import useChatStore from '@/store/chat-store';
import { sendMessage } from '@/lib/firebase/firebaseService';

export const useBot = () => {
    const { messages, isBotActive } = useChatStore();
    const lastProcessedMessageId = useRef(null);

    useEffect(() => {
        if (messages.length === 0 || !isBotActive) return;

        const lastMessage = messages[messages.length - 1];

        if (
            lastMessage &&
            lastMessage.uid === 'customer' &&
            lastMessage.type === 'text' &&
            lastMessage.id !== lastProcessedMessageId.current
        ) {
            lastProcessedMessageId.current = lastMessage.id;

            const fetchBotResponseAndSend = async (prompt) => {
                try {
                    prompt = '넌 근육고양이봇이야. 반말로 짧게 대답해줘. ' + prompt;
                    const response = await fetch('https://musclecat.co.kr/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ prompt }),
                    });

                    if (!response.ok) throw new Error('Network response was not ok');

                    const botResponseText = await response.text();

                    if (botResponseText) {
                        await sendMessage({
                            text: botResponseText,
                            type: 'text',
                            sender: '근육고양이봇',
                            uid: 'bot-01',
                            authUid: 'bot-01',
                        });
                    }
                } catch (error) {
                    console.error("Error fetching bot response: ", error);
                }
            };
            // 봇이 너무 빨리 답변하지 않도록 약간의 딜레이를 줍니다.
            setTimeout(() => fetchBotResponseAndSend(lastMessage.text), 1000);
        }
    }, [messages, isBotActive]);
};