// frontend/src/utils/payments.ts
import axios from 'axios'

export interface WayforpayInitData {
  productId: string
  amount: number
  userId: string
}

export async function initiateWayforpayPayment(data: WayforpayInitData) {
  try {
    const res = await axios.post('/api/payments/wayforpay/initiate', data)
    const { url } = res.data
    // Перенаправлення користувача на WayForPay
    window.location.href = url
  } catch (err) {
    console.error('WayForPay init error', err)
    throw err
  }
}