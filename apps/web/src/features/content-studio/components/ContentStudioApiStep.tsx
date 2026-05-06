import { InfoHint } from '@/ui'

import { ModeToggle } from './ContentStudioStepPrimitives'

type Props = {
  sectionTitleClass: string
  segmentClass: string
  fieldClass: string
  stackColumnsClass: string
  stackColumnClass: string
  sectionCardClass: string
  elevenKeyMode: 'saved' | 'manual'
  setElevenKeyMode: (value: 'saved' | 'manual') => void
  savedElevenKeyLabel: string
  setSavedElevenKeyLabel: (value: string) => void
  elevenKey: string
  setElevenKey: (value: string) => void
  voiceIdMode: 'saved' | 'manual'
  setVoiceIdMode: (value: 'saved' | 'manual') => void
  savedVoiceIdLabel: string
  setSavedVoiceIdLabel: (value: string) => void
  voiceId: string
  setVoiceId: (value: string) => void
  openAiKeyMode: 'saved' | 'manual'
  setOpenAiKeyMode: (value: 'saved' | 'manual') => void
  savedOpenAiKeyLabel: string
  setSavedOpenAiKeyLabel: (value: string) => void
  gptKey: string
  setGptKey: (value: string) => void
  telegramTokenMode: 'saved' | 'manual'
  setTelegramTokenMode: (value: 'saved' | 'manual') => void
  savedTelegramBotLabel: string
  setSavedTelegramBotLabel: (value: string) => void
  tgToken: string
  setTgToken: (value: string) => void
  telegramChatMode: 'saved' | 'manual'
  setTelegramChatMode: (value: 'saved' | 'manual') => void
  savedTelegramChatLabel: string
  setSavedTelegramChatLabel: (value: string) => void
  tgChat: string
  setTgChat: (value: string) => void
}

export default function ContentStudioApiStep(props: Props) {
  const {
    sectionTitleClass,
    segmentClass,
    fieldClass,
    stackColumnsClass,
    stackColumnClass,
    sectionCardClass,
    elevenKeyMode,
    setElevenKeyMode,
    savedElevenKeyLabel,
    setSavedElevenKeyLabel,
    elevenKey,
    setElevenKey,
    voiceIdMode,
    setVoiceIdMode,
    savedVoiceIdLabel,
    setSavedVoiceIdLabel,
    voiceId,
    setVoiceId,
    openAiKeyMode,
    setOpenAiKeyMode,
    savedOpenAiKeyLabel,
    setSavedOpenAiKeyLabel,
    gptKey,
    setGptKey,
    telegramTokenMode,
    setTelegramTokenMode,
    savedTelegramBotLabel,
    setSavedTelegramBotLabel,
    tgToken,
    setTgToken,
    telegramChatMode,
    setTelegramChatMode,
    savedTelegramChatLabel,
    setSavedTelegramChatLabel,
    tgChat,
    setTgChat,
  } = props

  const elevenSavedMissing = elevenKeyMode === 'saved' && !savedElevenKeyLabel.trim()
  const voiceSavedMissing = voiceIdMode === 'saved' && !savedVoiceIdLabel.trim()
  const openAiSavedMissing = openAiKeyMode === 'saved' && !savedOpenAiKeyLabel.trim()
  const telegramBotSavedMissing = telegramTokenMode === 'saved' && !savedTelegramBotLabel.trim()
  const telegramChatSavedMissing = telegramChatMode === 'saved' && !savedTelegramChatLabel.trim()

  return (
    <div className="space-y-4">
      <p className="text-[11px] leading-5 text-[var(--text-muted)]">
        За замовчуванням система працює в режимі <span className="font-semibold text-[var(--text-secondary)]">Використати збережений</span>.
      </p>
      <div className={stackColumnsClass}>
        <div className={stackColumnClass}>
          <div className={sectionCardClass}>
            <div className="flex items-center gap-2">
              <p className={sectionTitleClass}>Налаштування голосу</p>
              <InfoHint label="Налаштування голосу" description="Тут визначається, яким ключем і яким voice profile система буде озвучувати контент." instruction="Робочий режим — через збережені label з vault і voice profiles. Ручний ввід лишай тільки для тестів." />
            </div>
            <div className="mt-3 space-y-4">
              <div className={segmentClass}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">ElevenLabs API</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">Краще брати ключ із vault.</p>
                  </div>
                  <ModeToggle value={elevenKeyMode} onChange={setElevenKeyMode} warning={elevenSavedMissing} />
                </div>
                {elevenKeyMode === 'saved' ? (
                  <>
                    <input aria-label="ElevenLabs API label" title="ElevenLabs API label" placeholder="elevenlabs-main" value={savedElevenKeyLabel} onChange={(event) => setSavedElevenKeyLabel(event.target.value)} className={`mt-4 ${fieldClass} ${elevenSavedMissing ? 'border-[rgba(255,113,124,0.36)] bg-[rgba(255,113,124,0.06)] focus:border-[rgba(255,113,124,0.48)]' : ''}`} />
                    {elevenSavedMissing ? <p className="mt-2 text-xs text-[rgb(255,113,124)]">Заповни label, щоб «Використати збережений» працювало коректно.</p> : null}
                  </>
                ) : (
                  <input aria-label="ElevenLabs API key" title="ElevenLabs API key" placeholder="Введи ElevenLabs API key" value={elevenKey} onChange={(event) => setElevenKey(event.target.value)} type="password" className={`mt-4 ${fieldClass}`} />
                )}
              </div>
              <div className={segmentClass}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">Voice ID</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">Для кількох голосів краще працювати через label профілю.</p>
                  </div>
                  <ModeToggle value={voiceIdMode} onChange={setVoiceIdMode} warning={voiceSavedMissing} />
                </div>
                {voiceIdMode === 'saved' ? (
                  <>
                    <input aria-label="Voice ID label" title="Voice ID label" placeholder="mentor-voice-main" value={savedVoiceIdLabel} onChange={(event) => setSavedVoiceIdLabel(event.target.value)} className={`mt-4 ${fieldClass} ${voiceSavedMissing ? 'border-[rgba(255,113,124,0.36)] bg-[rgba(255,113,124,0.06)] focus:border-[rgba(255,113,124,0.48)]' : ''}`} />
                    {voiceSavedMissing ? <p className="mt-2 text-xs text-[rgb(255,113,124)]">Заповни label, щоб «Використати збережений» працювало коректно.</p> : null}
                  </>
                ) : (
                  <input aria-label="Voice ID" title="Voice ID" placeholder="Введи Voice ID" value={voiceId} onChange={(event) => setVoiceId(event.target.value)} className={`mt-4 ${fieldClass}`} />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className={stackColumnClass}>
          <div className={sectionCardClass}>
            <div className="flex items-center gap-2">
              <p className={sectionTitleClass}>OpenAI і Telegram</p>
              <InfoHint label="OpenAI і Telegram" description="Ключі моделі, бот і маршрут, через які машина збирає пакет і відправляє його далі." instruction="На production краще використовувати тільки збережені label для ключів, ботів і чатів." />
            </div>
            <div className="mt-3 space-y-4">
              <div className={segmentClass}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">OpenAI API</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">У production краще використовувати збережений ключ по label.</p>
                  </div>
                  <ModeToggle value={openAiKeyMode} onChange={setOpenAiKeyMode} warning={openAiSavedMissing} />
                </div>
                {openAiKeyMode === 'saved' ? (
                  <>
                    <input aria-label="OpenAI API label" title="OpenAI API label" placeholder="openai-main" value={savedOpenAiKeyLabel} onChange={(event) => setSavedOpenAiKeyLabel(event.target.value)} className={`mt-4 ${fieldClass} ${openAiSavedMissing ? 'border-[rgba(255,113,124,0.36)] bg-[rgba(255,113,124,0.06)] focus:border-[rgba(255,113,124,0.48)]' : ''}`} />
                    {openAiSavedMissing ? <p className="mt-2 text-xs text-[rgb(255,113,124)]">Заповни label, щоб «Використати збережений» працювало коректно.</p> : null}
                  </>
                ) : (
                  <input aria-label="OpenAI API key" title="OpenAI API key" placeholder="Введи OpenAI API key" value={gptKey} onChange={(event) => setGptKey(event.target.value)} type="password" className={`mt-4 ${fieldClass}`} />
                )}
              </div>
              <div className={segmentClass}>
                <p className="text-sm font-medium text-[var(--text-primary)]">Telegram Bot</p>
                <div className="mt-3 space-y-3">
                  <ModeToggle value={telegramTokenMode} onChange={setTelegramTokenMode} warning={telegramBotSavedMissing} />
                  {telegramTokenMode === 'saved' ? (
                    <>
                      <input aria-label="Telegram bot label" title="Telegram bot label" placeholder="main-bot" value={savedTelegramBotLabel} onChange={(event) => setSavedTelegramBotLabel(event.target.value)} className={`${fieldClass} ${telegramBotSavedMissing ? 'border-[rgba(255,113,124,0.36)] bg-[rgba(255,113,124,0.06)] focus:border-[rgba(255,113,124,0.48)]' : ''}`} />
                      {telegramBotSavedMissing ? <p className="text-xs text-[rgb(255,113,124)]">Заповни label, щоб «Використати збережений» працювало коректно.</p> : null}
                    </>
                  ) : (
                    <input aria-label="Telegram bot token" title="Telegram bot token" placeholder="Введи Telegram bot token" value={tgToken} onChange={(event) => setTgToken(event.target.value)} type="password" className={fieldClass} />
                  )}
                </div>
              </div>
              <div className={segmentClass}>
                <p className="text-sm font-medium text-[var(--text-primary)]">Telegram маршрут</p>
                <div className="mt-3 space-y-3">
                  <ModeToggle value={telegramChatMode} onChange={setTelegramChatMode} warning={telegramChatSavedMissing} />
                  {telegramChatMode === 'saved' ? (
                    <>
                      <input aria-label="Telegram маршрут label" title="Telegram маршрут label" placeholder="review-chat" value={savedTelegramChatLabel} onChange={(event) => setSavedTelegramChatLabel(event.target.value)} className={`${fieldClass} ${telegramChatSavedMissing ? 'border-[rgba(255,113,124,0.36)] bg-[rgba(255,113,124,0.06)] focus:border-[rgba(255,113,124,0.48)]' : ''}`} />
                      {telegramChatSavedMissing ? <p className="text-xs text-[rgb(255,113,124)]">Заповни label, щоб «Використати збережений» працювало коректно.</p> : null}
                    </>
                  ) : (
                    <input aria-label="Telegram маршрут" title="Telegram маршрут" placeholder="@channel або chat id" value={tgChat} onChange={(event) => setTgChat(event.target.value)} className={fieldClass} />
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
