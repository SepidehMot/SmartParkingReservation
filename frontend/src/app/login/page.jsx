"use client";
import AuthContainer from "./AuthContainer";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-start justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-secondary-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="text-center space-y-8 mb-6">
            <h1 className="text-2xl font-semibold text-secondary-800">
              Sign in / Sign up
            </h1>
            <p className="text-sm text-secondary-500 text-left">
              Enter your phone number to continue. If you’re new, we’ll create your account automatically.
            </p>
          </div>

          <AuthContainer />
        </div>
      </div>
    </main>
  );
}
