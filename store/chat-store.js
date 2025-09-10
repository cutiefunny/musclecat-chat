// store/chat-store.js
import { create } from 'zustand';

const useChatStore = create((set) => ({
  authUser: null,
  chatUser: null,
  messages: [],
  users: [],
  isBotActive: true, // 앱 시작 시 DB 값으로 덮어쓰기 전의 기본값
  typingUsers: [],
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
}));

export default useChatStore;