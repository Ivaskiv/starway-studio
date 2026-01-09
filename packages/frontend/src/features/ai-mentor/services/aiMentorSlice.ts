// packages/frontend/src/features/ai-mentor/aiMentorSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type {
  ChatMessage,
  EveningSessionAnswers,
  MoodTag,
  MorningSessionAnswers,
  SessionType,
  WheelScore
} from '../types/ai-mentor.types';

// ============ STATE INTERFACE ============
interface AIMentorState {
  // Current Session
  currentSession: {
    type: SessionType | null;
    step: number;
    answers: Partial<MorningSessionAnswers | EveningSessionAnswers>;
    isSubmitting: boolean;
  };

  // Wheel of Balance
  wheel: {
    isAssessing: boolean;
    currentCategoryIndex: number;
    scores: WheelScore[];
  };

  // Goals
  goals: {
    selectedGoalId: string | null;
    isCreating: boolean;
    editingGoalId: string | null;
  };

  // Chat (Telegram Mini-App)
  chat: {
    messages: ChatMessage[];
    isTyping: boolean;
    inputValue: string;
  };

  // UI State
  ui: {
    activeTab: 'dashboard' | 'sessions' | 'goals' | 'analytics' | 'chat';
    isSidebarOpen: boolean;
    showWheelModal: boolean;
    showGoalModal: boolean;
    showCourseRecommendation: boolean;
    notificationPermission: 'granted' | 'denied' | 'default';
  };

  // User Context
  userContext: {
    userId: string | null;
    telegramId: string | null;
    timezone: string;
    lastSessionDate: string | null;
    currentMood: MoodTag | null;
  };
}

// ============ INITIAL STATE ============
const initialState: AIMentorState = {
  currentSession: {
    type: null,
    step: 0,
    answers: {},
    isSubmitting: false,
  },

  wheel: {
    isAssessing: false,
    currentCategoryIndex: 0,
    scores: [],
  },

  goals: {
    selectedGoalId: null,
    isCreating: false,
    editingGoalId: null,
  },

  chat: {
    messages: [],
    isTyping: false,
    inputValue: '',
  },

  ui: {
    activeTab: 'dashboard',
    isSidebarOpen: true,
    showWheelModal: false,
    showGoalModal: false,
    showCourseRecommendation: false,
    notificationPermission: 'default',
  },

  userContext: {
    userId: null,
    telegramId: null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    lastSessionDate: null,
    currentMood: null,
  },
};

// ============ SLICE ============
const aiMentorSlice = createSlice({
  name: 'aiMentor',
  initialState,
  reducers: {
    // ========== SESSION ACTIONS ==========
    startSession: (state, action: PayloadAction<SessionType>) => {
      state.currentSession = {
        type: action.payload,
        step: 0,
        answers: {},
        isSubmitting: false,
      };
    },

    nextSessionStep: (state) => {
      state.currentSession.step += 1;
    },

    prevSessionStep: (state) => {
      if (state.currentSession.step > 0) {
        state.currentSession.step -= 1;
      }
    },

    updateSessionAnswer: (state, action: PayloadAction<{
      key: string;
      value: unknown;
    }>) => {
      const { key, value } = action.payload;
      (state.currentSession.answers as Record<string, unknown>)[key] = value;
    },

    setSessionSubmitting: (state, action: PayloadAction<boolean>) => {
      state.currentSession.isSubmitting = action.payload;
    },

    resetSession: (state) => {
      state.currentSession = initialState.currentSession;
    },

    // ========== WHEEL ACTIONS ==========
    startWheelAssessment: (state) => {
      state.wheel = {
        isAssessing: true,
        currentCategoryIndex: 0,
        scores: [],
      };
      state.ui.showWheelModal = true;
    },

    setWheelScore: (state, action: PayloadAction<WheelScore>) => {
      const existingIndex = state.wheel.scores.findIndex(
        s => s.categoryId === action.payload.categoryId
      );
      if (existingIndex >= 0) {
        state.wheel.scores[existingIndex] = action.payload;
      } else {
        state.wheel.scores.push(action.payload);
      }
    },

    nextWheelCategory: (state) => {
      state.wheel.currentCategoryIndex += 1;
    },

    prevWheelCategory: (state) => {
      if (state.wheel.currentCategoryIndex > 0) {
        state.wheel.currentCategoryIndex -= 1;
      }
    },

    finishWheelAssessment: (state) => {
      state.wheel.isAssessing = false;
      state.ui.showWheelModal = false;
    },

    resetWheel: (state) => {
      state.wheel = initialState.wheel;
    },

    // ========== GOALS ACTIONS ==========
    selectGoal: (state, action: PayloadAction<string | null>) => {
      state.goals.selectedGoalId = action.payload;
    },

    startCreatingGoal: (state) => {
      state.goals.isCreating = true;
      state.ui.showGoalModal = true;
    },

    startEditingGoal: (state, action: PayloadAction<string>) => {
      state.goals.editingGoalId = action.payload;
      state.ui.showGoalModal = true;
    },

    cancelGoalEdit: (state) => {
      state.goals.isCreating = false;
      state.goals.editingGoalId = null;
      state.ui.showGoalModal = false;
    },

    // ========== CHAT ACTIONS ==========
    addChatMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.chat.messages.push(action.payload);
    },

    setChatMessages: (state, action: PayloadAction<ChatMessage[]>) => {
      state.chat.messages = action.payload;
    },

    setChatTyping: (state, action: PayloadAction<boolean>) => {
      state.chat.isTyping = action.payload;
    },

    setChatInput: (state, action: PayloadAction<string>) => {
      state.chat.inputValue = action.payload;
    },

    clearChatInput: (state) => {
      state.chat.inputValue = '';
    },

    // ========== UI ACTIONS ==========
    setActiveTab: (state, action: PayloadAction<AIMentorState['ui']['activeTab']>) => {
      state.ui.activeTab = action.payload;
    },

    toggleSidebar: (state) => {
      state.ui.isSidebarOpen = !state.ui.isSidebarOpen;
    },

    setShowWheelModal: (state, action: PayloadAction<boolean>) => {
      state.ui.showWheelModal = action.payload;
    },

    setShowGoalModal: (state, action: PayloadAction<boolean>) => {
      state.ui.showGoalModal = action.payload;
    },

    setShowCourseRecommendation: (state, action: PayloadAction<boolean>) => {
      state.ui.showCourseRecommendation = action.payload;
    },

    setNotificationPermission: (state, action: PayloadAction<'granted' | 'denied' | 'default'>) => {
      state.ui.notificationPermission = action.payload;
    },

    // ========== USER CONTEXT ACTIONS ==========
    setUserContext: (state, action: PayloadAction<Partial<AIMentorState['userContext']>>) => {
      state.userContext = { ...state.userContext, ...action.payload };
    },

    setCurrentMood: (state, action: PayloadAction<MoodTag>) => {
      state.userContext.currentMood = action.payload;
    },

    clearUserContext: (state) => {
      state.userContext = initialState.userContext;
    },

    // ========== RESET ==========
    resetAIMentor: () => initialState,
  },
});

// ============ EXPORT ACTIONS ============
export const {
  // Session
  startSession,
  nextSessionStep,
  prevSessionStep,
  updateSessionAnswer,
  setSessionSubmitting,
  resetSession,

  // Wheel
  startWheelAssessment,
  setWheelScore,
  nextWheelCategory,
  prevWheelCategory,
  finishWheelAssessment,
  resetWheel,

  // Goals
  selectGoal,
  startCreatingGoal,
  startEditingGoal,
  cancelGoalEdit,

  // Chat
  addChatMessage,
  setChatMessages,
  setChatTyping,
  setChatInput,
  clearChatInput,

  // UI
  setActiveTab,
  toggleSidebar,
  setShowWheelModal,
  setShowGoalModal,
  setShowCourseRecommendation,
  setNotificationPermission,

  // User Context
  setUserContext,
  setCurrentMood,
  clearUserContext,

  // Reset
  resetAIMentor,
} = aiMentorSlice.actions;

// ============ SELECTORS ============
export const selectCurrentSession = (state: { aiMentor: AIMentorState }) => state.aiMentor.currentSession;
export const selectWheel = (state: { aiMentor: AIMentorState }) => state.aiMentor.wheel;
export const selectGoals = (state: { aiMentor: AIMentorState }) => state.aiMentor.goals;
export const selectChat = (state: { aiMentor: AIMentorState }) => state.aiMentor.chat;
export const selectUI = (state: { aiMentor: AIMentorState }) => state.aiMentor.ui;
export const selectUserContext = (state: { aiMentor: AIMentorState }) => state.aiMentor.userContext;

// ============ EXPORT REDUCER ============
export default aiMentorSlice.reducer;