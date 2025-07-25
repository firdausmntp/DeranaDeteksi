import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    base: process.env.NODE_ENV === 'production' ? '/DeranaDeteksi/' : '/',
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        sourcemap: false,
        rollupOptions: {
            output: {
                manualChunks: undefined,
            }
        }
    },
    worker: {
        format: 'es'
    },
    optimizeDeps: {
        include: ['pdfjs-dist', 'pdfjs-dist/legacy/build/pdf'],
        exclude: ['pdfjs-dist/build/pdf.worker.min.js']
    },
    assetsInclude: ['**/*.worker.js', '**/*.worker.min.js']
})
