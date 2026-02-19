import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, XCircle, ArrowRight, Loader } from "lucide-react";
import api from "../lib/api";

export default function PaymentSuccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<{
    plan: string;
    amount: number;
  } | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      setError("No session ID found");
      setLoading(false);
      return;
    }

    // Verify the session with backend
    api
      .get(`/stripe/verify-session/${sessionId}`)
      .then((res) => {
        setSessionData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Session verification error:", err);
        setError("Failed to verify payment session");
        setLoading(false);
      });
  }, [searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Verifying your payment...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-xl border border-red-200 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Verification Error
          </h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate("/app")}
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-colors"
          >
            Go to Dashboard
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-blue-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        {/* Success Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 md:p-12 text-center">
          {/* Success Icon */}
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
            <CheckCircle className="w-12 h-12 text-emerald-600" />
          </div>

          {/* Success Message */}
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Payment Successful!
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Welcome to DonorTrack {sessionData?.plan || "Premium"}! Your
            subscription is now active.
          </p>

          {/* Subscription Details */}
          {sessionData && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-700 font-medium">
                  {sessionData.plan} Plan
                </span>
                <span className="text-2xl font-bold text-emerald-700">
                  ${sessionData.amount}
                  <span className="text-sm font-normal text-gray-600">
                    /month
                  </span>
                </span>
              </div>
              <p className="text-sm text-gray-600">
                Your subscription has been activated and you now have access to
                all {sessionData.plan} features.
              </p>
            </div>
          )}

          {/* What's Next */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 mb-8 text-left">
            <h2 className="font-bold text-gray-900 mb-4 text-center">
              What's Next?
            </h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">
                  Access all premium features immediately
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">
                  Manage your donors and track donations
                </span>
              </li>
              {(sessionData?.plan === "GROWTH" ||
                sessionData?.plan === "PLUS") && (
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-gray-700">
                    Generate tax letters for your donors
                  </span>
                </li>
              )}
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span className="text-gray-700">
                  Export reports and manage your organization
                </span>
              </li>
            </ul>
          </div>

          {/* CTA Button */}
          <button
            onClick={() => navigate("/app")}
            className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 bg-emerald-600 text-white rounded-lg font-semibold text-lg hover:bg-emerald-700 transition-colors shadow-lg hover:shadow-xl"
          >
            Go to Dashboard
            <ArrowRight className="w-5 h-5" />
          </button>

          {/* Support Note */}
          <p className="text-sm text-gray-500 mt-6">
            Questions? Contact us at{" "}
            <a
              href="mailto:donortrackapp@gmail.com"
              className="text-emerald-600 hover:text-emerald-700"
            >
              donortrackapp@gmail.com
            </a>
          </p>
        </div>

        {/* Receipt Note */}
        <p className="text-center text-sm text-gray-600 mt-6">
          A receipt has been sent to your email address.
        </p>
      </div>
    </div>
  );
}
