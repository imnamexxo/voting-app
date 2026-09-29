import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "투표",
  description: "질문을 올리고 함께 투표해요",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <header className="flex justify-end px-4 pt-4">
          <Link href="/operator/login" className="text-sm text-zinc-500 underline">
            운영자 로그인
          </Link>
        </header>
        {children}
        {/* The app's author, not a Poll's Creator. mt-auto keeps it at the bottom of short pages. */}
        <footer className="mt-auto px-4 py-6 text-center text-sm text-zinc-500">제작: 유소영</footer>
      </body>
    </html>
  );
}
