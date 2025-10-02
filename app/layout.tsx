import "@/styles/globals.css";
import { Metadata, Viewport } from "next";
import { Link } from "@heroui/link";
import clsx from "clsx";

import { Providers } from "./providers";
import { Toaster } from "react-hot-toast";

import { siteConfig } from "@/config/site";
import { fontSans } from "@/config/fonts";
import { Navbar } from "@/components/navbar";
import { RegisterSW } from "@/components/pwa/register-sw";

export const metadata: Metadata = {
  title: {
    default: siteConfig.name,
    template: `%s - ${siteConfig.name}`,
  },
  description: siteConfig.description,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: siteConfig.name,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html suppressHydrationWarning lang="id">
      <head />
      <body
        className={clsx(
          "min-h-dvh text-foreground bg-background font-sans antialiased",
          fontSans.variable,
        )}
      >
        <Providers themeProps={{ attribute: "class", defaultTheme: "dark" }}>
          <div className="relative flex flex-col min-h-dvh">
            {/* Skip link for keyboard users */}
            <a
              href="#main-content"
              className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-content2 focus:px-3 focus:py-2"
            >
              Lewati ke konten utama
            </a>
            <Toaster position="top-center" />
            <RegisterSW />
            <main id="main-content" role="main" className="px-4 py-4 flex-1 min-h-0">
              {children}
            </main>
            {/* <footer className="w-full flex gap-2 items-center justify-center py-3">
              
                <span className="text-default-600">Didukung oleh</span>
                <p className="text-primary cursor-pointer">IT RS Ananda Corporate (ITAC)</p>
            </footer> */}
          </div>
        </Providers>
      </body>
    </html>
  );
}
