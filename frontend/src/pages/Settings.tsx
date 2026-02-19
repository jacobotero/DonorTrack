import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import type { Organization, Fund } from "../types";
import toast from "react-hot-toast";
import { Plus, X, Mail, CheckCircle, Eye, EyeOff, Trash2, RotateCcw, Moon, Sun } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { usePageTitle } from "../hooks/usePageTitle";
import { useDarkMode } from "../hooks/useDarkMode";

const EMAIL_PROVIDERS = [
  {
    label: "Gmail",
    host: "smtp.gmail.com",
    port: "587",
    passwordLabel: "App Password",
    passwordHelp: "Gmail requires an App Password — not your regular password. Go to myaccount.google.com → Security → 2-Step Verification → App Passwords to create one.",
  },
  {
    label: "Outlook / Microsoft 365",
    host: "smtp-mail.outlook.com",
    port: "587",
    passwordLabel: "Password",
    passwordHelp: "Use your regular Microsoft account password.",
  },
  {
    label: "Yahoo Mail",
    host: "smtp.mail.yahoo.com",
    port: "587",
    passwordLabel: "App Password",
    passwordHelp: "Yahoo requires an App Password. Go to Yahoo Account Security → Generate app password.",
  },
  {
    label: "Zoho Mail",
    host: "smtp.zoho.com",
    port: "587",
    passwordLabel: "Password",
    passwordHelp: "Use your regular Zoho account password.",
  },
  {
    label: "iCloud Mail",
    host: "smtp.mail.me.com",
    port: "587",
    passwordLabel: "App-Specific Password",
    passwordHelp: "iCloud requires an App-Specific Password. Go to appleid.apple.com → Sign-In and Security → App-Specific Passwords.",
  },
  {
    label: "Other (enter manually)",
    host: "",
    port: "587",
    passwordLabel: "Password",
    passwordHelp: "Use the password for your email account.",
  },
] as const;

function detectProvider(host: string) {
  const match = EMAIL_PROVIDERS.find((p) => p.host && p.host === host);
  return match ? match.label : "Other (enter manually)";
}

export default function Settings() {
  usePageTitle("Settings");
  const navigate = useNavigate();
  const { logout, refreshUser } = useAuth();
  const { isDark, toggleDark } = useDarkMode();
  const [org, setOrg] = useState<Organization | null>(null);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newFundName, setNewFundName] = useState("");
  const [testingEmail, setTestingEmail] = useState(false);
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("Gmail");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmDeleteFund, setConfirmDeleteFund] = useState<string | null>(null);
  const [deleteInput, setDeleteInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [emailForm, setEmailForm] = useState({
    smtpHost: "",
    smtpPort: "587",
    smtpUser: "",
    smtpPass: "",
    smtpFromName: "",
  });

  const [form, setForm] = useState({
    name: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    zip: "",
    phone: "",
    email: "",
    ein: "",
    taxExemptStatus: "",
  });

  useEffect(() => {
    Promise.all([api.get("/organization"), api.get("/funds")])
      .then(([orgRes, fundsRes]) => {
        const o = orgRes.data.organization;
        setOrg(o);
        setForm({
          name: o.name || "",
          addressLine1: o.addressLine1 || "",
          addressLine2: o.addressLine2 || "",
          city: o.city || "",
          state: o.state || "",
          zip: o.zip || "",
          phone: o.phone || "",
          email: o.email || "",
          ein: o.ein || "",
          taxExemptStatus: o.taxExemptStatus || "",
        });
        setEmailForm({
          smtpHost: o.smtpHost || "",
          smtpPort: o.smtpPort ? String(o.smtpPort) : "587",
          smtpUser: o.smtpUser || "",
          smtpPass: "",
          smtpFromName: o.smtpFromName || "",
        });
        if (o.smtpHost) setSelectedProvider(detectProvider(o.smtpHost));
        setFunds(fundsRes.data.funds);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put("/organization", form);
      setOrg(res.data.organization);
      toast.success("Organization updated");
      refreshUser().catch(() => {});
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.put("/organization", emailForm);
      setOrg(res.data.organization);
      setEmailForm((prev) => ({ ...prev, smtpPass: "" }));
      toast.success("Email settings saved");
    } catch {
      toast.error("Failed to save email settings");
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    setTestingEmail(true);
    try {
      await api.post("/organization/test-email", emailForm);
      toast.success("SMTP connection successful! Your email is configured correctly.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "SMTP connection failed. Check your credentials.");
    } finally {
      setTestingEmail(false);
    }
  };

  const addFund = async () => {
    if (!newFundName.trim()) return;
    try {
      const res = await api.post("/funds", { name: newFundName.trim() });
      setFunds([...funds, res.data.fund]);
      setNewFundName("");
      toast.success("Fund added");
    } catch {
      toast.error("Failed to add fund");
    }
  };

  const deleteFund = async (id: string) => {
    try {
      await api.delete(`/funds/${id}`);
      setFunds(funds.map((f) => (f.id === id ? { ...f, isActive: false } : f)));
      toast.success("Fund deactivated");
    } catch {
      toast.error("Failed to deactivate fund");
    }
  };

  const reactivateFund = async (id: string) => {
    try {
      await api.put(`/funds/${id}`, { isActive: true });
      setFunds(funds.map((f) => (f.id === id ? { ...f, isActive: true } : f)));
      toast.success("Fund reactivated");
    } catch {
      toast.error("Failed to reactivate fund");
    }
  };

  const permanentDeleteFund = async (id: string) => {
    try {
      await api.delete(`/funds/${id}/permanent`);
      setFunds(funds.filter((f) => f.id !== id));
      setConfirmDeleteFund(null);
      toast.success("Fund permanently deleted");
    } catch {
      toast.error("Failed to permanently delete fund");
    }
  };

  const handleCancelSubscription = async () => {
    setCanceling(true);
    try {
      await api.post("/stripe/cancel-subscription");
      setShowCancelConfirm(false);
      toast.success("Subscription canceled. You will be redirected shortly.");
      setTimeout(() => { window.location.href = "/upgrade?subscription_canceled=true"; }, 1500);
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to cancel subscription");
    } finally {
      setCanceling(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteInput !== "DELETE") return;
    setDeleting(true);
    try {
      await api.delete("/auth/account");
      logout();
      navigate("/");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to delete account");
      setDeleting(false);
    }
  };

  const inputClass = "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500";

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>

      {/* Appearance */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Appearance</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Dark Mode</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">Switch between light and dark theme</p>
          </div>
          <button
            onClick={toggleDark}
            className={`relative inline-flex h-7 w-13 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
              isDark ? "bg-emerald-600" : "bg-gray-200"
            }`}
            style={{ width: "52px" }}
            aria-label="Toggle dark mode"
          >
            <span
              className={`inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-sm transition-transform ${
                isDark ? "translate-x-7" : "translate-x-1"
              }`}
            >
              {isDark ? (
                <Moon className="w-3 h-3 text-emerald-600" />
              ) : (
                <Sun className="w-3 h-3 text-gray-400" />
              )}
            </span>
          </button>
        </div>
      </div>

      {/* Organization Profile */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Organization Profile
        </h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Organization name *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Address
            </label>
            <input
              type="text"
              value={form.addressLine1}
              onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
              className={`${inputClass} mb-2`}
              placeholder="Street address"
            />
            <input
              type="text"
              value={form.addressLine2}
              onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
              className={inputClass}
              placeholder="Suite, unit, etc."
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">City</label>
              <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">State</label>
              <input type="text" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">ZIP</label>
              <input type="text" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">EIN (Tax ID)</label>
              <input type="text" value={form.ein} onChange={(e) => setForm({ ...form, ein: e.target.value })} className={inputClass} placeholder="XX-XXXXXXX" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tax-exempt status</label>
              <input type="text" value={form.taxExemptStatus} onChange={(e) => setForm({ ...form, taxExemptStatus: e.target.value })} className={inputClass} placeholder="501(c)(3)" />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>

      {/* Email Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Mail className="w-5 h-5 text-emerald-600" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Email Settings</h2>
          {org?.smtpConfigured && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-full ml-2">
              <CheckCircle className="w-3 h-3" /> Configured
            </span>
          )}
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          Tax letters will be sent from your organization's email address. Select your email provider below to get started.
        </p>
        <form onSubmit={handleSaveEmail} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Provider</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EMAIL_PROVIDERS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => {
                    setSelectedProvider(p.label);
                    setEmailForm((prev) => ({ ...prev, smtpHost: p.host, smtpPort: p.port }));
                  }}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium text-left transition-colors ${
                    selectedProvider === p.label
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                      : "border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {selectedProvider === "Other (enter manually)" && (
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SMTP Host</label>
                <input
                  type="text"
                  value={emailForm.smtpHost}
                  onChange={(e) => setEmailForm({ ...emailForm, smtpHost: e.target.value })}
                  placeholder="smtp.yourdomain.com"
                  className={`${inputClass} text-sm`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Port</label>
                <select
                  value={emailForm.smtpPort}
                  onChange={(e) => setEmailForm({ ...emailForm, smtpPort: e.target.value })}
                  className={`${inputClass} text-sm`}
                >
                  <option value="587">587 (TLS)</option>
                  <option value="465">465 (SSL)</option>
                  <option value="25">25</option>
                </select>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Your Email Address</label>
              <input type="email" value={emailForm.smtpUser} onChange={(e) => setEmailForm({ ...emailForm, smtpUser: e.target.value })} placeholder="treasurer@yourchurch.org" className={`${inputClass} text-sm`} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display Name</label>
              <input type="text" value={emailForm.smtpFromName} onChange={(e) => setEmailForm({ ...emailForm, smtpFromName: e.target.value })} placeholder="First Baptist Church" className={`${inputClass} text-sm`} />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Shown as the sender name</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {EMAIL_PROVIDERS.find((p) => p.label === selectedProvider)?.passwordLabel ?? "Password"}
            </label>
            <div className="relative">
              <input
                type={showSmtpPass ? "text" : "password"}
                value={emailForm.smtpPass}
                onChange={(e) => setEmailForm({ ...emailForm, smtpPass: e.target.value })}
                placeholder={org?.smtpConfigured ? "Leave blank to keep existing" : "Enter password"}
                className={`${inputClass} pr-10 text-sm`}
              />
              <button
                type="button"
                onClick={() => setShowSmtpPass(!showSmtpPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                tabIndex={-1}
              >
                {showSmtpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
              {EMAIL_PROVIDERS.find((p) => p.label === selectedProvider)?.passwordHelp}
            </p>
          </div>

          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50">
              {saving ? "Saving..." : "Save Email Settings"}
            </button>
            <button
              type="button"
              onClick={handleTestEmail}
              disabled={testingEmail || !emailForm.smtpHost || !emailForm.smtpUser || (!emailForm.smtpPass && !org?.smtpConfigured)}
              className="px-5 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              {testingEmail ? "Testing..." : "Test Connection"}
            </button>
          </div>
        </form>
      </div>

      {/* Subscription Plan & Fund Management - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subscription Plan */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Subscription Plan</h2>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {org?.subscriptionStatus === "TRIALING" && "Free Trial"}
              {org?.subscriptionStatus !== "TRIALING" && org?.subscriptionTier === "STARTER" && "Starter"}
              {org?.subscriptionStatus !== "TRIALING" && org?.subscriptionTier === "GROWTH" && "Growth"}
              {org?.subscriptionStatus !== "TRIALING" && org?.subscriptionTier === "PLUS" && "Plus"}
            </span>
            {org?.subscriptionStatus === "TRIALING" && (
              <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-full">Full Access</span>
            )}
            {org?.subscriptionStatus !== "TRIALING" && org?.subscriptionTier === "STARTER" && (
              <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-medium rounded-full">100 Donors</span>
            )}
            {org?.subscriptionStatus !== "TRIALING" && org?.subscriptionTier === "GROWTH" && (
              <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-full">500 Donors</span>
            )}
            {org?.subscriptionStatus !== "TRIALING" && org?.subscriptionTier === "PLUS" && (
              <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-full">Unlimited</span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {org?.subscriptionStatus === "TRIALING" && "14-day free trial · Full access to all features"}
            {org?.subscriptionStatus !== "TRIALING" && org?.subscriptionTier === "STARTER" && "$29/month · All core features for small nonprofits"}
            {org?.subscriptionStatus !== "TRIALING" && org?.subscriptionTier === "GROWTH" && "$59/month · Advanced features including tax letter generation"}
            {org?.subscriptionStatus !== "TRIALING" && org?.subscriptionTier === "PLUS" && "$99/month · Complete platform with unlimited donors"}
          </p>

          <div className="space-y-2">
            <button
              onClick={() => navigate("/app/upgrade")}
              className="w-full px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              {org?.subscriptionStatus === "TRIALING" ? "Purchase a Subscription Plan" : "Change Subscription Plan"}
            </button>
            {org?.subscriptionStatus === "ACTIVE" && (
              <>
                {!showCancelConfirm ? (
                  <button
                    onClick={() => setShowCancelConfirm(true)}
                    className="w-full px-4 py-2 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    Cancel Subscription
                  </button>
                ) : (
                  <div className="border border-red-200 dark:border-red-800 rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
                    <p className="text-sm text-red-800 dark:text-red-300 font-medium mb-1">Are you sure?</p>
                    <p className="text-xs text-red-700 dark:text-red-400 mb-3">
                      Billing stops immediately and your account will be locked until you resubscribe. All your data is preserved.
                    </p>
                    <div className="flex gap-2">
                      <button onClick={handleCancelSubscription} disabled={canceling} className="flex-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
                        {canceling ? "Canceling..." : "Yes, cancel"}
                      </button>
                      <button onClick={() => setShowCancelConfirm(false)} className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700">
                        Keep plan
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {org?.subscriptionStatus === "TRIALING" && (
            <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-300">
                You have full access to all features during your trial. Purchase a plan before your trial ends to keep access.
              </p>
            </div>
          )}
          {org?.subscriptionStatus === "ACTIVE" && org?.subscriptionTier === "STARTER" && (
            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>Upgrade to Growth or Plus</strong> to unlock tax letter generation, manage more donors, and get priority support.
              </p>
            </div>
          )}
        </div>

        {/* Fund Management */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Fund Management</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newFundName}
              onChange={(e) => setNewFundName(e.target.value)}
              placeholder="New fund name"
              className={`${inputClass} text-sm`}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFund())}
            />
            <button onClick={addFund} className="flex items-center gap-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
          <div className="space-y-2">
            {funds.map((fund) => (
              <div key={fund.id}>
                <div className={`flex items-center justify-between px-3 py-2 rounded-lg ${fund.isActive ? "bg-gray-50 dark:bg-gray-700/50" : "bg-gray-100 dark:bg-gray-700 opacity-60"}`}>
                  <span className="text-sm text-gray-900 dark:text-white">
                    {fund.name}
                    {!fund.isActive && <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">(inactive)</span>}
                  </span>
                  {fund.isActive ? (
                    <button onClick={() => deleteFund(fund.id)} className="text-gray-400 hover:text-red-500 dark:hover:text-red-400" title="Deactivate">
                      <X className="w-4 h-4" />
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button onClick={() => reactivateFund(fund.id)} className="text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400" title="Reactivate">
                        <RotateCcw className="w-4 h-4" />
                      </button>
                      <button onClick={() => setConfirmDeleteFund(fund.id)} className="text-gray-400 hover:text-red-500 dark:hover:text-red-400" title="Permanently delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                {confirmDeleteFund === fund.id && (
                  <div className="mt-1 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center justify-between gap-2">
                    <span className="text-xs text-red-700 dark:text-red-400">Permanently delete "{fund.name}"?</span>
                    <div className="flex gap-2 shrink-0">
                      <button onClick={() => permanentDeleteFund(fund.id)} className="px-2 py-1 text-xs font-medium bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
                      <button onClick={() => setConfirmDeleteFund(null)} className="px-2 py-1 text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-50 dark:hover:bg-gray-700">Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-red-200 dark:border-red-900 p-6 mt-6">
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-1">Danger Zone</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Permanently delete your account and all data. This cannot be undone.
        </p>

        {!showDeleteConfirm ? (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            Delete Account
          </button>
        ) : (
          <div className="border border-red-300 dark:border-red-800 rounded-lg p-4 bg-red-50 dark:bg-red-900/20 max-w-md">
            <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">This will permanently delete:</p>
            <ul className="text-xs text-red-700 dark:text-red-400 mb-3 list-disc list-inside space-y-0.5">
              <li>Your account and login</li>
              <li>All donors and donation records</li>
              <li>All reports, funds, and tax letters</li>
              <li>Any active Stripe subscription</li>
            </ul>
            <p className="text-xs text-red-700 dark:text-red-400 mb-3 font-medium">Type <strong>DELETE</strong> to confirm:</p>
            <input
              type="text"
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder="DELETE"
              className="w-full px-3 py-2 border border-red-300 dark:border-red-700 rounded-lg text-sm mb-3 outline-none focus:ring-2 focus:ring-red-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <div className="flex gap-2">
              <button
                onClick={handleDeleteAccount}
                disabled={deleteInput !== "DELETE" || deleting}
                className="flex-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? "Deleting..." : "Permanently delete"}
              </button>
              <button
                onClick={() => { setShowDeleteConfirm(false); setDeleteInput(""); }}
                className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
