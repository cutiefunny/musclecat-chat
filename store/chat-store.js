import { create } from 'zustand';

const useChatStore = create((set) => ({
  authUser: null,    // Firebase 인증 사용자 정보
  chatUser: null,    // 채팅에서 사용할 역할 정보 (고객/사장)
  messages: [],
  users: [], // 사용자 프로필 정보 목록
  isBotActive: true, // 봇 활성화 상태 추가
  setAuthUser: (user) => set({ authUser: user }),
  setChatUser: (user) => set({ chatUser: user }),
  setMessages: (messages) => set({ messages }),
  setUsers: (users) => set({ users }), // 사용자 목록 설정 함수
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  toggleBotActive: () => set((state) => ({ isBotActive: !state.isBotActive })), // 봇 상태 토글 함수 추가
}));

export default useChatStore;