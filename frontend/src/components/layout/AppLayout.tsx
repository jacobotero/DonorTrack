import { useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import Sidebar from "./Sidebar";
import api from "../../lib/api";

export default function AppLayout() {
  const { user, loading } = useAuth();
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

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
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {!user.emailVerified && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-amber-800">
              <svg className="h-4 w-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 100 18A9 9 0 0012 3z" />
              </svg>
              <span>
                Please verify your email address. Check your inbox for a verification link.
              </span>
              {resendMessage && (
                <span className="font-medium">{resendMessage}</span>
              )}
            </div>
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-sm font-medium text-amber-700 hover:text-amber-900 underline underline-offset-2 disabled:opacity-50 whitespace-nowrap"
            >
              {resending ? "Sending…" : "Resend email"}
            </button>
          </div>
        )}
        <div className="p-4 sm:p-6 lg:p-8 pt-16 lg:pt-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
