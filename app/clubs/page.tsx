"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Search } from "lucide-react";

const categories = ["all", "food", "accessories", "games"] as const;

type ClubStall = {
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
};

export default function ClubsPage() {
  const [stalls, setStalls] = useState<ClubStall[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<(typeof categories)[number]>("all");

  useEffect(() => {
    const loadStalls = async () => {
      try {
        setStatus("loading");
        const response = await fetch("/api/public/clubs");
        if (!response.ok) {
          throw new Error("Failed to load club stalls");
        }
        const data = await response.json();
        setStalls(data.stalls ?? []);
        setStatus("ready");
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Failed to load club stalls");
        setStatus("error");
      }
    };

    void loadStalls();
  }, []);

  const bucketBase = process.env.NEXT_PUBLIC_R2_BUCKET_URL?.replace(/\/$/, "");
  const toMediaUrl = (value: string) => {
    if (!bucketBase) return value;
    if (value.startsWith(bucketBase)) {
      const key = value.slice(bucketBase.length + 1);
      return `/api/media?key=${encodeURIComponent(key)}`;
    }
    return value;
  };

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

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredStalls = useMemo(() => {
    const getItemText = (item: { name?: string; price?: string } | string) => {
      if (typeof item === "string") return item;
      const name = item?.name ?? "";
      const price = item?.price ?? "";
      return `${name} ${price}`.trim();
    };

    return stalls.filter((stall) => {
      const matchesCategory =
        activeCategory === "all" || stall.category?.toLowerCase?.() === activeCategory;

      if (!matchesCategory) return false;
      if (!normalizedQuery) return true;

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
  }, [stalls, activeCategory, normalizedQuery]);

  return (
    <div className="min-h-screen bg-[#0f0e0a] text-white">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute left-[-10%] top-[-20%] h-[32rem] w-[32rem] rounded-full bg-orange-500/30 blur-[140px]" />
          <div className="absolute right-[-20%] top-1/3 h-[28rem] w-[28rem] rounded-full bg-amber-300/20 blur-[160px]" />
          <div className="absolute bottom-[-20%] left-1/4 h-[30rem] w-[30rem] rounded-full bg-emerald-400/10 blur-[160px]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 pb-20 pt-16">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-orange-200">
            Lakshya x Clubs Collab
          </div>
          <h1 className="mt-6 text-5xl md:text-7xl font-black tracking-tight">
            Club Stalls, Curated.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/70">
            Discover the club-run experiences powering the Mela. Filter by category or search across the menu to find your next favorite stall.
          </p>

          <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`rounded-full border px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] transition-all ${
                      isActive
                        ? "border-orange-300 bg-orange-400/20 text-orange-100"
                        : "border-white/10 text-white/60 hover:border-white/30 hover:text-white"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>

            <div className="w-full max-w-md">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Search className="h-4 w-4 text-white/50" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search club stalls, menu items, owners..."
                  className="w-full rounded-full border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder:text-white/40 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/30"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 pb-24">
        {status === "loading" && (
          <div className="py-16 text-center text-white/70">Loading club stalls...</div>
        )}
        {status === "error" && (
          <div className="py-16 text-center text-red-200">{errorMessage ?? "Unable to load stalls."}</div>
        )}
        {status === "ready" && filteredStalls.length === 0 && (
          <div className="py-16 text-center text-white/60">No club stalls match yet.</div>
        )}

        {status === "ready" && filteredStalls.length > 0 && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredStalls.map((stall) => {
              const image = stall.logoImage?.trim() || stall.bannerImage?.trim() || getFallbackBanner(stall.category);
              const imageSrc = toMediaUrl(image);
              const categorySlug = (stall.category ?? "").toLowerCase();
              return (
                <Link
                  key={`${stall.slug}-${stall.category}`}
                  href={`/${categorySlug}/${(stall.slug ?? "").toLowerCase()}`}
                  className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 transition-transform hover:-translate-y-2"
                >
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-80" />
                  <img
                    src={imageSrc}
                    alt={stall.name}
                    className="h-72 w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute bottom-0 left-0 w-full p-6">
                    <p className="text-xs uppercase tracking-[0.3em] text-orange-200">
                      {stall.category}
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold text-white">
                      {stall.name}
                    </h3>
                    <p className="mt-2 text-sm text-white/70 line-clamp-2">
                      {stall.description}
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                      <span>{stall.ownerName}</span>
                      <ArrowUpRight className="h-4 w-4" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
