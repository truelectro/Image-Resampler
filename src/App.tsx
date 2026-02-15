import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Image as ImageIcon, Download, Settings, Trash2, CheckCircle2, ChevronRight } from 'lucide-react';
import { processImage, ImageFormat, ResizeOptions, ProcessedImage } from './utils/imageProcessor';
import JSZip from 'jszip';

interface ImageFile {
    id: string;
    file: File;
    previewUrl: string;
    status: 'idle' | 'processing' | 'done' | 'error';
    processed?: ProcessedImage;
}

export default function App() {
    const [images, setImages] = useState<ImageFile[]>([]);
    const [resizeMode, setResizeMode] = useState<'pixels' | 'percentage'>('percentage');
    const [globalValue, setGlobalValue] = useState<number>(100);
    const [targetFormat, setTargetFormat] = useState<ImageFormat>('image/webp');
    const [isProcessing, setIsProcessing] = useState(false);

    const onDrop = useCallback((e: React.DragEvent | React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        let files: File[] = [];
        if ('dataTransfer' in e && e.dataTransfer.files) {
            files = Array.from(e.dataTransfer.files);
        } else if ('target' in e && e.target instanceof HTMLInputElement && e.target.files) {
            files = Array.from(e.target.files);
        }

        const newImages = files
            .filter(f => f.type.startsWith('image/'))
            .map(f => ({
                id: Math.random().toString(36).substring(7),
                file: f,
                previewUrl: URL.createObjectURL(f),
                status: 'idle' as const,
            }));

        setImages(prev => [...prev, ...newImages]);
    }, []);

    const removeImage = (id: string) => {
        setImages(prev => prev.filter(img => img.id !== id));
    };

    const processAll = async () => {
        setIsProcessing(true);
        const updatedImages = [...images];

        for (let i = 0; i < updatedImages.length; i++) {
            const img = updatedImages[i];
            if (img.status === 'done') continue;

            try {
                setImages(prev => prev.map((item, idx) =>
                    idx === i ? { ...item, status: 'processing' } : item
                ));

                const options: ResizeOptions = {
                    format: targetFormat,
                    percentage: resizeMode === 'percentage' ? globalValue : undefined,
                    width: resizeMode === 'pixels' ? globalValue : undefined,
                };

                const processed = await processImage(img.file, options);

                setImages(prev => prev.map((item, idx) =>
                    idx === i ? { ...item, status: 'done', processed } : item
                ));
            } catch (err) {
                console.error(err);
                setImages(prev => prev.map((item, idx) =>
                    idx === i ? { ...item, status: 'error' } : item
                ));
            }
        }
        setIsProcessing(false);
    };

    const downloadZip = async () => {
        const zip = new JSZip();
        images.forEach(img => {
            if (img.processed) {
                zip.file(img.processed.name, img.processed.blob);
            }
        });
        const content = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'resampled-images.zip';
        a.click();
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 p-8 lg:p-12">
            <div className="max-w-6xl mx-auto space-y-12">
                {/* Header */}
                <div className="flex flex-col items-center text-center space-y-4">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-medium"
                    >
                        <span>v1.0.0</span>
                        <ChevronRight size={14} />
                        <span>Premium Image Processor</span>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-5xl md:text-7xl font-bold tracking-tight gradient-text"
                    >
                        ImageResampler
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-zinc-400 text-lg max-w-2xl"
                    >
                        Fast, secure, batch image processing directly in your browser.
                        Resize and convert images for web & apps without uploading to any server.
                    </motion.p>
                </div>

                {/* Action Bar */}
                <div className="flex flex-col md:flex-row gap-6 items-center justify-between glass-morphism p-6 rounded-3xl">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex bg-zinc-900/50 p-1 rounded-xl border border-zinc-800">
                            <button
                                onClick={() => setResizeMode('percentage')}
                                className={`px-4 py-2 rounded-lg text-sm transition-all ${resizeMode === 'percentage' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}
                            >
                                Percentage
                            </button>
                            <button
                                onClick={() => setResizeMode('pixels')}
                                className={`px-4 py-2 rounded-lg text-sm transition-all ${resizeMode === 'pixels' ? 'bg-indigo-600 text-white shadow-lg' : 'text-zinc-400 hover:text-white'}`}
                            >
                                Pixels (Width)
                            </button>
                        </div>

                        <div className="flex items-center space-x-3 bg-zinc-900/50 p-2 px-4 rounded-xl border border-zinc-800">
                            <span className="text-sm text-zinc-500">{resizeMode === 'percentage' ? '%' : 'px'}</span>
                            <input
                                type="number"
                                value={globalValue}
                                onChange={(e) => setGlobalValue(Number(e.target.value))}
                                className="bg-transparent border-none outline-none text-white w-16 text-center font-mono"
                            />
                        </div>

                        <select
                            value={targetFormat}
                            onChange={(e) => setTargetFormat(e.target.value as ImageFormat)}
                            className="bg-zinc-900/50 text-white px-4 py-2.5 rounded-xl border border-zinc-800 outline-none cursor-pointer hover:border-zinc-700 transition-colors"
                        >
                            <option value="image/webp">WebP</option>
                            <option value="image/png">PNG</option>
                            <option value="image/jpeg">JPEG</option>
                        </select>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={processAll}
                            disabled={images.length === 0 || isProcessing}
                            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold text-white shadow-lg shadow-indigo-500/20"
                        >
                            {isProcessing ? (
                                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Settings size={20} />
                            )}
                            <span>Process All</span>
                        </button>

                        <button
                            onClick={downloadZip}
                            disabled={images.filter(i => i.status === 'done').length === 0}
                            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-zinc-100 text-zinc-900 hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
                        >
                            <Download size={20} />
                            <span>Download Zip</span>
                        </button>
                    </div>
                </div>

                {/* Drop Zone */}
                <label
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={onDrop}
                    className="relative group cursor-pointer"
                >
                    <input type="file" multiple onChange={onDrop} className="hidden" accept="image/*" />
                    <div className="border-2 border-dashed border-zinc-800 group-hover:border-indigo-500/50 rounded-3xl p-12 transition-all bg-zinc-900/20 hover:bg-indigo-500/5">
                        <div className="flex flex-col items-center space-y-4">
                            <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 group-hover:scale-110 transition-transform">
                                <Upload className="text-indigo-400" size={32} />
                            </div>
                            <div className="text-center">
                                <p className="text-xl font-medium">Click or Drag & Drop Photos</p>
                                <p className="text-zinc-500 mt-1">PNG, JPG, WEBP formats supported</p>
                            </div>
                        </div>
                    </div>
                </label>

                {/* Image Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence>
                        {images.map((img) => (
                            <motion.div
                                key={img.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="glass-morphism rounded-2xl overflow-hidden flex flex-col group relative"
                            >
                                <div className="aspect-video relative overflow-hidden bg-zinc-900">
                                    <img
                                        src={img.processed?.previewUrl || img.previewUrl}
                                        alt={img.file.name}
                                        className={`w-full h-full object-cover transition-all duration-500 ${img.status === 'processing' ? 'blur-sm grayscale' : ''}`}
                                    />

                                    {img.status === 'processing' && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950/40">
                                            <div className="w-8 h-8 border-3 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
                                        </div>
                                    )}

                                    {img.status === 'done' && (
                                        <div className="absolute top-3 right-3 p-1.5 bg-green-500 rounded-full shadow-lg">
                                            <CheckCircle2 size={16} className="text-white" />
                                        </div>
                                    )}

                                    <button
                                        onClick={() => removeImage(img.id)}
                                        className="absolute top-3 left-3 p-1.5 bg-zinc-900/80 hover:bg-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-all backdrop-blur-sm"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                <div className="p-4 flex flex-col space-y-1">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium truncate max-w-[150px]">{img.file.name}</span>
                                        <span className="text-xs text-zinc-500">{(img.file.size / 1024).toFixed(0)} KB</span>
                                    </div>
                                    {img.processed ? (
                                        <div className="flex items-center space-x-2 text-[10px] text-zinc-400 mt-2">
                                            <span className="bg-zinc-800 px-1.5 py-0.5 rounded uppercase">{img.processed.blob.type.split('/')[1]}</span>
                                            <span>•</span>
                                            <span>{img.processed.width}x{img.processed.height}</span>
                                            <span>•</span>
                                            <span className="text-indigo-400">{(img.processed.blob.size / 1024).toFixed(0)} KB</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center space-x-2 text-[10px] text-zinc-500 mt-2">
                                            <ImageIcon size={12} />
                                            <span>Ready to process</span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
