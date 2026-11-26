import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { readdir, writeFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';
import { defineConfig } from 'vite';

const offlineAppShell = () => {
  let outDir;
  let base;

  const listFiles = async (directory) => {
    const entries = await readdir(directory, { withFileTypes: true });
    const nestedFiles = await Promise.all(entries.map((entry) => {
      const path = resolve(directory, entry.name);
      return entry.isDirectory() ? listFiles(path) : [path];
    }));
    return nestedFiles.flat();
  };

  return {
    name: 'offline-app-shell',
    apply: 'build',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
      base = config.base;
    },
    async closeBundle() {
      const precacheUrls = (await listFiles(outDir))
        .map((file) => relative(outDir, file).split(sep).join('/'))
        .filter((file) => file !== 'sw.js' && file !== 'env-config.js')
        .map((file) => `${base}${file}`);
      const indexUrl = `${base}index.html`;
      const worker = `
const CACHE_NAME = 'projekt-planer-${Date.now()}';
const PRECACHE_URLS = ${JSON.stringify(precacheUrls)};
const INDEX_URL = ${JSON.stringify(indexUrl)};
const ENV_CONFIG_URL = ${JSON.stringify(`${base}env-config.js`)};

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((key) => key.startsWith('projekt-planer-') && key !== CACHE_NAME)
        .map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  if (url.pathname === ENV_CONFIG_URL) {
    event.respondWith(
      fetch(request).catch(() => new Response('window.__ENV = {};', {
        headers: { 'Content-Type': 'application/javascript' },
      }))
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(INDEX_URL)));
    return;
  }

  if (PRECACHE_URLS.includes(url.pathname)) {
    event.respondWith(caches.match(request, { ignoreVary: true }).then((cached) => cached || fetch(request)));
  }
});
`;
      await writeFile(resolve(outDir, 'sw.js'), worker);
    },
  };
};

export default defineConfig({
  plugins: [react(), tailwindcss(), offlineAppShell()],
  envPrefix: ['VITE_', 'SUPABASE_'],
  optimizeDeps: {
    include: ['@blocknote/core', '@blocknote/react', '@blocknote/mantine'],
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: 'editor-prosemirror',
              test: /node_modules[\\/](?:prosemirror-(?:state|view|model|transform|commands|keymap|history|schema-list))[\\/]/,
              priority: 2,
            },
            {
              name: 'editor-blocknote',
              test: /node_modules[\\/]@blocknote[\\/](?:core|react|mantine)[\\/]/,
            },
            {
              name: 'editor-shiki',
              test: /node_modules[\\/]shiki[\\/]/,
            },
            {
              name: 'cloud-supabase',
              test: /node_modules[\\/]@supabase[\\/]supabase-js[\\/]/,
            },
            {
              name: 'react-vendor',
              test: /node_modules[\\/](?:react|react-dom|react-router-dom)[\\/]/,
            },
            {
              name: 'i18n',
              test: /node_modules[\\/](?:i18next|react-i18next|i18next-browser-languagedetector)[\\/]/,
            },
          ],
        },
      },
    },
  },
});
