import { useState, useEffect } from "react";
import { AlertCircle, X } from "lucide-react";
import { Link } from "react-router-dom";
import type { Organization } from "../../types";

interface TrialBannerProps {
  organization: Organization;
}

export default function TrialBanner({ organization }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [daysLeft, setDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    // Only show for active trial
    if (
      organization.subscriptionStatus !== "TRIALING" ||
      !organization.trialEndsAt
    ) {
      return;
    }

    const trialEnd = new Date(organization.trialEndsAt);
    const now = new Date();
    const diff = trialEnd.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

    setDaysLeft(days);

    // Check if dismissed in session
    const dismissedKey = `trial-banner-dismissed-${organization.id}`;
    if (sessionStorage.getItem(dismissedKey)) {
      setDismissed(true);
    }
  }, [organization]);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem(
      `trial-banner-dismissed-${organization.id}`,
      "true"
    );
  };

  // Don't show if not on active trial or no trial end date
  if (
    organization.subscriptionStatus !== "TRIALING" ||
    !organization.trialEndsAt ||
    daysLeft === null
  ) {
    return null;
  }

  // Don't show if dismissed or trial already expired
  if (dismissed || daysLeft < 0) {
    return null;
  }

  // Show warning colors when less than 3 days left
  const isUrgent = daysLeft <= 3;
  const bgColor = isUrgent ? "bg-red-50" : "bg-blue-50";
  const borderColor = isUrgent ? "border-red-200" : "border-blue-200";
  const textColor = isUrgent ? "text-red-800" : "text-blue-800";
  const iconColor = isUrgent ? "text-red-600" : "text-blue-600";

  return (
    <div
      className={`${bgColor} border ${borderColor} rounded-lg p-4 mb-6 relative`}
    >
      <button
        onClick={handleDismiss}
        className={`absolute top-3 right-3 ${textColor} opacity-50 hover:opacity-100`}
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3">
        <AlertCircle className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          <p className={`text-sm font-medium ${textColor} mb-1`}>
            {daysLeft === 0 && "Trial ends today!"}
            {daysLeft === 1 && "1 day left in your free trial"}
            {daysLeft > 1 && `${daysLeft} days left in your free trial`}
          </p>
          <p className={`text-xs ${textColor} opacity-80 mb-3`}>
            Upgrade to continue accessing all features after your trial ends.
          </p>
          <Link
            to="/app/upgrade"
            className={`inline-flex items-center gap-2 px-4 py-2 ${
              isUrgent ? "bg-red-600" : "bg-blue-600"
            } text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity`}
          >
            Upgrade Now
          </Link>
        </div>
      </div>
    </div>
  );
}
