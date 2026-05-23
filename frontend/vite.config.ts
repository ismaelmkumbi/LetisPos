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
        // ES2020 produces smaller bundles for modern browsers (all evergreen
        // browsers support it).  Drops legacy polyfills and transform overhead.
        target: 'es2020',
        chunkSizeWarningLimit: 500,
        rollupOptions: {
            output: {
                // Pull heavy vendors into their own chunks so the main bundle
                // stays lean and cache-friendly. SmartPOS pages only load
                // charts when the dashboard/reports mount.
                manualChunks(id) {
                    if (id.includes('node_modules')) {
                        // Core React — must match /react/ NOT /react-* or @*/react
                        if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router/')) {
                            return 'vendor-react';
                        }
                        if (id.includes('@mui/material') || id.includes('@mui/system') || id.includes('@mui/icons-material')) {
                            return 'vendor-mui';
                        }
                        if (id.includes('@mui/x-charts') || id.includes('@mui/x-date-pickers')) {
                            return 'vendor-mui-x';
                        }
                        if (id.includes('@mui') && (id.includes('@mui/lab') || id.includes('@mui/x-tree-view'))) {
                            return 'vendor-mui-x';
                        }
                        if (id.includes('apexcharts') || id.includes('react-apexcharts')) {
                            return 'vendor-charts';
                        }
                        if (id.includes('@tiptap')) {
                            return 'vendor-editor';
                        }
                        if (id.includes('i18next') || id.includes('react-i18next')) {
                            return 'vendor-i18n';
                        }
                        if (id.includes('formik') || id.includes('yup')) {
                            return 'vendor-forms';
                        }
                        if (id.includes('@tanstack/react-query')) {
                            return 'vendor-query';
                        }
                        if (id.includes('@tanstack/react-table')) {
                            return 'vendor-table';
                        }
                        if (id.includes('axios') || id.includes('swr')) {
                            return 'vendor-fetch';
                        }
                        if (id.includes('xlsx')) {
                            return 'vendor-xlsx';
                        }
                        if (id.includes('pdfjs-dist')) {
                            return 'vendor-pdf';
                        }
                        if (id.includes('react-syntax-highlighter')) {
                            return 'vendor-syntax-highlighter';
                        }
                        if (id.includes('framer-motion') || id.includes('react-spring')) {
                            return 'vendor-animation';
                        }
                        if (id.includes('emoji-picker-react')) {
                            return 'vendor-emoji';
                        }
                        if (id.includes('fuse.js')) {
                            return 'vendor-fuse';
                        }
                    }
                },
            },
        },
    },
});
