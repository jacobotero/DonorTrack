import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle, CreditCard, Lock, ArrowLeft } from "lucide-react";
import { toast } from "react-hot-toast";
import { useAuth } from "../hooks/useAuth";

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
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<Plan>("GROWTH");
  const [processing, setProcessing] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: "",
    cardName: "",
    expiryDate: "",
    cvv: "",
  });

  const currentPlan = user?.organization?.subscriptionTier || "STARTER";
  const selectedPlanData = plans.find((p) => p.id === selectedPlan);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    // TODO: Integrate with Stripe or payment processor
    // For now, just show a success message
    setTimeout(() => {
      toast.success(
        `Payment processed! You've been upgraded to ${selectedPlanData?.name}. This is a demo - payment integration coming soon.`
      );
      setProcessing(false);
      // Navigate back to settings or dashboard
      navigate("/app/settings");
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Upgrade Your Plan
          </h1>
          <p className="text-xl text-gray-600">
            Choose the plan that's right for your organization
          </p>
          {currentPlan && (
            <p className="text-sm text-gray-500 mt-2">
              Current plan: <strong>{currentPlan}</strong>
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Plan Selection */}
          <div className="lg:col-span-2">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Select a Plan
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`relative bg-white rounded-xl border-2 p-6 text-left transition-all ${
                    selectedPlan === plan.id
                      ? "border-emerald-600 shadow-lg"
                      : "border-gray-200 hover:border-gray-300"
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

                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <div className="mb-4">
                    <span className="text-3xl font-bold text-gray-900">
                      ${plan.price}
                    </span>
                    <span className="text-gray-600">/month</span>
                  </div>
                  <div className="text-sm text-gray-600 mb-4">
                    {plan.donors} donors
                  </div>
                  <ul className="space-y-2">
                    {plan.features.slice(0, 3).map((feature, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-gray-700"
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

          {/* Payment Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">
                Payment Details
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Plan Summary */}
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      {selectedPlanData?.name} Plan
                    </span>
                    <span className="text-lg font-bold text-emerald-700">
                      ${selectedPlanData?.price}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    Billed monthly • Cancel anytime
                  </p>
                </div>

                {/* Card Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Card Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="1234 5678 9012 3456"
                      value={paymentDetails.cardNumber}
                      onChange={(e) =>
                        setPaymentDetails({
                          ...paymentDetails,
                          cardNumber: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      required
                    />
                    <CreditCard className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" />
                  </div>
                </div>

                {/* Cardholder Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cardholder Name
                  </label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={paymentDetails.cardName}
                    onChange={(e) =>
                      setPaymentDetails({
                        ...paymentDetails,
                        cardName: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    required
                  />
                </div>

                {/* Expiry & CVV */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="text"
                      placeholder="MM/YY"
                      value={paymentDetails.expiryDate}
                      onChange={(e) =>
                        setPaymentDetails({
                          ...paymentDetails,
                          expiryDate: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      CVV
                    </label>
                    <input
                      type="text"
                      placeholder="123"
                      value={paymentDetails.cvv}
                      onChange={(e) =>
                        setPaymentDetails({
                          ...paymentDetails,
                          cvv: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      required
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={processing || selectedPlan === currentPlan}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Lock className="w-4 h-4" />
                  {processing
                    ? "Processing..."
                    : `Pay $${selectedPlanData?.price}/month`}
                </button>

                {/* Security Note */}
                <p className="text-xs text-center text-gray-500 mt-4">
                  <Lock className="w-3 h-3 inline mr-1" />
                  Secure payment processing
                </p>
              </form>

              {/* Trial Info */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 text-center">
                  <strong>14-day free trial</strong>
                  <br />
                  No charge until trial ends
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Comparison */}
        <div className="bg-white rounded-xl border border-gray-200 p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            All Plans Include
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Secure & Reliable
              </h3>
              <p className="text-sm text-gray-600">
                256-bit encryption and daily backups
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Cancel Anytime
              </h3>
              <p className="text-sm text-gray-600">
                No long-term contracts or commitments
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">
                Regular Updates
              </h3>
              <p className="text-sm text-gray-600">
                New features and improvements monthly
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
