import Image from "next/image";
import Link from "next/link";

type CardProps = {
  value: string;
  image: string;
};

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, "-");
}


export default function Card({ value, image }: CardProps) {
  return (
    <Link href={`/${slugify(value)}`} className="block">
    <div
      className="
        group relative w-full overflow-hidden rounded-xl
        aspect-[15/4]
        shadow-[0_0_30px_rgba(255,140,0,0.45),0_0_60px_rgba(255,140,0,0.25)]
        transition-all duration-300 ease-out
        hover:-translate-y-2
        hover:shadow-[0_0_45px_rgba(255,140,0,0.7),0_0_90px_rgba(255,140,0,0.45)]
        cursor-pointer
      "
    >
      {/* Background image */}
      <Image
        src={image}
        alt={value}
        fill
        sizes="(min-width: 1024px) 33vw, 100vw"
        className="object-cover"
      />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Centered text */}
      <div className="relative z-10 flex h-full items-center justify-center">
        <span className="text-3xl font-semibold tracking-widest text-white">
          {value}
        </span>
      </div>
    </div>
    </Link>
  );
}
