// store/chat-store.js
import { create } from 'zustand';

const useChatStore = create((set) => ({
  authUser: null,
  chatUser: null,
  messages: [],
  users: [],
  isBotActive: true,
  // 💡 [추가] 메시지 모달(답장/삭제) 활성화 상태 (기본값: true)
  isMessageModalActive: true, 
  typingUsers: [],
  replyingToMessage: null,
  highlightedMessageId: null,
  unreadCount: 0,

  lastLoadedMessage: null,
  hasMoreMessages: true,

  setAuthUser: (user) => set({ authUser: user }),
  setChatUser: (user) => set({ chatUser: user }),
  setMessages: (messages) => set({ messages }),
  
  addPreviousMessages: (newMessages) => set((state) => ({
    messages: [...newMessages, ...state.messages],
  })),
  
  setUsers: (users) => set({ users }),
  setBotActiveState: (isActive) => set({ isBotActive: isActive }),
  toggleBotActive: () => set((state) => ({ isBotActive: !state.isBotActive })),
  
  // 💡 [추가] 모달 활성화 상태 변경 액션
  setMessageModalActiveState: (isActive) => set({ isMessageModalActive: isActive }),

  setTypingUsers: (typingUsers) => set({ typingUsers }),
  setReplyingToMessage: (message) => set({ replyingToMessage: message }),
  setHighlightedMessageId: (messageId) => set({ highlightedMessageId: messageId }),
  setUnreadCount: (count) => set({ unreadCount: count }),
  
  setLastLoadedMessage: (doc) => set({ lastLoadedMessage: doc }),
  setHasMoreMessages: (hasMore) => set({ hasMoreMessages: hasMore }),
}));

export default useChatStore;