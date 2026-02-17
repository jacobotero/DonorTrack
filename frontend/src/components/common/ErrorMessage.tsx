import { AlertCircle, X } from "lucide-react";

interface ErrorMessageProps {
  title?: string;
  message: string;
  onDismiss?: () => void;
  type?: "error" | "warning" | "info";
}

export default function ErrorMessage({
  title,
  message,
  onDismiss,
  type = "error",
}: ErrorMessageProps) {
  const styles = {
    error: "bg-red-50 border-red-200 text-red-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
    info: "bg-blue-50 border-blue-200 text-blue-800",
  };

  const iconColors = {
    error: "text-red-500",
    warning: "text-amber-500",
    info: "text-blue-500",
  };

  return (
    <div className={`${styles[type]} border rounded-lg p-4 relative`}>
      <div className="flex items-start gap-3">
        <AlertCircle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${iconColors[type]}`} />
        <div className="flex-1 min-w-0">
          {title && <h3 className="font-semibold text-sm mb-1">{title}</h3>}
          <p className="text-sm">{message}</p>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="flex-shrink-0 hover:opacity-70 transition-opacity"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
