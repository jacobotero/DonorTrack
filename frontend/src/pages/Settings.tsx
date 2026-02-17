import { useEffect, useState } from "react";
import api from "../lib/api";
import type { Organization, Fund } from "../types";
import toast from "react-hot-toast";
import { Plus, X } from "lucide-react";

export default function Settings() {
  const [org, setOrg] = useState<Organization | null>(null);
  const [funds, setFunds] = useState<Fund[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newFundName, setNewFundName] = useState("");

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
    } catch {
      toast.error("Failed to save");
    } finally {
      setSaving(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

      {/* Organization Profile */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Organization Profile
        </h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization name *
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Address
            </label>
            <input
              type="text"
              value={form.addressLine1}
              onChange={(e) =>
                setForm({ ...form, addressLine1: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none mb-2"
              placeholder="Street address"
            />
            <input
              type="text"
              value={form.addressLine2}
              onChange={(e) =>
                setForm({ ...form, addressLine2: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              placeholder="Suite, unit, etc."
            />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                State
              </label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ZIP
              </label>
              <input
                type="text"
                value={form.zip}
                onChange={(e) => setForm({ ...form, zip: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                EIN (Tax ID)
              </label>
              <input
                type="text"
                value={form.ein}
                onChange={(e) => setForm({ ...form, ein: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                placeholder="XX-XXXXXXX"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tax-exempt status
              </label>
              <input
                type="text"
                value={form.taxExemptStatus}
                onChange={(e) =>
                  setForm({ ...form, taxExemptStatus: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                placeholder="501(c)(3)"
              />
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

      {/* Subscription Plan */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Subscription Plan
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl font-bold text-emerald-700">
                {org?.subscriptionTier === "STARTER" && "Starter"}
                {org?.subscriptionTier === "GROWTH" && "Growth"}
                {org?.subscriptionTier === "PLUS" && "Plus"}
              </span>
              {org?.subscriptionTier === "STARTER" && (
                <span className="px-3 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                  100 Donors
                </span>
              )}
              {org?.subscriptionTier === "GROWTH" && (
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">
                  500 Donors
                </span>
              )}
              {org?.subscriptionTier === "PLUS" && (
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                  Unlimited
                </span>
              )}
            </div>
            <p className="text-sm text-gray-600">
              {org?.subscriptionTier === "STARTER" &&
                "$29/month - All core features for small nonprofits"}
              {org?.subscriptionTier === "GROWTH" &&
                "$59/month - Advanced features including tax letter generation"}
              {org?.subscriptionTier === "PLUS" &&
                "$99/month - Complete platform with unlimited donors"}
            </p>
          </div>
          {org?.subscriptionTier === "STARTER" && (
            <a
              href="/app/upgrade"
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              Upgrade Plan
            </a>
          )}
        </div>
        {org?.subscriptionTier === "STARTER" && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Upgrade to Growth or Plus</strong> to unlock tax letter
              generation, manage more donors, and get priority support.
            </p>
          </div>
        )}
      </div>

      {/* Fund Management */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Fund Management
        </h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newFundName}
            onChange={(e) => setNewFundName(e.target.value)}
            placeholder="New fund name"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addFund())}
          />
          <button
            onClick={addFund}
            className="flex items-center gap-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>
        <div className="space-y-2">
          {funds.map((fund) => (
            <div
              key={fund.id}
              className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                fund.isActive ? "bg-gray-50" : "bg-gray-100 opacity-50"
              }`}
            >
              <span className="text-sm text-gray-900">
                {fund.name}
                {!fund.isActive && (
                  <span className="text-xs text-gray-500 ml-2">
                    (inactive)
                  </span>
                )}
              </span>
              {fund.isActive && (
                <button
                  onClick={() => deleteFund(fund.id)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
