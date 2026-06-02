import crypto from 'crypto'

const MERCHANT = process.env.WAYFORPAY_MERCHANT ?? 'www_instagram_com1060'
const SECRET = process.env.WAYFORPAY_SECRET ?? ''

// Береться з логів — реальний orderReference тестової оплати
const ORDER_REF =
  process.env.ORDER_REF
  ?? process.argv[2]
  ?? 'focus_1month_TEST_USER_ID_manual'

const fields = [
  MERCHANT,
  ORDER_REF,
  '1990', // amount — 3 місяці
  'UAH',
  'Focus Subscription 3 months',
  '1',
  '1990',
]

const signature = crypto
  .createHmac('md5', SECRET)
  .update(fields.join(';'))
  .digest('hex')

const nowTs = Math.floor(Date.now() / 1000)

const payload = {
  merchantAccount: MERCHANT,
  orderReference: ORDER_REF,
  merchantSignature: signature,
  amount: 1990,
  currency: 'UAH',
  productName: ['Focus Subscription 3 months'],
  productCount: [1],
  productPrice: [1990],
  authCode: 'TEST123',
  email: 'test@test.com',
  phone: '380000000000',
  createdDate: nowTs,
  processingDate: nowTs,
  cardPan: '4111****1111',
  cardType: 'Visa',
  issuerBankCountry: 'Ukraine',
  issuerBankName: 'Test Bank',
  recToken: '',
  transactionStatus: 'Approved',
  reason: 'Ok',
  reasonCode: 1100,
  fee: 0,
  paymentSystem: 'card',
  acquirerBankName: 'WayForPay',
  cardProduct: 'debit',
  clientName: 'Test User',
}

console.log('\n=== POSTMAN BODY (raw JSON) ===')
console.log(JSON.stringify(payload, null, 2))

console.log('\n=== SERVICE URL ===')
console.log(
  'POST',
  process.env.BACKEND_URL ?? 'http://localhost:3001',
  '+ /api/subscriptions/payments/wayforpay/callback'
)

console.log('\n=== HEADERS ===')
console.log('Content-Type: application/json')
