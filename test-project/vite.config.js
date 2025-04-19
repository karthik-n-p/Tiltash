
import { defineConfig } from 'vite'

import react from '@vitejs/plugin-react-swc'

export default defineConfig({

 plugins: [react()],

 server: {

  host: true, // allows external access

  strictPort: true,

  port: 5173,

  allowedHosts: ['.ngrok-free.app'], // allows all ngrok subdomains

 },

})



