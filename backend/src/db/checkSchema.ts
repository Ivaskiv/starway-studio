import { sql } from './client.js'

export async function checkDatabaseSchema() {
  console.log('🧠 DB schema check (all public tables):')

  try {
    // Беремо всі таблиці зі схеми public
const tables = await sql<{ table_name: string }>`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
  ORDER BY table_name
  `
    if (!tables.length) {
      console.log('  ❌ No tables found in public schema!')
      return
    }

    // Перевіряємо наявність кожної таблиці
    for (const { table_name } of tables) {
      try {
        const res: { exists: string | null }[] = await sql`
          SELECT to_regclass(${table_name}) AS exists
        ` as any

        if (res[0]?.exists) {
          console.log(`  ✅ ${table_name}`)
        } else {
          console.log(`  ❌ ${table_name} (MISSING)`)
        }
      } catch (err) {
        console.log(`  ❌ ${table_name} (ERROR)`, err)
      }
    }
  } catch (err) {
    console.error('  ❌ Failed to fetch tables from information_schema:', err)
  }
}
