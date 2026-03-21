import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { setCredentials } from '@/features/auth/services/auth.slice'
import { useRegisterLeadMagnetMutation } from '@/features/landing/lead-magnet/services/api'

export function useLeadMagnetRegistration() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [selectedPackage, setSelectedPackage] = useState<'free' | 'trial' | 'paid'>('free')
  const [register, { isLoading, error }] = useRegisterLeadMagnetMutation()
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) return

    try {
      const result = await register({
        name: name.trim(),
        phone: phone.trim(),
        packageType: selectedPackage,
      }).unwrap()

      // Зберігаємо токен і юзера в Redux
      dispatch(setCredentials({
        user: result.user as any,
        accessToken: result.accessToken,
      }))

      // Редірект залежно від пакету
      if (selectedPackage === 'trial' || selectedPackage === 'paid') {
        navigate('/dashboard')
      } else {
        navigate('/dashboard/lead-magnet')
      }
    } catch (err) {
      console.error('Registration failed:', err)
    }
  }

  return {
    name, setName,
    phone, setPhone,
    selectedPackage, setSelectedPackage,
    handleSubmit,
    isLoading,
    error,
  }
}