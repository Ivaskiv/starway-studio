// features/ai-mentor/components/MentorWorkspace/MentorChat.tsx

export default function MentorChat() {
  return (
    <div className="relative rounded-3xl border border-white/10 bg-white/5 p-8 text-white shadow-[0_0_60px_rgba(0,0,0,0.4)]">

      {/* Background glow layers */}
      <div className="absolute -top-24 -right-24 w-80 h-80 bg-purple-500/20 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-orange-500/20 blur-3xl rounded-full pointer-events-none" />

      {/* Inner glass reflection */}
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 via-transparent to-transparent pointer-events-none" />

      <div className="relative z-10 space-y-8">

        <div className="space-y-3">
          <h2 className="text-2xl font-semibold tracking-tight bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
            👋 Привіт. Я твій ментор.
          </h2>
          <p className="text-white/60 leading-relaxed">
            Я допоможу тобі розкласти хаос у голові на чіткий план дій.
          </p>
        </div>

        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-wider text-white/40">
            Я можу допомогти:
          </p>

          <ul className="space-y-2 text-white/80 text-sm">
            <li>✨ Розібратись у цілі</li>
            <li>🧠 Навести порядок у думках</li>
            <li>📋 Скласти план дій</li>
            <li>⚖️ Прийняти рішення</li>
          </ul>
        </div>

        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-sm uppercase tracking-wider text-white/40">
            Щоб почати, напиши:
          </p>

          <ul className="space-y-2 text-sm text-white/80">
            <li>• Що тебе зараз турбує?</li>
            <li>• Яку ціль хочеш досягти?</li>
            <li>• Де відчуваєш ступор?</li>
          </ul>

          <div className="pt-4 border-t border-white/10 space-y-2">
            <p className="text-xs text-white/40">Наприклад:</p>

            <div className="space-y-2 text-sm">
              <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70">
                "Не можу зосередитись на роботі"
              </div>
              <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70">
                "Хочу більше заробляти, але не знаю з чого почати"
              </div>
              <div className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70">
                "Почуваюсь перевантаженою"
              </div>
            </div>
          </div>
        </div>

        <p className="text-sm text-white/50 leading-relaxed">
          Я поставлю правильні запитання і допоможу розкласти все по поличках 💛
        </p>

      </div>
    </div>
  );
}
