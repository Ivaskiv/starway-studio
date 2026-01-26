// frontend/src/features/ai-mentor/services/aiMentorSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@/app/store/store';
import type { 
  SessionType, 
  MorningSessionAnswers, 
  EveningSessionAnswers,
  WheelAssessment,
  GamificationState 
} from '../types/ai-mentor.types';
import type { ChatMessage } from '@/types/mentor.types';

// ============ STATE INTERFACES ============

interface SessionState {
  type: SessionType | null;
  step: number;
  answers: Record<string, unknown>; // ← Generic для будь-яких значень
  isSubmitting: boolean;
}

interface ChatState {
  messages: ChatMessage[];
  inputValue: string;
  isTyping: boolean;
}

interface WheelState {
  currentAssessment: WheelAssessment | null;
  isAssessing: boolean;
}

interface AIMentorState {
  session: SessionState;
  chat: ChatState;
  wheel: WheelState;
  gamification: GamificationState | null;
}

// ============ INITIAL STATE ============

const initialState: AIMentorState = {
  session: {
    type: null,
    step: 0,
    answers: {},
    isSubmitting: false,
  },
  chat: {
    messages: [],
    inputValue: '',
    isTyping: false,
  },
  wheel: {
    currentAssessment: null,
    isAssessing: false,
  },
  gamification: null,
};

// ============ SLICE ============

const aiMentorSlice = createSlice({
  name: 'aiMentor',
  initialState,
  reducers: {
    // ========== SESSION ACTIONS ==========
    startSession(state, action: PayloadAction<SessionType>) {
      console.log('🌅 Starting session:', action.payload);
      state.session.type = action.payload;
      state.session.step = 0;
      state.session.answers = {};
      state.session.isSubmitting = false;
    },
    
    nextSessionStep(state) {
      console.log('➡️ Next step:', state.session.step + 1);
      state.session.step += 1;
    },
    
    prevSessionStep(state) {
      if (state.session.step > 0) {
        console.log('⬅️ Prev step:', state.session.step - 1);
        state.session.step -= 1;
      }
    },
    
    updateSessionAnswer(state, action: PayloadAction<{ key: string; value: unknown }>) {
      const { key, value } = action.payload;
      console.log('✏️ Update answer:', key, value);
      // ✅ Пряме присвоєння без type assertion
      state.session.answers[key] = value;
    },
    
    setSessionSubmitting(state, action: PayloadAction<boolean>) {
      state.session.isSubmitting = action.payload;
    },
    
    resetSession(state) {
      console.log('🔄 Reset session');
      state.session = initialState.session;
    },
    
    // ========== CHAT ACTIONS ==========
    addChatMessage(state, action: PayloadAction<ChatMessage>) {
      console.log('💬 New message:', action.payload.role);
      state.chat.messages.push(action.payload);
    },
    
    setChatMessages(state, action: PayloadAction<ChatMessage[]>) {
      state.chat.messages = action.payload;
    },
    
    setChatInput(state, action: PayloadAction<string>) {
      state.chat.inputValue = action.payload;
    },
    
    clearChatInput(state) {
      state.chat.inputValue = '';
    },
    
    setChatTyping(state, action: PayloadAction<boolean>) {
      state.chat.isTyping = action.payload;
    },
    
    clearChat(state) {
      console.log('🧹 Clear chat');
      state.chat = initialState.chat;
    },
    
    // ========== WHEEL ACTIONS ==========
    setCurrentWheelAssessment(state, action: PayloadAction<WheelAssessment | null>) {
      state.wheel.currentAssessment = action.payload;
    },
    
    setWheelAssessing(state, action: PayloadAction<boolean>) {
      state.wheel.isAssessing = action.payload;
    },
    
    // ========== GAMIFICATION ACTIONS ==========
    setGamificationState(state, action: PayloadAction<GamificationState>) {
      state.gamification = action.payload;
    },
  },
});

// ============ ACTIONS EXPORT ============

export const {
  startSession,
  nextSessionStep,
  prevSessionStep,
  updateSessionAnswer,
  setSessionSubmitting,
  resetSession,
  addChatMessage,
  setChatMessages,
  setChatInput,
  clearChatInput,
  setChatTyping,
  clearChat,
  setCurrentWheelAssessment,
  setWheelAssessing,
  setGamificationState,
} = aiMentorSlice.actions;

// ============ SELECTORS ============

export const selectSession = (state: RootState) => state.aiMentor.session;
export const selectCurrentSession = (state: RootState) => ({
  type: state.aiMentor.session.type,
  step: state.aiMentor.session.step,
  answers: state.aiMentor.session.answers,
  isSubmitting: state.aiMentor.session.isSubmitting,
});
export const selectSessionAnswers = (state: RootState) => state.aiMentor.session.answers;

export const selectChat = (state: RootState) => state.aiMentor.chat;
export const selectChatMessages = (state: RootState) => state.aiMentor.chat.messages;
export const selectChatInput = (state: RootState) => state.aiMentor.chat.inputValue;
export const selectChatTyping = (state: RootState) => state.aiMentor.chat.isTyping;

export const selectWheel = (state: RootState) => state.aiMentor.wheel;
export const selectCurrentWheelAssessment = (state: RootState) => state.aiMentor.wheel.currentAssessment;

export const selectGamification = (state: RootState) => state.aiMentor.gamification;

export default aiMentorSlice.reducer;