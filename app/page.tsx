"use client"

import { useRef } from "react"
import Link from "next/link"
import { ImageTrail } from "@/components/ui/image-trail"
import { Search } from "lucide-react"
import Image from "next/image"
import Card from "@/components/mela-cards"

export default function Home() {
  const ref = useRef<HTMLDivElement>(null)

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
      <div className="absolute top-0 right-0 pt-6 pr-6 z-20">
        <Link href="/login" className="text-orange-500 font-semibold hover:text-orange-600 transition-colors border-b-2 border-orange-500 pb-1">
          Sign In
        </Link>
      </div>
      <div className="z-10 flex flex-col items-center gap-8 px-4">
        <Image src="/lakshya.png" alt="Lakshya Logo" width={100} height={100} />
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
              placeholder="Search for food, games, or accessories..."
              className="w-full pl-12 pr-4 py-4 text-base bg-white border border-gray-200 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:border-transparent transition-all"
            />
          </div>
        </div>
        

      </div>
      {/* Cards Section */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 mt-12 z-10 mx-auto max-w-6xl">
          <Card value="Food" image="/images/food.png" />
          <Card value="Accessories" image="/images/accessories.png" />
          <Card value="Games" image="/images/games.png" />
        </div>
      </div>
    </div>
  )
}
