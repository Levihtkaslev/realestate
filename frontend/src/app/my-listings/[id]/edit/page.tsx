"use client";
// EDIT PROPERTY PAGE "/my-listings/5/edit" (owner or admin only)

import { use, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Checkbox, Field, Input, Label, Textarea } from "@headlessui/react";
import { toast } from "react-toastify";
import { RiKey2Fill, RiPriceTag3Fill, RiEditFill } from "react-icons/ri";
import { FiCheck, FiImage, FiStar, FiTrash2 } from "react-icons/fi";
import api, { getErrorMessage } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import Button from "@/components/Button";
import Select, { SelectOption } from "@/components/Select";
import Tabs from "@/components/Tabs";
import Loader from "@/components/Loader";
import ErrorBox from "@/components/ErrorBox";
import { PropertyDetail } from "@/types/property";

type Master = { id: number; name: string };
type Photo = { id: number; url: string; isCover: boolean };

type EditPageProps = {
  params: Promise<{ id: string }>;
};

const EditPropertyPage = ({ params }: EditPageProps) => {

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const router = useRouter();
  const { id } = use(params);
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

  // page state
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [ownerId, setOwnerId] = useState(0);
  const [slug, setSlug] = useState("");

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
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // dropdown lists
  const [types, setTypes] = useState<Master[]>([]);
  const [states, setStates] = useState<Master[]>([]);
  const [cities, setCities] = useState<Master[]>([]);
  const [localities, setLocalities] = useState<Master[]>([]);
  const [amenities, setAmenities] = useState<Master[]>([]);



  //================ LOAD property + lists (once) ================
  useEffect(() => {
    const loadAll = async () => {
      try {
        // API 1: the property
        const res = await api.get("/properties/" + id);
        const p: PropertyDetail = res.data;

        setOwnerId(p.ownerId);
        setSlug(p.slug);
        setListingType(p.listingType);
        setTitle(p.title);
        setDescription(p.description);
        setPrice(String(p.price));
        setAreaSqft(String(p.areaSqft));
        setBedrooms(p.bedrooms === null ? "" : String(p.bedrooms));
        setBathrooms(p.bathrooms === null ? "" : String(p.bathrooms));
        setFurnishing(p.furnishing === null ? "" : p.furnishing);
        setAddress(p.address === null ? "" : p.address);
        setPropertyTypeId(String(p.propertyType.id));
        setCityId(String(p.city.id));
        setLocalityId(String(p.locality.id));
        setAmenityIds(p.amenities.map((a) => a.amenity.id));
        setPhotos(p.images);

        // API 2: the city -> gives its state
        const cityRes = await api.get("/cities/" + p.city.id);
        const cityStateId = String(cityRes.data.stateId);
        setStateId(cityStateId);

        // API 3-7: dropdown lists
        const typesRes = await api.get("/property-types");
        setTypes(typesRes.data);
        const statesRes = await api.get("/states");
        setStates(statesRes.data);
        const citiesRes = await api.get("/cities/by-state/" + cityStateId);
        setCities(citiesRes.data);
        const localitiesRes = await api.get("/localities/by-city/" + p.city.id);
        setLocalities(localitiesRes.data);
        const amenitiesRes = await api.get("/amenities");
        setAmenities(amenitiesRes.data);
      } catch (err) {
        setLoadError(getErrorMessage(err));
      }
      setLoading(false);
    };
    loadAll();
  }, [id]);



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

  //================ AMENITY ticked / unticked ================
  const toggleAmenity = (amenityId: number) => {
    setAmenityIds((old) => {
      if (old.includes(amenityId)) {
        return old.filter((x) => x !== amenityId);
      }
      return old.concat(amenityId);
    });
  };



  //================ PHOTOS: add / set cover / delete (each saves at once) ================
  const reloadPhotos = async () => {
    const res = await api.get("/property-images/by-property/" + id);
    setPhotos(res.data);
  };

  const handleAddPhotos = async (files: File[]) => {
    if (files.length === 0) {
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      for (const file of files) {
        formData.append("images", file);
      }
      await api.post("/property-images/" + id, formData);
      await reloadPhotos();
      toast.success("Photos added");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
    setUploading(false);
  };

  const handleSetCover = async (imageId: number) => {
    try {
      await api.put("/property-images/" + imageId + "/cover");
      await reloadPhotos();
      toast.success("Cover photo changed");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleDeletePhoto = async (imageId: number) => {
    try {
      await api.delete("/property-images/" + imageId);
      await reloadPhotos();
      toast.success("Photo deleted");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };



  //================ SAVE  PUT /api/properties/:id ================
  const handleSave = async () => {

    if (!title.trim() || !description.trim() || !price || !areaSqft || !propertyTypeId || !cityId || !localityId) {
      setError("Please fill title, description, price, area, type, city and locality");
      return;
    }

    setError("");
    setSaving(true);
    try {
      await api.put("/properties/" + id, {
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
      toast.success("Property updated");
      router.push("/my-listings");
    } catch (err) {
      setError(getErrorMessage(err));
      setSaving(false);
    }
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



  //================ NOT LOGGED IN / LOADING / NOT YOURS ================
  if (checked && !user) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="max-w-sm rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-700">Please login to edit your property.</p>
          <Link href={"/login?next=/my-listings/" + id + "/edit"} className="mt-4 inline-block rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark">Login</Link>
        </div>
      </div>
    );
  }

  if (loading || !checked) {
    return <Loader text="Loading property..." />;
  }

  if (loadError) {
    return <ErrorBox message={loadError} />;
  }

  if (user && user.id !== ownerId && user.role !== "ADMIN") {
    return <ErrorBox message="You can edit only your own property." />;
  }



  //================ SCREEN ================
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/30 [&_svg]:h-5 [&_svg]:w-5"><RiEditFill /></span> Edit property</h1>
        <Link href={"/property/" + slug} className="text-sm font-medium text-primary hover:underline">View page</Link>
      </div>

      {/* ---------- photos (saved at once) ---------- */}
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6">
        <p className={labelClass}>Photos ({photos.length}/10) - changes here are saved at once</p>

        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative h-28 overflow-hidden rounded-lg bg-gray-100">
              <Image src={API_URL + photo.url} alt="property photo" fill sizes="200px" className="object-cover" />
              {photo.isCover && <span className="absolute left-1 top-1 rounded bg-primary px-2 py-0.5 text-xs font-medium text-white">Cover</span>}
              <div className="absolute bottom-1 right-1 flex gap-1">
                {!photo.isCover && (
                  <Button variant="secondary" onClick={() => handleSetCover(photo.id)} className="px-2! py-1!"><FiStar /></Button>
                )}
                <Button variant="secondary" onClick={() => handleDeletePhoto(photo.id)} className="px-2! py-1! text-red-600"><FiTrash2 /></Button>
              </div>
            </div>
          ))}

          {photos.length < 10 && (
            <label className="flex h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 text-xs text-gray-500 hover:border-primary hover:text-primary">
              <FiImage className="h-5 w-5" />
              {uploading ? "Uploading..." : "Add photos"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => handleAddPhotos(Array.from(e.target.files || []))}
              />
            </label>
          )}
        </div>
      </div>

      {/* ---------- details (saved with the Save button) ---------- */}
      <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} noValidate className="mt-6 flex flex-col gap-5 rounded-2xl border border-gray-200 bg-white p-6">

        <Tabs value={listingType} options={LISTING_TABS} onChange={setListingType} />

        <Field>
          <Label className={labelClass}>Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className={inputClass} />
        </Field>

        <Field>
          <Label className={labelClass}>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={inputClass} />
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field>
            <Label className={labelClass}>{listingType === "RENT" ? "Rent per month (₹)" : "Price (₹)"}</Label>
            <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className={inputClass} />
          </Field>
          <Field>
            <Label className={labelClass}>Area (sq.ft)</Label>
            <Input type="number" value={areaSqft} onChange={(e) => setAreaSqft(e.target.value)} className={inputClass} />
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
          <Input value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} />
        </Field>

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

        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => router.push("/my-listings")} className="flex-1 py-3">Cancel</Button>
          <Button type="submit" loading={saving} className="flex-1 py-3">Save changes</Button>
        </div>
      </form>
    </div>
  );
};

export default EditPropertyPage;
