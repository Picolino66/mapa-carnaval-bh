import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Code splitting otimizado
        rollupOptions: {
          output: {
            manualChunks(id) {
              // Separar vendors em chunks diferentes
              if (id.includes('node_modules')) {
                if (id.includes('leaflet')) {
                  return 'leaflet';
                }
                if (id.includes('react') || id.includes('react-dom')) {
                  return 'react';
                }
                return 'vendor';
              }
            }
          }
        },
        // Configurações de minificação
        minify: 'terser',
        terserOptions: {
          compress: {
            drop_console: mode === 'production', // Remover console.log em produção
            drop_debugger: true,
            pure_funcs: mode === 'production' ? ['console.log', 'console.info'] : []
          }
        },
        // Limites de chunk size
        chunkSizeWarningLimit: 500,
        // Sourcemaps apenas em desenvolvimento
        sourcemap: mode !== 'production'
      },
      // Otimizações de deps
      optimizeDeps: {
        include: ['react', 'react-dom', 'leaflet']
      }
    };
});
