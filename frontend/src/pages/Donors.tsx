import { useEffect, useState, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import { Plus, Search, X, Upload, Download } from "lucide-react";
import api from "../lib/api";
import type { Donor, Pagination } from "../types";
import toast from "react-hot-toast";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

const DONOR_TYPES = ["Individual", "Family", "Business", "Foundation"];

export default function Donors() {
  usePageTitle("Donors");
  const [searchParams, setSearchParams] = useSearchParams();
  const [donors, setDonors] = useState<Donor[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(
    searchParams.get("action") === "add"
  );
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [donorTypeFilter, setDonorTypeFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [availableTags, setAvailableTags] = useState<string[]>([]);

  // Add donor form
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    addressLine1: "",
    city: "",
    state: "",
    zip: "",
    donorType: "",
    notes: "",
  });

  const fetchDonors = (page = 1) => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: "25" };
    if (search) params.search = search;
    if (donorTypeFilter) params.donorType = donorTypeFilter;
    if (tagFilter) params.tag = tagFilter;
    api
      .get("/donors", { params })
      .then((res) => {
        setDonors(res.data.donors);
        setPagination(res.data.pagination);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const fetchTags = () => {
    api
      .get("/donors/tags")
      .then((res) => {
        setAvailableTags(res.data.tags);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchDonors();
    fetchTags();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDonors();
  };

  const handleClearFilters = () => {
    setSearch("");
    setDonorTypeFilter("");
    setTagFilter("");
    fetchDonors(1);
  };

  const handleAddDonor = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/donors", form);
      toast.success("Donor added successfully");
      setShowAddModal(false);
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        addressLine1: "",
        city: "",
        state: "",
        zip: "",
        donorType: "",
        notes: "",
      });
      searchParams.delete("action");
      setSearchParams(searchParams);
      fetchDonors();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to add donor");
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get("/donors/export", {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `donors-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Donors exported successfully");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to export donors");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await api.post("/donors/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const { imported, errors, errorDetails } = response.data;
      if (errors > 0) {
        toast.error(
          `Imported ${imported} donors with ${errors} errors. Check console for details.`
        );
        console.error("Import errors:", errorDetails);
      } else {
        toast.success(`Successfully imported ${imported} donors`);
      }
      fetchDonors();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to import donors");
    } finally {
      setImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Donors</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleImport}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            {importing ? "Importing..." : "Import CSV"}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
          >
            <Plus className="w-4 h-4" />
            Add Donor
          </button>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search donors by name or email..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
        </div>
      </form>

      {/* Filters */}
      <div className="flex gap-4 mb-6 flex-wrap items-center">
        <select
          value={donorTypeFilter}
          onChange={(e) => setDonorTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
        >
          <option value="">All Donor Types</option>
          {DONOR_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>

        <select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
        >
          <option value="">All Tags</option>
          {availableTags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>

        <button
          onClick={() => fetchDonors()}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
        >
          Apply Filters
        </button>

        {(donorTypeFilter || tagFilter || search) && (
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Donor List */}
      <div className="bg-white rounded-xl border border-gray-200">
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
          </div>
        ) : donors.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No donors found.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="text-emerald-600 hover:text-emerald-700 font-medium text-sm mt-2"
            >
              Add your first donor
            </button>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-right">
                    Total Giving
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-right">
                    Donations
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {donors.map((donor) => (
                  <tr key={donor.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link
                        to={`/app/donors/${donor.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-emerald-600"
                      >
                        {donor.firstName} {donor.lastName}
                      </Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {donor.email || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {donor.donorType || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                      {formatCurrency(donor.totalGiving || 0)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 text-right">
                      {donor.donationCount || 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                  {Math.min(
                    pagination.page * pagination.limit,
                    pagination.total
                  )}{" "}
                  of {pagination.total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchDonors(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchDonors(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Donor Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Add Donor
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  searchParams.delete("action");
                  setSearchParams(searchParams);
                }}
              >
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleAddDonor} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.firstName}
                    onChange={(e) =>
                      setForm({ ...form, firstName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last name *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.lastName}
                    onChange={(e) =>
                      setForm({ ...form, lastName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
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
                  Address
                </label>
                <input
                  type="text"
                  value={form.addressLine1}
                  onChange={(e) =>
                    setForm({ ...form, addressLine1: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder="Street address"
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Donor type
                </label>
                <select
                  value={form.donorType}
                  onChange={(e) =>
                    setForm({ ...form, donorType: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                >
                  <option value="">Select type</option>
                  {DONOR_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    searchParams.delete("action");
                    setSearchParams(searchParams);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                >
                  Add Donor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
