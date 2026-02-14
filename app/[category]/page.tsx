"use client";

import { notFound } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react"; // Assuming lucide-react is installed as seen in package.json
import { use, useEffect, useMemo, useState } from "react";

type PageProps = {
    params: Promise<{ category: string }>;
};

export default function CategoryPage({ params }: PageProps) {
    // const { category } = React.use(params); // Next.js 15+ async params
    // Checking Next.js version in package.json: "next": "16.1.3"
    // In Next.js 15/16, params is a Promise.

    const { category } = use(params);

    // Validate category
    const validCategories = ["food", "accessories", "games"];
    if (!validCategories.includes(category.toLowerCase())) {
        return notFound();
    }

    const [stalls, setStalls] = useState<Array<{
        name: string;
        slug: string;
        category: string;
        description: string;
        bannerImage: string;
        logoImage?: string;
        ownerName: string;
        highlights?: string[];
        offers?: string[];
        bestSellers?: string[];
        items?: Array<{ name?: string; price?: string } | string>;
    }>>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const loadStalls = async () => {
            try {
                setIsLoading(true);
                const response = await fetch(`/api/public/stalls?category=${category}`);
                if (!response.ok) {
                    throw new Error("Failed to load stalls");
                }
                const data = await response.json();
                setStalls(data.stalls ?? []);
            } catch (error) {
                setErrorMessage(error instanceof Error ? error.message : "Failed to load stalls");
            } finally {
                setIsLoading(false);
            }
        };

        void loadStalls();
    }, [category]);
    const title = category.charAt(0).toUpperCase() + category.slice(1);

    const getFallbackBanner = (cat: string) => {
        switch (cat.toLowerCase()) {
            case "accessories":
                return "/images/accessories.png";
            case "games":
                return "/images/games.png";
            default:
                return "/images/food.png";
        }
    };

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

    const normalizedQuery = searchQuery.trim().toLowerCase();
    const hasSearch = normalizedQuery.length > 0;
    const filteredStalls = useMemo(() => {
        if (!hasSearch) return stalls;

        const getItemText = (item: { name?: string; price?: string } | string) => {
            if (typeof item === "string") return item;
            const name = item?.name ?? "";
            const price = item?.price ?? "";
            return `${name} ${price}`.trim();
        };

        return stalls.filter((stall) => {
            const searchParts = [
                stall.ownerName,
                stall.name,
                stall.description,
                ...(stall.highlights ?? []),
                ...(stall.offers ?? []),
                ...(stall.bestSellers ?? []),
                ...(stall.items ?? []).map(getItemText),
            ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();
            return searchParts.includes(normalizedQuery);
        });
    }, [hasSearch, normalizedQuery, stalls]);

    const visibleStalls = filteredStalls;

    return (
        <div className="min-h-screen bg-white text-neutral-900 p-8 md:p-12">
            {/* Background decoration */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-orange-500/20 rounded-full blur-3xl opacity-50" />
                <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-purple-500/20 rounded-full blur-3xl opacity-50" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-16">
                    <Link
                        href="/"
                        className="inline-flex items-center text-neutral-500 hover:text-neutral-900 mb-6 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5 mr-2" />
                        Back to Home
                    </Link>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-7xl md:text-9xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600 mb-4"
                    >
                        {title.toUpperCase()}
                    </motion.h1>
                    <p className="text-xl text-neutral-600 max-w-2xl">
                        Explore the best {category} stalls at our Mela. Hover over the cards to see more!
                    </p>
                </div>

                <div className="mt-10 max-w-3xl">
                    <label htmlFor="category-search" className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
                        Search stalls
                    </label>
                    <div className="mt-3">
                        <input
                            id="category-search"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                            placeholder={`Search ${category} stalls by name, owner, or menu...`}
                            className="w-full rounded-full border border-neutral-200 bg-white px-5 py-3 text-sm shadow-sm focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
                        />
                    </div>
                </div>

                {/* Stalls Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-10">
                    {visibleStalls.map((stall, index) => {
                        const image = stall.logoImage?.trim() || stall.bannerImage?.trim() || getFallbackBanner(category);
                        const imageSrc = toMediaUrl(image);
                        const stallKey = `${category}-${stall.slug ?? stall.name ?? "stall"}-${index}`;
                        return (
                        <Link key={stallKey} href={`/${category}/${(stall.slug ?? "").toLowerCase()}`}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1 }}
                                whileHover={{ scale: 1.05, y: -10 }}
                                className="group relative h-96 w-full rounded-2xl overflow-hidden cursor-pointer shadow-2xl"
                            >
                                {/* Background Image */}
                                <img
                                    src={imageSrc}
                                    alt={stall.name}
                                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />

                                {/* Overlay Gradient */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                                {/* Content */}
                                <div className="absolute bottom-0 left-0 w-full p-8 translate-y-2 group-hover:translate-y-0 transition-transform duration-300">
                                    <h2 className="text-3xl font-bold text-white mb-2 drop-shadow-md">
                                        {stall.name}
                                    </h2>

                                    {/* Cute Hover Popup Info */}
                                    <div className="overflow-hidden h-0 group-hover:h-auto transition-all duration-300">
                                        <p className="text-orange-300 font-medium mb-1">
                                            Owner: {stall.ownerName}
                                        </p>
                                        <p className="text-white/80 text-sm line-clamp-2">
                                            {stall.description}
                                        </p>
                                        <div className="mt-4 inline-block px-4 py-2 bg-white text-black font-bold rounded-full text-sm">
                                            Visit Stall →
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </Link>
                    )})}
                </div>

                {isLoading && (
                    <div className="text-center py-20">
                        <h2 className="text-2xl text-neutral-400">Loading stalls...</h2>
                    </div>
                )}

                {!isLoading && errorMessage && (
                    <div className="text-center py-20">
                        <h2 className="text-2xl text-neutral-400">{errorMessage}</h2>
                    </div>
                )}

                {!isLoading && !errorMessage && stalls.length === 0 && (
                    <div className="text-center py-20">
                        <h2 className="text-2xl text-neutral-400">No stalls found in this category yet.</h2>
                    </div>
                )}

                {!isLoading && !errorMessage && hasSearch && visibleStalls.length === 0 && stalls.length > 0 && (
                    <div className="text-center py-20">
                        <h2 className="text-2xl text-neutral-400">No stalls match your search.</h2>
                    </div>
                )}
            </div>
        </div>
    );
}
