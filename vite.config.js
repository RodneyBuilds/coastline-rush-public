import { defineConfig } from 'vite';
export default defineConfig({base:'./',server:{host:'127.0.0.1'},preview:{host:'127.0.0.1'},build:{target:'es2022',sourcemap:false,rollupOptions:{output:{manualChunks(id){if(id.includes('node_modules/three'))return 'three';}}}}});
