// src/features/demo/demoSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { login } from '../features/auth/authSlice'
import { DemoFunnelResult, DemoFunnelStage, DemoState } from './demoTypes'
import { DEMO_MENTOR, DEMO_STUDENT, DEMO_ADMIN } from './demoUsers'
import { AuthUser } from '@/types/src/types/api'
import { api } from '@/lib/api';

// fake AI funnel генератор
export const runDemoFunnel = createAsyncThunk<DemoFunnelResult>(
  'demo/run',
  async () => {
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const stages: DemoFunnelStage[] = [
      { day: 1, title: 'Знайомство', type: 'awareness', description: 'Привіт, знайомимось 👋' },
      { day: 2, title: 'Перша практика', type: 'interest', description: 'Маленькі вправи 🧘' },
      { day: 3, title: 'Прогрів', type: 'decision', description: 'Готові до CTA 🔥' }
    ]

    return {
      title: '🎯 Ваша AI-воронка (демо)',
      stages
    }
  }
)

const initialState: DemoState = {
  active: false,
  step: 1,
  loading: false,
  mentor: null, // Спочатку не створений
  student: null, // Спочатку не створений
  admin: DEMO_ADMIN, // Адмін завжди доступний
  funnel: null
}

const demoSlice = createSlice({
  name: 'demo',
  initialState,
  reducers: {
    startDemo: (state) => {
      state.active = true
      state.step = 1
      state.funnel = null
      state.mentor = null
      state.student = null
    },
    nextStep: (state) => {
      state.step += 1
    },
    prevStep: (state) => {
      state.step = Math.max(1, state.step - 1)
    },
    stopDemo: (state) => {
      state.active = false
      state.step = 1
      state.funnel = null
      state.mentor = null
      state.student = null
    },
    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
    },
    // Нові екшени для створення користувачів адміном
    createDemoMentor: (state) => {
      state.mentor = DEMO_MENTOR
    },
    createDemoStudent: (state) => {
      state.student = DEMO_STUDENT
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(runDemoFunnel.pending, (state) => {
        state.loading = true
      })
      .addCase(runDemoFunnel.fulfilled, (state, action) => {
        state.loading = false
        state.funnel = action.payload
      })
      .addCase(runDemoFunnel.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message
      })
  }
})

export const { 
  startDemo, 
  nextStep, 
  prevStep, 
  stopDemo, 
  setError,
  createDemoMentor,
  createDemoStudent
} = demoSlice.actions

// Логін як адмін - початок демо
export const loginDemoAsAdmin = () => (dispatch: any) => {
  const fakeToken = 'demo-token-admin'

  const demoUser: AuthUser = {
    id: DEMO_ADMIN.id,
    name: DEMO_ADMIN.name,
    email: DEMO_ADMIN.email,
    role: 'admin',
    demo: true
  }

  dispatch(
    login({
      user: demoUser,
      token: fakeToken
    })
  )

  dispatch(startDemo())
}

// Адмін створює ментора
export const adminCreatesMentor = () => (dispatch: any) => {
  dispatch(createDemoMentor())
}

// Адмін створює студента
export const adminCreatesStudent = () => (dispatch: any) => {
  dispatch(createDemoStudent())
}

// Логін як ментор (тільки якщо створений адміном)
export const loginDemoAsMentor = () => (dispatch: any) => {
  const fakeToken = 'demo-token-mentor'

  const demoUser: AuthUser = {
    id: DEMO_MENTOR.id,
    name: DEMO_MENTOR.name,
    email: DEMO_MENTOR.email,
    role: 'mentor',
    demo: true
  }

  dispatch(
    login({
      user: demoUser,
      token: fakeToken
    })
  )
}

// Логін як студент (тільки якщо створений адміном)
export const loginDemoAsStudent = () => (dispatch: any) => {
  const fakeToken = 'demo-token-student'

  const demoUser: AuthUser = {
    id: DEMO_STUDENT.id,
    name: DEMO_STUDENT.name,
    email: DEMO_STUDENT.email,
    role: 'student',
    demo: true
  }

  dispatch(
    login({
      user: demoUser,
      token: fakeToken
    })
  )
}

// Для зворотної сумісності
export const loginDemo = loginDemoAsAdmin

export default demoSlice.reducer