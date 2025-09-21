/**
 * Utilidad para obtener la URL base correcta en diferentes entornos
 */
export function getBaseUrl(): string {
  // En el servidor (SSR)
  if (typeof window === 'undefined') {
    // En desarrollo, usar localhost por defecto
    if (process.env.NODE_ENV === 'development') {
      return 'http://localhost:3000';
    }
    // En producción, usar la variable de entorno
    return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  }
  
  // En el cliente (browser)
  return window.location.origin;
}

/**
 * Obtiene la URL de redirección para OAuth
 */
export function getOAuthRedirectUrl(path: string = '/'): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}