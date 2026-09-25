import { RiBuilding2Fill, RiCommunityFill, RiDropFill, RiFileTextFill, RiHotelBedFill, RiInformationFill, RiRulerFill, RiSofaFill, RiStarFill, RiTimeFill } from "react-icons/ri";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { FiCheckCircle } from "react-icons/fi";
import PropertyCard from "@/components/PropertyCard";
import ErrorBox from "@/components/ErrorBox";
import TopSection from "./TopSection";
import { PropertyCardData, PropertyDetail } from "@/types/property";

type DetailPageProps = {
  params: Promise<{ slug: string }>; // Next.js 16: params is a Promise
};



//================================================================================== SEO: title + description ==========================================================================


export const generateMetadata = async ({ params }: DetailPageProps): Promise<Metadata> => {

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const { slug } = await params;

  const res = await fetch(API_URL + "/api/properties/slug/" + slug, { next: { revalidate: 60 } });
  if (!res.ok) {
    return { title: "Property not found" };
  }
  const property: PropertyDetail = await res.json();

  // first 155 characters of the description (Google shows about this much)
  const description = property.title + " in " + property.locality.name + ", " + property.city.name + ". " + property.description.slice(0, 120);

  // photo for WhatsApp / Facebook link preview
  const images = [];
  if (property.images.length > 0) {
    images.push(API_URL + property.images[0].url);
  }

  return {
    title: property.title,                // -> "2 BHK Villa in Adyar | RealEstate"
    description: description,
    openGraph: {
      title: property.title,
      description: description,
      images: images,
    },
  };
};



//================================================================================== THE PAGE ==========================================================================

const PropertyDetailPage = async ({ params }: DetailPageProps) => {

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  dayjs.extend(relativeTime); 

  const { slug } = await params;

  let similar: PropertyCardData[] = [];


  //================ API 1: the property  GET /api/properties/slug/:slug ================
  let res = null;
  try {
    res = await fetch(API_URL + "/api/properties/slug/" + slug, { next: { revalidate: 60 } });
  } catch {
    res = null; // backend not running
  }

  // wrong slug -> show the 404 page (and tells Google: do not index)
  if (res !== null && res.status === 404) {
    notFound();
  }

  // backend down or other error -> error box
  if (res === null || !res.ok) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <ErrorBox message="Could not load this property. Please make sure the server is running and refresh the page." />
      </div>
    );
  }

  const property: PropertyDetail = await res.json();


  //================ API 2: similar properties  GET /api/properties/:id/similar ================
  try {
    const res = await fetch(API_URL + "/api/properties/" + property.id + "/similar", { next: { revalidate: 60 } });
    if (res.ok) {
      similar = await res.json();
    }
  } catch {
    similar = []; // not important enough to show an error - the section is just hidden
  }


  let furnishingText = "Not furnished";
  if (property.furnishing === "FURNISHED") furnishingText = "Furnished";
  if (property.furnishing === "SEMI_FURNISHED") furnishingText = "Semi-furnished";

  // the key facts tiles (only the ones this property has), each with its own icon colour
  const facts = [];
  if (property.bedrooms !== null) facts.push({ label: "Bedrooms", value: property.bedrooms + " BHK", icon: <RiHotelBedFill />, colour: "from-teal-400 to-teal-600" });
  if (property.bathrooms !== null) facts.push({ label: "Bathrooms", value: String(property.bathrooms), icon: <RiDropFill />, colour: "from-emerald-400 to-green-600" });
  facts.push({ label: "Area", value: property.areaSqft + " sq.ft", icon: <RiRulerFill />, colour: "from-amber-300 to-orange-400" });
  if (property.furnishing !== null) facts.push({ label: "Furnishing", value: furnishingText, icon: <RiSofaFill />, colour: "from-orange-400 to-red-400" });
  facts.push({ label: "Type", value: property.propertyType.name, icon: <RiBuilding2Fill />, colour: "from-lime-400 to-green-500" });
  facts.push({ label: "Posted", value: dayjs(property.createdAt).fromNow(), icon: <RiTimeFill />, colour: "from-teal-500 to-emerald-600" }); // "3 days ago"



  //================================================================================== SCREEN ==========================================================================
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">

      {/* ---------- top: photos + price card + contact (client part) ---------- */}
      <TopSection property={property} />


      {/* ---------- key facts ---------- */}
      <section className="mt-6 rounded-2xl bg-linear-to-br from-emerald-950 via-teal-900 to-primary-dark p-5 shadow-lg">
        <h2 className="mb-4 flex items-center gap-3 text-lg font-bold text-white"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/15 text-white [&_svg]:h-4 [&_svg]:w-4"><RiInformationFill /></span> Property overview</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {facts.map((fact) => (
            <div key={fact.label} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/10 p-3 transition hover:bg-white/15">
              <span className={"flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br text-white shadow-md [&_svg]:h-5 [&_svg]:w-5 " + fact.colour}>{fact.icon}</span>
              <div className="min-w-0">
                <p className="text-xs font-medium text-emerald-100/70">{fact.label}</p>
                <p className="text-sm leading-snug font-bold text-white">{fact.value}</p>
              </div>
            </div>
          ))}
        </div>
      </section>


      {/* ---------- description ---------- */}
      <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="flex items-center gap-3 mb-2 text-lg font-bold text-gray-900"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white shadow-md shadow-primary/30 [&_svg]:h-4 [&_svg]:w-4"><RiFileTextFill /></span> About this property</h2>
        <p className="whitespace-pre-line text-sm leading-6 text-gray-700">{property.description}</p>
        {property.address && (
          <p className="mt-3 text-sm text-gray-500">Address: {property.address}, {property.locality.name}, {property.city.name}</p>
        )}
      </section>


      {/* ---------- amenities ---------- */}
      {property.amenities.length > 0 && (
        <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="flex items-center gap-3 mb-3 text-lg font-bold text-gray-900"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white shadow-md shadow-primary/30 [&_svg]:h-4 [&_svg]:w-4"><RiStarFill /></span> Amenities</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {property.amenities.map((item) => (
              <p key={item.amenity.id} className="flex items-center gap-2 text-sm text-gray-700">
                <FiCheckCircle className="text-green-600" /> {item.amenity.name}
              </p>
            ))}
          </div>
        </section>
      )}


      {/* ---------- similar properties ---------- */}
      {similar.length > 0 && (
        <section className="mt-10">
          <h2 className="flex items-center gap-3 mb-4 text-xl font-bold text-gray-900"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/30 [&_svg]:h-5 [&_svg]:w-5"><RiCommunityFill /></span> Similar properties</h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {similar.map((item) => (
              <PropertyCard key={item.id} property={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default PropertyDetailPage;
