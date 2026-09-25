"use client";
// SEARCH PAGE "/search?listingType=SALE&cityId=5 ..."

import { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import api, { getErrorMessage } from "@/lib/api";
import PropertyCard from "@/components/PropertyCard";
import Loader from "@/components/Loader";
import ErrorBox from "@/components/ErrorBox";
import Button from "@/components/Button";
import Select, { SelectOption } from "@/components/Select";
import Tabs from "@/components/Tabs";
import { RiFilter3Fill, RiHome4Fill, RiKey2Fill, RiSearchFill, RiArrowUpDownFill } from "react-icons/ri";
import { City, Locality, PropertyCardData, PropertyType, SearchFilters } from "@/types/property";



type SearchPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};



const SearchPage = ({ searchParams }: SearchPageProps) => {

  const router = useRouter();

  //================================================================================== 0. FIXED LISTS (dropdown choices) ==========================================================================

  // budget choices. value = "min-max" in rupees, empty side = no limit
  const SALE_BUDGETS = [
    { label: "Any budget", value: "-" },
    { label: "Under ₹50 L", value: "-5000000" },
    { label: "₹50 L - ₹1 Cr", value: "5000000-10000000" },
    { label: "₹1 Cr - ₹2 Cr", value: "10000000-20000000" },
    { label: "₹2 Cr - ₹5 Cr", value: "20000000-50000000" },
    { label: "Above ₹5 Cr", value: "50000000-" },
  ];

  const RENT_BUDGETS = [
    { label: "Any budget", value: "-" },
    { label: "Under ₹15,000", value: "-15000" },
    { label: "₹15,000 - ₹30,000", value: "15000-30000" },
    { label: "₹30,000 - ₹60,000", value: "30000-60000" },
    { label: "Above ₹60,000", value: "60000-" },
  ];

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

  const SORT_OPTIONS = [
    { label: "Newest first", value: "newest" },
    { label: "Price: low to high", value: "price_asc" },
    { label: "Price: high to low", value: "price_desc" },
  ];

  // one URL value -> text ("" if missing)
  const readParam = (value: string | string[] | undefined) => {
    if (typeof value === "string") {
      return value;
    }
    return "";
  };
  const params = use(searchParams);

  let startListingType = readParam(params.listingType);
  if (startListingType !== "RENT") {
    startListingType = "SALE"; // default: Buy
  }

  let startSort = readParam(params.sort);
  if (startSort !== "price_asc" && startSort !== "price_desc") {
    startSort = "newest";      // default sort
  }

  const startFilters: SearchFilters = {
    listingType: startListingType,
    cityId: readParam(params.cityId),
    localityId: readParam(params.localityId),
    propertyTypeId: readParam(params.propertyTypeId),
    bedrooms: readParam(params.bedrooms),
    minPrice: readParam(params.minPrice),
    maxPrice: readParam(params.maxPrice),
    sort: startSort,
  };



  //================================================================================== 2. STATE (memory of the page) ==========================================================================

  const [filters, setFilters] = useState<SearchFilters>(startFilters);   // what the user chose
  const [cities, setCities] = useState<City[]>([]);                      // dropdown lists
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<PropertyType[]>([]);
  const [properties, setProperties] = useState<PropertyCardData[]>([]);  // results
  const [nextCursor, setNextCursor] = useState<number | null>(null);     // where "Load more" continues
  const [hasMore, setHasMore] = useState(false);                         // show "Load more"?
  const [loading, setLoading] = useState(true);                          // first page loading
  const [loadingMore, setLoadingMore] = useState(false);                 // "Load more" loading
  const [error, setError] = useState("");

  // every search gets a number; if an OLD answer arrives after a NEW one, we ignore it
  const latestSearch = useRef(0);



  //================================================================================== 3. API CALLS ==========================================================================

  // filters -> query values for the API (only the chosen ones)
  const buildParams = (f: SearchFilters, cursor: number | null) => {
    const query: Record<string, string> = { listingType: f.listingType, sort: f.sort, limit: "12" };
    if (f.cityId) query.cityId = f.cityId;
    if (f.localityId) query.localityId = f.localityId;
    if (f.propertyTypeId) query.propertyTypeId = f.propertyTypeId;
    if (f.bedrooms) query.bedrooms = f.bedrooms;
    if (f.minPrice) query.minPrice = f.minPrice;
    if (f.maxPrice) query.maxPrice = f.maxPrice;
    if (cursor) query.cursor = String(cursor);
    return query;
  };


  //================ API: first page of results  GET /api/properties/search?... ================
  const loadResults = async (f: SearchFilters) => {
    latestSearch.current = latestSearch.current + 1;
    const searchNumber = latestSearch.current;

    try {
      const res = await api.get("/properties/search", { params: buildParams(f, null) });

      if (searchNumber !== latestSearch.current) {
        return; // a newer search started -> ignore this old answer
      }
      setProperties(res.data.items);
      setNextCursor(res.data.nextCursor);
      setHasMore(res.data.hasMore);
      setError("");
    } catch (err) {
      if (searchNumber === latestSearch.current) {
        setError(getErrorMessage(err));
      }
    }

    if (searchNumber === latestSearch.current) {
      setLoading(false);
    }
  };


  //================ API: next page ("Load more")  same search + &cursor=<last id> ================
  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await api.get("/properties/search", { params: buildParams(filters, nextCursor) });
      setProperties(properties.concat(res.data.items)); // old list + the new 12
      setNextCursor(res.data.nextCursor);
      setHasMore(res.data.hasMore);
    } catch (err) {
      setError(getErrorMessage(err));
    }
    setLoadingMore(false);
  };


  //================ when the page opens (runs once) ================
  useEffect(() => {
    const loadStart = async () => {

      // API 1: cities for the dropdown
      try {
        const citiesRes = await api.get("/cities");
        setCities(citiesRes.data);
      } catch {
        setCities([]);
      }

      // API 2: property types for the dropdown
      try {
        const typesRes = await api.get("/property-types");
        setPropertyTypes(typesRes.data);
      } catch {
        setPropertyTypes([]);
      }

      // API 3: localities of the city  GET /api/localities/by-city/5  (only if the URL already has a city)
      if (startFilters.cityId) {
        try {
          const localitiesRes = await api.get("/localities/by-city/" + startFilters.cityId);
          setLocalities(localitiesRes.data);
        } catch {
          setLocalities([]);
        }
      }

      // API 4: the results
      await loadResults(startFilters);
    };

    loadStart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);




  //================================================================================== 4. FILTER CHANGES ==========================================================================

  // a tab or dropdown changed, e.g. handleChange("cityId", "5")
  const handleChange = async (name: keyof SearchFilters, value: string) => {

    const newFilters = { ...filters }; // copy of the current filters
    newFilters[name] = value;

    // budget dropdown sends "min-max", e.g. "5000000-10000000" -> min 5000000, max 10000000
    if (name === "minPrice") {
      const parts = value.split("-");
      newFilters.minPrice = parts[0];
      newFilters.maxPrice = parts[1];
    }

    // Buy <-> Rent -> budgets are different (lakhs vs monthly rent), so clear the budget
    if (name === "listingType") {
      newFilters.minPrice = "";
      newFilters.maxPrice = "";
    }

    // new city -> the old locality does not belong to it
    if (name === "cityId") {
      newFilters.localityId = "";
    }

    // 1. remember the filters + show the spinner
    setFilters(newFilters);
    setLoading(true);

    // 2. put the filters in the URL (share / bookmark / refresh keeps them)
    const query = new URLSearchParams(buildParams(newFilters, null));
    query.delete("limit");
    router.replace("/search?" + query.toString(), { scroll: false });

    // 3. search again
    loadResults(newFilters);

    // 4. new city -> load its localities  GET /api/localities/by-city/5
    if (name === "cityId") {
      setLocalities([]);
      if (value) {
        try {
          const localitiesRes = await api.get("/localities/by-city/" + value);
          setLocalities(localitiesRes.data);
        } catch {
          setLocalities([]);
        }
      }
    }
  };

  //================ navbar Buy / Rent clicked while already on this page -> switch without a page refresh ================
  useEffect(() => {
    const followUrl = async () => {
      if (startListingType !== filters.listingType) {
        await handleChange("listingType", startListingType);
      }
    };
    followUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startListingType]);


  // ---------- options for the dropdowns (value + label) ----------

  const cityOptions: SelectOption[] = [{ value: "", label: "All cities" }];
  for (const city of cities) {
    cityOptions.push({ value: String(city.id), label: city.name });
  }

  let localityFirstLabel = "Choose a city first";
  if (filters.cityId) {
    localityFirstLabel = "All localities";
  }
  const localityOptions: SelectOption[] = [{ value: "", label: localityFirstLabel }];
  for (const locality of localities) {
    localityOptions.push({ value: String(locality.id), label: locality.name });
  }

  const typeOptions: SelectOption[] = [{ value: "", label: "All types" }];
  for (const type of propertyTypes) {
    typeOptions.push({ value: String(type.id), label: type.name });
  }

  let budgetOptions: SelectOption[] = SALE_BUDGETS;
  if (filters.listingType === "RENT") {
    budgetOptions = RENT_BUDGETS;
  }



  //================================================================================== 5. SCREEN ==========================================================================

  const filterLabel = "mb-1.5 block text-sm font-medium text-gray-700";

  return (
    <div className="flex w-full flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:items-start lg:px-8">

      {/* ---------- LEFT: filters sidebar (on top on phones) ---------- */}
      <aside className="w-full shrink-0 rounded-2xl border border-gray-200 bg-white p-5 lg:sticky lg:top-20 lg:w-72">
        <p className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900"><RiFilter3Fill className="h-5 w-5 text-primary" /> Filters</p>

        <div className="flex flex-col gap-4">
          <Tabs value={filters.listingType} options={LISTING_TABS} onChange={(value) => handleChange("listingType", value)} big />

          <div>
            <p className={filterLabel}>City</p>
            <Select value={filters.cityId} options={cityOptions} onChange={(value) => handleChange("cityId", value)} className="w-full" />
          </div>

          <div>
            <p className={filterLabel}>Locality</p>
            <Select value={filters.localityId} options={localityOptions} onChange={(value) => handleChange("localityId", value)} disabled={!filters.cityId} className="w-full" />
          </div>

          <div>
            <p className={filterLabel}>Property type</p>
            <Select value={filters.propertyTypeId} options={typeOptions} onChange={(value) => handleChange("propertyTypeId", value)} className="w-full" />
          </div>

          <div>
            <p className={filterLabel}>Bedrooms</p>
            <Select value={filters.bedrooms} options={BEDROOM_OPTIONS} onChange={(value) => handleChange("bedrooms", value)} className="w-full" />
          </div>

          <div>
            <p className={filterLabel}>Budget</p>
            <Select value={filters.minPrice + "-" + filters.maxPrice} options={budgetOptions} onChange={(value) => handleChange("minPrice", value)} className="w-full" />
          </div>
        </div>
      </aside>


      {/* ---------- RIGHT: title + sort + results ---------- */}
      <section className="min-w-0 flex-1">

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/30 [&_svg]:h-5 [&_svg]:w-5"><RiSearchFill /></span>
              {filters.listingType === "RENT" ? "Properties for rent" : "Properties for sale"}
            </h1>
            {!loading && !error && <p className="mt-1 pl-13 text-sm text-gray-500">Showing {properties.length} properties</p>}
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-dark text-white"><RiArrowUpDownFill className="h-5 w-5" /></span>
            <Select value={filters.sort} options={SORT_OPTIONS} onChange={(value) => handleChange("sort", value)} className="h-10" />
          </div>
        </div>

        {/* only ONE of these 4 shows */}
        {loading && <Loader text="Searching properties..." />}

        {!loading && error && (
          <ErrorBox message={error} onRetry={() => { setLoading(true); loadResults(filters); }} />
        )}

        {!loading && !error && properties.length === 0 && (
          <p className="py-16 text-center text-gray-500">No properties match your filters. Try changing them.</p>
        )}

        {!loading && !error && properties.length > 0 && (
          <>
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {properties.map((property) => (
                <PropertyCard key={property.id} property={property} />
              ))}
            </div>

            {hasMore && (
              <div className="mt-8 flex justify-center">
                <Button variant="secondary" loading={loadingMore} onClick={loadMore}>Load more</Button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
};

export default SearchPage;
