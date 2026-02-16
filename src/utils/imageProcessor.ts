import Upscaler from 'upscaler';

export type ImageFormat = 'image/png' | 'image/jpeg' | 'image/webp';

export interface ResizeOptions {
    width?: number;
    height?: number;
    percentage?: number;
    format: ImageFormat;
    quality?: number;
    upscale?: boolean;
}

export interface ProcessedImage {
    name: string;
    blob: Blob;
    previewUrl: string;
    originalWidth: number;
    originalHeight: number;
    width: number;
    height: number;
}

export async function processImage(
    file: File,
    options: ResizeOptions
): Promise<ProcessedImage> {
    const sourceUrl = URL.createObjectURL(file);

    let imgSource: string | HTMLImageElement = sourceUrl;

    if (options.upscale) {
        const upscaler = new Upscaler();
        imgSource = await upscaler.upscale(sourceUrl);
    }

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let targetWidth = img.width;
            let targetHeight = img.height;

            if (options.percentage) {
                targetWidth = img.width * (options.percentage / 100);
                targetHeight = img.height * (options.percentage / 100);
            } else if (options.width && options.height) {
                targetWidth = options.width;
                targetHeight = options.height;
            } else if (options.width) {
                const ratio = options.width / img.width;
                targetWidth = options.width;
                targetHeight = img.height * ratio;
            } else if (options.height) {
                const ratio = options.height / img.height;
                targetWidth = img.width * ratio;
                targetHeight = options.height;
            }

            canvas.width = targetWidth;
            canvas.height = targetHeight;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get canvas context'));
                return;
            }

            // Use better image smoothing
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

            canvas.toBlob(
                (blob) => {
                    if (!blob) {
                        reject(new Error('Canvas toBlob failed'));
                        return;
                    }
                    const previewUrl = URL.createObjectURL(blob);
                    const nameSuffix = options.upscale ? " (AI Upscaled)" : "";
                    resolve({
                        name: file.name.replace(/\.[^/.]+$/, "") + nameSuffix + getExtension(options.format),
                        blob,
                        previewUrl,
                        originalWidth: img.width,
                        originalHeight: img.height,
                        width: Math.round(targetWidth),
                        height: Math.round(targetHeight),
                    });
                },
                options.format,
                options.quality || 0.9
            );
            if (options.upscale) {
                // imgSource is a data URL if upscaled
            } else {
                URL.revokeObjectURL(sourceUrl);
            }
        };

        img.onerror = () => {
            URL.revokeObjectURL(sourceUrl);
            reject(new Error('Failed to load image'));
        };
        img.src = typeof imgSource === 'string' ? imgSource : (imgSource as any).src;
    });
}

function getExtension(format: ImageFormat): string {
    switch (format) {
        case 'image/png': return '.png';
        case 'image/jpeg': return '.jpg';
        case 'image/webp': return '.webp';
        default: return '';
    }
}
