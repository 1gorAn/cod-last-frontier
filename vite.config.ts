import {defineConfig} from 'vite';
export default defineConfig({base:'/cod-last-frontier/',build:{rollupOptions:{output:{manualChunks:{phaser:['phaser'],react:['react','react-dom']}}}}});
