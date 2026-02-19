import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Mail } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { usePageTitle } from "../hooks/usePageTitle";
import api from "../lib/api";

export default function VerifyEmailPending() {
  usePageTitle("Check Your Email");
  const { user, logout } = useAuth();
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  if (!user) return <Navigate to="/login" replace />;
  if (user.emailVerified) return <Navigate to="/app" replace />;

  const handleResend = async () => {
    setResending(true);
    setResendMessage("");
    try {
      await api.post("/auth/resend-verification");
      setResendMessage("Verification email sent! Check your inbox.");
    } catch {
      setResendMessage("Failed to send. Please try again.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <Mail className="h-8 w-8 text-emerald-600" />
        </div>

        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Check your email
        </h2>
        <p className="text-gray-500 mb-1">
          We sent a verification link to
        </p>
        <p className="font-medium text-gray-800 mb-6">{user.email}</p>

        <p className="text-sm text-gray-500 mb-6">
          Click the link in the email to verify your account and access your dashboard.
          If you don't see it, check your spam folder.
        </p>

        {resendMessage && (
          <div className={`text-sm rounded-lg p-3 mb-4 ${resendMessage.includes("Failed") ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
            {resendMessage}
          </div>
        )}

        <button
          onClick={handleResend}
          disabled={resending}
          className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors mb-3"
        >
          {resending ? "Sending..." : "Resend verification email"}
        </button>

        <button
          onClick={logout}
          className="w-full text-sm text-gray-500 hover:text-gray-700 py-2"
        >
          Sign out and use a different account
        </button>
      </div>
    </div>
  );
}
