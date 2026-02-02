// frontend/src/components/layout/Footer.tsx
import { FOOTER_LINKS } from '@/shared/config/dashboardNavigation';
import { Facebook, Instagram, Youtube } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-white/10 bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand */}
        <div>
          <h3 className="text-xl font-bold text-white mb-3">Starway</h3>
          <p className="text-white/60 text-sm">Платформа розвитку, курсів та AI-інструментів</p>
        </div>

        {/* Навчання */}
        <div>
          <h4 className="text-white font-semibold mb-3">Навчання</h4>
          <ul className="space-y-2 text-sm">
            {FOOTER_LINKS.learning.map(link => (
              <li key={link.path}>
                <Link to={link.path} className="text-white/60 hover:text-orange-400">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Інструменти */}
        <div>
          <h4 className="text-white font-semibold mb-3">Інструменти</h4>
          <ul className="space-y-2 text-sm">
            {FOOTER_LINKS.tools.map(link => (
              <li key={link.path}>
                <Link to={link.path} className="text-white/60 hover:text-orange-400">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Social */}
        <div>
          <h4 className="text-white font-semibold mb-3">Соціальні мережі</h4>
          <div className="flex gap-3">
            <IconLink icon={<Facebook />} />
            <IconLink icon={<Instagram />} />
            <IconLink icon={<Youtube />} />
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 py-4 text-center text-sm text-white/40">
        © {year} Starway. Всі права захищені.
      </div>
    </footer>
  );
}

function IconLink({ icon }: { icon: React.ReactNode }) {
  return (
    <a
      href="#"
      className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center"
    >
      {icon}
    </a>
  );
}
