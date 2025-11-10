"use client";

import { useEffect } from 'react';

export function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      console.log('Service Worker not supported');
      return;
    }

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          console.log('✅ Service Worker registrado con éxito:', registration.scope);
          
          // Verificar actualizaciones
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            console.log('🔄 Nueva versión del Service Worker detectada');
            
            newWorker?.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                console.log('✨ Nueva versión activada');
                // Podrías mostrar un mensaje al usuario aquí
              }
            });
          });
        })
        .catch((error) => {
          console.error('❌ Error al registrar Service Worker:', error);
        });

      // Verificar si ya está instalado
      navigator.serviceWorker.ready.then((registration) => {
        console.log('📱 PWA lista para instalar');
      });
    });

    // Detectar cambios de estado de la conexión
    window.addEventListener('online', () => {
      console.log('🌐 Conexión restaurada');
    });

    window.addEventListener('offline', () => {
      console.log('📡 Modo offline - usando caché');
    });
  }, []);

  return null;
}
