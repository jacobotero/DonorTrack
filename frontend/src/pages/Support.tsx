import { useState } from "react";
import { LifeBuoy, CheckCircle, Send } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { usePageTitle } from "../hooks/usePageTitle";
import api from "../lib/api";

export default function Support() {
  usePageTitle("Support");
  const { user } = useAuth();

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.post("/support", { subject, message });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSuccess(false);
    setSubject("");
    setMessage("");
    setError("");
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Support</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Have a question or running into an issue? Send us a message and we'll get back to you.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        {success ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Message sent!</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              We received your message and will reply to <span className="font-medium text-gray-800 dark:text-gray-200">{user?.email}</span> as soon as possible.
            </p>
            <button
              onClick={handleReset}
              className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              Send another message
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                <LifeBuoy className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">Contact DonorTrack Support</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Replies will be sent to {user?.email}</p>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm rounded-lg p-3 mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  maxLength={100}
                  placeholder="What's this about?"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  minLength={10}
                  rows={6}
                  placeholder="Describe your question or issue in as much detail as possible..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  We typically respond within 1–2 business days.
                </p>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  {loading ? "Sending..." : "Send Message"}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
