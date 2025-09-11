// store/chat-store.js
import { create } from 'zustand';

const useChatStore = create((set) => ({
  authUser: null,
  chatUser: null,
  messages: [],
  users: [],
  isBotActive: true, // 앱 시작 시 DB 값으로 덮어쓰기 전의 기본값
  typingUsers: [],
  replyingToMessage: null, // 답장할 메시지 상태
  highlightedMessageId: null, // 강조할 메시지 ID 상태 추가
  setAuthUser: (user) => set({ authUser: user }),
  setChatUser: (user) => set({ chatUser: user }),
  setMessages: (messages) => set({ messages }),
  setUsers: (users) => set({ users }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  
  // 봇 상태를 DB 값으로 설정하는 함수
  setBotActiveState: (isActive) => set({ isBotActive: isActive }),
  
  // UI의 봇 상태를 토글하는 함수 (DB 연동 X)
  toggleBotActive: () => set((state) => ({ isBotActive: !state.isBotActive })),
  
  setTypingUsers: (typingUsers) => set({ typingUsers }),

  // 답장할 메시지를 설정하는 함수
  setReplyingToMessage: (message) => set({ replyingToMessage: message }),

  // 강조할 메시지 ID를 설정하는 함수
  setHighlightedMessageId: (messageId) => set({ highlightedMessageId: messageId }),
}));

export default useChatStore;