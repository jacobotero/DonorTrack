import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import { Users, Trash2, ShieldCheck } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../lib/api";

interface OrgInfo {
  id: string;
  name: string;
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
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function Admin() {
  usePageTitle("Admin");
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [search, setSearch] = useState("");

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

  const deleteAccount = (orgId: string, email: string) => {
    if (!confirm(`Permanently delete ${email} and all their data? This cannot be undone.`)) return;
    action(`delete-${orgId}`, () => api.delete(`/admin/orgs/${orgId}`));
  };

  const verifyEmail = (userId: string) =>
    action(`verify-${userId}`, () => api.patch(`/admin/users/${userId}/verify`));

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.organization?.name.toLowerCase().includes(search.toLowerCase())
  );

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 max-w-xs">
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Total Users</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Data</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Joined</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      No users found
                    </td>
                  </tr>
                )}
                {filtered.map((u) => {
                  const org = u.organization;
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

                      {/* Data */}
                      <td className="px-4 py-3">
                        {org ? (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {org._count.donors} donors · {org._count.donations} donations
                          </p>
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
