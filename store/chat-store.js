// store/chat-store.js
import { create } from 'zustand';

const useChatStore = create((set) => ({
  authUser: null,
  chatUser: null,
  messages: [],
  users: [],
  isBotActive: true,
  typingUsers: [], // ⏹️ 타이핑 중인 사용자 목록 상태 추가
  setAuthUser: (user) => set({ authUser: user }),
  setChatUser: (user) => set({ chatUser: user }),
  setMessages: (messages) => set({ messages }),
  setUsers: (users) => set({ users }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  toggleBotActive: () => set((state) => ({ isBotActive: !state.isBotActive })),
  setTypingUsers: (typingUsers) => set({ typingUsers }), // ⏹️ 타이핑 사용자 설정 함수 추가
}));

export default useChatStore;