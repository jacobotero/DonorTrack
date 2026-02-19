import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, Lock, ArrowLeft, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";
import { usePageTitle } from "../hooks/usePageTitle";
import api from "../lib/api";

type Plan = "STARTER" | "GROWTH" | "PLUS";

const plans = [
  {
    id: "STARTER" as Plan,
    name: "Starter",
    price: 29,
    donors: "100",
    features: [
      "Up to 100 donors",
      "Unlimited donations",
      "All reports & exports",
      "CSV import & batch entry",
      "Email support",
    ],
  },
  {
    id: "GROWTH" as Plan,
    name: "Growth",
    price: 59,
    donors: "500",
    popular: true,
    features: [
      "Up to 500 donors",
      "Unlimited donations",
      "All reports & exports",
      "Tax letter generation",
      "CSV import & batch entry",
      "Priority email support",
    ],
  },
  {
    id: "PLUS" as Plan,
    name: "Plus",
    price: 99,
    donors: "Unlimited",
    features: [
      "Unlimited donors",
      "Unlimited donations",
      "All reports & exports",
      "Tax letter generation",
      "CSV import & batch entry",
      "Priority support",
      "Advanced features",
    ],
  },
];

export default function Upgrade() {
  usePageTitle("Upgrade Plan");
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [selectedPlan, setSelectedPlan] = useState<Plan>("GROWTH");
  const [processing, setProcessing] = useState(false);

  const subscriptionStatus = user?.organization?.subscriptionStatus;
  // If canceled or still on trial, no plan is "current" — all plans should be selectable
  const currentPlan = (subscriptionStatus === "CANCELED" || subscriptionStatus === "TRIALING")
    ? null
    : (user?.organization?.subscriptionTier ?? null);
  const selectedPlanData = plans.find((p) => p.id === selectedPlan);
  const trialExpired = searchParams.get("trial_expired") === "true";
  const canceled = searchParams.get("canceled") === "true";
  const subscriptionCanceled = searchParams.get("subscription_canceled") === "true";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    try {
      // Create checkout session
      const sessionRes = await api.post("/stripe/create-checkout-session", {
        plan: selectedPlan,
      });

      const { url } = sessionRes.data;

      if (!url) {
        toast.error("Failed to create checkout session. Please try again.");
        setProcessing(false);
        return;
      }

      // Redirect to Stripe Checkout (modern approach)
      window.location.href = url;
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(
        error.response?.data?.error || "Failed to start checkout process"
      );
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <button
            onClick={() => subscriptionCanceled ? navigate("/") : navigate(-1)}
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Upgrade Your Plan
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">
            Choose the plan that's right for your organization
          </p>
          {currentPlan && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              Current plan: <strong>{currentPlan}</strong>
            </p>
          )}
        </div>

        {/* Subscription Canceled Banner */}
        {subscriptionCanceled && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-12">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-900 dark:text-red-300 mb-2">
                  Your Subscription Has Been Canceled
                </h3>
                <p className="text-red-800 dark:text-red-400 mb-2">
                  Your subscription is no longer active. All your data is safely preserved — select a plan below to resubscribe and regain access instantly.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Canceled Banner */}
        {canceled && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 mb-12">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-amber-900 dark:text-amber-300 mb-2">
                  Payment Canceled
                </h3>
                <p className="text-amber-800 dark:text-amber-400">
                  Your payment was canceled. No charges were made. Feel free to
                  select a plan below when you're ready to upgrade.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Trial Expired Banner */}
        {trialExpired && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-12">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-900 dark:text-red-300 mb-2">
                  Your Free Trial Has Ended
                </h3>
                <p className="text-red-800 dark:text-red-400 mb-4">
                  Your 14-day free trial of DonorTrack has expired. To continue
                  managing your donors and donations, please upgrade to a paid
                  plan below.
                </p>
                <div className="bg-red-100 dark:bg-red-900/40 border border-red-300 dark:border-red-700 rounded-lg p-4">
                  <h4 className="font-semibold text-red-900 dark:text-red-300 mb-2">
                    What happens when you upgrade:
                  </h4>
                  <ul className="space-y-1 text-sm text-red-800 dark:text-red-400">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                      Immediate access to all your data
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                      Continue where you left off
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                      Unlock tax letter generation (Growth & Plus)
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Plan Selection */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
              Select a Plan
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative bg-white dark:bg-gray-800 rounded-xl border-2 p-6 text-left transition-all ${
                    selectedPlan === plan.id
                      ? "border-emerald-600 shadow-lg"
                      : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  } ${
                    plan.id === currentPlan
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                  disabled={plan.id === currentPlan}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-gray-900 px-3 py-1 rounded-full text-xs font-bold">
                      Most Popular
                    </div>
                  )}
                  {plan.id === currentPlan && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                      Current Plan
                    </div>
                  )}

                  <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                    {plan.name}
                  </h3>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                      ${plan.price}
                    </span>
                    <span className="text-gray-600 dark:text-gray-400">/month</span>
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    {plan.donors} donors
                  </div>
                  <ul className="space-y-2">
                    {plan.features.slice(0, 3).map((feature, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300"
                      >
                        <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          </div>

          {/* Checkout Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 sticky top-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
                Selected Plan
              </h2>

              {/* Plan Summary */}
              <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {selectedPlanData?.name} Plan
                  </span>
                  <span className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                    ${selectedPlanData?.price}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                  Billed monthly • Cancel anytime
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Payment securely processed by Stripe
                </p>
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleSubmit}
                disabled={processing || selectedPlan === currentPlan}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-emerald-600 text-white rounded-lg font-semibold text-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg hover:shadow-xl"
              >
                <Lock className="w-5 h-5" />
                {processing ? "Redirecting..." : "Continue to Checkout"}
              </button>

              <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-4">
                You'll enter payment details on the secure Stripe checkout page
              </p>

              {/* Trial Info */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                  <strong>14-day free trial</strong>
                  <br />
                  No charge until trial ends
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Comparison */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            All Plans Include
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Secure & Reliable
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                256-bit encryption and daily backups
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Cancel Anytime
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No long-term contracts or commitments
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Regular Updates
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                New features and improvements monthly
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
