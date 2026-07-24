import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    let version = String(Date.now());
    try { version = JSON.parse(require('fs').readFileSync('./public/version.json', 'utf-8')).version; } catch {}
    return {
        plugins: [
            react(),
            VitePWA({
                registerType: 'autoUpdate',
                includeAssets: ['pwa-192x192.png', 'pwa-512x512.png'],
                manifest: {
                    name: 'Lucky POS',
                    short_name: 'Lucky POS',
                    description: 'Modern POS System',
                    theme_color: '#3b82f6',
                    icons: [
                        {
                            src: 'pwa-192x192.png',
                            sizes: '192x192',
                            type: 'image/png'
                        },
                        {
                            src: 'pwa-512x512.png',
                            sizes: '512x512',
                            type: 'image/png'
                        }
                    ]
                }
            })
        ],
        define: {
            __APP_VERSION__: JSON.stringify(version)
        },
        server: {
            host: '0.0.0.0',
            port: 4000,
            proxy: {
                '/api': {
                    target: 'http://localhost:3015',
                    changeOrigin: true
                },
                '/socket.io': {
                    target: 'http://localhost:3015',
                    ws: true
                }
            }
        }
    };
});
