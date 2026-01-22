"use client";
import { useEffect, useRef, useState } from "react";
import { auth } from "@/lib/firebase";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import SendOTPForm from "./SendOTPForm";
import CheckOTPForm from "./CheckOTPForm";
import toast from "react-hot-toast";

export default function AuthContainer() {
  const [step, setStep] = useState(1);
  const [phone, setPhone] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [otpResponse, setOtpResponse] = useState("");

  const recaptchaRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (recaptchaRef.current) return;

    recaptchaRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
      size: "invisible",
    });
    recaptchaRef.current.render().catch(() => {});
  }, []);

  async function sendCode(e) {
    e.preventDefault();

    try {
      if (!recaptchaRef.current) {
        toast.error("reCAPTCHA not ready. Refresh the page and try again.");
        return;
      }
      const normalizedPhone = phone.replace(/\s+/g, "");

      if (!normalizedPhone.startsWith("+")) {
        toast.error("Phone number must start with +");
        return;
      }

      if (!/^\+\d{10,15}$/.test(normalizedPhone)) {
        toast.error(
          "Phone number is too short. Use full international format."
        );
        return;
      }

      const result = await signInWithPhoneNumber(
        auth,
        normalizedPhone,
        recaptchaRef.current
      );
      setConfirmation(result);
      setOtpResponse(`Code sent to ${normalizedPhone}`);
      setStep(2);
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    }
  }

  async function resendCode() {
    try {
      if (!recaptchaRef.current) return;
      const normalizedPhone = phone.replace(/\s+/g, "");

      if (!normalizedPhone.startsWith("+")) {
        toast.error("Phone number must start with +");
        return;
      }
      if (!/^\+\d{10,15}$/.test(normalizedPhone)) {
        toast.error(
          "Phone number is too short. Use full international format."
        );
        return;
      }
      const result = await signInWithPhoneNumber(
        auth,
        phone,
        recaptchaRef.current
      );
      setConfirmation(result);
      setOtpResponse(`Code resent to ${phone}`);
      toast.success("Code resent");
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    }
  }

  return (
    <div className="w-full sm:max-w-sm">
      <div id="recaptcha-container" />

      {step === 1 && (
        <SendOTPForm
          phone={phone}
          onChangePhone={(e) => setPhone(e.target.value)}
          onSubmit={sendCode}
        />
      )}

      {step === 2 && (
        <CheckOTPForm
          phoneNumber={phone}
          confirmation={confirmation}
          otpResponse={otpResponse}
          onBack={() => setStep(1)}
          onReSendOtp={resendCode}
        />
      )}
    </div>
  );
}
