import Link from "next/link";
import Form from "next/form";
import { FiSearch } from "react-icons/fi";
import {
  RiAddCircleFill, RiArrowRightLine, RiBriefcase4Fill, RiBuilding2Fill, RiBuilding4Fill, RiBuildingFill, RiChat3Fill, RiFireFill, RiFlashlightFill, RiHome4Fill, RiHome8Fill, RiHotelBedFill, RiKey2Fill, RiLandscapeFill, RiLayoutGridFill, RiMapPin2Fill, RiMoneyRupeeCircleFill, RiPlantFill, RiSearchEyeFill, RiStore2Fill, RiPriceTag3Fill,
} from "react-icons/ri";
import PropertyCard from "@/components/PropertyCard";
import ErrorBox from "@/components/ErrorBox";
import Tabs from "@/components/Tabs";
import Select, { SelectOption } from "@/components/Select";
import Button from "@/components/Button";
import { City, PropertyType, SearchResult } from "@/types/property";

// HOME PAGE "/" (server page, data cached for 60 s)

const HomePage = async () => {

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  // Buy / Rent tabs
  const LISTING_TABS = [
    { value: "SALE", label: "Buy", icon: <RiHome4Fill /> },
    { value: "RENT", label: "Rent", icon: <RiKey2Fill /> },
  ];

  const BEDROOM_OPTIONS = [
    { label: "Any BHK", value: "" },
    { label: "1 BHK", value: "1" },
    { label: "2 BHK", value: "2" },
    { label: "3 BHK", value: "3" },
    { label: "4 BHK", value: "4" },
    { label: "5 BHK", value: "5" },
  ];

  // icon for each property type (by slug)
  const TYPE_ICONS: Record<string, React.ReactNode> = {
    "apartment": <RiBuilding2Fill />,
    "independent-house": <RiHome4Fill />,
    "villa": <RiHome8Fill />,
    "builder-floor": <RiBuilding4Fill />,
    "plot": <RiLandscapeFill />,
    "agricultural-land": <RiPlantFill />,
    "office-space": <RiBriefcase4Fill />,
    "shop": <RiStore2Fill />,
    "warehouse": <RiBuildingFill />,
  };

  // feature card icon colours (teal / green / warm only), used one after another
  const TILE_COLOURS = [
    "bg-linear-to-br from-teal-400 to-teal-600 shadow-teal-500/30",
    "bg-linear-to-br from-amber-300 to-orange-400 shadow-amber-500/30",
    "bg-linear-to-br from-emerald-400 to-green-600 shadow-emerald-500/30",
    "bg-linear-to-br from-orange-400 to-red-400 shadow-orange-500/30",
  ];

  const FEATURES = [
    { icon: <RiChat3Fill />, title: "Talk to owners", text: "Send an enquiry straight to the owner" },
    { icon: <RiSearchEyeFill />, title: "Smart filters", text: "City, locality, type, BHK and budget" },
    { icon: <RiMoneyRupeeCircleFill />, title: "Post for free", text: "List your property in 2 minutes" },
    { icon: <RiFlashlightFill />, title: "Fast search", text: "Quick even with thousands of listings" },
  ];

  let cities: City[] = [];
  let propertyTypes: PropertyType[] = [];
  let forSale: SearchResult = { items: [], hasMore: false, nextCursor: null };
  let forRent: SearchResult = { items: [], hasMore: false, nextCursor: null };
  let loadError = "";

  try {

    //================ API 1: cities (search box + popular cities) ================

    const citiesRes = await fetch(API_URL + "/api/cities", { next: { revalidate: 60 } });
    if (!citiesRes.ok) {
      throw new Error("cities failed");
    }
    cities = await citiesRes.json();




    //================ API 2: property types (search box + browse by type) ================

    const typesRes = await fetch(API_URL + "/api/property-types", { next: { revalidate: 60 } });
    if (!typesRes.ok) {
      throw new Error("types failed");
    }
    propertyTypes = await typesRes.json();




    //================ API 3: latest 6 properties for SALE ================

    const saleRes = await fetch(API_URL + "/api/properties/search?listingType=SALE&limit=6", { next: { revalidate: 60 } });
    if (!saleRes.ok) {
      throw new Error("sale list failed");
    }
    forSale = await saleRes.json();




    //================ API 4: latest 6 properties for RENT ================

    const rentRes = await fetch(API_URL + "/api/properties/search?listingType=RENT&limit=6", { next: { revalidate: 60 } });
    if (!rentRes.ok) {
      throw new Error("rent list failed");
    }
    forRent = await rentRes.json();



  } catch {
    loadError = "Could not load properties. Please make sure the server is running and refresh the page.";
  }

  // dropdown options
  const cityOptions: SelectOption[] = [{ value: "", label: "All cities" }];
  for (const city of cities) {
    cityOptions.push({ value: String(city.id), label: city.name });
  }
  const typeOptions: SelectOption[] = [{ value: "", label: "All types" }];
  for (const type of propertyTypes) {
    typeOptions.push({ value: String(type.id), label: type.name });
  }

  const labelClass = "mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500";

  return (
    <div className="flex-1">

      {/* ---------- HERO: dark gradient + search box ---------- */}
      <section className="relative overflow-hidden bg-linear-to-br from-slate-950 via-emerald-950 to-teal-800 px-4 pt-16 pb-20 sm:px-6 lg:px-8">

        {/* background: two soft colour glows */}
        <div className="pointer-events-none absolute -top-32 -left-32 h-96 w-96 rounded-full bg-teal-400/30 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 -bottom-40 h-96 w-96 rounded-full bg-amber-500/25 blur-3xl" />

        <div className="relative flex flex-col items-center text-center">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-medium text-amber-300">
            <RiFireFill /> No brokerage · Contact owners directly
          </span>
          <h1 className="max-w-3xl text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            Find a home you&apos;ll <span className="bg-linear-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">love</span>
          </h1>
          <p className="mt-3 mb-8 max-w-xl text-base text-emerald-100/80">Flats, houses, villas, plots and offices for sale and rent across India</p>

          {/* Next.js Form: on Search it opens /search without a page refresh, e.g. /search?listingType=...&cityId=...&propertyTypeId=...&bedrooms=... */}
          <Form action="/search" className="w-full max-w-5xl rounded-2xl bg-white p-4 text-left shadow-2xl shadow-black/30 sm:p-6">

            <Tabs name="listingType" defaultValue="SALE" options={LISTING_TABS} big />

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1.5fr_1fr_auto] lg:items-end">
              <div>
                <p className={labelClass}><RiMapPin2Fill className="text-primary" /> City</p>
                <Select name="cityId" defaultValue="" options={cityOptions} className="w-full py-3" />
              </div>
              <div>
                <p className={labelClass}><RiBuilding2Fill className="text-primary" /> Property type</p>
                <Select name="propertyTypeId" defaultValue="" options={typeOptions} className="w-full py-3" />
              </div>
              <div>
                <p className={labelClass}><RiHotelBedFill className="text-primary" /> Bedrooms</p>
                <Select name="bedrooms" defaultValue="" options={BEDROOM_OPTIONS} className="w-full py-3" />
              </div>
              <Button type="submit" className="w-full px-8 py-3 text-base">
                <FiSearch /> Search
              </Button>
            </div>
          </Form>

          {/* popular cities: quick links */}
          {cities.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm">
              <span className="text-emerald-100/70">Popular:</span>
              {cities.slice(0, 6).map((city) => (
                <Link
                  key={city.id}
                  href={"/search?listingType=SALE&cityId=" + city.id}
                  className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-white transition-colors hover:bg-white/20"
                >
                  {city.name}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>


      <div className="w-full px-4 sm:px-6 lg:px-8">

        {/* ---------- features strip (overlaps the hero a little) ---------- */}
        <section className="relative -mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, index) => (
            <div key={feature.title} className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-md">
              <span className={"flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white shadow-lg [&_svg]:h-6 [&_svg]:w-6 " + TILE_COLOURS[index % TILE_COLOURS.length]}>
                {feature.icon}
              </span>
              <div>
                <p className="font-semibold text-gray-900">{feature.title}</p>
                <p className="text-sm text-gray-500">{feature.text}</p>
              </div>
            </div>
          ))}
        </section>

        {loadError && <div className="mt-10"><ErrorBox message={loadError} /></div>}


        {/* ---------- browse by property type ---------- */}
        {!loadError && (
          <section className="mt-14">
            <h2 className="flex items-center gap-3 text-2xl font-bold text-gray-900"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/30 [&_svg]:h-5 [&_svg]:w-5"><RiLayoutGridFill /></span> Browse by property type</h2>
            <p className="mt-1 pl-13 text-sm text-gray-500">Pick a type to see everything for sale</p>
            {/* moving strip: the list is shown twice so it loops without a gap, hover = pause */}
            <div className="group/strip mt-3 overflow-hidden py-3 [mask-image:linear-gradient(to_right,transparent,black_4%,black_96%,transparent)]">
              <div className="flex w-max animate-marquee group-hover/strip:[animation-play-state:paused]">
                {propertyTypes.concat(propertyTypes).map((type, index) => (
                  <Link
                    key={index}
                    href={"/search?listingType=SALE&propertyTypeId=" + type.id}
                    className="group relative mr-4 flex w-48 shrink-0 flex-col items-start gap-4 overflow-hidden rounded-2xl bg-linear-to-br from-slate-900 to-slate-800 p-5 shadow-lg ring-1 ring-white/5 transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:ring-amber-400/60"
                  >
                    {/* soft amber glow in the corner */}
                    <span className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-amber-400/15 blur-2xl transition duration-300 group-hover:bg-amber-400/30" />

                    <span className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-linear-to-br from-amber-300 to-amber-500 text-slate-900 shadow-lg shadow-amber-500/20 transition duration-300 group-hover:scale-110 [&_svg]:h-7 [&_svg]:w-7">
                      {TYPE_ICONS[type.slug] || <RiBuilding2Fill />}
                    </span>

                    <div className="relative w-full">
                      <p className="truncate text-base font-semibold text-white">{type.name}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs font-medium text-slate-400 transition-colors group-hover:text-amber-300">
                        Explore <RiArrowRightLine className="transition-transform group-hover:translate-x-1" />
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}


        {/* ---------- latest sale ---------- */}
        {!loadError && (
          <section className="mt-14">
            <div className="mb-5 flex items-end justify-between">
              <div>
                <h2 className="flex items-center gap-3 text-2xl font-bold text-gray-900"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/30 [&_svg]:h-5 [&_svg]:w-5"><RiPriceTag3Fill /></span> Latest properties for sale</h2>
                <p className="mt-1 pl-13 text-sm text-gray-500">Freshly added homes you can buy</p>
              </div>
              <Link href="/search?listingType=SALE" className="group flex shrink-0 items-center gap-2 rounded-full bg-primary py-1.5 pr-1.5 pl-4 text-sm font-semibold text-white shadow-md shadow-primary/30 ring-1 ring-primary transition-colors hover:bg-primary-dark hover:ring-primary-dark">
                <RiLayoutGridFill /> View all
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-primary transition group-hover:translate-x-0.5"><RiArrowRightLine /></span>
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {forSale.items.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          </section>
        )}


        {/* ---------- latest rent ---------- */}
        {!loadError && (
          <section className="mt-14">
            <div className="mb-5 flex items-end justify-between">
              <div>
                <h2 className="flex items-center gap-3 text-2xl font-bold text-gray-900"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/30 [&_svg]:h-5 [&_svg]:w-5"><RiKey2Fill /></span> Latest properties for rent</h2>
                <p className="mt-1 pl-13 text-sm text-gray-500">Move in soon, rent directly from owners</p>
              </div>
              <Link href="/search?listingType=RENT" className="group flex shrink-0 items-center gap-2 rounded-full bg-primary py-1.5 pr-1.5 pl-4 text-sm font-semibold text-white shadow-md shadow-primary/30 ring-1 ring-primary transition-colors hover:bg-primary-dark hover:ring-primary-dark">
                <RiLayoutGridFill /> View all
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-primary transition group-hover:translate-x-0.5"><RiArrowRightLine /></span>
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {forRent.items.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>
          </section>
        )}


        {/* ---------- post property banner ---------- */}
        <section className="relative my-14 overflow-hidden rounded-3xl bg-linear-to-r from-emerald-950 via-primary-dark to-primary px-6 py-10 sm:px-10">
          <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-amber-400/30 blur-3xl" />
          <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-bold text-white sm:text-3xl">Own a property? Sell or rent it faster</h2>
              <p className="mt-2 text-emerald-100/80">Post it for free and get enquiries straight from buyers and tenants.</p>
            </div>
            <Link href="/post-property" className="flex shrink-0 items-center gap-2 rounded-xl bg-amber-400 px-6 py-3 font-semibold text-gray-900 shadow-lg transition-colors hover:bg-amber-300">
              <RiAddCircleFill className="h-5 w-5" /> Post property free
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HomePage;
