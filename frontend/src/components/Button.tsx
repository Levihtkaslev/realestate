"use client";
// one button for the whole site (Headless UI Button), variant: primary | secondary | danger | cancel | light

import { Button as HeadlessButton } from "@headlessui/react";
import { ClipLoader } from "react-spinners";

type ButtonProps = {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "danger" | "cancel" | "light";
  loading?: boolean;
  disabled?: boolean;
  className?: string;
};

const Button = ({ children, onClick, type = "button", variant = "primary", loading = false, disabled = false, className = "" }: ButtonProps) => {

  // colours for each variant (data-hover / data-active come from the package)
  let colours = "bg-primary text-white data-hover:bg-primary-dark";
  if (variant === "secondary") {
    colours = "bg-white text-gray-700 border border-gray-300 data-hover:bg-gray-50";
  }
  if (variant === "danger") {
    colours = "bg-red-600 text-white data-hover:bg-red-700";
  }
  if (variant === "cancel") {
    colours = "bg-red-600 text-red-50 data-hover:bg-red-700";
  }
  if (variant === "light") {
    colours = "bg-primary-light text-primary-dark data-hover:bg-teal-100";
  }

  let spinnerColour = "#ffffff";
  if (variant === "secondary" || variant === "light") {
    spinnerColour = "#0d9488";
  }

  return (
    <HeadlessButton
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={
        "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition " +
        "data-disabled:cursor-not-allowed data-disabled:opacity-60 focus:outline-none data-focus:ring-2 data-focus:ring-primary/40 " +
        colours + " " + className
      }
    >
      {loading && <ClipLoader size={14} color={spinnerColour} />}
      {loading ? "Please wait..." : children}
    </HeadlessButton>
  );
};

export default Button;
