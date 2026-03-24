import { ROUTES } from '@/config/routes';
import { useSmartNavigation } from '@/hooks/useSmartNavigation';

export function RoleBridgeSection({ onAuthRequired }: { onAuthRequired: () => void }) {
  const { user, navigateTo } = useSmartNavigation();

  const goUser = () => {
    if (!user) {
      onAuthRequired();
      return;
    }
    navigateTo(ROUTES.PRODUCTS, { requiresAuth: true });
  };

  const goOwner = () => {
    if (!user) {
      onAuthRequired();
      return;
    }
    navigateTo(ROUTES.PRODUCTS, { requiresAuth: true });
  };

  return (
    <section className="py-8">
      <div className="mx-auto max-w-[1600px] px-6">
        {/* fix code_x: new role bridge section split into two cards with bidirectional owner/user logic. */}
        <div className="grid md:grid-cols-2 gap-6">
          <article className="glass-card p-6 rounded-3xl border border-white/15">
            <h3 className="text-2xl font-bold mb-3">Я користувач продуктів</h3>
            <p className="text-white/70 mb-4">
              Обираю продукти, проходжу практикум, отримую аналіз, звіти та Telegram-нагадування.
            </p>
            <button
              type="button"
              onClick={goUser}
              className="btn rounded-xl bg-[color:rgba(var(--accent-rgb),0.72)] border-[color:rgba(var(--accent-rgb),0.9)]"
            >
              Почати як користувач
            </button>
          </article>

          <article className="glass-card p-6 rounded-3xl border border-white/15">
            <h3 className="text-2xl font-bold mb-3">Я власник продуктів</h3>
            <p className="text-white/70 mb-4">
              Створюю продукти, веду навчальні сценарії miniapp і керую клієнтським досвідом в одному місці.
            </p>
            <button
              type="button"
              onClick={goOwner}
              className="btn rounded-xl bg-white/10 border-white/20"
            >
              Почати як власник
            </button>
          </article>
        </div>

        <p className="text-center text-sm text-white/60 mt-5">
          Важливо: кожен власник може бути користувачем інших продуктів, і кожен користувач може стати
          власником своїх продуктів.
        </p>
      </div>
    </section>
  );
}
