"use client";

import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Phone, Instagram, MapPin, ZoomIn, Sparkles, Trophy, MessageCircle, Star, Gift, QrCode } from "lucide-react";
import ImageViewer from "@/components/ui/image-viewer";

type PageProps = {
    params: Promise<{ category: string; stall: string }>;
};

export default function StallPage({ params }: PageProps) {
    const { category, stall: stallSlug } = use(params);
    const [viewerOpen, setViewerOpen] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [stallData, setStallData] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [menuPage, setMenuPage] = useState(0);

    useEffect(() => {
        const loadStall = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(`/api/public/stalls/${stallSlug}`);
                if (!response.ok) {
                    throw new Error("Failed to load stall");
                }
                const data = await response.json();
                if (!data.stall) {
                    setStallData(null);
                } else {
                    setStallData(data.stall);
                }
            } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : "Failed to load stall");
            } finally {
                setIsLoading(false);
            }
        };

        void loadStall();
    }, [stallSlug]);

    useEffect(() => {
        setMenuPage(0);
    }, [stallData?.items]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center text-neutral-600">
                Loading stall...
            </div>
        );
    }

    if (errorMessage) {
        return (
            <div className="min-h-screen flex items-center justify-center text-neutral-600">
                {errorMessage}
            </div>
        );
    }

    if (!stallData) {
        return notFound();
    }

    const heroImage = stallData.bannerImage?.trim()
        ? stallData.bannerImage
        : "/images/food.png";
    const galleryImages = Array.isArray(stallData.images) && stallData.images.length > 0
        ? stallData.images.filter(Boolean)
        : heroImage
            ? [heroImage]
            : [];
    const bucketBase = process.env.NEXT_PUBLIC_R2_BUCKET_URL?.replace(/\/$/, "");
    const toMediaUrl = (value: string) => {
        if (!bucketBase) return value;
        if (value.startsWith(bucketBase)) {
            const key = value.slice(bucketBase.length + 1);
            return `/api/media?key=${encodeURIComponent(key)}`;
        }
        return value;
    };

    const isRemoteUrl = (value: string) => value.startsWith("http://") || value.startsWith("https://");
    const heroSrc = toMediaUrl(heroImage);
    const viewerImages = galleryImages.map(toMediaUrl);
    const displayImages = galleryImages.slice(0, 3);
    const remainingImageCount = Math.max(galleryImages.length - displayImages.length, 0);

    const menuItems = Array.isArray(stallData.items) ? stallData.items : [];
    const menuPageSize = 5;
    const menuPageCount = Math.ceil(menuItems.length / menuPageSize);
    const menuStart = menuPage * menuPageSize;
    const visibleMenuItems = menuItems.slice(menuStart, menuStart + menuPageSize);
    const hasMoreMenuItems = menuPage + 1 < menuPageCount;
    const getMenuItemText = (item: { name?: string; price?: string } | string) => {
        if (typeof item === "string") return { name: item, price: "" };
        return { name: item?.name ?? "", price: item?.price ?? "" };
    };

    const openViewer = (index: number) => {
        setCurrentImageIndex(index);
        setViewerOpen(true);
    };

    return (
        <div className="min-h-screen bg-white text-neutral-900 font-sans">
            {/* Image Viewer Overlay */}
            <ImageViewer
                isOpen={viewerOpen}
                onClose={() => setViewerOpen(false)}
                images={viewerImages}
                initialIndex={currentImageIndex}
            />

            {/* Hero Banner */}
            <div className="relative h-[50vh] w-full bg-neutral-900">
                <img
                    src={heroSrc}
                    alt={stallData.name}
                    className="h-full w-full object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

                {/* Navigation - Adjusted top spacing for fixed header */}
                <div className="absolute top-24 left-8 md:left-12 z-20">
                    <Link
                        href={`/${category}`}
                        className="inline-flex items-center text-white/80 hover:text-white transition-colors bg-black/20 hover:bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Back to {category}
                    </Link>
                </div>

                {/* Title Overlay */}
                <div className="absolute bottom-0 left-0 w-full p-8 md:p-12">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl md:text-7xl font-bold text-white mb-2"
                    >
                        {stallData.name}
                    </motion.h1>
                    <div className="flex flex-wrap items-center gap-4 text-white/90 text-lg">
                        <span className="bg-orange-600 px-3 py-1 rounded-full text-sm font-semibold uppercase tracking-wider">
                            {stallData.category}
                        </span>
                        {stallData.stallNumber && (
                            <span className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" /> Stall No. {stallData.stallNumber}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
                {/* Left Column: Description & Gallery */}
                <div className="lg:col-span-2 space-y-12">
                    {/* Description */}
                    <section>
                        <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
                            About Us
                        </h2>
                        <p className="text-lg text-neutral-600 leading-relaxed whitespace-pre-line">
                            {stallData.description}
                        </p>
                    </section>

                    {menuItems.length > 0 && (
                        <section className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <h2 className="text-3xl font-bold">Menu</h2>
                                <span className="text-sm text-neutral-500">
                                    Showing {Math.min(menuStart + 1, menuItems.length)}-{Math.min(menuStart + menuPageSize, menuItems.length)} of {menuItems.length}
                                </span>
                            </div>
                            <div className="mt-6 space-y-3">
                                {visibleMenuItems.map((item, idx) => {
                                    const { name, price } = getMenuItemText(item);
                                    if (!name && !price) return null;
                                    return (
                                        <div key={`${name}-${idx}`} className="flex items-center justify-between rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3">
                                            <span className="text-base font-semibold text-neutral-800">{name || "Item"}</span>
                                            {price && <span className="text-sm font-semibold text-neutral-600">{price}</span>}
                                        </div>
                                    );
                                })}
                            </div>
                            {menuPageCount > 1 && (
                                <button
                                    type="button"
                                    onClick={() => setMenuPage((prev) => (hasMoreMenuItems ? prev + 1 : 0))}
                                    className="mt-5 inline-flex items-center justify-center rounded-full border border-neutral-200 bg-white px-5 py-2 text-sm font-semibold text-neutral-700 shadow-sm transition hover:border-orange-300 hover:text-orange-600"
                                >
                                    {hasMoreMenuItems ? "Show next 5" : "Back to start"}
                                </button>
                            )}
                        </section>
                    )}

                    {/* Gallery */}
                    <section>
                        <h2 className="text-3xl font-bold mb-6">Gallery</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {displayImages.map((img, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    whileInView={{ opacity: 1, scale: 1 }}
                                    viewport={{ once: true }}
                                    onClick={() => openViewer(idx)}
                                    className={`relative group rounded-2xl overflow-hidden h-64 shadow-lg hover:shadow-xl transition-shadow cursor-zoom-in ${idx === 0 && galleryImages.length > 2 ? 'md:col-span-2 md:h-80' : ''}`}
                                >
                                    <img
                                        src={toMediaUrl(img)}
                                        alt={`Gallery image ${idx + 1}`}
                                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                        onError={(event) => {
                                            const target = event.currentTarget;
                                            if (target.dataset.fallbackApplied === "true") return;
                                            target.dataset.fallbackApplied = "true";
                                            target.src = heroSrc;
                                        }}
                                    />
                                    {/* Hover Overlay with Icon */}
                                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                        <div className="bg-white/20 backdrop-blur-md p-3 rounded-full text-white">
                                            <ZoomIn className="w-6 h-6" />
                                        </div>
                                    </div>
                                    {idx === 2 && remainingImageCount > 0 && (
                                        <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
                                            <span className="text-white text-2xl font-semibold">+{remainingImageCount}</span>
                                        </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Right Column: Key Details & Pricing */}
                <div className="space-y-8">

                    {/* Location Card */}
                    <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-indigo-600">
                            <MapPin className="w-5 h-5" />
                            Location
                        </h3>
                        <div className="space-y-4">
                            {stallData.availableAt && (
                                <div>
                                    <p className="text-xs font-bold text-neutral-400 uppercase mb-1">Available At</p>
                                    <ul className="space-y-1">
                                        {stallData.availableAt.map((loc, idx) => (
                                            <li key={idx} className="text-neutral-700 font-medium flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                                {loc}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {stallData.stallNumber && (
                                <div className="bg-neutral-50 p-3 rounded-lg border border-neutral-200 inline-block">
                                    <p className="text-xs font-bold text-neutral-400 uppercase mb-1">Stall No.</p>
                                    <p className="text-2xl font-black text-neutral-800">{stallData.stallNumber}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Offers Card */}
                    {stallData.offers && (
                        <div className="bg-gradient-to-br from-pink-50 to-rose-50 p-6 rounded-2xl border border-pink-100 shadow-sm">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-rose-600">
                                <Gift className="w-5 h-5" />
                                Current Offers
                            </h3>
                            <ul className="space-y-3">
                                {stallData.offers.map((offer, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-neutral-800 font-medium">
                                        <span className="text-xl">🎉</span>
                                        <span>{offer}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Owner & Contact Card */}
                    <div className="bg-neutral-50 p-6 rounded-2xl border border-neutral-100 shadow-xl">
                        <h3 className="text-xl font-bold mb-6 border-b pb-2">Contact & Order</h3>
                        <div className="space-y-4 mb-6">
                            <div className="flex items-center gap-3 text-lg font-medium">
                                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-600">
                                    <span className="text-xl font-bold">{stallData.ownerName.charAt(0)}</span>
                                </div>
                                {stallData.ownerName}
                            </div>

                            <a href={`tel:${stallData.ownerPhone}`} className="flex items-center gap-3 text-neutral-600 hover:text-orange-600 transition-colors p-2 rounded-lg hover:bg-orange-50">
                                <Phone className="w-5 h-5" />
                                {stallData.ownerPhone}
                            </a>

                            {stallData.instagram && (
                                <a
                                    href={`https://instagram.com/${stallData.instagram.replace('@', '')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 text-neutral-600 hover:text-pink-600 transition-colors p-2 rounded-lg hover:bg-pink-50"
                                >
                                    <Instagram className="w-5 h-5" />
                                    {stallData.instagram}
                                </a>
                            )}
                        </div>

                        {/* Payment & Ordering Info */}
                        <div className="bg-white p-4 rounded-xl border border-neutral-200 space-y-3">
                            {stallData.paymentMethods && (
                                <div>
                                    <p className="text-xs font-bold text-neutral-400 uppercase mb-2">Payment</p>
                                    <div className="flex gap-2">
                                        {stallData.paymentMethods.map((pm, i) => (
                                            <span key={i} className="px-2 py-1 bg-neutral-100 text-neutral-600 text-xs font-bold rounded flex items-center gap-1">
                                                {pm === 'UPI' && <QrCode className="w-3 h-3" />}
                                                {pm}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div>
                                <p className="text-xs font-bold text-neutral-400 uppercase mb-2">How to Order</p>
                                <p className="text-sm text-neutral-600">DM us on Instagram or visit our stall directly to place your order!</p>
                            </div>
                        </div>
                    </div>

                    {/* Stall Highlights */}
                    {stallData.highlights && (
                        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-orange-600">
                                <Sparkles className="w-5 h-5" />
                                Why Buy From Us?
                            </h3>
                            <ul className="space-y-3">
                                {stallData.highlights.map((highlight, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-neutral-700">
                                        <div className="mt-1 min-w-[6px] min-h-[6px] rounded-full bg-orange-500" />
                                        <span>{highlight}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Best Sellers */}
                    {stallData.bestSellers && (
                        <div className="bg-gradient-to-br from-orange-50 to-red-50 p-6 rounded-2xl border border-orange-100 shadow-sm">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-red-600">
                                <Trophy className="w-5 h-5" />
                                Best Sellers
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {stallData.bestSellers.map((item, idx) => (
                                    <span key={idx} className="bg-white text-neutral-800 px-3 py-1 rounded-full text-sm font-medium shadow-sm border border-orange-100">
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Reviews */}
                    {stallData.reviews && (
                        <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
                            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                <MessageCircle className="w-5 h-5 text-blue-500" />
                                Customer Love
                            </h3>
                            <div className="space-y-4">
                                {stallData.reviews.map((review, idx) => (
                                    <div key={idx} className="border-b border-dashed border-neutral-100 last:border-0 pb-3 last:pb-0">
                                        <div className="flex items-center gap-1 text-yellow-500 mb-1">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} className={`w-3 h-3 ${i < review.rating ? "fill-current" : "text-neutral-300"}`} />
                                            ))}
                                        </div>
                                        <p className="text-neutral-600 italic text-sm mb-1">"{review.comment}"</p>
                                        <p className="text-xs font-bold text-neutral-400">- {review.user}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

