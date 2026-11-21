import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { StorefrontProvider } from "@/components/StorefrontContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "All the Good Things | Thoughtful finds for little moments",
  description:
    "Discover thoughtful pieces for everyday moments at All the Good Things.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <StorefrontProvider>{children}</StorefrontProvider>
      </body>
    </html>
  );
}
