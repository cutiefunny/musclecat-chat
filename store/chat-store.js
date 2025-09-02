import { create } from 'zustand';

const useChatStore = create((set) => ({
  authUser: null,    // Firebase 인증 사용자 정보
  chatUser: null,    // 채팅에서 사용할 역할 정보 (고객/사장)
  messages: [],
  setAuthUser: (user) => set({ authUser: user }),
  setChatUser: (user) => set({ chatUser: user }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
}));

export default useChatStore;