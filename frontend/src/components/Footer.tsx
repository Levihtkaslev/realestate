import Link from "next/link";

// bottom of every page (no "use client" -> built on the server, no JavaScript sent to the browser)

const Footer = () => {
  return (
    <footer className="mt-12 border-t border-gray-200 bg-white">
      <div className="flex flex-col items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-6 text-sm text-gray-500 sm:flex-row">
        <p>© {new Date().getFullYear()} RealEstate. Find your next home.</p>

        <div className="flex gap-5">
          <Link href="/search?listingType=SALE" className="hover:text-primary">Buy</Link>
          <Link href="/search?listingType=RENT" className="hover:text-primary">Rent</Link>
          <Link href="/post-property" className="hover:text-primary">Post Property</Link>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
