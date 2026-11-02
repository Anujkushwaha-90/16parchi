/**
 * Profile Photo Optimizer & Canvas Compressor
 * Resizes and center-crops user uploaded photos into a crisp, ultra-efficient square format.
 */

export interface OptimizedImageResult {
  dataUrl: string;
  fileSize: number;
  width: number;
  height: number;
}

export const optimizeProfilePhoto = async (
  file: File,
  targetDimension: number = 280,
  quality: number = 0.88
): Promise<OptimizedImageResult> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please select a valid image file (PNG, JPG, JPEG, WEBP).'));
      return;
    }

    // Limit raw upload input to 15MB to prevent browser memory issues
    if (file.size > 15 * 1024 * 1024) {
      reject(new Error('Selected image is too large. Please select a photo under 15MB.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to parse image data.'));
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = targetDimension;
          canvas.height = targetDimension;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            reject(new Error('Canvas context not available.'));
            return;
          }

          // Center-crop calculation (aspect-ratio preserved square)
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;

          // High quality image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          ctx.drawImage(
            img,
            sx,
            sy,
            minSide,
            minSide,
            0,
            0,
            targetDimension,
            targetDimension
          );

          // Prefer webp, fallback to jpeg
          let dataUrl = canvas.toDataURL('image/webp', quality);
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }

          // Calculate approximate byte size of base64
          const base64Length = dataUrl.length - (dataUrl.indexOf(',') + 1);
          const approximateBytes = Math.round((base64Length * 3) / 4);

          resolve({
            dataUrl,
            fileSize: approximateBytes,
            width: targetDimension,
            height: targetDimension,
          });
        } catch (err: any) {
          reject(new Error(err?.message || 'Error processing photo.'));
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
};

