import { defineConfig,loadEnv } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
import { nitro } from 'nitro/vite';
export default defineConfig(({mode})=>{
  // Node-only environment for SSR/server functions; never use define to inline
  // these secrets. Vite exposes only VITE_* variables to the browser.
  Object.assign(process.env,loadEnv(mode,process.cwd(),''));
  // Keep the local Node adapter; Vercel needs its own SSR function output.
  return { plugins: [tanstackStart(), ...(process.env.VERCEL === '1' ? [nitro({ preset: 'vercel' })] : []), react()], server: { port: 3000 } };
});
