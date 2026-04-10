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
      const search = new URLSearchParams(window.location.search)
      const expertId =
        search.get('expertId')?.trim() ||
        window.localStorage.getItem('expertId')?.trim() ||
        import.meta.env.VITE_EXPERT_ID?.trim() ||
        undefined
      const utmSource = search.get('utm_source')?.trim() || search.get('utmSource')?.trim() || undefined
      const utmCampaign = search.get('utm_campaign')?.trim() || search.get('utmCampaign')?.trim() || undefined
      const productId = search.get('product_id')?.trim() || search.get('productId')?.trim() || undefined

      const result = await register({
        name: name.trim(),
        phone: phone.trim(),
        packageType: selectedPackage,
        ...(expertId ? { expertId } : {}),
        ...(utmSource ? { utm_source: utmSource } : {}),
        ...(utmCampaign ? { utm_campaign: utmCampaign } : {}),
        ...(productId ? { product_id: productId } : {}),
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
