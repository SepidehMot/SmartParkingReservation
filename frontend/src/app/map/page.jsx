"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { reserve } from "@/lib/api";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import Loading from "@/components/Loading";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import TextField from "@/components/TextField";
import { onAuthStateChanged } from "firebase/auth";
import Button from "@/components/Button";

const MapContainer = dynamic(
  () => import("react-leaflet").then((m) => m.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((m) => m.TileLayer),
  { ssr: false }
);
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), {
  ssr: false,
});
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), {
  ssr: false,
});

export default function ParkingMapPage() {
  const [lots, setLots] = useState([]);
  const [slotsByLot, setSlotsByLot] = useState({});
  const [plates, setPlates] = useState([]);
  const [plateNumber, setPlateNumber] = useState("");
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState([44.4, 8.97]);
  const [user, setUser] = useState(null);
  const router = useRouter();
  const [selected, setSelected] = useState(null);
  // const [startAt, setStartAt] = useState(nowLocalDatetime());
  function nowLocalDatetime() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, "0");

    return (
      d.getFullYear() +
      "-" +
      pad(d.getMonth() + 1) +
      "-" +
      pad(d.getDate()) +
      "T" +
      pad(d.getHours()) +
      ":" +
      pad(d.getMinutes())
    );
  }
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      import("leaflet").then((L) => {
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "/marker-icon-2x.png",
          iconUrl: "/marker-icon.png",
          shadowUrl: "/marker-shadow.png",
        });
      });
    }
  }, []);

  useEffect(() => {
    const unsubs = [];

    async function fetchLots() {
      const snap = await getDocs(collection(db, "parkingLots"));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setLots(list);

      list.forEach((lot) => {
        const unsub = onSnapshot(
          collection(db, "parkingLots", lot.id, "slots"),
          (snap) => {
            setSlotsByLot((prev) => ({
              ...prev,
              [lot.id]: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
            }));
          }
        );
        unsubs.push(unsub);
      });
    }

    fetchLots();
    return () => unsubs.forEach((u) => u());
  }, []);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;
      try {
        const userRef = doc(db, "users", user.uid);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.licensePlates) {
            setPlates(data.licensePlates);
            setPlateNumber(data.licensePlates[0] || "");
          }
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      }
    }
    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => {
        console.warn(
          "Geolocation error:",
          err.message,
          "- falling back to Genova"
        );
        setCoords([44.4, 8.97]);
      }
    );
  }, []);
  useEffect(() => {
    if (!selected) return;

    const slot = (slotsByLot[selected.lotId] || []).find(
      (s) => s.id === selected.slotId
    );

    if (!slot || slot.status !== "free") {
      setSelected(null);
    }
  }, [slotsByLot, selected]);

  function isReservable(slot) {
    if (!slot) return false;
    if (slot.status !== "free") return false;
    if (slot.lockStatus !== "free") return false;
    if (slot.battery === 0) return false;
    return true;
  }

  async function handleReserve(lotName, lotId, slotId) {
    if (!user) {
      toast.error("Please log in first");
      router.push("/login");
      return;
    }

    if (loading) return;
    const normalizedPlate = plateNumber.toUpperCase().trim();
    if (!normalizedPlate || !duration) {
      toast.error("Select a plate");
      return;
    }
    if (!duration) {
      toast.error("Select duration");
      return;
    }
    const startAtIso = Date.now(); //new Date(startAt).getTime();
    try {
      setLoading(true);
      const userRef = doc(db, "users", user.uid);
      if (!plates.includes(normalizedPlate)) {
        await updateDoc(userRef, {
          licensePlates: arrayUnion(normalizedPlate),
          updatedAt: Date.now(),
        });
        setPlates((prev) => [...prev, normalizedPlate]);
      }
      const slot = (slotsByLot[lotId] || []).find((s) => s.id === slotId);
      if (!slot) {
        toast.error("Slot not found");
        return;
      }
      console.log(startAtIso);
      if (!isReservable(slot)) {
        toast.error("This slot is not reservable (out of order / not free)");
        return;
      }
      const result = await reserve({
        lotId,
        slotId,
        plateNumber: normalizedPlate,
        duration,
        userId: user.uid,
        startAt: startAtIso,
      });
      toast.custom(
        (t) => (
          <div className="bg-white shadow rounded p-4 text-sm">
            <div className="font-semibold text-green-600 mb-1">
              Reservation Confirmed
            </div>

            <div>
              {lotName} / {slotId}
            </div>
            <div className="text-xs text-gray-500">
              Duration: {duration} mins
            </div>

            <button
              className="mt-2 text-xs font-mono bg-gray-100 px-2 py-1 rounded hover:bg-gray-200"
              onClick={() => {
                navigator.clipboard.writeText(result.reservationId);
                toast.success("Reservation code copied");
                toast.dismiss(t.id);
              }}
            >
              {result.reservationId}
            </button>
          </div>
        ),
        { duration: 10000 }
      );
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDuration(30);
      setLoading(false);
      setSelected(null);
    }
  }

  function getSlotClasses(status) {
    let colorClass;
    switch (status) {
      case "free":
        colorClass = "text-green-500";
        break;
      case "reserved":
        colorClass = "text-orange-500";
        break;
      case "occupied":
        colorClass = "text-red-500";
        break;
      case "out_of_order":
        colorClass = "text-gray-500";
        break;
      default:
        colorClass = "text-black";
    }
    const cursorClass = status === "free" ? "cursor-pointer" : "cursor-default";
    return `my-1 ${cursorClass} ${colorClass}`;
  }

  return (
    <main className="min-h-screen flex items-start justify-center px-4 py-10">
      <div className="w-full ">
        <div className="rounded-2xl border border-secondary-200 bg-white p-6">
          <h1 className="text-xl font-bold text-secondary-700 text-center mb-6">
            Parking Map
          </h1>

          <div className="grid grid-cols-1 gap-4 mb-4 mt-4 md:grid-cols-4 md:items-end">
            <div className="md:col-span-1">
              {plates.length === 0 ? (
                <TextField
                  name="plateNumber"
                  type="text"
                  value={plateNumber}
                  onChange={(e) => setPlateNumber(e.target.value)}
                  placeholder="Car Plate Number"
                  label="Enter your Plate Number:"
                  required
                  errors={!plateNumber && "Plate Number is required."}
                />
              ) : (
                <>
                  <label className="block text-sm mb-1">Select Plate</label>
                  <select
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value)}
                    className="w-full border rounded p-2"
                    required
                  >
                    <option value="">-- Select Plate --</option>
                    {plates.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </div>
            {/* <div className="md:col-span-1">
              <TextField
                className="block mt-2"
                name="starttime"
                type="datetime-local"
                value={startAt}
                label="Start Time:"
                onChange={(e) => setStartAt(e.target.value)}
                required
                errors={!startAt && "Starttime is required."}
              ></TextField>
            </div> */}
            <div className="md:col-span-1">
              <TextField
                name="duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                placeholder="Duration (mins)"
                label="Duration (minutes):"
                required
                errors={!duration && "Duration is required."}
              />
            </div>
            <div className="flex flex-row gap-2 sm:flex-row sm:items-center sm:justify-between">
              <Button
                onClick={() => {
                  if (!selected) {
                    toast.error("Select a free slot on the map first");
                    return;
                  }
                  handleReserve(
                    selected.lotName,
                    selected.lotId,
                    selected.slotId
                  );
                }}
                variant="primary"
                className="w-full xxl:w-auto"
              >
                Reserve
              </Button>
            </div>
            {loading && <Loading />}
          </div>

          <MapContainer
            key={coords.join(",")}
            center={coords}
            zoom={14}
            style={{ height: "400px", width: "100%", marginBottom: "1rem" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

            {coords && (
              <Marker position={coords}>
                <Popup>You are here</Popup>
              </Marker>
            )}
            {lots.flatMap((lot) =>
              (slotsByLot[lot.id] || []).map((slot) => {
                const lat = slot.location?.lat;
                const lng = slot.location?.lng;
                if (!lat || !lng) return null;

                const isSelected =
                  selected?.lotId === lot.id && selected?.slotId === slot.id;

                return (
                  <Marker key={`${lot.id}_${slot.id}`} position={[lat, lng]}>
                    <Popup>
                      <h3>{lot.name}</h3>

                      <div className="text-sm">
                        <strong>Slot:</strong> {slot.id}
                      </div>

                      <div
                        className={`${getSlotClasses(slot.status)} ${
                          isSelected ? "font-bold underline" : ""
                        }`}
                      >
                        {slot.status}
                      </div>

                      {isSelected && (
                        <div className="text-sm mt-2">
                          <strong>Selected</strong>
                        </div>
                      )}

                      <div
                        className={`${getSlotClasses(slot.status)} mt-2`}
                        onClick={() => {
                          if (!isReservable(slot)) return;
                          setSelected({
                            lotId: lot.id,
                            lotName: lot.name,
                            slotId: slot.id,
                          });
                        }}
                      >
                        {slot.status === "free" && slot.lockStatus === "free"
                          ? "Tap to select"
                          : <p className={`${getSlotClasses(slot.lockStatus)} mt-2`}>Not selectable</p>}
                      </div>
                    </Popup>
                  </Marker>
                );
              })
            )}
          </MapContainer>
        </div>
      </div>
    </main>
  );
}
