import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Providers from "./providers";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import "./globals.css";

// the font of the whole site (loaded by Next.js, no extra request from the browser)
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// default SEO text for every page. A page can set its own title -> "2 BHK Flat | RealEstate"
export const metadata: Metadata = {
  title: {
    default: "RealEstate - Buy and Rent Properties",
    template: "%s | RealEstate",
  },
  description: "Find flats, houses, villas and plots for sale and rent. Search by city, budget, type and bedrooms.",
};

// frame around every page: Navbar + page + Footer
const RootLayout = ({ children }: LayoutProps<"/">) => {
  return (
    <html lang="en" className={geistSans.variable + " h-full antialiased"}>
      <body className="min-h-full flex flex-col font-sans">
        <Providers>
          <Navbar />
          <main className="flex flex-1 flex-col">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}

export default RootLayout;
