import { create } from 'zustand'

export type AppStep =
  | 'wheel'
  | 'goals'
  | 'vision'
  | 'cycle'
  | 'paywall'

type AppFlowState = {
  currentStep: AppStep
  lastAction: string | null
  todayCompleted: boolean
  completed: {
    wheel: boolean
    goals: boolean
    vision: boolean
    cycleDays: number
  }
  setStep: (step: AppStep) => void
  setLastAction: (action: string | null) => void
  setTodayCompleted: (completed: boolean) => void
  syncProgress: (progress: {
    wheel: boolean
    goals: boolean
    vision: boolean
    cycleDays: number
  }, hasSubscription: boolean) => void
  completeWheel: () => void
  completeGoals: () => void
  completeVision: () => void
  completeDay: () => void
}

export const useAppFlowStore = create<AppFlowState>((set) => ({
  currentStep: 'wheel',
  lastAction: null,
  todayCompleted: false,
  completed: {
    wheel: false,
    goals: false,
    vision: false,
    cycleDays: 0,
  },

  setStep: (step) => set({ currentStep: step }),
  setLastAction: (lastAction) => set({ lastAction }),
  setTodayCompleted: (todayCompleted) => set({ todayCompleted }),

  syncProgress: (progress, hasSubscription) =>
    set(() => ({
      completed: progress,
      currentStep: !progress.wheel
        ? 'wheel'
        : !progress.goals
          ? 'goals'
          : !progress.vision
            ? 'vision'
            : progress.cycleDays >= 3 && !hasSubscription
              ? 'paywall'
              : 'cycle',
    })),

  completeWheel: () =>
    set((s) => ({
      completed: { ...s.completed, wheel: true },
      currentStep: 'goals',
    })),

  completeGoals: () =>
    set((s) => ({
      completed: { ...s.completed, goals: true },
      currentStep: 'vision',
    })),

  completeVision: () =>
    set((s) => ({
      completed: { ...s.completed, vision: true },
      currentStep: 'cycle',
    })),

  completeDay: () =>
    set((s) => {
      const days = s.completed.cycleDays + 1
      return {
        completed: { ...s.completed, cycleDays: days },
        currentStep: days >= 3 ? 'paywall' : 'cycle',
      }
    }),
}))

export const useNextStep = () =>
  useAppFlowStore((s) => s.currentStep)

export function getPrimaryCTA(step: AppStep) {
  switch (step) {
    case 'wheel':
      return 'Отримати план'
    case 'goals':
      return 'Перейти до WEB-Карти'
    case 'vision':
      return 'Почати щоденний цикл'
    case 'cycle':
      return 'Продовжити'
    case 'paywall':
      return 'Продовжити доступ'
    default:
      return 'Отримати план'
  }
}
