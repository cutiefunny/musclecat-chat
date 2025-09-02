import { create } from 'zustand';

const useChatStore = create((set) => ({
  user: null,
  messages: [],
  setUser: (user) => set({ user }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
}));

export default useChatStore;