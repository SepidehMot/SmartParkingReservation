"use client";
import { useEffect, useState, useRef } from "react";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  getDocs,
  doc,
} from "firebase/firestore";
import {
  cancelReservation,
  extendReservation,
  arriveReservation,
  leaveReservation,
} from "@/lib/api";
import Loading from "@/components/Loading";
import Empty from "@/components/Empty";
import Button from "@/components/Button";
import toast from "react-hot-toast";
import { onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
export default function ReservationsPage() {
  const [reservations, setReservations] = useState([]);
  const [user, setUser] = useState(null);
  const [slot, setSlot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lotNames, setLotNames] = useState({});
  const router = useRouter();
  const activeRes = reservations.find((r) => r.status === "active");
  const slotRef = useRef(null);
  const activeResRef = useRef(null);
  const hasAutoArrivedRef = useRef(false);

  useEffect(() => {
    activeResRef.current = activeRes || null;
  }, [activeRes]);
  useEffect(() => {
    slotRef.current = slot;
  }, [slot]);

  useEffect(() => {
    hasAutoArrivedRef.current = false;
  }, [activeRes?.id]);

  useEffect(() => {
    let unsubReservations = null;

    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);

      if (!u) {
        setSlot(null);
        if (unsubReservations) unsubReservations();
        unsubReservations = null;

        setReservations([]);
        setLoading(false);

        router.replace("/login");
        return;
      }

      const q = query(
        collection(db, "reservations"),
        where("userId", "==", u.uid),
        orderBy("createdAt", "desc")
      );

      if (unsubReservations) unsubReservations();
      unsubReservations = onSnapshot(q, (snap) => {
        setReservations(
          snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );
        setLoading(false);
      });
    });

    return () => {
      if (unsubReservations) unsubReservations();
      unsubAuth();
    };
  }, [router]);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const lotsSnap = await getDocs(collection(db, "parkingLots"));
        if (cancelled) return;

        const names = {};

        lotsSnap.docs.forEach((doc) => {
          const d = doc.data() || {};
          names[doc.id] = d.name || doc.id;
        });

        setLotNames(names);
      } catch (err) {
        console.warn("fetchLots failed:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!activeRes?.lotId || !activeRes?.slotId) {
      setSlot(null);
      return;
    }

    const { lotId, slotId } = activeRes;
    const slotDocRef = doc(db, "parkingLots", lotId, "slots", slotId);

    const unsub = onSnapshot(slotDocRef, (snap) => {
      if (!snap.exists()) {
        setSlot(null);
        return;
      }
      setSlot({ ...snap.data(), lotId });
    });
    return () => unsub();
  }, [activeRes?.lotId, activeRes?.slotId]);
  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn("Geolocation not supported");
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;

        const r = activeResRef.current;
        if (!r || r.status !== "active") return;
        if (hasAutoArrivedRef.current) return;

        const slot = slotRef.current;
        if (!slot) return;

        const slotLat = Number(slot?.location?.lat);
        const slotLng = Number(slot?.location?.lng);
        if (!Number.isFinite(slotLat) || !Number.isFinite(slotLng)) return;

        const R = 6371e3;
        const toRad = (x) => (x * Math.PI) / 180;

        const dLat = toRad(slotLat - latitude);
        const dLng = toRad(slotLng - longitude);

        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(toRad(latitude)) *
            Math.cos(toRad(slotLat)) *
            Math.sin(dLng / 2) ** 2;

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        if (distance <= 15) {
          hasAutoArrivedRef.current = true;

          handleArrive(r.id, { source: "auto", distance })
            .then(() => {
              setReservations((prev) =>
                prev.map((res) =>
                  res.id === r.id ? { ...res, status: "occupied" } : res
                )
              );
            })
            .catch(() => {
              hasAutoArrivedRef.current = false;
            });
        }
      },
      (err) => console.warn("GPS error:", err.code, err.message, err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  async function handleCancel(reservationId) {
    try {
      await cancelReservation(reservationId);
      toast.success(`Reservation ${reservationId} cancelled`);
    } catch (err) {
      toast.error("Cancel failed: " + err.message);
    }
  }

  async function handleExtend(reservationId, minutes) {
    try {
      const newTime = await extendReservation(reservationId, minutes);
      toast.success(
        `Reservation ${reservationId} extended until ${newTime.toLocaleString()}`
      );
    } catch (err) {
      toast.error("Extend failed: " + err.message);
    }
  }

  async function handleArrive(
    reservationId,
    { source = "manual", distance } = {}
  ) {
    try {
      await arriveReservation(reservationId);
      if (source === "auto") {
        const meters = Number.isFinite(distance) ? Math.round(distance) : null;
        toast.success(
          meters != null
            ? `You arrived at your reservation location (${meters}m away)`
            : `You arrived at your reservation location`
        );
      } else {
        toast.success(`Arrival confirmed for reservation ${reservationId}`);
      }
    } catch (err) {
      toast.error("Arrive failed: " + err.message);
      throw err;
    }
  }

  async function handleLeave(reservationId) {
    try {
      await leaveReservation(reservationId);
      toast.success(`Reservation ${reservationId} marked as left`);
    } catch (err) {
      toast.error("Leave failed: " + err.message);
    }
  }

  if (loading) return <Loading />;
  if (reservations.length === 0) return <Empty resourceName="reservations" />;

  return (
    <main className="min-h-screen flex items-start justify-center px-4 py-10">
      <div className="w-full ">
        <div className="rounded-2xl border border-secondary-200 bg-white p-6">
          <h1 className="text-xl font-bold text-secondary-700 text-center mb-6">
            My Reservations
          </h1>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {reservations.map((r) => {
              const key = `${r.lotId}_${r.slotId}`;
              const created =
                r.createdAt?.toDate?.().toLocaleString?.() || "pending";
              const expires =
                r.expiresAt?.toDate?.().toLocaleString?.() || "pending";

              return (
                <li
                  key={r.id}
                  className="border border-secondary-300 rounded-md p-4 mt-4"
                >
                  <p>
                    <strong>Slot:</strong> {lotNames[r.lotId] || r.lotId} /
                    {r.slotId}
                  </p>
                  <p>
                    <strong>Reservation Status:</strong> {r.status}
                  </p>
                  <p>
                    <strong>Created:</strong> {created}
                  </p>
                  <p>
                    <strong>Expires:</strong> {expires}
                  </p>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {(r.status === "active" || r.status === "occupied") && (
                      <select
                        onChange={(e) => {
                          handleExtend(r.id, parseInt(e.target.value, 10));
                          e.target.value = "";
                        }}
                        defaultValue=""
                        className="w-full sm:w-44 textField__input py-2.5 text-md bg-secondary-0"
                      >
                        <option value="" disabled>
                          Extend...
                        </option>
                        <option value="15">+15 minutes</option>
                        <option value="30">+30 minutes</option>
                        <option value="60">+60 minutes</option>
                      </select>
                    )}

                    <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
                      {r.status === "active" && (
                        <>
                          <Button
                            onClick={() => handleCancel(r.id)}
                            variant="danger"
                            className="w-full sm:w-auto"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() => handleArrive(r.id)}
                            variant="primary"
                            className="w-full sm:w-auto"
                            style={{ backgroundColor: "green", color: "white" }}
                          >
                            I Arrived
                          </Button>
                        </>
                      )}

                      {r.status === "occupied" && (
                        <Button
                          onClick={() => handleLeave(r.id)}
                          variant="secondary"
                          className="w-full sm:w-auto"
                          style={{ backgroundColor: "blue", color: "white" }}
                        >
                          I Left
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </main>
  );
}
