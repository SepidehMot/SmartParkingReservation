"use client";
import Button from "@/components/Button";
import TextField from "@/components/TextField";

function SendOTPForm({ phone, onChangePhone, onSubmit }) {
  return (
    <form className="space-y-6" onSubmit={onSubmit}>
      <TextField
        name="phoneNumber"
        label="Phone Number"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={phone}
        onChange={onChangePhone}
        required
      />
      <Button variant="primary" type="submit" className="w-full">Send Code</Button>
    </form>
  );
}
export default SendOTPForm;
