export interface InitWayforpayArgs {
  userId?: string | null
  productId: string
  amount: number
  onSuccess?: () => void
  onError?: () => void
}

export function initiateWayforpayPayment(args: InitWayforpayArgs) {
  if (!args.userId) {
    console.warn('Wayforpay: user is not logged in')
    args.onError?.()
    return
  }
  // stub: simulate payment flow
  console.debug('Initiating Wayforpay payment', args)
  args.onSuccess?.()
}
