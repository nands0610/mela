"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Download } from "lucide-react";

interface ImageViewerProps {
    images: string[];
    initialIndex?: number;
    isOpen: boolean;
    onClose: () => void;
}

export default function ImageViewer({
    images,
    initialIndex = 0,
    isOpen,
    onClose,
}: ImageViewerProps) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);

    // Update index if initialIndex changes when opening
    useEffect(() => {
        if (isOpen) {
            setCurrentIndex(initialIndex);
        }
    }, [initialIndex, isOpen]);

    // Handle keyboard navigation
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowLeft") prevImage();
            if (e.key === "ArrowRight") nextImage();
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

    const nextImage = () => {
        setCurrentIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = () => {
        setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                    onClick={onClose}
                >
                    {/* Top Bar */}
                    <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-50 text-white pointer-events-none">
                        <span className="text-sm font-medium opacity-80 drop-shadow-md">
                            {currentIndex + 1} of {images.length}
                        </span>
                        <div className="flex gap-4 pointer-events-auto">
                            {/* Placeholder Download Button (Optional) */}
                            {/* <button className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <Download className="w-5 h-5" />
                    </button> */}
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                    </div>

                    {/* Main Image Stage */}
                    <motion.div
                        key={currentIndex}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="relative w-full max-w-3xl aspect-[4/3] rounded-lg overflow-hidden shadow-2xl bg-transparent"
                        onClick={(e) => e.stopPropagation()} // Prevent close when clicking image itself
                    >
                        <img
                            src={images[currentIndex]}
                            alt={`View ${currentIndex + 1}`}
                            className="h-full w-full object-contain"
                        />
                    </motion.div>
                    {/* Navigation Arrows */}
                    <button
                        onClick={(e) => { e.stopPropagation(); prevImage(); }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all z-20"
                    >
                        <ChevronLeft className="w-8 h-8" />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); nextImage(); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-all z-20"
                    >
                        <ChevronRight className="w-8 h-8" />
                    </button>

                    {/* Thumbnails Strip */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-20 flex justify-center gap-2 overflow-x-auto">
                        {images.map((img, idx) => (
                            <button
                                key={idx}
                                onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                                className={`relative w-16 h-16 rounded-md overflow-hidden border-2 transition-all flex-shrink-0 ${idx === currentIndex ? "border-white scale-110" : "border-transparent opacity-50 hover:opacity-100"
                                    }`}
                            >
                                <img
                                    src={img}
                                    alt={`Thumbnail ${idx}`}
                                    className="h-full w-full object-cover"
                                />
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </AnimatePresence>
    );
}
