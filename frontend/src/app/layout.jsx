"use client";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { useEffect, useState } from "react";
import { auth } from "../lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import Header from "@/components/Header";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({ children }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
  }, []);
  const router = useRouter();
  async function handleLogout() {
    try {
      await signOut(auth);
      router.replace("/");
      toast.success("You have logged out.");
    } catch (err) {
      console.error(err);
      toast.error("Logout failed: " + err.message);
    }
  }

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <Toaster
          position="top-center"
          containerStyle={{
            top: "50%",
            transform: "translateY(-50%)",
          }}
          toastOptions={{
            // duration: 8000,
            success: {
              className: "border border-green-200",
            },
            error: {
              className: "border border-red-200",
            },
          }}
        />
        <Header handleLogout={handleLogout} user={user} />
        <div className="container xl:max-w-screen-xl px-4"> {children}</div>
      </body>
    </html>
  );
}
