import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'


function inlineTelegramCompiledCss() {
  return {
    name: 'inline-telegram-compiled-css',
    enforce: 'post' as const,

    generateBundle(
      _options: unknown,
      bundle: Record<string, any>,
    ) {
      const cssAssets = Object.entries(bundle).filter(
        ([fileName, output]) =>
          fileName.endsWith('.css') &&
          output?.type === 'asset',
      )

      if (cssAssets.length === 0) {
        return
      }

      const css = cssAssets
        .map(([, output]) =>
          typeof output.source === 'string'
            ? output.source
            : Buffer.from(output.source).toString('utf8'),
        )
        .join('\n')

      const jsEntry = Object.values(bundle).find(
        (output: any) =>
          output?.type === 'chunk' &&
          output.isEntry,
      ) as any

      if (!jsEntry) {
        throw new Error(
          'Telegram classic entry chunk not found',
        )
      }

      const cssBootstrap = `
(function () {
  var style = document.createElement('style');
  style.id = 'starway-global-styles';
  style.textContent = ${JSON.stringify(css)};
  document.head.appendChild(style);
})();
`

      jsEntry.code = cssBootstrap + jsEntry.code

      for (const [fileName] of cssAssets) {
        delete bundle[fileName]
      }
    },
  }
}

export default defineConfig({
  publicDir: false,

  // Browser-only Telegram bundle.
  // Prevent Node globals from leaking into the IIFE runtime.
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    'process.env': '{}',
  },

  plugins: [
    inlineTelegramCompiledCss(),
    react(),
    tsconfigPaths(),
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@ai': path.resolve(__dirname, '../../packages/ai/src'),
    },
  },

  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        includePaths: [path.resolve(__dirname, 'src/styles')],
      },
    },
  },

  build: {
    target: 'es2017',
    outDir: 'public/telegram-legacy',
    emptyOutDir: true,
    cssCodeSplit: false,

    lib: {
      entry: path.resolve(__dirname, 'src/index.tsx'),
      name: 'StarwayTelegramApp',
      formats: ['iife'],
      fileName: () => 'telegram-webview.js',
    },

    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
})
