import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  plugins: [react() ,
    tailwindcss()
  ],
  server: {
    https: {
      key: fs.readFileSync('./certs/key.pem'),
      cert: fs.readFileSync('./certs/cert.pem')
    },
    port: 3000,
    host: true
  }
});
