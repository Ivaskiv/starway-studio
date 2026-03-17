// frontend/src/features/ai-generator/slice.ts
// ОНОВИТИ існуючий slice — додати mascotsEnabled

import { createSlice } from '@reduxjs/toolkit'

interface ProducerState {
  mascotsEnabled:  boolean
  activeTemplate:  string | null
  wizardStep:      number
  wizardOpen:      boolean
  chatMode:        boolean
}

const initial: ProducerState = {
  mascotsEnabled: true,   // ← NEW
  activeTemplate: null,
  wizardStep:     0,
  wizardOpen:     false,
  chatMode:       false,
}

export const producerSlice = createSlice({
  name: 'producer',
  initialState: initial,
  reducers: {
    toggleMascots:   s => { s.mascotsEnabled = !s.mascotsEnabled },  // ← NEW
    setTemplate:     (s, a) => { s.activeTemplate = a.payload },
    setWizardStep:   (s, a) => { s.wizardStep = a.payload },
    openWizard:      s => { s.wizardOpen = true; s.wizardStep = 0 },
    closeWizard:     s => { s.wizardOpen = false },
    setChatMode:     (s, a) => { s.chatMode = a.payload },
  },
})

export const {
  toggleMascots,
  setTemplate,
  setWizardStep,
  openWizard,
  closeWizard,
  setChatMode,
} = producerSlice.actions

export default producerSlice.reducer