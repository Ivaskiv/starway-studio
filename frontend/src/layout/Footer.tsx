// frontend/src/layout/Footer.tsx

import { Facebook, Instagram, Youtube, Github, Twitter } from 'lucide-react';
import AuthModal from '@/features/auth/components/AuthModal';
import { useSmartNavigation } from '@/hooks/useSmartNavigation';
import { ROUTES } from '@/config/routes';

interface FooterLink {
  label: string;
  path: string;
}

const FOOTER_LINKS = {
  learning: [
    { label: 'Всі курси', path: ROUTES.PRODUCTS },
    { label: 'AI Ментор', path: ROUTES.AI_MENTOR },
    { label: 'Колесо балансу', path: ROUTES.WHEEL },
    { label: 'Прогрес', path: ROUTES.PROGRESS },
  ] as FooterLink[],
  tools: [
    { label: 'Щоденний цикл', path: ROUTES.CYCLE },
    { label: 'Бачення життя', path: ROUTES.VISION },
    { label: 'Цілі', path: ROUTES.GOALS },
    { label: 'AI Генератор', path: ROUTES.AI_GENERATOR },
  ] as FooterLink[],
  company: [
    { label: 'Про нас', path: '/about' },
    { label: 'Блог', path: '/blog' },
    { label: 'Кар\'єра', path: '/careers' },
    { label: 'Контакти', path: '/contact' },
  ] as FooterLink[],
  support: [
    { label: 'Допомога', path: ROUTES.HELP },
    { label: 'FAQ', path: '/faq' },
    { label: 'Політика приватності', path: '/privacy' },
    { label: 'Умови використання', path: '/terms' },
  ] as FooterLink[],
};

const SOCIAL_LINKS = [
  { icon: Facebook, href: 'https://facebook.com', label: 'Facebook' },
  { icon: Instagram, href: 'https://instagram.com', label: 'Instagram' },
  { icon: Twitter, href: 'https://twitter.com', label: 'Twitter' },
  { icon: Youtube, href: 'https://youtube.com', label: 'YouTube' },
  { icon: Github, href: 'https://github.com', label: 'GitHub' },
];

export default function Footer() {
  const year = new Date().getFullYear();
  const { navigateTo, authModalOpen, closeAuthModal } = useSmartNavigation();

  return (
    <>
      <footer className="mt-auto border-t border-white/10 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">S</span>
              </div>
              <h3 className="text-xl font-bold text-white">Starway</h3>
            </div>
            <p className="text-white/60 text-sm mb-4">
              Платформа розвитку з AI-інструментами для досягнення цілей
            </p>
            {/* Social Links */}
            <div className="flex gap-2">
              {SOCIAL_LINKS.map((social) => (
                <SocialLink
                  key={social.label}
                  icon={social.icon}
                  href={social.href}
                  label={social.label}
                />
              ))}
            </div>
          </div>

          {/* Навчання */}
          <FooterColumn 
            title="Навчання" 
            links={FOOTER_LINKS.learning}
            onClick={(path) => navigateTo(path, { requiresAuth: true })}
          />

          {/* Інструменти */}
          <FooterColumn 
            title="Інструменти" 
            links={FOOTER_LINKS.tools}
            onClick={(path) => navigateTo(path, { requiresAuth: true })}
          />

          {/* Компанія */}
          <FooterColumn 
            title="Компанія" 
            links={FOOTER_LINKS.company}
            onClick={(path) => navigateTo(path)}
          />

          {/* Підтримка */}
          <FooterColumn 
            title="Підтримка" 
            links={FOOTER_LINKS.support}
            onClick={(path) => navigateTo(path)}
          />
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-white/40">
            © {year} Starway. Всі права захищені.
          </p>
          <div className="flex gap-6 text-sm text-white/40">
            <button 
              onClick={() => navigateTo('/privacy')}
              className="hover:text-white transition-colors"
            >
              Приватність
            </button>
            <button 
              onClick={() => navigateTo('/terms')}
              className="hover:text-white transition-colors"
            >
              Умови
            </button>
            <button 
              onClick={() => navigateTo('/cookies')}
              className="hover:text-white transition-colors"
            >
              Cookies
            </button>
          </div>
        </div>
        </div>
      </footer>
      {/* fix code_x: Footer also uses smart navigation with requiresAuth links, so it must render AuthModal host. */}
      <AuthModal isOpen={authModalOpen} onClose={closeAuthModal} defaultMode="login" />
    </>
  );
}

/**
 * Footer Column Component
 */
interface FooterColumnProps {
  title: string;
  links: FooterLink[];
  onClick: (path: string) => void;
}

function FooterColumn({ title, links, onClick }: FooterColumnProps) {
  return (
    <div>
      <h4 className="text-white font-semibold mb-4">{title}</h4>
      <ul className="space-y-2">
        {links.map((link) => (
          <li key={link.path}>
            <button
              onClick={() => onClick(link.path)}
              className="text-sm text-white/60 hover:text-orange-400 transition-colors text-left"
            >
              {link.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Social Link Component
 */
interface SocialLinkProps {
  icon: any;
  href: string;
  label: string;
}

function SocialLink({ icon: Icon, href, label }: SocialLinkProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="w-9 h-9 rounded-lg bg-white/5 hover:bg-orange-500/20 border border-white/10 hover:border-orange-500/40 flex items-center justify-center text-white/60 hover:text-orange-500 transition-all"
    >
      <Icon className="w-4 h-4" />
    </a>
  );
}
