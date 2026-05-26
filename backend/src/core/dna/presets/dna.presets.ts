import type { DnaPresetConfig, DnaPresetId } from '@/core/dna/contracts/dna.contracts.js'

const PRESETS: Record<DnaPresetId, DnaPresetConfig> = {
  SHUM: {
    id: 'SHUM',
    label: 'ШУМ',
    toneModifiers: ['прямо', 'різко', 'без помʼякшень'],
    psycholinguisticTriggers: ['FOMO', 'urgency', 'loss aversion'],
    pacing: 'high',
    pressureLevel: 'high',
    ctaStyle: 'aggressive',
    hookStyle: 'provocative',
  },
  ZASTRYAG: {
    id: 'ZASTRYAG',
    label: 'ЗАСТРЯГ',
    toneModifiers: ['емпатично', 'коучингово', 'точно'],
    psycholinguisticTriggers: ['self-reflection', 'safety', 'clarity'],
    pacing: 'low',
    pressureLevel: 'low',
    ctaStyle: 'coaching',
    hookStyle: 'empathetic',
  },
  BATL: {
    id: 'BATL',
    label: 'БАТЛ',
    toneModifiers: ['лідерсько', 'енергійно', 'з викликом'],
    psycholinguisticTriggers: ['competition', 'rankings', 'social comparison'],
    pacing: 'medium',
    pressureLevel: 'medium',
    ctaStyle: 'competitive',
    hookStyle: 'challenge',
  },
  TAKTYKA: {
    id: 'TAKTYKA',
    label: 'ТАКТИКА',
    toneModifiers: ['сухо', 'структурно', 'операційно'],
    psycholinguisticTriggers: ['prioritization', 'deadlines', 'ownership'],
    pacing: 'medium',
    pressureLevel: 'low',
    ctaStyle: 'execution',
    hookStyle: 'structured',
  },
}

export function getDnaPreset(id: DnaPresetId): DnaPresetConfig {
  return PRESETS[id]
}

export function listDnaPresets(): DnaPresetConfig[] {
  return Object.values(PRESETS)
}
