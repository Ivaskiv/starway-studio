import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

import { generateContentStudioItems, regenerateContentStudioItem } from '../utils/contentStudio.generator'
import type { ContentStudioInputs, ContentStudioItem, ContentStudioState } from '../types/contentStudio.types'

const initialInputs: ContentStudioInputs = {
  goal: ['sale'],
  product: ['ABsystem · 7-денний Trial та підписка'],
  audience: ['Жінки 28-42 роки, які бачать контент, але ще не доходять до покупки'],
  pain: ['Немає продажів, немає нових користувачів і підписників, а ті хто є — не купують'],
  offer: ['ABsystem', '7-денний trial', 'автоматизація продажів'],
  result: ['стабільний ритм', 'структура', 'рух до результату'],
  cta: ['Спробувати 7 днів безкоштовно → ссилка в шапці'],
}

const initialState: ContentStudioState = {
  inputs: initialInputs,
  items: [],
  lastGeneratedAt: null,
}

const contentStudioSlice = createSlice({
  name: 'contentStudio',
  initialState,
  reducers: {
    resetContentStudio(state) {
      state.inputs = { ...initialInputs }
      state.items = []
      state.lastGeneratedAt = null
    },
    updateInputs(state, action: PayloadAction<Partial<ContentStudioInputs>>) {
      state.inputs = { ...state.inputs, ...action.payload }
    },
    setGeneratedBundle(state, action: PayloadAction<{ items: ContentStudioItem[]; generatedAt: string }>) {
      state.items = action.payload.items
      state.lastGeneratedAt = action.payload.generatedAt
    },
    generateContent(state) {
      state.items = generateContentStudioItems(state.inputs)
      state.lastGeneratedAt = new Date().toISOString()
    },
    regenerateItem(state, action: PayloadAction<string>) {
      state.items = state.items.map((item) => (
        item.id === action.payload
          ? regenerateContentStudioItem(item, state.inputs)
          : item
      ))
    },
    approveItem(state, action: PayloadAction<string>) {
      state.items = state.items.map((item) => (
        item.id === action.payload
          ? { ...item, status: 'approved', updatedAt: new Date().toISOString() }
          : item
      ))
    },
    publishItem(state, action: PayloadAction<string>) {
      state.items = state.items.map((item) => (
        item.id === action.payload
          ? { ...item, status: 'published', updatedAt: new Date().toISOString() }
          : item
      ))
    },
    replaceItemContent(state, action: PayloadAction<{ id: string; content: string[] }>) {
      state.items = state.items.map((item) => (
        item.id === action.payload.id
          ? { ...item, content: action.payload.content, updatedAt: new Date().toISOString() }
          : item
      ))
    },
    replaceItem(state, action: PayloadAction<ContentStudioItem>) {
      state.items = state.items.map((item) => (
        item.id === action.payload.id ? action.payload : item
      ))
    },
  },
})

export const {
  resetContentStudio,
  updateInputs,
  setGeneratedBundle,
  generateContent,
  regenerateItem,
  approveItem,
  publishItem,
  replaceItemContent,
  replaceItem,
} = contentStudioSlice.actions

export default contentStudioSlice.reducer
