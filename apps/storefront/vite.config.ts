import { defineConfig,loadEnv } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({mode})=>{
  // Node-only environment for SSR/server functions; never use define to inline
  // these secrets. Vite exposes only VITE_* variables to the browser.
  Object.assign(process.env,loadEnv(mode,process.cwd(),''));
  return { plugins: [tanstackStart(), react()], server: { port: 3000 } };
});
