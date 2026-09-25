"use client";
// "use client" because the navbar reads Redux (who is logged in) and has click actions (menu, logout)

import { Suspense, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { toast } from "react-toastify";
import { RiHome4Fill, RiKey2Fill, RiAddCircleFill, RiFileList3Fill, RiMailFill, RiShieldUserFill, RiLogoutBoxRFill } from "react-icons/ri";
import { FiMenu, FiX, FiChevronDown } from "react-icons/fi";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { clearAuth } from "@/store/authSlice";
import api, { getRefreshToken, removeRefreshToken } from "@/lib/api";

type BuyRentProps = {
  mobile: boolean;
  onClick?: () => void;
};

//================ Buy / Rent links. active = "SALE" | "RENT" | "" -> that link gets a dark bg + white text ================
const BuyRentLinks = ({ active, mobile, onClick }: BuyRentProps & { active: string }) => {

  let shape = "flex items-center gap-1.5 rounded-full px-4 py-2 transition-colors [&_svg]:h-4 [&_svg]:w-4";
  if (mobile) {
    shape = "flex items-center gap-2 rounded-lg px-3 py-2 transition-colors";
  }

  let buyColour = "text-gray-700 hover:bg-primary-light hover:text-primary-dark";
  let rentColour = "text-gray-700 hover:bg-primary-light hover:text-primary-dark";
  if (active === "SALE") {
    buyColour = "bg-primary-dark text-white hover:bg-primary";
  }
  if (active === "RENT") {
    rentColour = "bg-primary-dark text-white hover:bg-primary";
  }

  return (
    <>
      <Link href="/search?listingType=SALE" onClick={onClick} className={shape + " " + buyColour}><RiHome4Fill /> Buy</Link>
      <Link href="/search?listingType=RENT" onClick={onClick} className={shape + " " + rentColour}><RiKey2Fill /> Rent</Link>
    </>
  );
};

//================ reads ?listingType= from the address (Next.js rule: must sit inside <Suspense>) ================
const BuyRentActiveLinks = ({ mobile, onClick }: BuyRentProps) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  let active = "";
  if (pathname === "/search") {
    active = "SALE";
    if (searchParams.get("listingType") === "RENT") {
      active = "RENT";
    }
  }

  return <BuyRentLinks active={active} mobile={mobile} onClick={onClick} />;
};



const Navbar = () => {

  const user = useAppSelector((state) => state.auth.user);       // null = guest
  const checked = useAppSelector((state) => state.auth.checked); // false = still checking login (after page load)
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();                          // current URL, e.g. "/search"
  const [mobileOpen, setMobileOpen] = useState(false);     // mobile menu open or closed

  // ---------- logout ----------
  const handleLogout = async () => {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      try {
        await api.post("/auth/logout", { refreshToken: refreshToken }); 
      } catch {
        // even if the server call fails, we still log out on this browser
      }
    }
    removeRefreshToken();
    dispatch(clearAuth());
    setMobileOpen(false);
    toast.success("Logged out");
    router.push("/");
  }

  // blue text for the link of the page we are on
  const linkClass = (href: string) => {
    if (pathname === href) {
      return "text-primary font-semibold";
    }
    return "text-gray-700 hover:text-primary";
  }

  return (
    <header className="sticky top-0 z-40 border-b border-gray-200/70 bg-white/85 shadow-sm backdrop-blur-md">
      <nav className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">

        {/* ---------- logo ---------- */}
        <Link href="/" className="flex items-center gap-2.5 text-xl font-extrabold tracking-tight text-gray-900">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-linear-to-br from-primary to-emerald-500 text-white shadow-md shadow-primary/30"><RiHome4Fill className="h-5 w-5" /></span>
          <span>Real<span className="text-primary">Estate</span></span>
        </Link>

        {/* ---------- desktop links (hidden on mobile) ---------- */}
        <div className="hidden items-center gap-2 text-sm font-medium md:flex">
          <Suspense fallback={<BuyRentLinks active="" mobile={false} />}>
            <BuyRentActiveLinks mobile={false} />
          </Suspense>

          {/* GUEST: login + register */}
          {checked && !user && (
            <>
              <Link href="/login" className={"rounded-full px-4 py-2 transition-colors hover:bg-primary-light " + linkClass("/login")}>Login</Link>
              <Link href="/register" className="ml-1 rounded-full bg-primary px-5 py-2 font-semibold text-white shadow-md shadow-primary/30 transition-colors hover:bg-primary-dark">
                Register
              </Link>
            </>
          )}

          {/* USER + ADMIN: post property button + name menu */}
          {user && (
            <>
              <Link href="/post-property" className="ml-1 flex items-center gap-2 rounded-full bg-primary-dark py-2 pr-2 pl-4 font-semibold text-white shadow-md shadow-primary/30 transition-colors hover:bg-primary">
                <RiAddCircleFill className="h-4 w-4" /> Post Property
                <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-semibold text-white">Free</span>
              </Link>

              {/* dropdown menu (Headless UI): click the name -> list opens */}
              <Menu as="div" className="relative">
                <MenuButton className="flex items-center gap-2 rounded-full bg-primary-dark py-1 pr-3 pl-1 font-semibold text-white shadow-md shadow-primary/30 transition-colors hover:bg-primary data-open:bg-primary">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-amber-300 to-orange-400 font-bold text-gray-900">{user.name.charAt(0).toUpperCase()}</span>
                  {user.name} <FiChevronDown />
                </MenuButton>

                <MenuItems anchor="bottom end" modal={false} className="z-50 mt-2 w-56 divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg focus:outline-none">
                  <MenuItem>
                    <Link href="/my-listings" className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 data-focus:bg-primary-light data-focus:text-primary-dark [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-primary"><RiFileList3Fill /> My Listings</Link>
                  </MenuItem>
                  <MenuItem>
                    <Link href="/enquiries" className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 data-focus:bg-primary-light data-focus:text-primary-dark [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-primary"><RiMailFill /> Enquiries</Link>
                  </MenuItem>

                  {/* ADMIN only */}
                  {user.role === "ADMIN" && (
                    <MenuItem>
                      <Link href="/admin" className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 data-focus:bg-primary-light data-focus:text-primary-dark [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-primary">
                        <RiShieldUserFill /> Admin
                      </Link>
                    </MenuItem>
                  )}

                  <MenuItem>
                    <button onClick={handleLogout} className="flex w-full items-center gap-3 px-4 py-3 text-sm text-red-600 data-focus:bg-red-50 [&_svg]:h-4 [&_svg]:w-4">
                      <RiLogoutBoxRFill /> Logout
                    </button>
                  </MenuItem>
                </MenuItems>
              </Menu>
            </>
          )}
        </div>

        {/* ---------- mobile: menu button (hidden on desktop) ---------- */}
        <button onClick={() => setMobileOpen(!mobileOpen)} className="rounded-lg p-2 text-gray-700 hover:bg-gray-100 md:hidden" aria-label="Open menu">
          {mobileOpen ? <FiX className="h-6 w-6" /> : <FiMenu className="h-6 w-6" />}
        </button>
      </nav>

      {/* ---------- mobile menu (opens below the bar) ---------- */}
      {mobileOpen && (
        <div className="flex flex-col gap-1 border-t border-gray-200 bg-white px-4 py-3 text-sm md:hidden">
          <Suspense fallback={<BuyRentLinks active="" mobile={true} onClick={() => setMobileOpen(false)} />}>
            <BuyRentActiveLinks mobile={true} onClick={() => setMobileOpen(false)} />
          </Suspense>

          {checked && !user && (
            <>
              <Link href="/login" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 hover:bg-gray-100">Login</Link>
              <Link href="/register" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 hover:bg-gray-100">Register</Link>
            </>
          )}

          {user && (
            <>
              <p className="px-3 py-2 font-semibold text-gray-900">Hi, {user.name}</p>
              <Link href="/post-property" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 hover:bg-gray-100">Post Property</Link>
              <Link href="/my-listings" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 hover:bg-gray-100">My Listings</Link>
              <Link href="/enquiries" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 hover:bg-gray-100">Enquiries</Link>
              {user.role === "ADMIN" && (
                <Link href="/admin" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 hover:bg-gray-100">Admin</Link>
              )}
              <button onClick={handleLogout} className="rounded-lg px-3 py-2 text-left text-red-600 hover:bg-red-50">Logout</button>
            </>
          )}
        </div>
      )}
    </header>
  );
}

export default Navbar;
