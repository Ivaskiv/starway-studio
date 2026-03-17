import { useMemo, useState, type FormEvent } from 'react'
import toast from 'react-hot-toast'
import {
  useGetUsersQuery,
  useGetOwnershipQuery,
  useTransferOwnershipMutation,
} from '@/features/admin/services/ownership.api'
import type { AdminUser } from '@/features/admin/services/ownership.types'

export default function TransferOwnershipPage() {
  const { data: users = [], isLoading: usersLoading } = useGetUsersQuery()
  const { data: ownership } = useGetOwnershipQuery()
  const [transfer, { isLoading: transferring }] = useTransferOwnershipMutation()

  const [search, setSearch] = useState('')
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null)
  const [transferType, setTransferType] = useState<'EXPERT' | 'ADMIN'>('EXPERT')
  const [confirmed, setConfirmed] = useState(false)

  const filtered = useMemo(() => {
    const normalized = search.toLowerCase()
    return users.filter((user) =>
      user.email.toLowerCase().includes(normalized) ||
      `${user.firstName ?? ''} ${user.lastName ?? ''}`.toLowerCase().includes(normalized),
    )
  }, [search, users])

  const handleTransfer = async () => {
    if (!selectedUser || !confirmed) return
    try {
      await transfer({ targetUserId: selectedUser.id, transferType }).unwrap()
      toast.success(`Права передано ${selectedUser.email}`)
      setSelectedUser(null)
      setConfirmed(false)
    } catch {
      toast.error('Не вдалося передати роль')
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">
          Передача прав власника AI-Ментора
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          Лише SuperAdmin може передавати експертну або адміністративну роль іншим користувачам.
        </p>
      </div>

      {ownership?.expert && (
        <div className="p-4 rounded-2xl border border-[rgba(var(--accent-rgb),0.25)] bg-[rgba(var(--accent-rgb),0.06)] space-y-1">
          <p className="text-xs text-[var(--text-muted)] uppercase tracking-[0.3em]">
            Поточний власник
          </p>
          <p className="font-semibold text-[var(--text-primary)]">
            {ownership.expert.user?.firstName} {ownership.expert.user?.lastName}
          </p>
          <p className="text-sm text-[var(--text-muted)]">
            {ownership.expert.user?.email} · {ownership.expert.user?.role}
          </p>
          <p className="text-xs text-[var(--text-muted)]">
            Продуктів: {ownership.expert.products?.length ?? 0}
          </p>
        </div>
      )}

      <div className="flex gap-3">
        {(['EXPERT', 'ADMIN'] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setTransferType(type)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
              transferType === type
                ? 'border-[rgba(var(--accent-rgb),0.45)] bg-[rgba(var(--accent-rgb),0.15)] text-[rgb(var(--accent-rgb))]'
                : 'border-[var(--border-primary)] text-[var(--text-muted)] bg-transparent'
            }`}
          >
            {type === 'EXPERT' ? '👤 Expert (власник)' : '🔧 Admin (адмін)'}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <input
          className="input-glass w-full"
          placeholder="Пошук за email або іменем"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {usersLoading && <p className="text-sm text-[var(--text-muted)] p-3">Завантаження...</p>}
          {filtered.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => { setSelectedUser(user); setConfirmed(false) }}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all text-left ${
                selectedUser?.id === user.id
                  ? 'bg-[rgba(var(--accent-rgb),0.12)] border-[rgba(var(--accent-rgb),0.35)]'
                  : 'border-[var(--border-primary)] bg-[var(--glass-bg)] hover:border-[rgba(var(--accent-rgb),0.3)]'
              }`}
            >
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {user.firstName} {user.lastName ?? ''}
                </p>
                <p className="text-xs text-[var(--text-muted)]">{user.email}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                user.role === 'SUPERADMIN'
                  ? 'border-amber-400 text-amber-400 bg-amber-400/10'
                  : 'border-[rgba(var(--accent-rgb),0.3)] text-[rgb(var(--accent-rgb))]'
              }`}>
                {user.role}
              </span>
            </button>
          ))}
        </div>
      </div>

      {selectedUser && (
        <div className="p-4 rounded-2xl border border-[rgba(244,169,0,0.3)] bg-[rgba(244,169,0,0.06)] space-y-3">
          <p className="text-sm text-[var(--text-secondary)]">
            Передати роль <strong>{transferType}</strong> користувачу <strong>{selectedUser.email}</strong>?
          </p>
          <label className="flex items-center gap-2 cursor-pointer text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="w-4 h-4 rounded border border-[var(--border-primary)] bg-[var(--glass-bg)]"
            />
            Підтверджую передачу прав
          </label>
          <button
            type="button"
            disabled={!confirmed || transferring}
            onClick={handleTransfer}
            className="w-full py-2.5 rounded-xl font-semibold text-sm bg-[rgb(var(--accent-rgb))] text-[var(--on-accent)] disabled:opacity-40 transition-all hover:opacity-90"
          >
            {transferring ? 'Передаємо...' : 'Підтвердити передачу'}
          </button>
        </div>
      )}
    </div>
  )
}
