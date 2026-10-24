import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { APP_NAME } from "@/lib/brand";
import { FAVICON_DATA_URI } from "@/lib/logo";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Manage your rental fleet, bookings, clients and revenue in one place.",
  icons: {
    icon: [{ url: FAVICON_DATA_URI, type: "image/png" }],
    apple: [{ url: FAVICON_DATA_URI }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
