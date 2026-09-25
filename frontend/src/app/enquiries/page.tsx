"use client";
// ENQUIRIES PAGE "/enquiries" (login required): Received | Sent tabs

import { useEffect, useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { FiMail, FiPhone } from "react-icons/fi";
import { RiInboxArchiveFill, RiSendPlaneFill, RiMailFill } from "react-icons/ri";
import api, { getErrorMessage } from "@/lib/api";
import { useAppSelector } from "@/store/hooks";
import { formatPrice } from "@/lib/format";
import Loader from "@/components/Loader";
import ErrorBox from "@/components/ErrorBox";

type ReceivedEnquiry = {
  id: number;
  message: string;
  createdAt: string;
  property: { id: number; title: string; slug: string };
  user: { id: number; name: string; email: string; phone: string | null };
};

type SentEnquiry = {
  id: number;
  message: string;
  createdAt: string;
  property: { id: number; title: string; slug: string; price: number; listingType: string; status: string };
};

const EnquiriesPage = () => {

  const user = useAppSelector((state) => state.auth.user);
  const checked = useAppSelector((state) => state.auth.checked);

  const [received, setReceived] = useState<ReceivedEnquiry[]>([]);
  const [sent, setSent] = useState<SentEnquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");



  //================ LOAD both lists ================
  const loadEnquiries = async () => {
    try {
      // API 1: enquiries on my properties
      const receivedRes = await api.get("/inquiries/received");
      setReceived(receivedRes.data);

      // API 2: enquiries I sent
      const sentRes = await api.get("/inquiries/sent");
      setSent(sentRes.data);

      setError("");
    } catch (err) {
      setError(getErrorMessage(err));
    }
    setLoading(false);
  };

  useEffect(() => {
    const start = async () => {
      if (user) {
        await loadEnquiries();
      }
    };
    start();
  }, [user]);



  //================ NOT LOGGED IN ================
  if (checked && !user) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="max-w-sm rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <p className="text-gray-700">Please login to see your enquiries.</p>
          <Link href="/login?next=/enquiries" className="mt-4 inline-block rounded-lg bg-primary px-5 py-2 text-sm font-medium text-white hover:bg-primary-dark">Login</Link>
        </div>
      </div>
    );
  }



  //================ SCREEN ================
  const tabClass = "flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium text-gray-600 transition-colors focus:outline-none data-hover:text-gray-900 data-selected:bg-primary data-selected:text-white data-selected:data-hover:bg-primary-dark data-selected:data-hover:text-white [&_svg]:h-4 [&_svg]:w-4";

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="flex items-center gap-3 mb-6 text-2xl font-bold text-gray-900"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/30 [&_svg]:h-5 [&_svg]:w-5"><RiMailFill /></span> Enquiries</h1>

      {loading && <Loader text="Loading enquiries..." />}

      {!loading && error && <ErrorBox message={error} onRetry={() => { setLoading(true); loadEnquiries(); }} />}

      {!loading && !error && (
        <TabGroup>
          <TabList className="inline-grid auto-cols-fr grid-flow-col gap-1 rounded-lg bg-gray-100 p-1">
            <Tab className={tabClass}><RiInboxArchiveFill /> Received ({received.length})</Tab>
            <Tab className={tabClass}><RiSendPlaneFill /> Sent ({sent.length})</Tab>
          </TabList>

          <TabPanels className="mt-6">

            {/* ---------- RECEIVED: people who asked about my properties ---------- */}
            <TabPanel className="flex flex-col gap-4">
              {received.length === 0 && (
                <p className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-500">No one has contacted you yet.</p>
              )}

              {received.map((item) => (
                <div key={item.id} className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-900">{item.user.name}</p>
                      <p className="text-xs text-gray-500">
                        about <Link href={"/property/" + item.property.slug} className="text-primary hover:underline">{item.property.title}</Link>
                      </p>
                    </div>
                    <p className="text-xs text-gray-400">{dayjs(item.createdAt).format("DD MMM YYYY, hh:mm A")}</p>
                  </div>

                  <p className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{item.message}</p>

                  <div className="mt-3 flex flex-wrap gap-4 text-sm">
                    {item.user.phone && (
                      <a href={"tel:" + item.user.phone} className="flex items-center gap-1 text-primary hover:underline"><FiPhone /> {item.user.phone}</a>
                    )}
                    <a href={"mailto:" + item.user.email} className="flex items-center gap-1 text-primary hover:underline"><FiMail /> {item.user.email}</a>
                  </div>
                </div>
              ))}
            </TabPanel>

            {/* ---------- SENT: properties I asked about ---------- */}
            <TabPanel className="flex flex-col gap-4">
              {sent.length === 0 && (
                <p className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-500">You have not contacted any owner yet.</p>
              )}

              {sent.map((item) => (
                <div key={item.id} className="rounded-2xl border border-gray-200 bg-white p-5">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <Link href={"/property/" + item.property.slug} className="font-semibold text-gray-900 hover:text-primary">{item.property.title}</Link>
                      <p className="text-sm text-gray-600">{formatPrice(item.property.price, item.property.listingType)}</p>
                    </div>
                    <div className="text-right">
                      {item.property.status !== "ACTIVE" && <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">No longer available</span>}
                      <p className="mt-1 text-xs text-gray-400">{dayjs(item.createdAt).format("DD MMM YYYY, hh:mm A")}</p>
                    </div>
                  </div>
                  <p className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{item.message}</p>
                </div>
              ))}
            </TabPanel>
          </TabPanels>
        </TabGroup>
      )}
    </div>
  );
};

export default EnquiriesPage;
