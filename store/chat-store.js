// store/chat-store.js
import { create } from 'zustand';

const useChatStore = create((set) => ({
  authUser: null,
  chatUser: null,
  messages: [],
  users: [],
  isBotActive: true,
  typingUsers: [],
  replyingToMessage: null,
  highlightedMessageId: null,

  // 💡 무한 스크롤 상태 추가
  lastLoadedMessage: null,
  hasMoreMessages: true,

  setAuthUser: (user) => set({ authUser: user }),
  setChatUser: (user) => set({ chatUser: user }),
  setMessages: (messages) => set({ messages }),
  
  // 💡 이전 메시지를 배열 앞에 추가하는 액션
  addPreviousMessages: (newMessages) => set((state) => ({
    messages: [...newMessages, ...state.messages],
  })),
  
  setUsers: (users) => set({ users }),
  setBotActiveState: (isActive) => set({ isBotActive: isActive }),
  toggleBotActive: () => set((state) => ({ isBotActive: !state.isBotActive })),
  setTypingUsers: (typingUsers) => set({ typingUsers }),
  setReplyingToMessage: (message) => set({ replyingToMessage: message }),
  setHighlightedMessageId: (messageId) => set({ highlightedMessageId: messageId }),
  
  // 💡 무한 스크롤 상태 업데이트 액션 추가
  setLastLoadedMessage: (doc) => set({ lastLoadedMessage: doc }),
  setHasMoreMessages: (hasMore) => set({ hasMoreMessages: hasMore }),
}));

export default useChatStore;