// packages/frontend/src/features/ai-mentor/services/aiMentorSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ChatMessage } from '@/types/mentor.types';

interface ChatState {
  messages: ChatMessage[];
  inputValue: string;
  isTyping: boolean;
}

const initialState: ChatState = {
  messages: [],
  inputValue: '',
  isTyping: false,
};

const aiMentorSlice = createSlice({
  name: 'aiMentorChat',
  initialState,
  reducers: {
    addChatMessage(state, action: PayloadAction<ChatMessage>) {
      state.messages.push(action.payload);
    },
    clearChatInput(state) {
      state.inputValue = '';
    },
    setChatInput(state, action: PayloadAction<string>) {
      state.inputValue = action.payload;
    },
    setChatTyping(state, action: PayloadAction<boolean>) {
      state.isTyping = action.payload;
    },
    clearChat(state) {
      state.messages = [];
      state.inputValue = '';
      state.isTyping = false;
    },
  },
});

export const { addChatMessage, clearChatInput, setChatInput, setChatTyping, clearChat } =
  aiMentorSlice.actions;

export const selectChat = (state: { aiMentorChat: ChatState }) => state.aiMentorChat;

export default aiMentorSlice.reducer;
