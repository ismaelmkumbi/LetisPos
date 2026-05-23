import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import fs from 'fs/promises';
import svgr from '@svgr/rollup';

// https://vitejs.dev/config/
export default defineConfig({
    resolve: {
        alias: {
            src: resolve(__dirname, 'src'),
        },
    },
    esbuild: {
        loader: 'tsx',
        include: /src\/.*\.tsx?$/,
        exclude: [],
    },
    optimizeDeps: {
        esbuildOptions: {
            plugins: [
                {
                    name: 'load-js-files-as-tsx',
                    setup(build) {
                        build.onLoad(
                            { filter: /src\\.*\.js$/ },
                            async (args) => ({
                                loader: 'tsx',
                                contents: await fs.readFile(args.path, 'utf8'),
                            })
                        );
                    },
                },
            ],
        },
    },

    plugins: [svgr(), react()],

    server: {
        host: '0.0.0.0', // accessible from phones/tablets on the same LAN
    },

    build: {
        chunkSizeWarningLimit: 500,
        rollupOptions: {
            output: {
                // Only pull truly heavy / rarely-used packages into separate
                // chunks.  Let Vite/Rollup handle React, MUI, and all other
                // vendor splitting automatically — manualChunks on React
                // internals causes "Cannot set properties of undefined
                // (setting 'Children')" init failures.
                manualChunks(id) {
                    if (!id.includes('node_modules')) return;

                    if (id.includes('node_modules/xlsx/')) {
                        return 'vendor-xlsx';
                    }
                    if (id.includes('node_modules/pdfjs-dist/')) {
                        return 'vendor-pdf';
                    }
                    if (id.includes('node_modules/react-syntax-highlighter/')) {
                        return 'vendor-syntax-highlighter';
                    }
                    if (id.includes('node_modules/apexcharts/') ||
                        id.includes('node_modules/react-apexcharts/')) {
                        return 'vendor-charts';
                    }
                },
            },
        },
    },
});
