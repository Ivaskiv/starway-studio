import { createApp } from './app.js';

const PORT = Number(process.env.PORT) || 3001;
const app = createApp();

const server = app.listen(PORT, () => {
  console.log('🚀 Starway Studio Backend');
  console.log(`🌐 http://localhost:${PORT}`);
});

// Graceful shutdown
const shutdown = async (signal: string) => {
  console.log(`👋 ${signal} received. Shutting down...`);
  server.close(() => process.exit(0));
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
