// frontend/src/layout/Footer.tsx

import { Facebook, Instagram, Youtube, Github, Twitter } from 'lucide-react';
import AuthModal from '@/features/auth/components/AuthModal';
import { useSmartNavigation } from '@/hooks/useSmartNavigation';
import { ROUTES } from '@/config/routes';

interface FooterLink { label: string; path: string }

const FOOTER_LINKS = {
  learning: [
    { label: 'Всі курси',      path: ROUTES.PRODUCTS    },
    { label: 'AI Ментор',      path: ROUTES.AI_MENTOR   },
    { label: 'Колесо балансу', path: ROUTES.WHEEL       },
    { label: 'Прогрес',        path: ROUTES.PROGRESS    },
  ] as FooterLink[],
  tools: [
    { label: 'Щоденний цикл',  path: ROUTES.CYCLE       },
    { label: 'Бачення життя',  path: ROUTES.VISION      },
    { label: 'Цілі',           path: ROUTES.GOALS       },
    { label: 'AI Генератор',   path: ROUTES.AI_GENERATOR },
  ] as FooterLink[],
  company: [
    { label: 'Про нас',        path: '/about'           },
    { label: 'Блог',           path: '/blog'            },
    { label: "Кар'єра",        path: '/careers'         },
    { label: 'Контакти',       path: '/contact'         },
  ] as FooterLink[],
  support: [
    { label: 'Допомога',       path: ROUTES.HELP        },
    { label: 'FAQ',            path: '/faq'             },
    { label: 'Приватність',    path: '/privacy'         },
    { label: 'Умови',          path: '/terms'           },
  ] as FooterLink[],
};

const SOCIALS = [
  { icon: Facebook,  href: 'https://facebook.com',  label: 'Facebook'  },
  { icon: Instagram, href: 'https://instagram.com', label: 'Instagram' },
  { icon: Twitter,   href: 'https://twitter.com',   label: 'Twitter'   },
  { icon: Youtube,   href: 'https://youtube.com',   label: 'YouTube'   },
  { icon: Github,    href: 'https://github.com',    label: 'GitHub'    },
];

const COLS = [
  { title: 'Навчання',    links: FOOTER_LINKS.learning, auth: true  },
  { title: 'Інструменти', links: FOOTER_LINKS.tools,    auth: true  },
  { title: 'Компанія',    links: FOOTER_LINKS.company,  auth: false },
  { title: 'Підтримка',   links: FOOTER_LINKS.support,  auth: false },
];

export default function Footer() {
  const year = new Date().getFullYear();
  const { navigateTo, authModalOpen, closeAuthModal } = useSmartNavigation();

  return (
    <>
      <footer
        className="mt-auto border-t bg-[color:var(--bg)]/90 text-[color:var(--text)]"
        style={{ borderColor: 'rgba(var(--accent-rgb),0.2)' }}
      >
        <div className="max-w-7xl mx-auto px-6 py-12">

          {/* grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">

            {/* brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2.5 mb-3">
                <div className="w-[30px] h-[30px] rounded-[8px] bg-gradient-to-br from-orange-500 to-orange-400 flex items-center justify-center text-sm shadow-[0_3px_10px_rgba(249,115,22,0.35)]">
                  ✦
                </div>
                <span className="text-[17px] font-extrabold tracking-[-0.5px] text-white">Starway</span>
              </div>
              <p className="text-[13px] text-white/38 leading-relaxed mb-4">
                Платформа розвитку з AI-інструментами для досягнення цілей
              </p>
              <div className="flex gap-2">
                {SOCIALS.map(s => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                    className="w-8 h-8 rounded-[8px] bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-white/38 hover:bg-orange-500/20 hover:border-orange-500/40 hover:text-orange-500 transition-all"
                  >
                    <s.icon className="w-3.5 h-3.5" />
                  </a>
                ))}
              </div>
            </div>

            {/* link columns */}
            {COLS.map(col => (
              <div key={col.title}>
                <h4 className="text-[13px] font-semibold text-white mb-4">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map(link => (
                    <li key={link.path}>
                      <button
                        onClick={() => navigateTo(link.path, col.auth ? { requiresAuth: true } : {})}
                        className="text-[13px] text-white/38 hover:text-orange-400 transition-colors bg-transparent border-none cursor-pointer text-left"
                      >{link.label}</button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* bottom bar */}
          <div className="pt-8 border-t border-white/[0.07] flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-[12px] text-white/38">© {year} Starway. Всі права захищені.</p>
            <div className="flex gap-6">
              {[
                { label: 'Приватність', path: '/privacy' },
                { label: 'Умови',       path: '/terms'   },
                { label: 'Cookies',     path: '/cookies' },
              ].map(item => (
                <button key={item.path} onClick={() => navigateTo(item.path)}
                  className="text-[12px] text-white/38 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
                >{item.label}</button>
              ))}
            </div>
          </div>
        </div>
      </footer>

      <AuthModal isOpen={authModalOpen} onClose={closeAuthModal} defaultMode="login" />
    </>
  );
}
