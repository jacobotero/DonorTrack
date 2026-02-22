import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import { Users, DollarSign, TrendingUp, XCircle, Trash2, CheckCircle, Clock, ShieldCheck } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../lib/api";

interface OrgInfo {
  id: string;
  name: string;
  subscriptionStatus: "TRIALING" | "ACTIVE" | "CANCELED";
  subscriptionTier: "STARTER" | "GROWTH" | "PLUS";
  trialEndsAt: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  _count: { donors: number; donations: number };
}

interface AdminUser {
  id: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  organization: OrgInfo | null;
}

interface Stats {
  total: number;
  trialing: number;
  active: number;
  canceled: number;
  mrr: number;
}

const STATUS_COLORS = {
  TRIALING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  ACTIVE: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  CANCELED: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const TIER_PRICES: Record<string, number> = { STARTER: 29, GROWTH: 59, PLUS: 99 };

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function daysLeft(d: string | null) {
  if (!d) return null;
  const diff = Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function Admin() {
  usePageTitle("Admin");
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "TRIALING" | "ACTIVE" | "CANCELED">("all");

  const load = async () => {
    try {
      const [statsRes, usersRes] = await Promise.all([
        api.get("/admin/stats"),
        api.get("/admin/users"),
      ]);
      setStats(statsRes.data);
      setUsers(usersRes.data.users);
    } catch (err: any) {
      if (err?.response?.status === 403) {
        toast.error("Not authorized");
        navigate("/app");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const action = async (label: string, fn: () => Promise<any>) => {
    setActionLoading(label);
    try {
      await fn();
      toast.success("Done");
      await load();
    } catch {
      toast.error("Action failed");
    } finally {
      setActionLoading(null);
    }
  };

  const extendTrial = (orgId: string, days: number) =>
    action(`extend-${orgId}`, () => api.patch(`/admin/orgs/${orgId}/extend-trial`, { days }));

  const activate = (orgId: string) =>
    action(`activate-${orgId}`, () => api.patch(`/admin/orgs/${orgId}/activate`, { tier: "PLUS" }));

  const cancel = (orgId: string) => {
    if (!confirm("Cancel this account?")) return;
    action(`cancel-${orgId}`, () => api.patch(`/admin/orgs/${orgId}/cancel`));
  };

  const deleteAccount = (orgId: string, email: string) => {
    if (!confirm(`Permanently delete ${email} and all their data? This cannot be undone.`)) return;
    action(`delete-${orgId}`, () => api.delete(`/admin/orgs/${orgId}`));
  };

  const verifyEmail = (userId: string) =>
    action(`verify-${userId}`, () => api.patch(`/admin/users/${userId}/verify`));

  const filtered = users.filter((u) => {
    const matchSearch =
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.organization?.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || u.organization?.subscriptionStatus === filter;
    return matchSearch && matchFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">DonorTrack internal management</p>
          </div>
          <button
            onClick={() => navigate("/app")}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Back to App
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Total Users</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-yellow-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Trialing</span>
              </div>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{stats.trialing}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Active</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.active}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="w-4 h-4 text-red-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Canceled</span>
              </div>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.canceled}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-gray-500 dark:text-gray-400">MRR</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">${stats.mrr}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-4">
          <input
            type="text"
            placeholder="Search by email or org name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64"
          />
          {(["all", "TRIALING", "ACTIVE", "CANCELED"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                filter === f
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              }`}
            >
              {f === "all" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
          <span className="self-center text-sm text-gray-500 dark:text-gray-400 ml-auto">
            {filtered.length} user{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User / Org</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Plan</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Trial / Data</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Joined</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      No users found
                    </td>
                  </tr>
                )}
                {filtered.map((u) => {
                  const org = u.organization;
                  const days = org ? daysLeft(org.trialEndsAt) : null;
                  const isLoading = (key: string) => actionLoading === key;

                  return (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      {/* User / Org */}
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 dark:text-white">{u.email}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {org?.name || <span className="italic">No org</span>}
                          {!u.emailVerified && (
                            <span className="ml-2 text-orange-500">· unverified</span>
                          )}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        {org ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[org.subscriptionStatus]}`}>
                            {org.subscriptionStatus}
                          </span>
                        ) : "—"}
                      </td>

                      {/* Plan */}
                      <td className="px-4 py-3">
                        {org ? (
                          <span className="text-gray-700 dark:text-gray-300">
                            {org.subscriptionTier}
                            {org.subscriptionStatus === "ACTIVE" && (
                              <span className="text-gray-400 dark:text-gray-500"> · ${TIER_PRICES[org.subscriptionTier]}/mo</span>
                            )}
                          </span>
                        ) : "—"}
                      </td>

                      {/* Trial / Data */}
                      <td className="px-4 py-3">
                        {org ? (
                          <div>
                            {org.subscriptionStatus === "TRIALING" && org.trialEndsAt && (
                              <p className={`text-xs font-medium ${days !== null && days <= 3 ? "text-red-600 dark:text-red-400" : "text-gray-600 dark:text-gray-400"}`}>
                                {days !== null && days > 0 ? `${days}d left` : "Expired"} · {formatDate(org.trialEndsAt)}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                              {org._count.donors} donors · {org._count.donations} donations
                            </p>
                          </div>
                        ) : "—"}
                      </td>

                      {/* Joined */}
                      <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(u.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        {org ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Verify email */}
                            {!u.emailVerified && (
                              <button
                                onClick={() => verifyEmail(u.id)}
                                disabled={!!actionLoading}
                                title="Manually verify email"
                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 disabled:opacity-50"
                              >
                                <ShieldCheck className="w-3 h-3" />
                                {isLoading(`verify-${u.id}`) ? "..." : "Verify"}
                              </button>
                            )}

                            {/* Extend trial */}
                            <button
                              onClick={() => extendTrial(org.id, 14)}
                              disabled={!!actionLoading}
                              title="Extend trial by 14 days"
                              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded hover:bg-yellow-100 dark:hover:bg-yellow-900/40 disabled:opacity-50"
                            >
                              <TrendingUp className="w-3 h-3" />
                              {isLoading(`extend-${org.id}`) ? "..." : "+14d"}
                            </button>

                            {/* Activate */}
                            {org.subscriptionStatus !== "ACTIVE" && (
                              <button
                                onClick={() => activate(org.id)}
                                disabled={!!actionLoading}
                                title="Manually activate account"
                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded hover:bg-emerald-100 dark:hover:bg-emerald-900/40 disabled:opacity-50"
                              >
                                <CheckCircle className="w-3 h-3" />
                                {isLoading(`activate-${org.id}`) ? "..." : "Activate"}
                              </button>
                            )}

                            {/* Cancel */}
                            {org.subscriptionStatus !== "CANCELED" && (
                              <button
                                onClick={() => cancel(org.id)}
                                disabled={!!actionLoading}
                                title="Cancel account"
                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-50"
                              >
                                <XCircle className="w-3 h-3" />
                                {isLoading(`cancel-${org.id}`) ? "..." : "Cancel"}
                              </button>
                            )}

                            {/* Delete */}
                            <button
                              onClick={() => deleteAccount(org.id, u.email)}
                              disabled={!!actionLoading}
                              title="Permanently delete account"
                              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded hover:bg-red-50 hover:text-red-700 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:text-red-400 disabled:opacity-50"
                            >
                              <Trash2 className="w-3 h-3" />
                              {isLoading(`delete-${org.id}`) ? "..." : "Delete"}
                            </button>
                          </div>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
