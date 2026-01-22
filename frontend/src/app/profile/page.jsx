"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import toast from "react-hot-toast";
import Button from "@/components/Button";
import Loading from "@/components/Loading";
import TextField from "@/components/TextField";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({
    name: "",
    email: "",
    licensePlates: [],
  });
  const [newPlate, setNewPlate] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const userRef = doc(db, "users", u.uid);
        const snap = await getDoc(userRef);

        if (snap.exists()) {
          setProfile((prev) => ({ ...prev, ...snap.data() }));
        } else {
          await setDoc(userRef, {
            uid: u.uid,
            phone: u.phoneNumber,
            name: "",
            email: "",
            licensePlates: [],
            role: "user",
            createdAt: Date.now(),
          });
        }
      } else {
        setUser(null);
        router.replace("/login");
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!user) return;
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        name: profile.name,
        email: profile.email,
        updatedAt: Date.now(),
      });
      toast.success("Profile updated!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to update profile");
    }
  }

  async function handleAddPlate() {
    if (!newPlate.trim()) return;
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        licensePlates: arrayUnion(newPlate.trim().toUpperCase()),
      });
      setProfile((prev) => ({
        ...prev,
        licensePlates: [
          ...(prev.licensePlates || []),
          newPlate.trim().toUpperCase(),
        ],
      }));
      setNewPlate("");
      toast.success("Plate added.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to add plate");
    }
  }

  async function handleRemovePlate(plate) {
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        licensePlates: arrayRemove(plate),
      });
      setProfile((prev) => ({
        ...prev,
        licensePlates: prev.licensePlates.filter((p) => p !== plate),
      }));
      toast.success("Plate removed.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to remove plate");
    }
  }
  if (loading)
    return (
      <div className="px-4 py-10 ">
        <Loading />
      </div>
    );
  if (!user)
    return (
      <p className="px-4 py-10 text-center text-secondary-500"> Login first</p>
    );

  return (
    <main className="min-h-screen flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-secondary-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="space-y-2 mb-6">
            <h1 className="text-2xl font-semibold text-secondary-800">
              My Profile
            </h1>
            <p className="text-sm text-secondary-500">
              Update your details and manage your license plates.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <TextField
                name="phone"
                label="Phone Number"
                value={user.phoneNumber || ""}
                disabled
              />
            </div>
            <div>
              <TextField
                name="name"
                label="Name"
                value={profile.name}
                onChange={(e) =>
                  setProfile({ ...profile, name: e.target.value })
                }
                required
              />
            </div>
            <div>
              <TextField
                name="email"
                label="Email"
                type="email"
                value={profile.email}
                onChange={(e) =>
                  setProfile({ ...profile, email: e.target.value })
                }
              
              />
            </div>

            <Button type="submit" variant="primary" className="w-full">
              Save Profile
            </Button>
          </form>
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-secondary-800 mb-2">
              My Plates
            </h2>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row mb-2">
              <input
                type="text"
                placeholder="Add new plate"
                value={newPlate}
                onChange={(e) => setNewPlate(e.target.value)}
                className="textField__input"
              />
              <Button
                onClick={handleAddPlate}
                className="w-full sm:w-auto"
                variant="primary"
              >
                Add
              </Button>
            </div>
            {profile.licensePlates?.length ? (
              <ul className="space-y-2">
                {profile.licensePlates.map((plate) => (
                  <li
                    key={plate}
                    className="flex items-center justify-between rounded-lg border border-secondary-200 p-2"
                  >
                    <span className="font-medium text-secondary-800">
                      {plate}
                    </span>
                    <Button
                      onClick={() => handleRemovePlate(plate)}
                      variant="danger"
                      type="button"
                    >
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-secondary-500">No plates added yet.</p>
            )}
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-secondary-400">
          Changes are saved to your account.
        </p>
      </div>
    </main>
  );
}
