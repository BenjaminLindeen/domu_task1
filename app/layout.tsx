import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Domu TAM Workbench",
  description: "Internal operations tooling for Domu voicebot accounts",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0c10] text-slate-100`}
      >
        <header className="border-b border-white/[0.06] px-8 py-5">
          <h1 className="text-white font-semibold text-base tracking-wide">
            Domu TAM Workbench
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">
            Internal voicebot operations tooling
          </p>
        </header>
        {children}
      </body>
    </html>
  );
}
