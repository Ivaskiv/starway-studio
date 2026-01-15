// packages/backend/src/db/client.ts

import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.DATABASE_URL

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found!')
  console.error('📝 Available env keys:', Object.keys(process.env).slice(0, 10))
  process.exit(1)
}

console.log('✅ Connecting to Neon database...')

// Основний sql — типізовано як повернення масиву рядків (Record<string, any>[])
export const sql = <T = Record<string, any>>(
  strings: TemplateStringsArray,
  ...values: any[]
): Promise<T[]> => {
  const query = neon(DATABASE_URL!)
  return query(strings, ...values) as Promise<T[]>
}

// Асинхронний тест підключення (виконується один раз при запуску)
async function testConnection() {
  try {
    const result = await sql<{ test: number }>`SELECT 1 as test`
    if (result[0]?.test === 1) {
      console.log('✅ Database connected successfully')
    } else {
      throw new Error('Unexpected test result')
    }
  } catch (err: any) {
    console.error('❌ Database connection failed:', err.message)
    console.error('   Error details:', err)
    process.exit(1)
  }
}

// Запускаємо тест підключення відразу (не блокуючи основний потік)
testConnection().catch((err) => {
  console.error('Critical error during DB test:', err)
  process.exit(1)
})

export default sql