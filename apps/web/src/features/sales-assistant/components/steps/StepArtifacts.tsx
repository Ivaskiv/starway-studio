import { useEffect, useState } from 'react'

type ToneStyle = 'clear' | 'warm' | 'expert' | 'bold'

type Props = {
  onChange?: (payload: { artifacts: string[]; style: ToneStyle }) => void
}

const ARTIFACTS = [
  'BLOG',
  'LANDING',
  'STORYTELLING',
  'TELEGRAM MSG',
  'REELS',
  'STORIES',
  'WARMUP',
  'WEBINAR',
  'AUDIT',
  'POST',
  'EMAIL',
  'SALES',
]

const STYLES: ToneStyle[] = ['clear', 'warm', 'expert', 'bold']

export default function StepArtifacts({ onChange }: Props) {
  const [selected, setSelected] = useState<string[]>(['REELS', 'WARMUP'])
  const [style, setStyle] = useState<ToneStyle>('expert')

  useEffect(() => {
    onChange?.({ artifacts: selected, style })
  }, [selected, style, onChange])

  const toggleArtifact = (artifact: string) => {
    setSelected((prev) => (prev.includes(artifact) ? prev.filter((item) => item !== artifact) : [...prev, artifact]))
  }

  return (
    <section className="dna-step-artifacts">
      <header className="dna-step-artifacts__header">
        <h3>Артефакти</h3>
        <span>{selected.length} обрано</span>
      </header>

      <div className="dna-step-artifacts__grid artifacts-grid">
        {ARTIFACTS.map((artifact) => (
          <button
            key={artifact}
            type="button"
            aria-pressed={selected.includes(artifact)}
            className={`dna-step-artifacts__item artifact-btn${selected.includes(artifact) ? ' is-active' : ''}`}
            onClick={() => toggleArtifact(artifact)}
          >
            {artifact}
          </button>
        ))}
      </div>

      <div className="dna-step-artifacts__styles" role="radiogroup" aria-label="style">
        {STYLES.map((tone) => (
          <button
            key={tone}
            type="button"
            role="radio"
            aria-checked={style === tone}
            className={`dna-step-artifacts__style-btn${style === tone ? ' is-active' : ''}`}
            onClick={() => setStyle(tone)}
          >
            {tone}
          </button>
        ))}
      </div>
    </section>
  )
}
