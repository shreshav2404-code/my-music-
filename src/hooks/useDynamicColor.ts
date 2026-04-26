import { useEffect, useState } from 'react';
import ImageColors from 'react-native-image-colors';

export function useDynamicColor(imageUri?: string, fallback = '#1DB954'): string {
  const [color, setColor] = useState(fallback);

  useEffect(() => {
    let mounted = true;

    if (!imageUri) {
      setColor(fallback);
      return;
    }

    ImageColors.getColors(imageUri, {
      cache: true,
      key: imageUri,
    })
      .then((result) => {
        if (!mounted) {
          return;
        }

        if (result.platform === 'android') {
          setColor(result.dominant || fallback);
        } else {
          setColor((result as any).primary || fallback);
        }
      })
      .catch(() => {
        if (mounted) {
          setColor(fallback);
        }
      });

    return () => {
      mounted = false;
    };
  }, [imageUri, fallback]);

  return color;
}