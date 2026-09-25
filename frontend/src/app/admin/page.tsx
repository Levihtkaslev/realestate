"use client";
// ADMIN PAGE "/admin" (admin only): manage states, cities, localities, property types, amenities

import { useEffect, useState } from "react";
import Link from "next/link";
import { CloseButton, Dialog, DialogPanel, DialogTitle, Field, Input, Label, Switch, Tab, TabGroup, TabList } from "@headlessui/react";
import { toast } from "react-toastify";
import { FiPlus, FiX } from "react-icons/fi";
import { RiBuilding2Fill, RiHome2Fill, RiMapPin2Fill, RiMapPinFill, RiStarFill, RiShieldUserFill, RiEditFill, RiDeleteBin6Fill, RiSearchLine, RiErrorWarningFill, RiArrowLeftSLine, RiArrowRightSLine } from "react-icons/ri";
import api, { getErrorMessage } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import Button from "@/components/Button";
import Select, { SelectOption } from "@/components/Select";
import Loader from "@/components/Loader";
import ErrorBox from "@/components/ErrorBox";

type Row = {
  id: number;
  name: string;
  isActive: boolean;
  code?: string;                   // states
  stateId?: number;                // cities
  cityId?: number;                 // localities
  state?: { name: string };        // cities
  city?: { name: string };         // localities
};

type Master = { id: number; name: string };

const AdminPage = () => {

  const user = useAppSelector((state) => state.auth.user);
  const checked = useAppSelector((state) => state.auth.checked);

  // the 5 tabs: label + API url
  const TABS = [
    { label: "States", url: "/states", icon: <RiMapPin2Fill /> },
    { label: "Cities", url: "/cities", icon: <RiBuilding2Fill /> },
    { label: "Localities", url: "/localities", icon: <RiMapPinFill /> },
    { label: "Property types", url: "/property-types", icon: <RiHome2Fill /> },
    { label: "Amenities", url: "/amenities", icon: <RiStarFill /> },
  ];

  const [tabIndex, setTabIndex] = useState(0);
  const tab = TABS[tabIndex];

  // table
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");   // search box above the table
  const [page, setPage] = useState(1);        // current page of the table
  const [perPage, setPerPage] = useState(10); // rows per page

  // lists for the popup dropdowns (city needs a state, locality needs a city)
  const [allStates, setAllStates] = useState<Master[]>([]);
  const [allCities, setAllCities] = useState<Master[]>([]);

  // popup form (editRow = null means "add new")
  const [formOpen, setFormOpen] = useState(false);
  const [editRow, setEditRow] = useState<Row | null>(null);
  const [formName, setFormName] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formParentId, setFormParentId] = useState("");
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  // delete popup
  const [deleteRow, setDeleteRow] = useState<Row | null>(null);



  //================ LOAD the table of the selected tab  GET /api/<url>?all=true ================
  const loadRows = async (url: string) => {
    try {
      const res = await api.get(url + "?all=true");
      setRows(res.data);
      setError("");
    } catch (err) {
      setError(getErrorMessage(err));
    }
    setLoading(false);
  };

  // load again every time the tab changes
  useEffect(() => {
    const start = async () => {
      if (user && user.role === "ADMIN") {
        await loadRows(TABS[tabIndex].url);
      }
    };
    start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabIndex, user]);

  // dropdown lists for the popup (once)
  useEffect(() => {
    const start = async () => {
      if (user && user.role === "ADMIN") {
        const statesRes = await api.get("/states");
        setAllStates(statesRes.data);
        const citiesRes = await api.get("/cities");
        setAllCities(citiesRes.data);
      }
    };
    start();
  }, [user]);

  const changeTab = (index: number) => {
    setLoading(true);
    setRows([]);
    setSearch("");
    setPage(1);
    setTabIndex(index);
  };



  //================ OPEN the popup (add or edit) ================
  const openAdd = () => {
    setEditRow(null);
    setFormName("");
    setFormCode("");
    setFormParentId("");
    setFormError("");
    setFormOpen(true);
  };

  const openEdit = (row: Row) => {
    setEditRow(row);
    setFormName(row.name);
    setFormCode(row.code || "");
    setFormParentId(String(row.stateId || row.cityId || ""));
    setFormError("");
    setFormOpen(true);
  };



  //================ SAVE  POST (add) or PUT (edit) ================
  const handleSave = async () => {

    if (!formName.trim()) {
      setFormError("Name is required");
      return;
    }

    // body depends on the tab
    const body: Record<string, string | number> = { name: formName.trim() };
    if (tab.label === "States") {
      if (!formCode.trim()) {
        setFormError("Code is required, e.g. TN");
        return;
      }
      body.code = formCode.trim();
    }
    if (tab.label === "Cities") {
      if (!formParentId) {
        setFormError("Please choose a state");
        return;
      }
      body.stateId = Number(formParentId);
    }
    if (tab.label === "Localities") {
      if (!formParentId) {
        setFormError("Please choose a city");
        return;
      }
      body.cityId = Number(formParentId);
    }

    setFormError("");
    setSaving(true);
    try {
      if (editRow) {
        await api.put(tab.url + "/" + editRow.id, body);
        toast.success("Updated");
      } else {
        await api.post(tab.url, body);
        toast.success("Added");
      }
      setFormOpen(false);
      await loadRows(tab.url);

      // new/changed state or city -> refresh the popup dropdown lists too
      if (tab.label === "States") {
        const statesRes = await api.get("/states");
        setAllStates(statesRes.data);
      }
      if (tab.label === "Cities") {
        const citiesRes = await api.get("/cities");
        setAllCities(citiesRes.data);
      }
    } catch (err) {
      setFormError(getErrorMessage(err)); // e.g. "city already exists"
    }
    setSaving(false);
  };



  //================ ACTIVE switch  PUT { isActive } ================
  const handleActive = async (row: Row, isActive: boolean) => {
    try {
      await api.put(tab.url + "/" + row.id, { isActive: isActive });
      setRows((old) => old.map((r) => (r.id === row.id ? { ...r, isActive: isActive } : r)));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };



  //================ DELETE ================
  const handleDelete = async () => {
    if (!deleteRow) {
      return;
    }
    try {
      await api.delete(tab.url + "/" + deleteRow.id);
      toast.success("Deleted");
      setRows((old) => old.filter((r) => r.id !== deleteRow.id));
    } catch (err) {
      toast.error(getErrorMessage(err)); // e.g. "cannot delete: 3 city(s) belong to this state"
    }
    setDeleteRow(null);
  };



  //================ NOT ADMIN ================
  if (checked && (!user || user.role !== "ADMIN")) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="max-w-sm rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-700">This page is only for the admin.</p>
          <Link href="/" className="mt-4 inline-block rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark">Go home</Link>
        </div>
      </div>
    );
  }



  //================ popup dropdown options ================
  const stateOptions: SelectOption[] = [{ value: "", label: "Select state" }];
  for (const s of allStates) {
    stateOptions.push({ value: String(s.id), label: s.name });
  }
  const cityOptions: SelectOption[] = [{ value: "", label: "Select city" }];
  for (const c of allCities) {
    cityOptions.push({ value: String(c.id), label: c.name });
  }



  //================ search: only rows whose name has the typed text ================
  const shownRows = rows.filter((row) => row.name.toLowerCase().includes(search.trim().toLowerCase()));

  //================ pagination (in the browser): cut shownRows into pages ================
  const PER_PAGE_OPTIONS = [
    { value: "5", label: "5" },
    { value: "10", label: "10" },
    { value: "20", label: "20" },
    { value: "50", label: "50" },
  ];
  const totalPages = Math.max(1, Math.ceil(shownRows.length / perPage));
  let currentPage = page;
  if (currentPage > totalPages) {
    currentPage = totalPages; // e.g. after a delete the last page became empty
  }
  const firstIndex = (currentPage - 1) * perPage;
  const pageRows = shownRows.slice(firstIndex, firstIndex + perPage);
  // show at most 5 page numbers around the current page
  const startPage = Math.max(1, Math.min(currentPage - 2, totalPages - 4));
  const endPage = Math.min(totalPages, startPage + 4);
  const pageNumbers: number[] = [];
  for (let i = startPage; i <= endPage; i++) {
    pageNumbers.push(i);
  }



  //================ SCREEN ================
  const tabClass = "flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium text-gray-600 transition-colors focus:outline-none data-hover:text-gray-900 data-selected:bg-primary data-selected:text-white data-selected:data-hover:bg-primary-dark data-selected:data-hover:text-white [&_svg]:h-4 [&_svg]:w-4";
  const inputClass = "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-700 focus:outline-none data-focus:border-primary";

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="flex items-center gap-3 mb-6 text-2xl font-bold text-gray-900"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/30 [&_svg]:h-5 [&_svg]:w-5"><RiShieldUserFill /></span> Admin</h1>

      <TabGroup selectedIndex={tabIndex} onChange={changeTab}>
        <TabList className="grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-gray-100 p-1 overflow-x-auto">
          {TABS.map((t) => (
            <Tab key={t.label} className={tabClass}>{t.icon} {t.label}</Tab>
          ))}
        </TabList>
      </TabGroup>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <RiSearchLine className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder={"Search " + tab.label.toLowerCase() + "..."} className={inputClass + " bg-white pl-9"} />
        </div>
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-500">{shownRows.length} of {rows.length} {tab.label.toLowerCase()}</p>
          <Button onClick={openAdd}><FiPlus /> Add</Button>
        </div>
      </div>

      {loading && <Loader />}

      {!loading && error && <ErrorBox message={error} onRetry={() => { setLoading(true); loadRows(tab.url); }} />}

      {!loading && !error && (
        <div className="mt-3 overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="bg-primary-dark text-sm font-semibold text-white">
              <tr>
                <th className="w-20 px-4 py-4">S.No</th>
                <th className="px-4 py-4">Name</th>
                {tab.label === "States" && <th className="px-4 py-4">Code</th>}
                {tab.label === "Cities" && <th className="px-4 py-4">State</th>}
                {tab.label === "Localities" && <th className="px-4 py-4">City</th>}
                <th className="px-4 py-4">Active</th>
                <th className="px-4 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shownRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-gray-500">Nothing found</td>
                </tr>
              )}
              {pageRows.map((row, index) => (
                <tr key={row.id} className="hover:bg-primary-light/50">
                  <td className="px-4 py-3 text-gray-500">{firstIndex + index + 1}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{row.name}</td>
                  {tab.label === "States" && <td className="px-4 py-3 text-gray-600">{row.code}</td>}
                  {tab.label === "Cities" && <td className="px-4 py-3 text-gray-600">{row.state?.name}</td>}
                  {tab.label === "Localities" && <td className="px-4 py-3 text-gray-600">{row.city?.name}</td>}
                  <td className="px-4 py-3">
                    {/* on / off switch (Headless UI Switch) */}
                    <Switch
                      checked={row.isActive}
                      onChange={(value) => handleActive(row, value)}
                      className="group relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300 transition data-checked:bg-primary"
                    >
                      <span className="inline-block h-4 w-4 translate-x-1 rounded-full bg-white transition group-data-checked:translate-x-6" />
                    </Switch>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button onClick={() => openEdit(row)} className="px-2.5!"><RiEditFill className="h-4 w-4" /></Button>
                      <Button variant="cancel" onClick={() => setDeleteRow(row)} className="px-2.5!"><RiDeleteBin6Fill className="h-4 w-4" /></Button>
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
                Showing {shownRows.length === 0 ? 0 : firstIndex + 1}-{firstIndex + pageRows.length} of {shownRows.length}
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


      {/* ---------- add / edit popup ---------- */}
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">

            {/* dark header */}
            <div className="flex items-center justify-between bg-primary-dark px-6 py-4">
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-white [&_svg]:h-5 [&_svg]:w-5">{tab.icon} {editRow ? "Edit" : "Add"} - {tab.label}</DialogTitle>
              <CloseButton className="rounded-lg p-1 text-white/80 data-hover:bg-white/10 data-hover:text-white" aria-label="Close"><FiX className="h-5 w-5" /></CloseButton>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} noValidate className="flex flex-col gap-4 p-6">
              <Field>
                <Label className="mb-1 block text-sm font-medium text-gray-700">Name</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} className={inputClass} />
              </Field>

              {tab.label === "States" && (
                <Field>
                  <Label className="mb-1 block text-sm font-medium text-gray-700">Code (2-5 letters)</Label>
                  <Input value={formCode} onChange={(e) => setFormCode(e.target.value)} placeholder="TN" className={inputClass} />
                </Field>
              )}

              {tab.label === "Cities" && (
                <div>
                  <p className="mb-1 text-sm font-medium text-gray-700">State</p>
                  <Select value={formParentId} options={stateOptions} onChange={setFormParentId} className="w-full" />
                </div>
              )}

              {tab.label === "Localities" && (
                <div>
                  <p className="mb-1 text-sm font-medium text-gray-700">City</p>
                  <Select value={formParentId} options={cityOptions} onChange={setFormParentId} className="w-full" />
                </div>
              )}

              {formError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</p>}

              <div className="mt-2 grid grid-cols-2 gap-3">
                <Button variant="cancel" onClick={() => setFormOpen(false)} className="w-full py-2.5">Cancel</Button>
                <Button type="submit" loading={saving} className="w-full py-2.5">Save</Button>
              </div>
            </form>
          </DialogPanel>
        </div>
      </Dialog>


      {/* ---------- delete popup ---------- */}
      <Dialog open={deleteRow !== null} onClose={() => setDeleteRow(null)} className="relative z-50">
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <DialogPanel className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between bg-primary-dark px-6 py-4">
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-white"><RiErrorWarningFill className="h-5 w-5" /> Delete &quot;{deleteRow?.name}&quot;?</DialogTitle>
              <CloseButton className="rounded-lg p-1 text-white/80 data-hover:bg-white/10 data-hover:text-white" aria-label="Close"><FiX className="h-5 w-5" /></CloseButton>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600">If it is used by other data, delete is blocked. Turn it off (Active) instead.</p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                <Button variant="cancel" onClick={() => setDeleteRow(null)} className="w-full py-2.5">Cancel</Button>
                <Button variant="danger" onClick={handleDelete} className="w-full py-2.5">Delete</Button>
              </div>
            </div>
          </DialogPanel>
        </div>
      </Dialog>
    </div>
  );
};

export default AdminPage;
