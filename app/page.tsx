"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ImageTrail } from "@/components/ui/image-trail"
import { Search } from "lucide-react"
import Image from "next/image"
import Card from "@/components/mela-cards"

export default function Home() {
  const ref = useRef<HTMLDivElement>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [stalls, setStalls] = useState<Array<{
    name: string
    slug: string
    category: string
    description: string
    bannerImage: string
    logoImage?: string
    ownerName: string
    highlights?: string[]
    offers?: string[]
    bestSellers?: string[]
    items?: Array<{ name?: string; price?: string } | string>
  }>>([])
  const [stallsStatus, setStallsStatus] = useState<"idle" | "loading" | "ready" | "error">("idle")
  const [stallsError, setStallsError] = useState<string | null>(null)

  // Local images from public/images folder
  const images = [
    "/images/20240223081350_IMG_1808.JPG",
    "/images/20240223081402_IMG_1809.JPG",
    "/images/20240223081552_IMG_1810.JPG",
    "/images/20240223081746_IMG_1814.JPG",
    "/images/20240223081801_IMG_1815.JPG",
    "/images/20240223081839_IMG_1816.JPG",
    "/images/20240223081923_IMG_1817.JPG",
    "/images/20240223081947_IMG_1818.JPG",
    "/images/20240223082001_IMG_1819.JPG",
    "/images/20240223082019_IMG_1820.JPG",
  ]

  const bucketBase = process.env.NEXT_PUBLIC_R2_BUCKET_URL?.replace(/\/$/, "")
  const toMediaUrl = (value: string) => {
    if (!bucketBase) return value
    if (value.startsWith(bucketBase)) {
      const key = value.slice(bucketBase.length + 1)
      return `/api/media?key=${encodeURIComponent(key)}`
    }
    return value
  }

  const getFallbackBanner = (cat: string) => {
    switch (cat.toLowerCase()) {
      case "accessories":
        return "/images/accessories.png"
      case "games":
        return "/images/games.png"
      default:
        return "/images/food.png"
    }
  }

  const normalizedQuery = searchQuery.trim().toLowerCase()

  useEffect(() => {
    if (!normalizedQuery || stallsStatus === "loading" || stallsStatus === "ready") return

    const loadStalls = async () => {
      try {
        setStallsStatus("loading")
        const response = await fetch("/api/public/stalls")
        if (!response.ok) {
          throw new Error("Failed to load stalls")
        }
        const data = await response.json()
        setStalls(data.stalls ?? [])
        setStallsStatus("ready")
      } catch (error) {
        setStallsError(error instanceof Error ? error.message : "Failed to load stalls")
        setStallsStatus("error")
      }
    }

    void loadStalls()
  }, [normalizedQuery, stallsStatus])

  const filteredStalls = useMemo(() => {
    if (!normalizedQuery) return []

    const getItemText = (item: { name?: string; price?: string } | string) => {
      if (typeof item === "string") return item
      const name = item?.name ?? ""
      const price = item?.price ?? ""
      return `${name} ${price}`.trim()
    }

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
        .toLowerCase()
      return searchParts.includes(normalizedQuery)
    })
  }, [normalizedQuery, stalls])

  return (
    <div className="flex w-full min-h-screen justify-center items-center bg-white relative overflow-hidden">
      <div className="absolute top-0 left-0 z-0 w-full h-full" ref={ref}>
        <ImageTrail containerRef={ref}>
          {images.map((url, index) => (
            <div
              key={index}
              className="flex relative overflow-hidden w-24 h-24 md:w-32 md:h-32 lg:w-36 lg:h-36 rounded-lg"
            >
              <img
                src={url}
                alt={`Trail image ${index + 1}`}
                className="object-cover absolute inset-0 hover:scale-110 transition-transform"
              />
            </div>
          ))}
        </ImageTrail>
      </div>

      <div className="w-full px-4">
      <div className="z-10 flex flex-col items-center gap-8 px-4">
        <Image
          src="/lakshya.png"
          alt="Lakshya Logo"
          width={100}
          height={100}
          className="h-auto w-auto"
        />
        <h1 className="text-6xl md:text-9xl font-bold select-none bg-clip-text text-transparent bg-gradient-to-t from-orange-450 to-orange-500">
          MELA
        </h1>

        {/* Search Bar */}
        <div className="w-full max-w-2xl">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search for food, games, accessories, or clubs..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full pl-12 pr-4 py-4 text-base bg-white border border-gray-200 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:border-transparent transition-all"
            />
          </div>
        </div>

        {normalizedQuery.length > 0 && (
          <div className="w-full max-w-6xl">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-neutral-600">
              <span className="font-semibold uppercase tracking-[0.2em] text-orange-500">Search results</span>
              {stallsStatus === "loading" && <span>Searching...</span>}
              {stallsStatus === "ready" && (
                <span>{filteredStalls.length} matches</span>
              )}
            </div>
            {stallsStatus === "error" && (
              <p className="mt-3 text-sm text-red-600">{stallsError ?? "Search failed."}</p>
            )}
            {stallsStatus === "ready" && filteredStalls.length === 0 && (
              <p className="mt-3 text-sm text-neutral-500">No stalls match your search yet.</p>
            )}
            {stallsStatus === "ready" && filteredStalls.length > 0 && (
              <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredStalls.map((stall) => {
                  const image = stall.logoImage?.trim() || stall.bannerImage?.trim() || getFallbackBanner(stall.category)
                  const imageSrc = toMediaUrl(image)
                  const categorySlug = (stall.category ?? "").toLowerCase()
                  return (
                    <Link key={`${stall.slug}-${stall.category}`} href={`/${categorySlug}/${(stall.slug ?? "").toLowerCase()}`}>
                      <div className="group relative h-72 w-full overflow-hidden rounded-2xl shadow-xl">
                        <img
                          src={imageSrc}
                          alt={stall.name}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                        <div className="absolute bottom-0 left-0 w-full p-6">
                          <p className="text-xs uppercase tracking-[0.2em] text-orange-300">{stall.category}</p>
                          <h3 className="mt-2 text-2xl font-bold text-white">{stall.name}</h3>
                          <p className="mt-2 text-sm text-white/80 line-clamp-2">{stall.description}</p>
                          <p className="mt-3 text-xs text-white/60">Owner: {stall.ownerName}</p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        )}
        

      </div>
      {/* Cards Section */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4 mt-12 z-10 mx-auto max-w-6xl">
            <Card value="Food" image="/images/food.png" />
            <Card value="Accessories" image="/images/accessories.png" />
            <Card value="Games" image="/images/games.png" />
            <Card value="Clubs" image="/images/food.png" />
          </div>
      </div>
    </div>
  )
}
