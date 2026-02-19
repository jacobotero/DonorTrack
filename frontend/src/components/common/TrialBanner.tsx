import { useState, useEffect } from "react";
import { AlertCircle, X } from "lucide-react";
import { Link } from "react-router-dom";
import type { Organization } from "../../types";

interface TrialBannerProps {
  organization: Organization;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function getTimeLeft(trialEndsAt: string): TimeLeft {
  const diff = new Date(trialEndsAt).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds, expired: false };
}

export default function TrialBanner({ organization }: TrialBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);

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

    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(organization.trialEndsAt!));
    }, 1000);

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
    dismissed ||
    timeLeft.expired
  ) {
    return null;
  }

  const isUrgent = timeLeft.days < 3;
  const bgColor = isUrgent ? "bg-red-50 dark:bg-red-900/20" : "bg-blue-50 dark:bg-blue-900/20";
  const borderColor = isUrgent ? "border-red-200 dark:border-red-800" : "border-blue-200 dark:border-blue-800";
  const textColor = isUrgent ? "text-red-800 dark:text-red-300" : "text-blue-800 dark:text-blue-300";
  const iconColor = isUrgent ? "text-red-600 dark:text-red-400" : "text-blue-600 dark:text-blue-400";
  const btnColor = isUrgent ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700";

  const pad = (n: number) => String(n).padStart(2, "0");

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
          <p className={`text-sm font-medium ${textColor} mb-2`}>
            Free trial ending in:
          </p>
          <div className="flex items-center gap-2 mb-3">
            {[
              { value: timeLeft.days, label: "days" },
              { value: timeLeft.hours, label: "hrs" },
              { value: timeLeft.minutes, label: "min" },
              { value: timeLeft.seconds, label: "sec" },
            ].map(({ value, label }, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`text-center ${isUrgent ? "bg-red-100 dark:bg-red-900/40" : "bg-blue-100 dark:bg-blue-900/40"} rounded-lg px-2.5 py-1`}>
                  <span className={`text-lg font-bold font-mono ${textColor}`}>{label === "days" ? timeLeft.days : pad(value)}</span>
                  <p className={`text-xs ${textColor} opacity-70`}>{label}</p>
                </div>
                {i < 3 && <span className={`text-lg font-bold ${textColor} opacity-50`}>:</span>}
              </div>
            ))}
          </div>
          <Link
            to="/app/upgrade"
            className={`inline-flex items-center gap-2 px-4 py-2 ${btnColor} text-white rounded-lg text-sm font-medium transition-opacity`}
          >
            Upgrade Now
          </Link>
        </div>
      </div>
    </div>
  );
}
