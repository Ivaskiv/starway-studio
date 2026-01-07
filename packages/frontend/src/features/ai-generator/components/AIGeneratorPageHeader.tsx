// packages/frontend/src/features/ai-generator/components/AIGeneratorPageHeader.tsx
export function AIGeneratorPageHeader() {
  return (
    <header className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
      <h1 className="text-3xl font-bold text-white">AI Генератор Воронок</h1>
      <p className="mt-2 md:mt-0 text-slate-400">
        Створюйте, тестуйте та керуйте своїми AI-воронками прямо тут
      </p>
    </header>
  )
}
