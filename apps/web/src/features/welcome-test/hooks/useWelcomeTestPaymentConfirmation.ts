import { useWelcomeTestStore } from '@/features/welcome-test/stores/useWelcomeTestStore'
import { createAppRequestHeaders } from '@/lib/miniapp/apiClient'
import { useEffect, useRef, useState } from 'react'

export function useWelcomeTestPaymentConfirmation(
  linkToken: string,
  active: boolean
) {
  const [isPaid, setIsPaid] = useState(false)
  const [isPolling, setIsPolling] = useState(false)
  const [error, setError] = useState<'TIMEOUT' | null>(null)
  const markPaid = useWelcomeTestStore((s) => s.markPaid)

  const attemptsRef = useRef(0)
  const MAX_ATTEMPTS = 12

  useEffect(() => {
    if (!active || isPaid || error) return

    setIsPolling(true)

    const poll = async () => {
      if (attemptsRef.current >= MAX_ATTEMPTS) {
        setError('TIMEOUT')
        setIsPolling(false)
        return
      }

      try {
        const res = await fetch(`/api/test/${linkToken}/payment-status`, {
          headers: createAppRequestHeaders(),
        })

        if (!res.ok) throw new Error('Fetch failed')

        const data = await res.json()

        if (data.status === 'PAID') {
          markPaid()
          setIsPaid(true)
          setIsPolling(false)
        } else {
          attemptsRef.current += 1
        }
      } catch (e) {
        attemptsRef.current += 1
      }
    }

    const interval = setInterval(() => {
      if (!isPaid && !error) {
        poll()
      }
    }, 3000)

    return () => {
      clearInterval(interval)
    }
  }, [linkToken, active, isPaid, error, markPaid])

  return { isPaid, isPolling, error }
}
