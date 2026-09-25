"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";
import { CloseButton, Dialog, DialogPanel, DialogTitle, Field, Label, Textarea } from "@headlessui/react";
import { toast } from "react-toastify";
import { FiHome, FiMapPin, FiPhone, FiUser, FiX } from "react-icons/fi";
import { RiCheckboxCircleFill, RiHome4Fill } from "react-icons/ri";
import api, { getErrorMessage } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { formatPrice } from "@/lib/format";
import Button from "@/components/Button";
import { PropertyDetail } from "@/types/property";

const TopSection = ({ property }: { property: PropertyDetail }) => {

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

  const user = useAppSelector((state) => state.auth.user); 
  const [open, setOpen] = useState(false);                 
  const [message, setMessage] = useState("Hi, I am interested in this property. Is it still available?");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);                 



  //================ API: send enquiry  POST /api/inquiries ================
  const handleSend = async () => {
    if (message.trim().length < 10) {
      toast.error("Please write at least 10 characters");
      return;
    }

    setSending(true);
    try {
      await api.post("/inquiries", { propertyId: property.id, message: message.trim() });
      toast.success("Enquiry sent. The owner will contact you.");
      setSent(true);
      setOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err)); 
    }
    setSending(false);
  };

  let isOwner = false;
  if (user && user.id === property.ownerId) {
    isOwner = true;
  }



  //================ screen ================
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

      {/* ---------- LEFT: photo slider ---------- */}
      <div className="overflow-hidden rounded-2xl bg-gray-100 lg:col-span-2">
        {property.images.length > 0 && (
          <Swiper modules={[Navigation, Pagination]} navigation pagination={{ clickable: true }} className="h-72 sm:h-96">
            {property.images.map((image, index) => (
              <SwiperSlide key={image.id}>
                <div className="relative h-full w-full">
                  {/* first photo loads immediately (it is the biggest thing at the top), others when needed */}
                  <Image src={API_URL + image.url} alt={property.title} fill sizes="(max-width: 1024px) 100vw, 66vw" loading={index === 0 ? "eager" : "lazy"} className="object-cover" />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        )}

        {property.images.length === 0 && (
          <div className="flex h-72 flex-col items-center justify-center gap-2 text-gray-400 sm:h-96">
            <FiHome className="h-16 w-16" />
            <p className="text-sm">No photos yet</p>
          </div>
        )}
      </div>


      {/* ---------- RIGHT: price + owner + contact ---------- */}
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6">
        <span className="w-fit rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">
          {property.listingType === "SALE" ? "For Sale" : "For Rent"}
        </span>

        <p className="text-3xl font-bold text-gray-900">{formatPrice(property.price, property.listingType)}</p>
        <h1 className="text-lg font-semibold text-gray-800">{property.title}</h1>
        <p className="flex items-center gap-1 text-sm text-gray-500">
          <FiMapPin /> {property.locality.name}, {property.city.name}
        </p>

        <div className="border-t border-gray-100 pt-4 text-sm text-gray-600">
          <p className="flex items-center gap-2"><FiUser /> Posted by <span className="font-medium text-gray-900">{property.owner.name}</span></p>
        </div>

        {/* who sees what */}
        {property.status !== "ACTIVE" && (
          <p className="rounded-lg bg-gray-100 p-3 text-center text-sm text-gray-600">This property is no longer available.</p>
        )}
        {property.status === "ACTIVE" && isOwner && (
          <p className="flex items-center justify-center gap-2 rounded-lg bg-primary-dark p-3 text-center text-sm font-medium text-white"><RiHome4Fill className="h-4 w-4" /> This is your property</p>
        )}
        {property.status === "ACTIVE" && !isOwner && sent && (
          <p className="flex items-center justify-center gap-2 rounded-lg bg-primary-dark p-3 text-center text-sm font-medium text-white"><RiCheckboxCircleFill className="h-4 w-4" /> Enquiry sent</p>
        )}
        {property.status === "ACTIVE" && !isOwner && !sent && (
          <Button onClick={() => setOpen(true)} className="w-full py-3">
            <FiPhone /> Contact owner
          </Button>
        )}
      </div>


      {/* ---------- POPUP (Headless UI Dialog) ---------- */}
      <Dialog open={open} onClose={() => setOpen(false)} className="relative z-50">

        {/* dark background */}
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">

            {/* dark header */}
            <div className="flex items-center justify-between bg-primary-dark px-6 py-4">
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-white"><FiPhone className="h-5 w-5" /> Contact owner</DialogTitle>
              <CloseButton className="rounded-lg p-1 text-white/80 data-hover:bg-white/10 data-hover:text-white" aria-label="Close">
                <FiX className="h-5 w-5" />
              </CloseButton>
            </div>

            <div className="p-6">

            {/* guest -> must login first */}
            {!user && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-gray-600">Please login to send an enquiry to the owner.</p>
                <Link href={"/login?next=/property/" + property.slug} className="rounded-lg bg-primary px-4 py-2 text-center text-sm font-medium text-white hover:bg-primary-dark">
                  Login to continue
                </Link>
              </div>
            )}

            {/* logged in -> message box */}
            {user && (
              <div className="flex flex-col gap-4">
                <p className="text-sm text-gray-600">
                  About: <span className="font-medium text-gray-900">{property.title}</span>
                </p>

                <Field>
                  <Label className="mb-1 block text-sm font-medium text-gray-700">Your message</Label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    maxLength={500}
                    className="w-full rounded-lg border border-gray-300 p-3 text-sm text-gray-700 focus:outline-none data-focus:border-primary"
                  />
                  <p className="mt-1 text-right text-xs text-gray-400">{message.length}/500</p>
                </Field>

                <div className="grid grid-cols-2 gap-3">
                  <Button variant="cancel" onClick={() => setOpen(false)} className="w-full py-2.5">Cancel</Button>
                  <Button loading={sending} onClick={handleSend} className="w-full py-2.5">Send enquiry</Button>
                </div>
              </div>
            )}
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
};

export default TopSection;
