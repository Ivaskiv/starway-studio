// frontend/src/components/Footer.tsx
import { Facebook, Instagram, Twitter, Youtube } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-white/10 bg-slate-900/50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent mb-4">
              MindFlow
            </h3>
            <p className="text-white/60 text-sm">
              Платформа для особистісного зростання та розвитку
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Навчання</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/dashboard"
                  className="text-white/60 hover:text-orange-400 text-sm transition-colors"
                >
                  Усі курси
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard/my-courses"
                  className="text-white/60 hover:text-orange-400 text-sm transition-colors"
                >
                  Мої курси
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard/progress"
                  className="text-white/60 hover:text-orange-400 text-sm transition-colors"
                >
                  Мій прогрес
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Інструменти</h4>
            <ul className="space-y-2">
              <li>
                <Link
                  to="/dashboard/wheel"
                  className="text-white/60 hover:text-orange-400 text-sm transition-colors"
                >
                  Колесо балансу
                </Link>
              </li>
              <li>
                <Link
                  to="/dashboard/ai-mentor"
                  className="text-white/60 hover:text-orange-400 text-sm transition-colors"
                >
                  AI Ментор
                </Link>
              </li>
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="text-white font-semibold mb-4">Соціальні мережі</h4>
            <div className="flex gap-3">
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <Facebook className="w-5 h-5 text-white/60" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <Instagram className="w-5 h-5 text-white/60" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <Twitter className="w-5 h-5 text-white/60" />
              </a>
              <a
                href="#"
                className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                <Youtube className="w-5 h-5 text-white/60" />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-white/40 text-sm">© {currentYear} MindFlow. Всі права захищені.</p>
          <div className="flex gap-6">
            <Link to="#" className="text-white/40 hover:text-orange-400 text-sm transition-colors">
              Політика конфіденційності
            </Link>
            <Link to="#" className="text-white/40 hover:text-orange-400 text-sm transition-colors">
              Умови використання
            </Link>
          </div>
        </div>
      </div>
    </footer>
    // <footer className="border-t border-white/10 mt-20">
    //   <GlassCard className="rounded-none" data-blur="md">
    //     <div className="container mx-auto px-4 py-8">
    //       <div className="flex flex-col md:flex-row items-center justify-between gap-4">

    //         {/* Copyright */}
    //         <p className="text-slate-400 text-sm">
    //           © 2025 Starway Studio. Створено з
    //           <span className="text-orange-500 animate-pulse mx-1">🧡</span>
    //         </p>

    //         {/* Links */}
    //         <nav className="flex items-center gap-4 text-sm">
    //           <Link
    //             to="/privacy"
    //             className="text-slate-400 hover:text-white transition-colors duration-200"
    //           >
    //             Політика конфіденційності
    //           </Link>
    //           <span className="text-slate-600">•</span>
    //           <Link
    //             to="/terms"
    //             className="text-slate-400 hover:text-white transition-colors duration-200"
    //           >
    //             Умови використання
    //           </Link>
    //           <span className="text-slate-600">•</span>
    //           <Link
    //             to="/contact"
    //             className="text-slate-400 hover:text-white transition-colors duration-200"
    //           >
    //             Контакти
    //           </Link>
    //         </nav>

    //         {/* Social Icons */}
    //         <div className="flex items-center gap-3">
    //           {/* Telegram */}
    //           <a
    //             href="https://t.me/your_channel"
    //             target="_blank"
    //             rel="noopener noreferrer"
    //             className="glass-card p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-200 hover:scale-110"
    //             aria-label="Telegram"
    //           >
    //             <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    //               <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.941z"/>
    //             </svg>
    //           </a>

    //           {/* Instagram */}
    //           <a
    //             href="https://instagram.com/your_profile"
    //             target="_blank"
    //             rel="noopener noreferrer"
    //             className="glass-card p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-200 hover:scale-110"
    //             aria-label="Instagram"
    //           >
    //             <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    //               <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    //             </svg>
    //           </a>

    //           {/* YouTube */}
    //           <a
    //             href="https://youtube.com/@your_channel"
    //             target="_blank"
    //             rel="noopener noreferrer"
    //             className="glass-card p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-200 hover:scale-110"
    //             aria-label="YouTube"
    //           >
    //             <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
    //               <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    //             </svg>
    //           </a>
    //         </div>
    //       </div>

    //       {/* Additional Info */}
    //       <div className="mt-6 pt-6 border-t border-white/5 text-center">
    //         <p className="text-xs text-slate-500">
    //           AI-powered funnel builder для сучасних підприємців 🚀
    //         </p>
    //       </div>
    //     </div>
    //   </GlassCard>
    // </footer>
  );
}
