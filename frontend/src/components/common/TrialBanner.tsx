import { useState, useEffect } from "react";
import { AlertCircle, X } from "lucide-react";
import { Link } from "react-router-dom";
import type { Organization } from "../../types";

interface TrialBannerProps {
  organization: Organization;
}

function getTimeLeft(trialEndsAt: string): string | null {
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  if (diff <= 0) return null;
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days} day${days !== 1 ? "s" : ""}, ${hours} hour${hours !== 1 ? "s" : ""}`;
  return `${hours} hour${hours !== 1 ? "s" : ""}`;
}

export default function TrialBanner({ organization }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    if (
      organization.subscriptionStatus !== "TRIALING" ||
      !organization.trialEndsAt
    ) {
      return;
    }

    const dismissedKey = `trial-banner-dismissed-${organization.id}`;
    if (sessionStorage.getItem(dismissedKey)) {
      setDismissed(true);
    }

    setTimeLeft(getTimeLeft(organization.trialEndsAt));

    // Update once per minute — no need to tick every second
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(organization.trialEndsAt!));
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [organization]);

  const handleDismiss = () => {
    setDismissed(true);
    sessionStorage.setItem(`trial-banner-dismissed-${organization.id}`, "true");
  };

  if (
    organization.subscriptionStatus !== "TRIALING" ||
    !organization.trialEndsAt ||
    timeLeft === null ||
    dismissed
  ) {
    return null;
  }

  const daysLeft = Math.floor((new Date(organization.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const isUrgent = daysLeft < 3;

  const bgColor = isUrgent ? "bg-red-50 dark:bg-red-900/20" : "bg-blue-50 dark:bg-blue-900/20";
  const borderColor = isUrgent ? "border-red-200 dark:border-red-800" : "border-blue-200 dark:border-blue-800";
  const textColor = isUrgent ? "text-red-800 dark:text-red-300" : "text-blue-800 dark:text-blue-300";
  const iconColor = isUrgent ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400";
  const btnColor = isUrgent ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700";

  return (
    <div className={`${bgColor} border ${borderColor} rounded-lg p-4 mb-6 relative`}>
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
            <strong>{timeLeft}</strong> left in your free trial
          </p>
          <p className={`text-xs ${textColor} opacity-80 mb-3`}>
            Upgrade to continue accessing all features after your trial ends.
          </p>
          <Link
            to="/app/upgrade"
            className={`inline-flex items-center gap-2 px-4 py-2 ${btnColor} text-white rounded-lg text-sm font-medium transition-colors`}
          >
            Upgrade Now
          </Link>
        </div>
      </div>
    </div>
  );
}
