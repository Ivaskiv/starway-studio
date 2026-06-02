import crypto from 'crypto'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env' })

const MERCHANT = process.env.WAYFORPAY_MERCHANT ?? ''
const SECRET = process.env.WAYFORPAY_SECRET ?? ''
const ORDER_REF = process.argv[2] ?? ''
const PROD_URL = process.argv[3] ?? ''

if (!MERCHANT || !SECRET) {
  console.error('❌ WAYFORPAY_MERCHANT або WAYFORPAY_SECRET не задані в .env')
  process.exit(1)
}
if (!ORDER_REF) {
  console.error('❌ Передай orderReference як перший аргумент')
  console.error('   tsx scripts/generate-test-webhook.ts <orderReference> <prodUrl>')
  process.exit(1)
}

const now = Math.floor(Date.now() / 1000)
const amount = '1990'
const currency = 'UAH'
const status = 'Approved'

// WayForPay signature: MERCHANT;ORDER_REF;AMOUNT;CURRENCY;STATUS;CREATED;PROCESSING
const sigFields = [
  MERCHANT,
  ORDER_REF,
  amount,
  currency,
  status,
  String(now),
  String(now),
]
const signature = crypto
  .createHmac('md5', SECRET)
  .update(sigFields.join(';'))
  .digest('hex')

const payload = {
  merchantAccount: MERCHANT,
  orderReference: ORDER_REF,
  merchantSignature: signature,
  amount: Number(amount),
  currency,
  authCode: 'TEST123',
  email: 'test@starway.studio',
  phone: '380000000000',
  createdDate: now,
  processingDate: now,
  cardPan: '4111****1111',
  cardType: 'Visa',
  issuerBankCountry: 'Ukraine',
  issuerBankName: 'Test Bank',
  recToken: '',
  transactionStatus: status,
  reason: 'Ok',
  reasonCode: 1100,
  fee: 0,
  paymentSystem: 'card',
  acquirerBankName: 'WayForPay',
  cardProduct: 'debit',
  clientName: 'Test User',
}

console.log('\n✅ POSTMAN — POST request:\n')
console.log(
  'URL:    ',
  PROD_URL || '<вставити Render URL>/api/subscriptions/payments/wayforpay/callback'
)
console.log('Method: POST')
console.log('Header: Content-Type: application/json')
console.log('\nBody (raw JSON):\n')
console.log(JSON.stringify(payload, null, 2))
