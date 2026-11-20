import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({plugins:[react()],server:{proxy:{'/matchmake':{target:'http://127.0.0.1:2567'},'/rooms':{target:'ws://127.0.0.1:2567',ws:true}}}});
