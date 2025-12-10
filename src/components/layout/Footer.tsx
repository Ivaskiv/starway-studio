// src/components/layout/Footer.tsx
export default function Footer() {
  return (
    <footer className="home-footer">
      <p>&copy; 2025 Starway. Всі права захищені.</p>
      <div className="footer-links">
        <a href="/privacy">Політика конфіденційності</a>
        <span className="mx-2">•</span>
        <a href="/terms">Умови використання</a>
      </div>
    </footer>
  )
}