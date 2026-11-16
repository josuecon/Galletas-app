import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App.tsx';
import './index.css';

// Registro controlado del Service Worker para caché de recursos estáticos y actualización segura
registerSW({
  immediate: true,
  onRegisterError(error) {
    console.error('Error al registrar el Service Worker:', error);
  },
});

createRoot(document.getElementById('root')!).render(<App />);
