import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:3001';
  const useNgrok = env.USE_NGROK === 'true';
  const tunnelUrl = env.VITE_DEV_TUNNEL_URL?.trim();
  const tunnel = useNgrok && tunnelUrl ? new URL(tunnelUrl) : null;
  const hmrHost = env.VITE_HMR_HOST?.trim() || tunnel?.hostname || 'localhost';
  const hmrProtocol = env.VITE_HMR_PROTOCOL?.trim() || (tunnel?.protocol === 'https:' ? 'wss' : 'ws');
  const hmrClientPort = Number(env.VITE_HMR_CLIENT_PORT || (tunnel ? (tunnel.port ? Number(tunnel.port) : 443) : 5173));
  const hmrPort = Number(env.VITE_HMR_PORT || 5173);
  let reloadStamp = Date.now().toString();

  const miniAppDevReloadPlugin = {
    name: 'miniapp-dev-reload-stamp',
    configureServer(server: import('vite').ViteDevServer) {
      const touch = () => {
        reloadStamp = Date.now().toString();
      };

      server.watcher.on('add', touch);
      server.watcher.on('change', touch);
      server.watcher.on('unlink', touch);

      server.middlewares.use('/__miniapp_reload_stamp', (_req, res) => {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
        res.end(JSON.stringify({ stamp: reloadStamp }));
      });

      server.middlewares.use(
        '/telegram-legacy/telegram-webview.js',
        async (_req, res) => {
          const fs = await import('node:fs/promises');
          const bundlePath = path.resolve(
            __dirname,
            '.telegram-legacy-dev/telegram-webview.js',
          );

          try {
            const bundle = await fs.readFile(bundlePath);

            res.statusCode = 200;
            res.setHeader(
              'Content-Type',
              'application/javascript; charset=utf-8',
            );
            res.setHeader(
              'Cache-Control',
              'no-cache, no-store, must-revalidate',
            );
            res.end(bundle);
          } catch {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'text/plain; charset=utf-8');
            res.end('telegram-webview.js not built');
          }
        },
      );
    },
  };

  return {
    plugins: [react(), tsconfigPaths(), miniAppDevReloadPlugin],
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
          includePaths: [path.resolve(__dirname, 'src/styles')],
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@shared': path.resolve(__dirname, '../../packages/shared/src'),
        '@ai': path.resolve(__dirname, '../../packages/ai/src'),
      },
    },
    server: {
      host: true,
      port: 5173,
      strictPort: true,
      allowedHosts: [
        'localhost',
        '.ngrok-free.dev',
        '.trycloudflare.com',
        '.lhr.life',
      ],
      origin: tunnel?.toString() || undefined,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
        'ngrok-skip-browser-warning': '1',
      },
      hmr: useNgrok
        ? {
            protocol: hmrProtocol as 'ws' | 'wss',
            host: hmrHost,
            port: hmrPort,
            clientPort: hmrClientPort,
          }
        : undefined,
      watch: {
        usePolling: true,
        interval: 150,
        ignored: [
          '**/node_modules/**',
          '**/dist/**',
          '**/.turbo/**',
          '**/coverage/**',
          '**/.git/**',
          '**/generated/**',
          '**/.next/**',
        ],
      },
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
        '/webhook': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
        '/debug': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
