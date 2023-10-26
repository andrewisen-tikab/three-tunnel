import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { splitVendorChunkPlugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        react(),
        splitVendorChunkPlugin(),
        VitePWA({
            registerType: 'autoUpdate',
            manifest: {
                name: 'Tunnel Sketcher',
                short_name: 'Tunnel Sketcher',
                start_url: '.',
                background_color: '#fff',
                description: 'Tunnel and grouts sketcher',
            },
        }),
    ],
    base: './',
    build: {
        outDir: './dist/examples',
        rollupOptions: {
            input: {
                example: resolve(__dirname, 'example/index.html'),
            },
        },
    },
});
