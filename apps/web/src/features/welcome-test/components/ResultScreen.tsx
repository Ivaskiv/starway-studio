import type { WelcomeTestResultView } from '@/features/welcome-test/utils/welcomeTestResult'
import { getDominantBlockLabel } from '@/features/welcome-test/utils/welcomeTestResult'
import { Button } from '@/ui'

import { WelcomeTestShell } from './WelcomeTestShell'

type ResultScreenProps = {
  result: WelcomeTestResultView
  onContinue: () => void
}

export function ResultScreen({ result, onContinue }: ResultScreenProps) {
  return (
    <WelcomeTestShell
      kicker="Інтерпретація"
      title={result.title}
      subtitle="Короткий behavioral recap і наступний крок."
      footer={
        <button type="button" onClick={onContinue} className="ab-test-result-cta">
          {result.nextActionCta}
        </button>
      }
    >
      <div className="ab-test-result-card">
        <div className="ab-test-result-grid">
          <div className="ab-test-result-block">
            <p className="ab-test-result-label">Провідний блок</p>
            <p className="ab-test-result-value">{getDominantBlockLabel(result.dominantBlock)}</p>
          </div>
          <div className="ab-test-result-block">
            <p className="ab-test-result-label">Ланцюг</p>
            <p className="ab-test-result-value">STATUS → ACTION</p>
          </div>
        </div>
        <div className="ab-test-result-copy">
          <div className="ab-test-result-copy-block">
            <p className="ab-test-result-label">Наратив</p>
            <p className="ab-test-result-text ab-test-result-text--narrative">{result.body}</p>
          </div>
          <div className="ab-test-result-copy-block">
            <p className="ab-test-result-label">Наступний крок</p>
            <p className="ab-test-result-text">{result.nextAction}</p>
          </div>
        </div>
      </div>
      <Button type="button" variant="glass" fullWidth onClick={onContinue}>
        Перейти до оплати
      </Button>
    </WelcomeTestShell>
  )
}
