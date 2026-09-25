"use client";
// MY LISTINGS PAGE "/my-listings" (login required)

import { RiArrowLeftSLine, RiArrowRightSLine, RiDeleteBin6Fill, RiEditFill, RiErrorWarningFill, RiEyeFill, RiFileList3Fill, RiSearchLine } from "react-icons/ri";
import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import dayjs from "dayjs";
import { CloseButton, Dialog, DialogPanel, DialogTitle, Input } from "@headlessui/react";
import { toast } from "react-toastify";
import { FiHome, FiPlusCircle, FiX } from "react-icons/fi";
import api, { getErrorMessage } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { formatPrice } from "@/lib/format";
import Button from "@/components/Button";
import Select from "@/components/Select";
import Loader from "@/components/Loader";
import ErrorBox from "@/components/ErrorBox";
import { PropertyCardData } from "@/types/property";

type MyProperty = PropertyCardData & { status: "ACTIVE" | "INACTIVE" | "SOLD" };

const MyListingsPage = () => {

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
  const user = useAppSelector((state) => state.auth.user);
  const checked = useAppSelector((state) => state.auth.checked);

  const STATUS_OPTIONS = [
    { value: "ACTIVE", label: "Active" },
    { value: "INACTIVE", label: "Hidden" },
    { value: "SOLD", label: "Sold / Rented" },
  ];

  const [properties, setProperties] = useState<MyProperty[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteItem, setDeleteItem] = useState<MyProperty | null>(null); 
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");   // search box above the table
  const [page, setPage] = useState(1);        // current page of the table
  const [perPage, setPerPage] = useState(10); // rows per page



  //================ LOAD  GET /api/properties/mine ================
  const loadMine = async () => {
    try {
      const res = await api.get("/properties/mine");
      setProperties(res.data);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err));
    }
    setLoading(false);
  };

  // load once we know the user is logged in
  useEffect(() => {
    const start = async () => {
      if (user) {
        await loadMine();
      }
    };
    start();
  }, [user]);



  //================ CHANGE STATUS  PUT /api/properties/:id ================
  const handleStatusChange = async (id: number, status: string) => {
    try {
      await api.put("/properties/" + id, { status: status });
      setProperties((old) => old.map((p) => (p.id === id ? { ...p, status: status as MyProperty["status"] } : p)));
      toast.success("Status updated");
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };



  //================ DELETE  DELETE /api/properties/:id ================
  const handleDelete = async () => {
    if (!deleteItem) {
      return;
    }
    setDeleting(true);
    try {
      await api.delete("/properties/" + deleteItem.id);
      setProperties((old) => old.filter((p) => p.id !== deleteItem.id));
      toast.success("Property deleted");
      setDeleteItem(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
    setDeleting(false);
  };



  //================ NOT LOGGED IN ================
  if (checked && !user) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="max-w-sm rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-700">Please login to see your listings.</p>
          <Link href="/login?next=/my-listings" className="mt-4 inline-block rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark">Login</Link>
        </div>
      </div>
    );
  }



  //================ search: title, place or type has the typed text ================
  const searchText = search.trim().toLowerCase();
  const shownProperties = properties.filter((p) => {
    const text = (p.title + " " + p.locality.name + " " + p.city.name + " " + p.propertyType.name).toLowerCase();
    return text.includes(searchText);
  });

  //================ pagination (in the browser): cut shownProperties into pages ================
  const PER_PAGE_OPTIONS = [
    { value: "5", label: "5" },
    { value: "10", label: "10" },
    { value: "20", label: "20" },
    { value: "50", label: "50" },
  ];
  const totalPages = Math.max(1, Math.ceil(shownProperties.length / perPage));
  let currentPage = page;
  if (currentPage > totalPages) {
    currentPage = totalPages; // e.g. after a delete the last page became empty
  }
  const firstIndex = (currentPage - 1) * perPage;
  const pageProperties = shownProperties.slice(firstIndex, firstIndex + perPage);
  // show at most 5 page numbers around the current page
  const startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const endPage = Math.min(totalPages, startPage + 4);
  const pageNumbers: number[] = [];
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }



  //================ SCREEN ================
  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">

      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/30 [&_svg]:h-5 [&_svg]:w-5"><RiFileList3Fill /></span> My listings</h1>
        <Link href="/post-property" className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark">
          <FiPlusCircle /> Post property
        </Link>
      </div>

      {loading && <Loader text="Loading your properties..." />}

      {!loading && error && <ErrorBox message={error} onRetry={() => { setLoading(true); loadMine(); }} />}

      {!loading && !error && properties.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-500">
          You have not posted any property yet.
        </div>
      )}

      {!loading && !error && properties.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <RiSearchLine className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search title, place or type..."
              className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pr-3 pl-9 text-sm text-gray-700 focus:outline-none data-focus:border-primary"
            />
          </div>
          <p className="text-sm text-gray-500">{shownProperties.length} of {properties.length} properties</p>
        </div>
      )}

      {!loading && !error && properties.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-primary-dark text-sm font-semibold text-white">
              <tr>
                <th className="w-20 px-4 py-4">S.No</th>
                <th className="px-4 py-4">Property</th>
                <th className="px-4 py-4">Price</th>
                <th className="px-4 py-4">Posted</th>
                <th className="px-4 py-4">Status</th>
                <th className="px-4 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pageProperties.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">Nothing found</td>
                </tr>
              )}
              {pageProperties.map((p, index) => (
                <tr key={p.id} className="hover:bg-primary-light/50">
                  <td className="px-4 py-3 text-gray-500">{firstIndex + index + 1}</td>

                  {/* photo + title + place */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-md bg-gray-100">
                        {p.images.length > 0 && <Image src={API_URL + p.images[0].url} alt={p.title} fill sizes="64px" className="object-cover" />}
                        {p.images.length === 0 && <FiHome className="m-auto mt-3 h-6 w-6 text-gray-300" />}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-gray-900">{p.title}</p>
                        <p className="text-xs text-gray-500">{p.locality.name}, {p.city.name} · {p.propertyType.name}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3 font-semibold text-gray-900">{formatPrice(p.price, p.listingType)}</td>

                  <td className="px-4 py-3 text-gray-600">{dayjs(p.createdAt).format("DD MMM YYYY")}</td>

                  <td className="px-4 py-3">
                    <Select value={p.status} options={STATUS_OPTIONS} onChange={(value) => handleStatusChange(p.id, value)} />
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={"/property/" + p.slug} className="rounded-lg bg-gray-600 px-2.5 py-2 text-white hover:bg-gray-700" title="View"><RiEyeFill className="h-4 w-4" /></Link>
                      <Link href={"/my-listings/" + p.id + "/edit"} className="rounded-lg bg-primary px-2.5 py-2 text-white hover:bg-primary-dark" title="Edit"><RiEditFill className="h-4 w-4" /></Link>
                      <Button variant="cancel" onClick={() => setDeleteItem(p)} className="px-2.5!"><RiDeleteBin6Fill className="h-4 w-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ---------- pagination bar ---------- */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span>Rows per page</span>
              <Select value={String(perPage)} options={PER_PAGE_OPTIONS} onChange={(value) => { setPerPage(Number(value)); setPage(1); }} className="min-w-20!" />
              <span className="ml-2">
                Showing {shownProperties.length === 0 ? 0 : firstIndex + 1}-{firstIndex + pageProperties.length} of {shownProperties.length}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-2">Page {currentPage} of {totalPages}</span>
              <Button variant="light" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1} className="px-2.5!"><RiArrowLeftSLine className="h-4 w-4" /></Button>
              {pageNumbers.map((number) => (
                <Button key={number} variant={number === currentPage ? "primary" : "light"} onClick={() => setPage(number)} className="min-w-9 px-2.5!">
                  {number}
                </Button>
              ))}
              <Button variant="light" onClick={() => setPage(currentPage + 1)} disabled={currentPage === totalPages} className="px-2.5!"><RiArrowRightSLine className="h-4 w-4" /></Button>
            </div>
          </div>
        </div>
      )}


      {/* ---------- delete popup ---------- */}
      <Dialog open={deleteItem !== null} onClose={() => setDeleteItem(null)} className="relative z-50">
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between bg-primary-dark px-6 py-4">
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-white"><RiErrorWarningFill className="h-5 w-5" /> Delete property?</DialogTitle>
              <CloseButton className="rounded-lg p-1 text-white/80 data-hover:bg-white/10 data-hover:text-white" aria-label="Close"><FiX className="h-5 w-5" /></CloseButton>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600">&quot;{deleteItem?.title}&quot; and its photos and enquiries will be deleted. This cannot be undone.</p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <Button variant="cancel" onClick={() => setDeleteItem(null)} className="w-full py-2.5">Cancel</Button>
                <Button variant="danger" loading={deleting} onClick={handleDelete} className="w-full py-2.5">Delete</Button>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
};

export default MyListingsPage;
