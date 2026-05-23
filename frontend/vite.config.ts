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
                // Static chunks for core vendors — proven stable config.
                // Additional dynamic rules below for lazy-loadable packages.
                manualChunks(id) {
                    if (!id.includes('node_modules')) return;

                    // ── Core React (must be together — splitting causes init errors) ──
                    if (id.includes('node_modules/react/') ||
                        id.includes('node_modules/react-dom/') ||
                        id.includes('node_modules/scheduler/') ||
                        id.includes('node_modules/react-router/')) {
                        return 'vendor-react';
                    }

                    // ── MUI ──
                    if (id.includes('node_modules/@mui/material/') ||
                        id.includes('node_modules/@mui/system/') ||
                        id.includes('node_modules/@mui/icons-material/') ||
                        id.includes('node_modules/@mui/utils/') ||
                        id.includes('node_modules/@mui/styled-engine/') ||
                        id.includes('node_modules/@mui/private-theming/')) {
                        return 'vendor-mui';
                    }

                    // ── MUI X (charts + date pickers — lazy) ──
                    if (id.includes('node_modules/@mui/x-charts/') ||
                        id.includes('node_modules/@mui/x-date-pickers/') ||
                        id.includes('node_modules/@mui/x-tree-view/') ||
                        id.includes('node_modules/@mui/lab/')) {
                        return 'vendor-mui-x';
                    }

                    // ── ApexCharts (used by dashboard + reports) ──
                    if (id.includes('node_modules/apexcharts/') ||
                        id.includes('node_modules/react-apexcharts/')) {
                        return 'vendor-charts';
                    }

                    // ── TipTap editor ──
                    if (id.includes('node_modules/@tiptap/')) {
                        return 'vendor-editor';
                    }

                    // ── i18n ──
                    if (id.includes('node_modules/i18next/') ||
                        id.includes('node_modules/react-i18next/')) {
                        return 'vendor-i18n';
                    }

                    // ── Forms ──
                    if (id.includes('node_modules/formik/') ||
                        id.includes('node_modules/yup/')) {
                        return 'vendor-forms';
                    }

                    // ── Data fetching ──
                    if (id.includes('node_modules/@tanstack/react-query/')) {
                        return 'vendor-query';
                    }
                    if (id.includes('node_modules/@tanstack/react-table/')) {
                        return 'vendor-table';
                    }
                    if (id.includes('node_modules/axios/') ||
                        id.includes('node_modules/swr/')) {
                        return 'vendor-fetch';
                    }

                    // ── Heavy packages — lazy loaded on demand only ──
                    if (id.includes('node_modules/xlsx/')) {
                        return 'vendor-xlsx';
                    }
                    if (id.includes('node_modules/pdfjs-dist/')) {
                        return 'vendor-pdf';
                    }
                    if (id.includes('node_modules/react-syntax-highlighter/')) {
                        return 'vendor-syntax-highlighter';
                    }

                    // ── Animation ──
                    if (id.includes('node_modules/framer-motion/') ||
                        id.includes('node_modules/react-spring/')) {
                        return 'vendor-animation';
                    }

                    // ── Misc ──
                    if (id.includes('node_modules/emoji-picker-react/')) {
                        return 'vendor-emoji';
                    }
                    if (id.includes('node_modules/fuse.js/')) {
                        return 'vendor-fuse';
                    }
                },
            },
        },
    },
});
