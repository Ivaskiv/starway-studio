import { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'

import {
  useActivatePromptVersionMutation,
  useCreatePromptVersionMutation,
  useDeletePromptVersionMutation,
  type PromptVersionRecord,
} from '@/features/admin/services/admin.api'
import type { MasterPanelSidebarItem } from '@/features/admin/components/master-panel/MasterPanelSidebar'
import { Badge, Button, GlassCard, InfoHint, Textarea } from '@/ui'

const DEFAULT_PROMPT_TEMPLATE = `{
  "model": "claude-sonnet-4",
  "goal": "Опиши тут сценарій промпта",
  "dependencies": [],
  "content": "Короткий опис того, що робить промпт"
}`

function formatDate(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function normalizeLookup(value: string) {
  return value.toLowerCase().replace(/[\s_\-→:·/]+/g, '')
}

function matchesPrompt(prompt: PromptVersionRecord, item: MasterPanelSidebarItem) {
  const tokens = [item.promptName, item.label, item.hint, ...(item.aliases ?? [])].filter((value): value is string => Boolean(value))
  const source = `${prompt.name} ${prompt.content}`.toLowerCase()
  const normalizedSource = normalizeLookup(source)
  return tokens.some((token) => normalizedSource.includes(normalizeLookup(token)))
}

function promptPreview(prompt: PromptVersionRecord) {
  if (typeof prompt.parsedContent === 'object' && prompt.parsedContent) {
    try {
      return JSON.stringify(prompt.parsedContent, null, 2).slice(0, 240)
    } catch {
      return prompt.content.slice(0, 240)
    }
  }

  return prompt.content.slice(0, 240)
}

export default function MasterPanelPromptTab({
  canEdit,
  prompts,
  isLoading,
  selectedItem,
}: {
  canEdit: boolean
  prompts: PromptVersionRecord[]
  isLoading: boolean
  selectedItem: MasterPanelSidebarItem
}) {
  const [createPromptVersion, { isLoading: creating }] = useCreatePromptVersionMutation()
  const [activatePromptVersion, { isLoading: activating }] = useActivatePromptVersionMutation()
  const [deletePromptVersion, { isLoading: deleting }] = useDeletePromptVersionMutation()
  const [draftName, setDraftName] = useState('')
  const [draftContent, setDraftContent] = useState(DEFAULT_PROMPT_TEMPLATE)

  const selectedLabel = selectedItem.promptName ?? selectedItem.label
  const filteredPrompts = useMemo(() => {
    const matched = prompts.filter((prompt) => matchesPrompt(prompt, selectedItem))
    return matched.length ? matched : prompts
  }, [prompts, selectedItem])

  const activeCount = filteredPrompts.filter((item) => item.isActive).length

  useEffect(() => {
    const nextDefaultName = selectedItem.promptName ?? selectedLabel
    setDraftName(nextDefaultName)
  }, [selectedItem.id, selectedItem.promptName, selectedLabel])

  const handleCreate = async () => {
    if (!canEdit) return
    const name = draftName.trim()
    const content = draftContent.trim()
    if (!name || !content) return

    try {
      await createPromptVersion({
        name,
        content,
        isActive: false,
      }).unwrap()
      toast.success('Нову версію промпта створено')
      setDraftContent(DEFAULT_PROMPT_TEMPLATE)
    } catch {
      toast.error('Не вдалося створити версію промпта')
    }
  }

  const handleActivate = async (promptId: string) => {
    try {
      await activatePromptVersion(promptId).unwrap()
      toast.success('Версію активовано')
    } catch {
      toast.error('Не вдалося активувати версію')
    }
  }

  const handleDelete = async (promptId: string) => {
    try {
      await deletePromptVersion(promptId).unwrap()
      toast.success('Версію видалено')
    } catch {
      toast.error('Не вдалося видалити версію')
    }
  }

  return (
    <GlassCard variant="bordered" className="overflow-hidden">
      <div className="dashboard-liquid-edge--top p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[rgb(var(--accent-soft-rgb))]">
                Промпти
              </p>
              <InfoHint
                label="Промпти"
                description="Версійне сховище системних промптів. Тут зберігаємо історію, активний стан і послідовні зміни."
                instruction="Перевіряй залежності перед активацією. Зміна структури промпта може вплинути на генерацію задач, інсайтів і звітів."
              />
            </div>
            <h2 className="mt-2 text-[1.6rem] font-semibold leading-tight text-[var(--text-primary)]">
              {selectedItem.label}
            </h2>
            <p className="mt-2 text-sm leading-7 text-[var(--text-muted)]">
              {selectedItem.hint}. Показуємо тільки ту family, яку обрала sidebar-навігація.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant="info" size="sm">Версій {filteredPrompts.length}</Badge>
            <Badge variant="success" size="sm">Активних {activeCount}</Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4 p-5">
          {isLoading ? (
            <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] px-4 py-4 text-sm text-[var(--text-muted)]">
              Завантажуємо версії промптів…
            </div>
          ) : filteredPrompts.length ? (
            filteredPrompts.map((prompt) => (
              <div
                key={prompt.id}
                className="rounded-[24px] border border-[var(--border)] bg-[var(--card)] px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-semibold text-[var(--text-primary)]">{prompt.name}</p>
                      <Badge variant={prompt.isActive ? 'success' : 'info'} size="sm">
                        v{prompt.version}
                      </Badge>
                      {prompt.isActive ? <Badge variant="success" size="sm">Active</Badge> : null}
                    </div>
                    <p className="mt-1 text-xs text-[var(--text-muted)]">
                      Створено: {formatDate(prompt.createdAt)}
                    </p>
                  </div>

                  {canEdit ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="glass"
                        color="success"
                        loading={activating}
                        onClick={() => void handleActivate(prompt.id)}
                        disabled={prompt.isActive || activating}
                      >
                        {prompt.isActive ? 'Активна' : 'Активувати'}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        color="error"
                        loading={deleting}
                        onClick={() => void handleDelete(prompt.id)}
                        disabled={deleting}
                      >
                        Видалити
                      </Button>
                    </div>
                  ) : null}
                </div>

                <div className="mt-4 rounded-[20px] border border-[var(--border)] bg-[var(--bg-secondary)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                    Контент
                  </p>
                  <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words text-sm leading-6 text-[var(--text-primary)]">
                    {promptPreview(prompt)}
                  </pre>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[20px] border border-[var(--border)] bg-[var(--card)] px-4 py-4 text-sm text-[var(--text-muted)]">
              Ще немає версій для цієї family.
            </div>
          )}
        </div>

        <div className="border-l border-[var(--border)] bg-[var(--bg-secondary)] p-5">
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[rgb(var(--accent-soft-rgb))]">
                Створити версію
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                Залишаємо історію, не переписуємо попередню версію.
              </p>
            </div>

            <label className="block space-y-2">
              <span className="text-xs font-medium text-[var(--text-secondary)]">Назва промпта</span>
              <input
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                placeholder="Наприклад: daily_microtasks"
                className="w-full rounded-[18px] border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[rgba(var(--accent-rgb),0.24)]"
                disabled={!canEdit}
              />
            </label>

            <Textarea
              label="Content"
              value={draftContent}
              onChange={(event) => setDraftContent(event.target.value)}
              size="lg"
              className="bg-[var(--card)]"
              disabled={!canEdit}
              helperText="Промпт можна зберегти як JSON або plain text. Backend зберігає контент як рядок."
            />

            <Button
              type="button"
              size="lg"
              variant="solid"
              color="accent"
              fullWidth
              loading={creating}
              loadingText="Зберігаємо…"
              disabled={!canEdit || !draftName.trim() || !draftContent.trim()}
              onClick={() => void handleCreate()}
            >
              Створити нову версію
            </Button>

            {!canEdit ? (
              <div className="rounded-[20px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-4 text-sm leading-6 text-[var(--text-muted)]">
                Ти бачиш промпти в read-only режимі. Для редагування потрібен SUPERADMIN.
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </GlassCard>
  )
}
