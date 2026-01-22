"use client";
import { useEffect, useState } from "react";
import OTPInput from "react-otp-input";
import { HiArrowRight } from "react-icons/hi";
import { CiEdit } from "react-icons/ci";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import Button from "@/components/Button";
const RESEND_TIME = 30;

function CheckOTPForm({
  phoneNumber,
  onBack,
  onReSendOtp,
  otpResponse,
  confirmation,
}) {
  const [otp, setOtp] = useState("");
  const [time, setTime] = useState(RESEND_TIME);
  const router = useRouter();

  async function handleVerify(e) {
    e.preventDefault();
    try {
      const result = await confirmation.confirm(otp);
      const user = result.user;

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      if (!snap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          phone: user.phoneNumber,
          name: "",
          email: "",
          licensePlate: "",
          role: "user",
          createdAt: Date.now(),
        });
      }

      toast.success("Login success");
      router.replace("/map");
    } catch (err) {
      console.error(err);
      toast.error("Invalid code");
    }
  }

  useEffect(() => {
    if (time <= 0) return;
    const timer = setInterval(() => setTime((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [time]);

  return (
    <div>
      <button onClick={onBack}>
        <HiArrowRight className="w-6 h-6 text-secondary-500" />
      </button>

      {otpResponse && (
        <p className="flex items-center gap-x-2 my-4">
          <span>{otpResponse}</span>
          <button onClick={onBack}>
            <CiEdit className="w-6 h-6 text-primary-900" />
          </button>
        </p>
      )}

      <div className="mb-4 text-secondary-500">
        {time > 0 ? (
          <p>{time} seconds until the code can be resent</p>
        ) : (
          <button
            onClick={() => {
              onReSendOtp();
              setTime(RESEND_TIME);
            }}
          >
            Re-Send Verification Code
          </button>
        )}
      </div>

      <form className="space-y-10" onSubmit={handleVerify}>
        <p className="font-bold text-secondary-800">
          Enter the verification code
        </p>
        <OTPInput
          value={otp}
          onChange={setOtp}
          numInputs={6}
          renderSeparator={<span className="text-secondary-300">-</span>}
          renderInput={(props) => (
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              {...props}
              className="h-11 rounded-lg border border-primary-400 text-center"
            />
          )}
          containerStyle="flex flex-wrap justify-center gap-2"
          inputStyle={{
            width: "clamp(2rem, 10vw, 2rem)",
          }}
        />

        <Button variant="primary" className="w-full" type="submit">
          Verify Code
        </Button>
      </form>
    </div>
  );
}

export default CheckOTPForm;
