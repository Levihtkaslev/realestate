import Link from "next/link";
import type { Metadata } from "next";
import { RiHome4Fill, RiKey2Fill, RiMapPinUserFill, RiSearchFill } from "react-icons/ri";

// 404 PAGE: shown for a wrong address or a property that does not exist (notFound())

export const metadata: Metadata = {
  title: "Page not found",
};

const NotFoundPage = () => {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="w-full max-w-lg overflow-hidden rounded-3xl bg-white text-center shadow-xl">

        {/* ---------- dark top ---------- */}
        <div className="relative overflow-hidden bg-linear-to-br from-slate-950 via-emerald-950 to-teal-800 px-6 py-10">
          <div className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full bg-amber-400/20 blur-3xl" />
          <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-amber-300">
            <RiMapPinUserFill className="h-8 w-8" />
          </span>
          <p className="relative mt-4 text-6xl font-extrabold tracking-tight text-white">404</p>
          <p className="relative mt-1 text-lg font-semibold text-emerald-100">Page not found</p>
        </div>

        {/* ---------- message + buttons ---------- */}
        <div className="p-6">
          <p className="text-sm text-gray-600">
            The page you are looking for does not exist, or the property was removed by its owner.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Link href="/" className="flex items-center justify-center gap-2 rounded-lg bg-primary-dark px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary">
              <RiHome4Fill className="h-4 w-4" /> Go home
            </Link>
            <Link href="/search?listingType=SALE" className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-700">
              <RiSearchFill className="h-4 w-4" /> Search properties
            </Link>
          </div>

          <Link href="/search?listingType=RENT" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary-dark hover:underline">
            <RiKey2Fill /> Looking to rent? See rentals
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
