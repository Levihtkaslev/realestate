"use client";
// REGISTER PAGE "/register" (creates the account, then logs in automatically)

import { RiUserAddFill } from "react-icons/ri";
import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Field, Input, Label } from "@headlessui/react";
import { toast } from "react-toastify";
import api, { getErrorMessage, saveRefreshToken } from "@/lib/api";
import { useAppDispatch } from "@/store/hooks";
import { setAuth } from "@/store/authSlice";
import Button from "@/components/Button";

type RegisterPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

const RegisterPage = ({ searchParams }: RegisterPageProps) => {

  const router = useRouter();
  const dispatch = useAppDispatch();
  const inputClass = "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-700 focus:outline-none data-focus:border-primary";
  const labelClass = "mb-1 block text-sm font-medium text-gray-700";

  // where to go after register (only our own pages)
  const params = use(searchParams);
  let nextUrl = "/";
  if (typeof params.next === "string" && params.next.startsWith("/") && !params.next.startsWith("//")) {
    nextUrl = params.next;
  }

  // form boxes
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);



  //================ REGISTER ================
  const handleRegister = async () => {

    // checks
    if (!name.trim() || !email.trim() || !phone.trim() || !password) {
      setError("Please fill all the fields");
      return;
    }
    if (!email.includes("@") || !email.includes(".")) {
      setError("Please enter a valid email");
      return;
    }
    if (phone.trim().length !== 10) {
      setError("Please enter a 10-digit mobile number");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setError("");
    setLoading(true);

    // API 1: create the account  POST /api/auth/register
    try {
      await api.post("/auth/register", { name: name.trim(), email: email.trim(), phone: phone.trim(), password: password });
    } catch (err) {
      setError(getErrorMessage(err));
      setLoading(false);
      return;
    }

    // API 2: log in automatically  POST /api/auth/login
    try {
      const res = await api.post("/auth/login", { email: email.trim(), password: password });
      saveRefreshToken(res.data.refreshToken);
      dispatch(setAuth({ user: res.data.user, accessToken: res.data.accessToken }));
      toast.success("Account created. Welcome, " + res.data.user.name);
      router.push(nextUrl);
    } catch {
      toast.success("Account created. Please login.");
      router.push("/login?next=" + nextUrl);
    }
  };



  //================ SCREEN ================
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">

        <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-900"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-md shadow-primary/30 [&_svg]:h-5 [&_svg]:w-5"><RiUserAddFill /></span> Create an account</h1>
        <p className="mt-1 text-sm text-gray-500">Post your property for free and contact owners directly.</p>

        {/* preventDefault = no page reload, noValidate = our checks instead of the browser popup */}
        <form onSubmit={(e) => { e.preventDefault(); handleRegister(); }} noValidate className="mt-6 flex flex-col gap-4">

          <Field>
            <Label className={labelClass}>Full name</Label>
            <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ravi Kumar" className={inputClass} />
          </Field>

          <Field>
            <Label className={labelClass}>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className={inputClass} />
          </Field>

          <Field>
            <Label className={labelClass}>Phone <span className="font-normal text-gray-400">(owners use it to call you)</span></Label>
            <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9876543210" className={inputClass} />
          </Field>

          <Field>
            <Label className={labelClass}>Password</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" className={inputClass} />
          </Field>

          <Field>
            <Label className={labelClass}>Confirm password</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Type the password again" className={inputClass} />
          </Field>

          {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

          <Button type="submit" loading={loading} className="mt-2 w-full py-2.5">Create account</Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link href={"/login?next=" + nextUrl} className="font-medium text-primary hover:underline">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
