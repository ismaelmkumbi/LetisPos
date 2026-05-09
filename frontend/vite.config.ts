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


    
    // plugins: [react(),svgr({
    //   exportAsDefault: true
    // })],

    plugins: [svgr(), react()],

    server: {
        host: '0.0.0.0', // accessible from phones/tablets on the same LAN
    },

    build: {
        chunkSizeWarningLimit: 700,
        rollupOptions: {
            output: {
                // Pull heavy vendors into their own chunks so the main bundle
                // stays lean and cache-friendly. SmartPOS pages only load
                // charts when the dashboard/reports mount.
                manualChunks: {
                    'vendor-react':    ['react', 'react-dom', 'react-router'],
                    'vendor-mui':      ['@mui/material', '@mui/system', '@mui/icons-material'],
                    'vendor-mui-x':    ['@mui/x-charts', '@mui/x-date-pickers'],
                    'vendor-charts':   ['apexcharts', 'react-apexcharts'],
                    'vendor-editor':   ['@tiptap/react', '@tiptap/starter-kit'],
                    'vendor-i18n':     ['i18next', 'react-i18next'],
                    'vendor-forms':    ['formik', 'yup'],
                    'vendor-data':     ['axios', 'swr', '@tanstack/react-table'],
                },
            },
        },
    },
});