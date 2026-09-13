import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // `npm run dev:https` sirve el front por HTTPS para probar desde el celular
  // las APIs que el navegador solo habilita en páginas seguras, como Wake Lock.
  // En ese modo el socket también pasa por el proxy de Vite: una página HTTPS
  // no puede conectarse a http://...:3000 sin que el navegador lo bloquee.
  const useHttps = mode === 'https'

  return {
    plugins: [react(), ...(useHttps ? [basicSsl()] : [])],
    server: {
      host: true, // Expone el servidor a la red local
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
        ...(useHttps && {
          '/socket.io': {
            target: 'http://localhost:3000',
            ws: true,
            changeOrigin: true,
          },
        }),
      },
    },
  }
})
