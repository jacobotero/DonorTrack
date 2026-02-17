import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, DollarSign, TrendingUp, Plus } from "lucide-react";
import api from "../lib/api";
import type { DashboardStats, Donation } from "../types";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentDonations, setRecentDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/dashboard/stats")
      .then((res) => {
        setStats(res.data.stats);
        setRecentDonations(res.data.recentDonations);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex gap-3">
          <Link
            to="/donors?action=add"
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Plus className="w-4 h-4" />
            Add Donor
          </Link>
          <Link
            to="/donations?action=add"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" />
            Add Donation
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-sm font-medium text-gray-500">
              This Month
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(stats?.monthlyTotal || 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {stats?.monthlyCount || 0} donations
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-500">
              This Year
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(stats?.yearlyTotal || 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {stats?.yearlyCount || 0} donations
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-purple-50 rounded-lg">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-gray-500">
              Total Donors
            </span>
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {stats?.totalDonors || 0}
          </p>
        </div>
      </div>

      {/* Recent Donations */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Recent Donations</h2>
        </div>
        {recentDonations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No donations recorded yet.</p>
            <Link
              to="/donations?action=add"
              className="text-emerald-600 hover:text-emerald-700 font-medium text-sm mt-2 inline-block"
            >
              Record your first donation
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentDonations.map((donation) => (
              <div
                key={donation.id}
                className="px-6 py-3 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {donation.donor?.firstName} {donation.donor?.lastName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDate(donation.donationDate)}
                    {donation.fund && ` · ${donation.fund}`}
                  </p>
                </div>
                <span className="text-sm font-semibold text-gray-900">
                  {formatCurrency(Number(donation.amount))}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
