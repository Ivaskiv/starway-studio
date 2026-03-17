//frontend/src/features/producer/assistant/pages/AIProducerAssistantPage.tsx
import { ModuleIntro } from '@/shared/components/ModuleIntro'
import { AssistantPanel } from '../components/AssistantPanel'
import { AssistantStepCard } from '../components/AssistantStepCard'
import { useProducerAssistant } from '../hooks/useProducerAssistant'

export default function AIProducerAssistantPage() {
  const { steps, nextAction, chat, isLoading } = useProducerAssistant()

  if (!steps.length) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">AI Producer Assistant</h1>
        <p className="text-sm text-white/70">Отримуємо дані для наступного кроку...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-6">
      <header className="space-y-3">
        <h1 className="text-3xl font-bold text-white">AI Producer Assistant</h1>
        <p className="text-sm text-white/70">Крок за кроком ведемо через funnel, mentor і product.</p>
      </header>

      <ModuleIntro
        title="Наступний крок"
        description={nextAction}
        steps={['Слідуй ідеям Assistant', 'Оновлюй продукти й funnel', 'Розвивай дистрибуцію']}
      />

      <div className="grid gap-4 md:grid-cols-2">
        {steps.map(step => (
          <AssistantStepCard key={step.id} step={step} onAction={() => {}}
          />
        ))}
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Чат з продюсером</h2>
          {isLoading && <span className="text-xs text-white/60">завантаження...</span>}
        </div>
        <AssistantPanel
          isOpen
          onClose={() => null}
          nextAction={nextAction}
          messages={chat.messages}
          sendMessage={chat.sendMessage}
          isSending={chat.isSending}
          mode="static"
          showClose={false}
        />
      </section>
    </div>
  )
}
