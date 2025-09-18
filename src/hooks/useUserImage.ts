import { useState, useEffect } from 'react';
import { AppSession } from '@/src/types/types';
import { useImageLoader } from './useImageLoader';

export function useUserImage(session: AppSession | null) {
  const [userImageUrl, setUserImageUrl] = useState<string>("");
  
  useEffect(() => {
    if (!session?.user) {
      setUserImageUrl("https://ui-avatars.com/api/?name=User&background=6366f1&color=fff");
      return;
    }

    const user = session.user;
    
    // Buscar imagen en diferentes campos posibles
    const possibleImages = [
      user.picture,
      user.metadata?.picture,
      user.metadata?.avatar_url,
      user.metadata?.image,
      user.metadata?.profile_picture,
      user.metadata?.photo,
    ].filter(Boolean) as string[];
    
    if (possibleImages.length > 0) {
      const selectedImage = possibleImages[0];
      setUserImageUrl(selectedImage);
    } else {
      // Generar avatar basado en el nombre del usuario
      const name = user.full_name || user.email || 'User';
      const encodedName = encodeURIComponent(name);
      setUserImageUrl(`https://ui-avatars.com/api/?name=${encodedName}&background=6366f1&color=fff&size=96`);
    }
  }, [session]);

  const fallbackUrl = session?.user 
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(session.user.full_name || session.user.email || 'User')}&background=6366f1&color=fff&size=96`
    : "https://ui-avatars.com/api/?name=User&background=6366f1&color=fff&size=96";

  const { imgSrc, isLoading, hasError } = useImageLoader(userImageUrl, fallbackUrl);
  
  return { imgSrc, isLoading, hasError };
}
