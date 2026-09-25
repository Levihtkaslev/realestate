"use client";
// POST PROPERTY PAGE "/post-property" (login required)

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Checkbox, Field, Input, Label, Textarea } from "@headlessui/react";
import { toast } from "react-toastify";
import { RiKey2Fill, RiPriceTag3Fill, RiAddCircleFill } from "react-icons/ri";
import { FiCheck, FiImage } from "react-icons/fi";
import api, { getErrorMessage } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import Button from "@/components/Button";
import Select, { SelectOption } from "@/components/Select";
import Tabs from "@/components/Tabs";

type Master = { id: number; name: string };

const PostPropertyPage = () => {

  const router = useRouter();
  const user = useAppSelector((state) => state.auth.user);
  const checked = useAppSelector((state) => state.auth.checked);

  const inputClass = "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-700 focus:outline-none data-focus:border-primary";
  const labelClass = "mb-1 block text-sm font-medium text-gray-700";

  const LISTING_TABS = [
    { value: "SALE", label: "Sell", icon: <RiPriceTag3Fill /> },
    { value: "RENT", label: "Rent out", icon: <RiKey2Fill /> },
  ];

  const NUMBER_OPTIONS = [
    { value: "", label: "Not applicable" },
    { value: "1", label: "1" },
    { value: "2", label: "2" },
    { value: "3", label: "3" },
    { value: "4", label: "4" },
    { value: "5", label: "5" },
  ];

  const FURNISHING_OPTIONS = [
    { value: "", label: "Not applicable" },
    { value: "UNFURNISHED", label: "Unfurnished" },
    { value: "SEMI_FURNISHED", label: "Semi-furnished" },
    { value: "FURNISHED", label: "Furnished" },
  ];

  // form boxes
  const [listingType, setListingType] = useState("SALE");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [areaSqft, setAreaSqft] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [furnishing, setFurnishing] = useState("");
  const [address, setAddress] = useState("");
  const [propertyTypeId, setPropertyTypeId] = useState("");
  const [stateId, setStateId] = useState("");
  const [cityId, setCityId] = useState("");
  const [localityId, setLocalityId] = useState("");
  const [amenityIds, setAmenityIds] = useState<number[]>([]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // dropdown lists
  const [types, setTypes] = useState<Master[]>([]);
  const [states, setStates] = useState<Master[]>([]);
  const [cities, setCities] = useState<Master[]>([]);
  const [localities, setLocalities] = useState<Master[]>([]);
  const [amenities, setAmenities] = useState<Master[]>([]);



  //================ LOAD LISTS (once) ================
  useEffect(() => {
    const loadLists = async () => {
      try {
        const typesRes = await api.get("/property-types");
        setTypes(typesRes.data);
        const statesRes = await api.get("/states");
        setStates(statesRes.data);
        const amenitiesRes = await api.get("/amenities");
        setAmenities(amenitiesRes.data);
      } catch (err) {
        toast.error(getErrorMessage(err));
      }
    };
    loadLists();
  }, []);



  //================ STATE CHANGED -> load its cities ================
  const handleStateChange = async (value: string) => {
    setStateId(value);
    setCityId("");
    setLocalityId("");
    setCities([]);
    setLocalities([]);
    if (value) {
      const res = await api.get("/cities/by-state/" + value);
      setCities(res.data);
    }
  };

  //================ CITY CHANGED -> load its localities ================
  const handleCityChange = async (value: string) => {
    setCityId(value);
    setLocalityId("");
    setLocalities([]);
    if (value) {
      const res = await api.get("/localities/by-city/" + value);
      setLocalities(res.data);
    }
  };

  //================ AMENITY ticked / unticked (old = latest list, safe for fast clicks) ================
  const toggleAmenity = (id: number) => {
    setAmenityIds((old) => {
      if (old.includes(id)) {
        return old.filter((x) => x !== id);
      }
      return old.concat(id);
    });
  };



  //================ SAVE ================
  const handleSave = async () => {

    if (!title.trim() || !description.trim() || !price || !areaSqft || !propertyTypeId || !cityId || !localityId) {
      setError("Please fill title, description, price, area, type, city and locality");
      return;
    }
    if (photos.length > 10) {
      setError("You can add up to 10 photos");
      return;
    }

    setError("");
    setSaving(true);

    // API 1: create the property  POST /api/properties
    let property = null;
    try {
      const res = await api.post("/properties", {
        listingType: listingType,
        title: title.trim(),
        description: description.trim(),
        price: Number(price),
        areaSqft: Number(areaSqft),
        bedrooms: bedrooms,
        bathrooms: bathrooms,
        furnishing: furnishing,
        address: address.trim(),
        propertyTypeId: Number(propertyTypeId),
        cityId: Number(cityId),
        localityId: Number(localityId),
        amenityIds: amenityIds,
      });
      property = res.data;
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
      return;
    }

    // API 2: upload photos  POST /api/property-images/:id  (form-data key "images")
    if (photos.length > 0) {
      try {
        const formData = new FormData();
        for (const photo of photos) {
          formData.append("images", photo);
        }
        await api.post("/property-images/" + property.id, formData);
      } catch (err) {
        toast.error("Property saved, but photos failed: " + getErrorMessage(err));
      }
    }

    toast.success("Property posted");
    router.push("/property/" + property.slug);
  };



  //================ dropdown options ================
  const typeOptions: SelectOption[] = [{ value: "", label: "Select type" }];
  for (const t of types) {
    typeOptions.push({ value: String(t.id), label: t.name });
  }
  const stateOptions: SelectOption[] = [{ value: "", label: "Select state" }];
  for (const s of states) {
    stateOptions.push({ value: String(s.id), label: s.name });
  }
  const cityOptions: SelectOption[] = [{ value: "", label: "Select city" }];
  for (const c of cities) {
    cityOptions.push({ value: String(c.id), label: c.name });
  }
  const localityOptions: SelectOption[] = [{ value: "", label: "Select locality" }];
  for (const l of localities) {
    localityOptions.push({ value: String(l.id), label: l.name });
  }



  //================ NOT LOGGED IN ================
  if (checked && !user) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="max-w-sm rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-700">Please login to post a property.</p>
          <Link href="/login?next=/post-property" className="mt-4 inline-block rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark">Login</Link>
        </div>
      </div>
    );
  }



  //================ SCREEN ================
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/30 [&_svg]:h-5 [&_svg]:w-5"><RiAddCircleFill /></span> Post your property</h1>
      <p className="mt-1 text-sm text-gray-500">Free. Buyers and tenants contact you directly.</p>

      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} noValidate className="mt-6 flex flex-col gap-5 rounded-2xl border border-gray-200 bg-white p-6">

        <Tabs value={listingType} options={LISTING_TABS} onChange={setListingType} />

        <Field>
          <Label className={labelClass}>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="2 BHK flat near metro" className={inputClass} />
        </Field>

        <Field>
          <Label className={labelClass}>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Tell buyers about the property" className={inputClass} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <Label className={labelClass}>{listingType === "RENT" ? "Rent per month (₹)" : "Price (₹)"}</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="4500000" className={inputClass} />
          </Field>
          <Field>
            <Label className={labelClass}>Area (sq.ft)</Label>
            <Input type="number" value={areaSqft} onChange={(e) => setAreaSqft(e.target.value)} placeholder="1100" className={inputClass} />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className={labelClass}>Property type</p>
            <Select value={propertyTypeId} options={typeOptions} onChange={setPropertyTypeId} className="w-full" />
          </div>
          <div>
            <p className={labelClass}>Bedrooms (BHK)</p>
            <Select value={bedrooms} options={NUMBER_OPTIONS} onChange={setBedrooms} className="w-full" />
          </div>
          <div>
            <p className={labelClass}>Bathrooms</p>
            <Select value={bathrooms} options={NUMBER_OPTIONS} onChange={setBathrooms} className="w-full" />
          </div>
        </div>

        <div>
          <p className={labelClass}>Furnishing</p>
          <Select value={furnishing} options={FURNISHING_OPTIONS} onChange={setFurnishing} className="w-full" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className={labelClass}>State</p>
            <Select value={stateId} options={stateOptions} onChange={handleStateChange} className="w-full" />
          </div>
          <div>
            <p className={labelClass}>City</p>
            <Select value={cityId} options={cityOptions} onChange={handleCityChange} disabled={!stateId} className="w-full" />
          </div>
          <div>
            <p className={labelClass}>Locality</p>
            <Select value={localityId} options={localityOptions} onChange={setLocalityId} disabled={!cityId} className="w-full" />
          </div>
        </div>

        <Field>
          <Label className={labelClass}>Address (optional)</Label>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="12, 3rd Street" className={inputClass} />
        </Field>

        {/* amenities: Headless UI Checkbox */}
        <div>
          <p className={labelClass}>Amenities</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {amenities.map((a) => (
              <Field key={a.id} className="flex items-center gap-2">
                <Checkbox
                  checked={amenityIds.includes(a.id)}
                  onChange={() => toggleAmenity(a.id)}
                  className="group flex h-5 w-5 items-center justify-center rounded border border-gray-300 bg-white data-checked:border-primary data-checked:bg-primary"
                >
                  <FiCheck className="hidden h-3.5 w-3.5 text-white group-data-checked:block" />
                </Checkbox>
                <Label className="cursor-pointer text-sm text-gray-700">{a.name}</Label>
              </Field>
            ))}
          </div>
        </div>

        {/* photos: hidden file input, the label looks like a button */}
        <div>
          <p className={labelClass}>Photos (up to 10, jpg / png / webp)</p>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-6 text-sm text-gray-600 hover:border-primary hover:text-primary">
            <FiImage className="h-5 w-5" />
            {photos.length === 0 ? "Click to choose photos" : photos.length + " photo(s) selected"}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => setPhotos(Array.from(e.target.files || []))}
            />
          </label>
        </div>

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <Button type="submit" loading={saving} className="w-full py-3">Post property</Button>
      </form>
    </div>
  );
};

export default PostPropertyPage;
