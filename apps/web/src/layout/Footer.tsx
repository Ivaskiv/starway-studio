// frontend/src/layout/Footer.tsx
import { ROUTES } from '@/config/routes'
import AuthModal from '@/features/auth/components/AuthModal'
import { useSmartNavigation } from '@/hooks/useSmartNavigation'
import { Facebook, Github, Instagram, Twitter, Youtube } from 'lucide-react'
import { useState } from 'react'

const FOOTER_LINKS = {
  learning: [
    { label: 'Всі курси',       path: ROUTES.PRODUCTS      },
    { label: 'AI Ментор',       path: ROUTES.AI_MENTOR     },
    { label: 'Колесо балансу',  path: ROUTES.WHEEL         },
    { label: 'Прогрес',         path: ROUTES.PROGRESS      },
  ],
  tools: [
    { label: 'Щоденний цикл',   path: ROUTES.CYCLE         },
    { label: 'Бачення життя',   path: ROUTES.VISION        },
    { label: 'Цілі',            path: ROUTES.GOALS         },
    { label: 'Підписка',        path: ROUTES.SUBSCRIPTION  },
  ],
  company: [
    { label: 'Про нас',         path: '/about'             },
    { label: 'Блог',            path: '/blog'              },
    { label: "Кар'єра",         path: '/careers'           },
    { label: 'Контакти',        path: '/contact'           },
  ],
  support: [
    { label: 'Допомога',        path: ROUTES.HELP          },
    { label: 'FAQ',             path: '/faq'               },
    { label: 'Приватність',     path: '/privacy'           },
    { label: 'Умови',           path: '/terms'             },
  ],
}

const SOCIALS = [
  { icon: Facebook,  href: 'https://facebook.com',  label: 'Facebook'  },
  { icon: Instagram, href: 'https://instagram.com', label: 'Instagram' },
  { icon: Twitter,   href: 'https://twitter.com',   label: 'Twitter'   },
  { icon: Youtube,   href: 'https://youtube.com',   label: 'YouTube'   },
  { icon: Github,    href: 'https://github.com',    label: 'GitHub'    },
]

export default function Footer() {
  const { navigateTo, authModalOpen, closeAuthModal } = useSmartNavigation()
  const year = new Date().getFullYear()

  const [openLearning, setOpenLearning] = useState(false)
  const [openTools,    setOpenTools]    = useState(false)
  const [openCompany,  setOpenCompany]  = useState(false)
  const [openSupport,  setOpenSupport]  = useState(false)

  const columns = [
    { title: 'Навчання',     links: FOOTER_LINKS.learning, open: openLearning, setOpen: setOpenLearning, auth: true  },
    { title: 'Інструменти', links: FOOTER_LINKS.tools,    open: openTools,    setOpen: setOpenTools,    auth: true  },
    { title: 'Компанія',    links: FOOTER_LINKS.company,  open: openCompany,  setOpen: setOpenCompany,  auth: false },
    { title: 'Підтримка',   links: FOOTER_LINKS.support,  open: openSupport,  setOpen: setOpenSupport,  auth: false },
  ]

  return (
    <>
      <footer className="
        w-full mt-auto
        border-t border-[color:var(--border-primary)]
        bg-[color:var(--bg-secondary)]
        text-[color:var(--text-primary)]
      ">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 py-6 flex flex-col gap-5">

          {/* ── Brand row ── */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3">

            {/* Logo */}
          <button
            onClick={() => navigateTo('/')}
            className="flex items-center gap-2.5 focus:outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[rgb(var(--accent-rgb))] to-[rgb(var(--accent-strong-rgb))] flex items-center justify-center text-sm font-bold text-white shadow-[var(--shadow-glow)]">
              ✦
            </div>
            <span className="text-[15px] font-extrabold text-[color:var(--text-primary)]">Starway</span>
          </button>

            {/* Socials */}
            <div className="flex gap-2">
              {SOCIALS.map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="
                    w-8 h-8 rounded-lg flex items-center justify-center
                    border border-[color:var(--border-primary)]
                    bg-[color:var(--glass-bg)]
                    text-[color:var(--text-muted)]
                    hover:bg-[color:var(--glass-bg-hover)]
                    hover:text-[color:var(--accent-soft)]
                    hover:border-[color:var(--border-accent)]
                    transition-all duration-200
                  "
                >
                  <s.icon className="w-3.5 h-3.5" />
                </a>
              ))}
            </div>
          </div>

          {/* ── Links grid ── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {columns.map(col => (
              <div key={col.title}>

                {/* Mobile: accordion toggle */}
                <button
                  onClick={() => col.setOpen(o => !o)}
                  className="
                    w-full flex justify-between items-center
                    text-[10px] font-bold uppercase tracking-[0.12em]
                    text-[color:var(--text-primary)] mb-2 opacity-80
                    sm:cursor-default
                  "
                >
                  {col.title}
                  <span className="sm:hidden text-[color:var(--accent-soft)] text-xs">
                    {col.open ? '▲' : '▼'}
                  </span>
                </button>

                {/* Links */}
                <ul className={`space-y-1 ${col.open ? 'block' : 'hidden sm:block'}`}>
                  {col.links.map(link => (
                    <li key={link.path}>
                      <button
                        onClick={() => navigateTo(link.path, col.auth ? { requiresAuth: true } : {})}
                        className="
                          text-[12px] text-left w-full
                          text-[color:var(--text-muted)]
                          hover:text-[color:var(--accent-soft)]
                          transition-colors duration-150
                        "
                      >
                        {link.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* ── Divider ── */}
          <div className="border-t border-[color:var(--border-primary)]" />

          {/* ── Bottom row ── */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-[11px] text-[color:var(--text-muted)]">
            <p>© {year} Starway. Всі права захищені.</p>
            <div className="flex gap-4">
              {[
                { label: 'Приватність', path: '/privacy' },
                { label: 'Умови',       path: '/terms'   },
                { label: 'Cookies',     path: '/cookies' },
              ].map(item => (
                <button
                  key={item.path}
                  onClick={() => navigateTo(item.path)}
                  className="
                    hover:text-[color:var(--accent-soft)]
                    transition-colors duration-150
                  "
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

        </div>
      </footer>

      <AuthModal isOpen={authModalOpen} onClose={closeAuthModal} defaultMode="login" />
    </>
  )
}
