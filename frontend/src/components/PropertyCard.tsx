import Link from "next/link";
import Image from "next/image";
import { RiArrowRightUpLine, RiBuilding2Fill, RiHome4Fill, RiHotelBedFill, RiKey2Fill, RiMapPin2Fill, RiPriceTag3Fill, RiRulerFill } from "react-icons/ri";
import { formatPrice } from "@/lib/format";
import { PropertyCardData } from "@/types/property";

const PropertyCard = ({ property }: { property: PropertyCardData }) => {

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  let coverUrl = null;
  if (property.images.length > 0) {
    coverUrl = API_URL + property.images[0].url;
  }

  const factClass = "flex items-center gap-1 rounded-lg bg-gray-50 px-2 py-1 [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:text-primary";

  return (
    <Link href={"/property/" + property.slug} className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl">

      {/* ---------- photo (zooms a little on hover) ---------- */}
      <div className="relative h-52 w-full overflow-hidden bg-primary-dark">
        {coverUrl && (
          <Image src={coverUrl} alt={property.title} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover transition duration-500 group-hover:scale-105" />
        )}
        {!coverUrl && (
          <div className="flex h-full items-center justify-center text-[#b7dfdb]">
            <RiHome4Fill className="h-16 w-16" />
          </div>
        )}

        {/* soft dark fade at the bottom of real photos */}
        {coverUrl && <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/40 to-transparent" />}

        {/* SALE = teal, RENT = amber */}
        {property.listingType === "SALE" && (
          <span className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white shadow"><RiPriceTag3Fill /> For Sale</span>
        )}
        {property.listingType === "RENT" && (
          <span className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-gray-900 shadow"><RiKey2Fill /> For Rent</span>
        )}

        <span className="absolute bottom-3 left-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-gray-700 shadow-sm backdrop-blur [&_svg]:text-primary"><RiBuilding2Fill /> {property.propertyType.name}</span>
      </div>

      {/* ---------- text ---------- */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xl font-bold text-primary-dark">{formatPrice(property.price, property.listingType)}</p>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition group-hover:bg-primary group-hover:text-white">
            <RiArrowRightUpLine className="h-4 w-4" />
          </span>
        </div>

        <h3 className="mt-1 truncate font-semibold text-gray-900 group-hover:text-primary">{property.title}</h3>

        <p className="mt-1 flex items-center gap-1 truncate text-sm text-gray-500">
          <RiMapPin2Fill className="shrink-0 text-rose-500" /> {property.locality.name}, {property.city.name}
        </p>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3 text-xs font-medium text-gray-700">
          {property.bedrooms !== null && <span className={factClass}><RiHotelBedFill /> {property.bedrooms} BHK</span>}
          <span className={factClass}><RiRulerFill /> {property.areaSqft} sq.ft</span>
        </div>
      </div>
    </Link>
  );
};

export default PropertyCard;
