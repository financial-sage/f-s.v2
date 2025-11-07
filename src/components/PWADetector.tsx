"use client";

import { useEffect, useState } from 'react';

export function PWADetector() {
  const [isPWA, setIsPWA] = useState(false);
  const [displayMode, setDisplayMode] = useState('');
  const [deviceType, setDeviceType] = useState('');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Detectar si está en modo standalone (instalada)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as { standalone?: boolean }).standalone
      || document.referrer.includes('android-app://');
    
    setIsPWA(isStandalone);

    // Detectar el modo de visualización
    if (window.matchMedia('(display-mode: fullscreen)').matches) {
      setDisplayMode('fullscreen');
    } else if (window.matchMedia('(display-mode: standalone)').matches) {
      setDisplayMode('standalone');
    } else if (window.matchMedia('(display-mode: minimal-ui)').matches) {
      setDisplayMode('minimal-ui');
    } else {
      setDisplayMode('browser');
    }

    // Detectar tipo de dispositivo
    const ua = navigator.userAgent;
    if (ua.includes('Android')) {
      setDeviceType('Android');
    } else if (ua.includes('iPhone') || ua.includes('iPad')) {
      setDeviceType('iOS');
    } else {
      setDeviceType('Desktop');
    }
  }, []);

  // No renderizar nada hasta que esté en el cliente
  if (!isClient) {
    return null;
  }

  // Solo mostrar en desarrollo o si no está instalada
  if (process.env.NODE_ENV !== 'development' && isPWA) {
    return null;
  }

  return (
    <div className="fixed bottom-24 left-4 right-4 z-50 lg:bottom-4 lg:left-auto lg:right-4 lg:w-80">
      <div className="bg-zinc-900/95 backdrop-blur-sm border border-zinc-700 rounded-lg p-4 text-sm">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-3 h-3 rounded-full ${isPWA ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
          <span className="font-semibold text-white">
            {isPWA ? '✅ PWA Instalada' : '⚠️ No instalada'}
          </span>
        </div>
        <div className="text-zinc-400 space-y-1">
          <p><strong>Modo:</strong> {displayMode}</p>
          <p><strong>Device:</strong> {deviceType}</p>
          {!isPWA && (
            <div className="mt-3 pt-3 border-t border-zinc-700 text-xs">
              <p className="text-yellow-400 mb-2">📱 Para pantalla completa ({deviceType}):</p>
              <ol className="list-decimal list-inside space-y-1">
                {deviceType === 'Android' ? (
                  <>
                    <li>Chrome → Menú (⋮)</li>
                    <li>&quot;Agregar a pantalla de inicio&quot;</li>
                    <li>Abrir desde el ícono en el Home</li>
                  </>
                ) : deviceType === 'iOS' ? (
                  <>
                    <li>Safari → Botón compartir (□↑)</li>
                    <li>&quot;Agregar a pantalla de inicio&quot;</li>
                    <li>Abrir desde el ícono en el Home</li>
                  </>
                ) : (
                  <>
                    <li>Chrome → Ícono de instalación en barra</li>
                    <li>O menú → &quot;Instalar app&quot;</li>
                  </>
                )}
              </ol>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
