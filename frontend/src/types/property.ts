// one property in a list (home, search, similar)

export type PropertyCardData = {
  id: number;
  title: string;
  slug: string;
  listingType: "SALE" | "RENT";
  price: number;
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqft: number;
  furnishing: "FURNISHED" | "SEMI_FURNISHED" | "UNFURNISHED" | null;
  createdAt: string;
  propertyType: { id: number; name: string };
  city: { id: number; name: string };
  locality: { id: number; name: string };
  images: { url: string }[]; // only the cover photo (0 or 1 item)
};

// answer of GET /api/properties/search
export type SearchResult = {
  items: PropertyCardData[];
  hasMore: boolean;
  nextCursor: number | null;
};

// a city in the dropdown (GET /api/cities)
export type City = {
  id: number;
  name: string;
};

// a locality in the dropdown (GET /api/localities/by-city/:cityId)
export type Locality = {
  id: number;
  name: string;
};

// a property type in the dropdown (GET /api/property-types)
export type PropertyType = {
  id: number;
  name: string;
  slug: string;
};

// all filters of the search page. "" = not chosen (any)
export type SearchFilters = {
  listingType: string;    // "SALE" or "RENT"
  cityId: string;
  localityId: string;
  propertyTypeId: string;
  bedrooms: string;
  minPrice: string;
  maxPrice: string;
  sort: string;           // "newest" | "price_asc" | "price_desc"
};

// one property on the DETAIL page (GET /api/properties/slug/:slug) - more fields than the card
export type PropertyDetail = {
  id: number;
  title: string;
  slug: string;
  description: string;
  listingType: "SALE" | "RENT";
  price: number;
  bedrooms: number | null;
  bathrooms: number | null;
  areaSqft: number;
  furnishing: "FURNISHED" | "SEMI_FURNISHED" | "UNFURNISHED" | null;
  address: string | null;
  status: "ACTIVE" | "INACTIVE" | "SOLD";
  ownerId: number;
  createdAt: string;
  owner: { id: number; name: string; phone: string | null };
  propertyType: { id: number; name: string };
  city: { id: number; name: string; slug: string };
  locality: { id: number; name: string; slug: string };
  amenities: { amenity: { id: number; name: string } }[];
  images: { id: number; url: string; isCover: boolean; sortOrder: number }[];
};
