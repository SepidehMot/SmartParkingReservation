"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, getDocs, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import Button from "@/components/Button";
import Loading from "@/components/Loading";

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [lotsCount, setLotsCount] = useState(0);
  const [slotsStats, setSlotsStats] = useState({
    total: 0,
    free: 0,
    reserved: 0,
    occupied: 0,
    out_of_order: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubs = [];

    async function setup() {
      setLoading(true);
      try {
        const lotsSnap = await getDocs(collection(db, "parkingLots"));
        if (cancelled) return;

        setLotsCount(lotsSnap.size);

        const perLot = {};

        function recomputeTotals() {
          const totals = {
            total: 0,
            free: 0,
            reserved: 0,
            occupied: 0,
            out_of_order: 0,
          };
          Object.values(perLot).forEach((c) => {
            totals.total += c.total;
            totals.free += c.free;
            totals.reserved += c.reserved;
            totals.occupied += c.occupied;
            totals.out_of_order += c.out_of_order;
          });
          setSlotsStats(totals);
        }

        lotsSnap.docs.forEach((lotDoc) => {
          const lotId = lotDoc.id;
          const slotsRef = collection(db, "parkingLots", lotId, "slots");

          const unsub = onSnapshot(slotsRef, (snap) => {
            if (cancelled) return;

            const c = {
              total: 0,
              free: 0,
              reserved: 0,
              occupied: 0,
              out_of_order: 0,
            };
            snap.docs.forEach((d) => {
              c.total++;
              const st = d.data()?.status;
              if (st === "free") c.free++;
              else if (st === "reserved") c.reserved++;
              else if (st === "occupied") c.occupied++;
              else if (st === "out_of_order") c.out_of_order++;
            });

            perLot[lotId] = c;
            recomputeTotals();
            setLoading(false);
          });

          unsubs.push(unsub);
        });

        if (lotsSnap.size === 0) setLoading(false);
      } catch (e) {
        console.warn("Home stats setup failed:", e);
        setLoading(false);
      }
    }

    setup();

    return () => {
      cancelled = true;
      unsubs.forEach((u) => u());
    };
  }, []);

  const greeting = useMemo(() => {
    if (!user) return "Welcome";
    return `Welcome, ${user.email || "driver"}`;
  }, [user]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-secondary-700 mb-2">{greeting}</h1>
      <p className="text-secondary-600 mb-6">
        Reserve a parking slot from your phone: pick a free slot on the map,
        enter your plate, set duration, and confirm. The slot becomes reserved,
        then occupied when you arrive, and returns to free when you leave/cancel or it
        expires.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <div className="border border-secondary-200 rounded-md p-4">
          <div className="text-sm text-secondary-500">Live availability</div>
          {loading ? (
            <div className="mt-2">
              <Loading />
            </div>
          ) : (
            <div className="mt-2 space-y-1">
              <div>
                <strong>Lots:</strong> {lotsCount}
              </div>
              <div>
                <strong>Slots:</strong> {slotsStats.total}
              </div>
              <div>
                <strong>Free:</strong> {slotsStats.free}
              </div>
              <div>
                <strong>Reserved:</strong> {slotsStats.reserved}
              </div>
              <div>
                <strong>Occupied:</strong> {slotsStats.occupied}
              </div>
              <div>
                <strong>Out of order:</strong> {slotsStats.out_of_order}
              </div>
            </div>
          )}
        </div>

        <div className="border border-secondary-200 rounded-md p-4">
          <div className="text-sm text-secondary-500 mb-2">Quick actions</div>
          <div className="flex flex-col gap-3">
            <Link href="/map">
              <Button variant="primary">Open Map</Button>
            </Link>
            <Link href="/reservations">
              <Button variant="secondary">My Reservations</Button>
            </Link>
            {!user ? (
              <Link href="/login">
                <Button variant="secondary">Log in</Button>
              </Link>
            ) : (
              <Link href="/profile">
                <Button variant="secondary">Profile</Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="border border-secondary-200 rounded-md p-4">
        <h2 className="text-lg font-semibold mb-2 text-secondary-600">How it works</h2>
        <div className="rounded-xl border border-secondary-200 bg-secondary-50 p-4 text-sm text-secondary-700">
          <div className="font-semibold text-secondary-800 mb-2">
            Dear Professors,
          </div>

          <p className="text-secondary-600 mb-3">
            Please use one of the following test phone numbers and the OTP below
            to log in or sign up. (We configured them as Firebase test phone
            numbers on the free plan.)
          </p>
          <p className="m-3 text-xs text-error">
            First-time login automatically creates a user account.
          </p>
          <ul className="space-y-1">
            <li className="text-xs font-mono text-primary-500 mt-2">For sign up</li>
           <li className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-mono">+39 111 111 1111</span>
              <span className="font-mono">OTP: 123456</span>

            </li>
           <li className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-mono">+39 222 222 2222</span>
              <span className="font-mono">OTP: 123456</span>

            </li>
             <li className="text-xs font-mono text-primary-500 mt-3">For log in</li>
           <li className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-mono">+39 351 747 6471</span>
              <span className="font-mono">OTP: 123456</span>
              
            </li>
           <li className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <span className="font-mono">+39 345 519 2905</span>
              <span className="font-mono">OTP: 123456</span>

            </li>
          </ul>
        </div>

        <ol className="list-decimal pl-5 space-y-1 text-secondary-700 mt-4">
          <li>
            Open the map and tap a <strong>free</strong> slot.
          </li>
          <li>
            Enter your plate number and choose a duration.
          </li>
          <li>Confirm reservation.</li>
          <li>On arrival, mark “I Arrived” (or auto-arrive via GPS).</li>
          <li>
            When you leave, the slot returns to free (or auto-free on expiry).
          </li>
        </ol>
      </div>
    </div>
  );
}
