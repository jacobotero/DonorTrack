import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  DollarSign,
  TrendingUp,
  Plus,
  Calendar,
  Download,
  FileText,
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../lib/api";
import type { DashboardStats, Donation, Organization } from "../types";
import TrialBanner from "../components/common/TrialBanner";

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

// Calculate date ranges for presets
function getDateRange(preset: string): { startDate: string; endDate: string } {
  const now = new Date();
  const endDate = now.toISOString().split("T")[0];
  let startDate = "";

  switch (preset) {
    case "this_week": {
      const start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      startDate = start.toISOString().split("T")[0];
      break;
    }
    case "last_week": {
      const end = new Date(now);
      end.setDate(now.getDate() - now.getDay() - 1);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      startDate = start.toISOString().split("T")[0];
      return { startDate, endDate: end.toISOString().split("T")[0] };
    }
    case "this_month": {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      break;
    }
    case "last_month": {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      startDate = lastMonth.toISOString().split("T")[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      return { startDate, endDate: lastDay.toISOString().split("T")[0] };
    }
    case "this_quarter": {
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1)
        .toISOString()
        .split("T")[0];
      break;
    }
    case "last_quarter": {
      const quarter = Math.floor(now.getMonth() / 3) - 1;
      const year = quarter < 0 ? now.getFullYear() - 1 : now.getFullYear();
      const q = quarter < 0 ? 3 : quarter;
      startDate = new Date(year, q * 3, 1).toISOString().split("T")[0];
      const lastDay = new Date(year, q * 3 + 3, 0);
      return { startDate, endDate: lastDay.toISOString().split("T")[0] };
    }
    case "ytd": {
      startDate = new Date(now.getFullYear(), 0, 1).toISOString().split("T")[0];
      break;
    }
    case "last_year": {
      const lastYear = now.getFullYear() - 1;
      startDate = new Date(lastYear, 0, 1).toISOString().split("T")[0];
      return {
        startDate,
        endDate: new Date(lastYear, 11, 31).toISOString().split("T")[0],
      };
    }
    case "all_time":
      return { startDate: "", endDate: "" };
    default:
      return { startDate: "", endDate: "" };
  }

  return { startDate, endDate };
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentDonations, setRecentDonations] = useState<Donation[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRangePreset, setDateRangePreset] = useState("this_month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const fetchStats = () => {
    setLoading(true);
    let params: Record<string, string> = {};

    if (dateRangePreset === "custom") {
      if (customStartDate) params.startDate = customStartDate;
      if (customEndDate) params.endDate = customEndDate;
    } else {
      const range = getDateRange(dateRangePreset);
      if (range.startDate) params.startDate = range.startDate;
      if (range.endDate) params.endDate = range.endDate;
    }

    api
      .get("/dashboard/stats", { params })
      .then((res) => {
        setStats(res.data.stats);
        setRecentDonations(res.data.recentDonations);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    // Fetch organization on mount
    api
      .get("/organization")
      .then((res) => setOrganization(res.data.organization))
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchStats();
  }, [dateRangePreset, customStartDate, customEndDate]);

  const handleExport = async (reportType: string, format: string) => {
    try {
      let params: Record<string, string> = { format };

      if (dateRangePreset === "custom") {
        if (customStartDate) params.startDate = customStartDate;
        if (customEndDate) params.endDate = customEndDate;
      } else {
        const range = getDateRange(dateRangePreset);
        if (range.startDate) params.startDate = range.startDate;
        if (range.endDate) params.endDate = range.endDate;
      }

      const response = await api.get(`/reports/${reportType}`, {
        params,
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${reportType}-report.${format === "pdf" ? "pdf" : "csv"}`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success(`Report exported successfully`);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export report");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div>
      {organization && <TrialBanner organization={organization} />}

      <div className="flex items-center justify-between mb-6">
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

      {/* Date Range Selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              Date Range:
            </span>
          </div>
          <select
            value={dateRangePreset}
            onChange={(e) => setDateRangePreset(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="this_week">This Week</option>
            <option value="last_week">Last Week</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_quarter">This Quarter</option>
            <option value="last_quarter">Last Quarter</option>
            <option value="ytd">Year to Date</option>
            <option value="last_year">Last Year</option>
            <option value="all_time">All Time</option>
            <option value="custom">Custom Range</option>
          </select>

          {dateRangePreset === "custom" && (
            <>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Start Date"
              />
              <span className="text-sm text-gray-500">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="End Date"
              />
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <DollarSign className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-sm font-medium text-gray-500">
              Selected Period
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
              Total
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

      {/* Tax Letters Quick Action */}
      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 rounded-xl border border-emerald-200 p-6 mb-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Tax Letters
              </h3>
            </div>
            <p className="text-sm text-gray-600 max-w-2xl">
              Generate IRS-compliant year-end donation receipts for your donors.
              Perfect for tax season preparation.
            </p>
          </div>
          <Link
            to="/app/tax-letters"
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 whitespace-nowrap"
          >
            <FileText className="w-4 h-4" />
            Generate Tax Letters
          </Link>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              Export Reports:
            </span>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleExport("summary", "pdf")}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              <FileText className="w-4 h-4" />
              Summary PDF
            </button>
            <button
              onClick={() => handleExport("summary", "csv")}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <FileText className="w-4 h-4" />
              Summary CSV
            </button>
            <button
              onClick={() => handleExport("funds", "pdf")}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              <FileText className="w-4 h-4" />
              Funds PDF
            </button>
            <button
              onClick={() => handleExport("funds", "csv")}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <FileText className="w-4 h-4" />
              Funds CSV
            </button>
            <button
              onClick={() => handleExport("top-donors", "pdf")}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              <FileText className="w-4 h-4" />
              Top Donors PDF
            </button>
            <button
              onClick={() => handleExport("top-donors", "csv")}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <FileText className="w-4 h-4" />
              Top Donors CSV
            </button>
          </div>
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
