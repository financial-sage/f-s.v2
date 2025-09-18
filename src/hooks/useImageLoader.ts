import { useState, useEffect } from 'react';

export function useImageLoader(src: string, fallback: string = "https://ui-avatars.com/api/?name=User&background=6366f1&color=fff") {
  const [imgSrc, setImgSrc] = useState<string>(fallback);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    if (!src || src === fallback) {
      setImgSrc(fallback);
      setHasError(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setHasError(false);

    // Crear una imagen temporal para probar si se carga
    const testImg = new Image();
    
    testImg.onload = () => {
      setImgSrc(src);
      setIsLoading(false);
      setHasError(false);
    };

    testImg.onerror = (e) => {
      // Intentar con diferentes parámetros de Google
      if (src.includes('googleusercontent.com')) {
        const modifiedSrc = src.replace('=s96-c', '=s96'); // Remover el crop
        
        const testImg2 = new Image();
        testImg2.onload = () => {
          setImgSrc(modifiedSrc);
          setIsLoading(false);
          setHasError(false);
        };
        
        testImg2.onerror = () => {
          setImgSrc(fallback);
          setIsLoading(false);
          setHasError(true);
        };
        
        testImg2.src = modifiedSrc;
      } else {
        // Para URLs que no son de Google, usar fallback directamente
        setImgSrc(fallback);
        setIsLoading(false);
        setHasError(true);
      }
    };

    testImg.src = src;
  }, [src, fallback]);

  return { imgSrc, isLoading, hasError };
}
