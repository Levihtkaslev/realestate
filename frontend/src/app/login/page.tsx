"use client";
// LOGIN PAGE "/login" (after login go to ?next=... or home)

import { RiLoginBoxFill } from "react-icons/ri";
import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Field, Input, Label } from "@headlessui/react";
import { toast } from "react-toastify";
import api, { getErrorMessage, saveRefreshToken } from "@/lib/api";
import { useAppDispatch } from "@/store/hooks";
import { setAuth } from "@/store/authSlice";
import Button from "@/components/Button";

type LoginPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const LoginPage = ({ searchParams }: LoginPageProps) => {

  const router = useRouter();
  const dispatch = useAppDispatch();
  const inputClass = "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-700 focus:outline-none data-focus:border-primary";

  // where to go after login (only our own pages)
  const params = use(searchParams);
  let nextUrl = "/";
  if (typeof params.next === "string" && params.next.startsWith("/") && !params.next.startsWith("//")) {
    nextUrl = params.next;
  }

  // form boxes
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);



  //================ LOGIN  POST /api/auth/login ================
  const handleLogin = async () => {

    if (!email.trim() || !password) {
      setError("Please enter email and password");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await api.post("/auth/login", { email: email.trim(), password: password });
      saveRefreshToken(res.data.refreshToken);
      dispatch(setAuth({ user: res.data.user, accessToken: res.data.accessToken }));
      toast.success("Welcome, " + res.data.user.name);
      router.push(nextUrl);
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
    }
  };



  //================ SCREEN ================
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">

        <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/30 [&_svg]:h-5 [&_svg]:w-5"><RiLoginBoxFill /></span> Login</h1>
        <p className="mt-1 text-sm text-gray-500">Welcome back. Login to post properties and contact owners.</p>

        {/* preventDefault = no page reload, noValidate = our checks instead of the browser popup */}
        <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} noValidate className="mt-6 flex flex-col gap-4">

          <Field>
            <Label className="mb-1 block text-sm font-medium text-gray-700">Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputClass} />
          </Field>

          <Field>
            <Label className="mb-1 block text-sm font-medium text-gray-700">Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" className={inputClass} />
          </Field>

          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          <Button type="submit" loading={loading} className="mt-2 w-full py-2.5">Login</Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          New here?{" "}
          <Link href={"/register?next=" + nextUrl} className="font-medium text-primary hover:underline">Create an account</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
