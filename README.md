# React + TypeScript + Vite

> This project is proprietary. Unauthorized use, copying, or distribution is prohibited.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/plugin-react) uses
  [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in
  [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/plugin-react-swc)
  uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is currently not compatible with SWC. See
[this issue](https://github.com/vitejs/vite-plugin-react/issues/428) for tracking the progress.

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable
type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: process.dirname,
      },
      // other options...
    },
  },
]);
```

You can also install
[eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/plugins/eslint-plugin-react-x)
and
[eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/plugins/eslint-plugin-react-dom)
for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x';
import reactDom from 'eslint-plugin-react-dom';

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: process.dirname,
      },
      // other options...
    },
  },
]);
```
# 🌟 Starway AI-Mentor - Full Stack Application

AI-powered mentoring system with Ukrainian language support, built with modern tech stack.

## 🚀 Tech Stack

**Backend:**
- Node.js + TypeScript
- Express.js
- Prisma ORM
- PostgreSQL (Neon)
- OpenAI API
- Telegram Bot API

**Frontend:**
- React 18
- TypeScript
- Vite
- Redux Toolkit + RTK Query
- TailwindCSS
- Glassmorphism UI

## 📋 Prerequisites

- Node.js 20+
- PostgreSQL 16+
- OpenAI API Key
- Telegram Bot Token (optional)

## 🛠️ Installation

### Backend Setup
```bash
cd backend
npm install
```

Create `.env`:
```env
DATABASE_URL="postgresql://postgres:YOUR_SUPABASE_DB_PASSWORD_URLENCODED@db.YOUR_PROJECT_REF.supabase.co:5432/postgres?sslmode=require"
DIRECT_URL="postgresql://postgres:YOUR_SUPABASE_DB_PASSWORD_URLENCODED@db.YOUR_PROJECT_REF.supabase.co:5432/postgres?sslmode=require"
OPENAI_API_KEY=sk-...
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
TELEGRAM_DELIVERY_MODE=polling
TELEGRAM_LOCAL_BOT_TOKEN=your-local-test-bot-token
TELEGRAM_LOCAL_BOT_USERNAME=your_local_test_bot
```

For parallel local + production testing, keep Render on the production bot token and use a separate local bot token here. Telegram update delivery is single-writer per bot token, so the same token cannot be active in polling locally and webhook in production at the same time.

Run migrations:
```bash
pnpm --filter @starway/db run prisma:migrate:deploy
pnpm prisma:generate
```

Start dev server:
```bash
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 🚀 Deployment

### Railway (Backend)

1. Create new project on Railway
2. Add PostgreSQL service
3. Add environment variables
4. Connect GitHub repo
5. Deploy!

### Vercel (Frontend)

1. Import project from GitHub
2. Set build command: `npm run build`
3. Set environment variable: `VITE_API_URL`
4. Deploy!

## 📊 Features

- ✅ ABsystem Chat (GPT-4)
- ✅ Wheel of Life Balance
- ✅ Daily Cycle Tracking
- ✅ Vision & Goals Setting
- ✅ Trial Mirrors (Day 4 & 7)
- ✅ Mini-Courses Recommendations
- ✅ Consultation Booking
- ✅ Zoom Integration
- ✅ Mentorship Program
- ✅ Telegram Notifications

## 🧪 Testing
```bash
npm test
npm run test:coverage
```

## 📝 License

MIT
