import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import api from "../lib/api";
import toast from "react-hot-toast";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

const COLORS = [
  "#059669",
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#ea580c",
  "#ca8a04",
];

type ReportType = "summary" | "funds" | "top-donors";

export default function Reports() {
  const [reportType, setReportType] = useState<ReportType>("summary");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runReport = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      let endpoint = "/reports/summary";
      if (reportType === "funds") endpoint = "/reports/funds";
      if (reportType === "top-donors") endpoint = "/reports/top-donors";

      const res = await api.get(endpoint, { params });
      setData(res.data);
    } catch (error: any) {
      setData(null);
      toast.error(error.response?.data?.error || "Failed to load report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Reports</h1>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex gap-4 flex-wrap items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Report Type
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as ReportType)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="summary">Total Giving Summary</option>
              <option value="funds">Fund Report</option>
              <option value="top-donors">Top Donors</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            onClick={runReport}
            disabled={loading}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? "Loading..." : "Run Report"}
          </button>
        </div>
      </div>

      {/* Results */}
      {data && reportType === "summary" && data.summary && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Total Donations</p>
              <p className="text-xl font-bold">
                {formatCurrency(data.summary.totalAmount)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Number of Donations</p>
              <p className="text-xl font-bold">
                {data.summary.totalDonations}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Unique Donors</p>
              <p className="text-xl font-bold">{data.summary.uniqueDonors}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Average Gift</p>
              <p className="text-xl font-bold">
                {formatCurrency(data.summary.averageGift)}
              </p>
            </div>
          </div>

          {data.summary.byFund.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">By Fund</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data.summary.byFund}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
                  />
                  <Bar dataKey="amount" fill="#059669" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {data.summary.byPaymentMethod.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                By Payment Method
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={data.summary.byPaymentMethod}
                    dataKey="amount"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) =>
                      `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
                    }
                  >
                    {data.summary.byPaymentMethod.map(
                      (_: any, index: number) => (
                        <Cell
                          key={index}
                          fill={COLORS[index % COLORS.length]}
                        />
                      )
                    )}
                  </Pie>
                  <Tooltip
                    formatter={(value: number | undefined) => formatCurrency(value ?? 0)}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {data && reportType === "funds" && data.funds && (
        <div className="bg-white rounded-xl border border-gray-200">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  Fund
                </th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-right">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-right">
                  Donors
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.funds.map((fund: any) => (
                <tr key={fund.name} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {fund.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">
                    {formatCurrency(fund.totalAmount)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 text-right">
                    {fund.donorCount}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && reportType === "top-donors" && data.topDonors && (
        <div className="bg-white rounded-xl border border-gray-200">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 text-left">
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  Rank
                </th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                  Donor
                </th>
                <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-right">
                  Total Giving
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.topDonors.map((item: any) => (
                <tr key={item.rank} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-500">
                    #{item.rank}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {item.donor?.firstName} {item.donor?.lastName}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                    {formatCurrency(item.totalGiving)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!data && !loading && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          Select a report type and click "Run Report" to see results.
        </div>
      )}
    </div>
  );
}
