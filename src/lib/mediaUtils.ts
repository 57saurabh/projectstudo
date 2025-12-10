
/**
 * Compresses an image file to be under a certain size limit (default 4MB).
 * Returns a Promise that resolves with the compressed Base64 string.
 */
export const compressImage = async (file: File, maxSizeMB: number = 4, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Max dimensions to avoid massive canvas (e.g. 1920px max)
                const MAX_DIMENSION = 1920;
                if (width > height) {
                    if (width > MAX_DIMENSION) {
                        height *= MAX_DIMENSION / width;
                        width = MAX_DIMENSION;
                    }
                } else {
                    if (height > MAX_DIMENSION) {
                        width *= MAX_DIMENSION / height;
                        height = MAX_DIMENSION;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Canvas context not available'));
                    return;
                }
                ctx.drawImage(img, 0, 0, width, height);

                // Start with requested quality
                let dataUrl = canvas.toDataURL('image/jpeg', quality);

                // Simple iterative reduction if still too big (rough check)
                // Base64 length ~ 4/3 of bytes. 4MB = 4 * 1024 * 1024 bytes.
                // Target length = 4 * 1024 * 1024 * 1.37 roughly.
                const MAX_LENGTH = maxSizeMB * 1024 * 1024 * 1.37;

                if (dataUrl.length > MAX_LENGTH) {
                    // Try lower quality
                    dataUrl = canvas.toDataURL('image/jpeg', 0.5);
                }

                resolve(dataUrl);
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};
