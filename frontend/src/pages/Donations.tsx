import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import { Plus, X, Upload, Download, Pencil } from "lucide-react";
import api from "../lib/api";
import type { Donation, Donor, Fund, Pagination } from "../types";
import toast from "react-hot-toast";

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

const PAYMENT_METHODS = [
  "Cash",
  "Check",
  "Credit Card",
  "Bank Transfer",
  "Other",
];

export default function Donations() {
  usePageTitle("Donations");
  const [searchParams, setSearchParams] = useSearchParams();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(
    searchParams.get("action") === "add"
  );
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [batchCount, setBatchCount] = useState(0);

  // Edit modal state
  const [editingDonation, setEditingDonation] = useState<Donation | null>(null);
  const [editForm, setEditForm] = useState({
    donorId: "",
    amount: "",
    donationDate: "",
    paymentMethod: "",
    checkNumber: "",
    fund: "",
    campaign: "",
    notes: "",
  });

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [fundFilter, setFundFilter] = useState("");

  // Donor search for add form
  const [donors, setDonors] = useState<Donor[]>([]);
  const [funds, setFunds] = useState<Fund[]>([]);

  const [form, setForm] = useState({
    donorId: searchParams.get("donorId") || "",
    amount: "",
    donationDate: new Date().toISOString().split("T")[0],
    paymentMethod: "",
    checkNumber: "",
    fund: "",
    campaign: "",
    notes: "",
  });

  const fetchDonations = (page = 1) => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), limit: "25" };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (fundFilter) params.fund = fundFilter;
    api
      .get("/donations", { params })
      .then((res) => {
        setDonations(res.data.donations);
        setPagination(res.data.pagination);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDonations();
    // Load donors and funds for the add form
    api.get("/donors", { params: { all: "true" } }).then((res) => setDonors(res.data.donors));
    api.get("/funds").then((res) => setFunds(res.data.funds));
  }, []);

  const handleAddDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/donations", form);

      if (batchMode) {
        // In batch mode, keep modal open and only clear amount/check number
        toast.success(`Donation ${batchCount + 1} recorded`);
        setBatchCount(batchCount + 1);
        setForm({
          ...form,
          amount: "",
          checkNumber: "",
          notes: "",
        });
        // Focus on amount field for quick entry
        setTimeout(() => {
          const amountInput = document.querySelector<HTMLInputElement>(
            'input[name="amount"]'
          );
          amountInput?.focus();
        }, 100);
      } else {
        // Normal mode, close modal and reset
        toast.success("Donation recorded");
        setShowAddModal(false);
        setForm({
          donorId: "",
          amount: "",
          donationDate: new Date().toISOString().split("T")[0],
          paymentMethod: "",
          checkNumber: "",
          fund: "",
          campaign: "",
          notes: "",
        });
        searchParams.delete("action");
        searchParams.delete("donorId");
        setSearchParams(searchParams);
      }
      fetchDonations();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to record donation");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this donation?")) return;
    try {
      await api.delete(`/donations/${id}`);
      toast.success("Donation deleted");
      fetchDonations();
    } catch {
      toast.error("Failed to delete");
    }
  };

  const openEdit = (donation: Donation) => {
    setEditingDonation(donation);
    setEditForm({
      donorId: donation.donorId,
      amount: String(donation.amount),
      donationDate: donation.donationDate.split("T")[0],
      paymentMethod: donation.paymentMethod || "",
      checkNumber: donation.checkNumber || "",
      fund: donation.fund || "",
      campaign: donation.campaign || "",
      notes: donation.notes || "",
    });
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDonation) return;
    try {
      await api.put(`/donations/${editingDonation.id}`, editForm);
      toast.success("Donation updated");
      setEditingDonation(null);
      fetchDonations();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update donation");
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get("/donations/export", {
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `donations-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success("Donations exported successfully");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to export donations");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await api.post("/donations/import", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const { imported, errors, errorDetails } = response.data;
      if (errors > 0) {
        toast.error(
          `Imported ${imported} donations with ${errors} errors. Check console for details.`
        );
        console.error("Import errors:", errorDetails);
      } else {
        toast.success(`Successfully imported ${imported} donations`);
      }
      fetchDonations();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to import donations");
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
        <h1 className="text-2xl font-bold text-gray-900">Donations</h1>
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
            Add Donation
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="Start date"
        />
        <input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
          placeholder="End date"
        />
        <select
          value={fundFilter}
          onChange={(e) => setFundFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">All Funds</option>
          {funds
            .filter((f) => f.isActive)
            .map((f) => (
              <option key={f.id} value={f.name}>
                {f.name}
              </option>
            ))}
        </select>
        <button
          onClick={() => fetchDonations()}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
        >
          Apply Filters
        </button>
      </div>

      {/* Donations Table */}
      <div className="bg-white rounded-xl border border-gray-200">
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
          </div>
        ) : donations.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No donations found.</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Donor
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Fund
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase">
                    Method
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-right">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {donations.map((donation) => (
                  <tr key={donation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {donation.donor?.firstName} {donation.donor?.lastName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {formatDate(donation.donationDate)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {donation.fund && funds.find((f) => f.name === donation.fund)?.isActive !== false
                        ? donation.fund
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {donation.paymentMethod || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">
                      {formatCurrency(Number(donation.amount))}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => openEdit(donation)}
                          className="text-gray-400 hover:text-emerald-600"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(donation.id)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

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
                    onClick={() => fetchDonations(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchDonations(pagination.page + 1)}
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

      {/* Edit Donation Modal */}
      {editingDonation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Edit Donation</h2>
              <button type="button" onClick={() => setEditingDonation(null)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleEditSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Donor *</label>
                <select
                  required
                  value={editForm.donorId}
                  onChange={(e) => setEditForm({ ...editForm, donorId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                >
                  <option value="">Select a donor</option>
                  {donors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.firstName} {d.lastName}{d.email ? ` (${d.email})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={editForm.amount}
                    onChange={(e) => setEditForm({ ...editForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={editForm.donationDate}
                    onChange={(e) => setEditForm({ ...editForm, donationDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment method</label>
                  <select
                    value={editForm.paymentMethod}
                    onChange={(e) => setEditForm({ ...editForm, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  >
                    <option value="">Select</option>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Check number</label>
                  <input
                    type="text"
                    value={editForm.checkNumber}
                    onChange={(e) => setEditForm({ ...editForm, checkNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fund</label>
                  <select
                    value={editForm.fund}
                    onChange={(e) => setEditForm({ ...editForm, fund: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  >
                    <option value="">Select fund</option>
                    {funds.filter((f) => f.isActive).map((f) => (
                      <option key={f.id} value={f.name}>{f.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Campaign</label>
                  <input
                    type="text"
                    value={editForm.campaign}
                    onChange={(e) => setEditForm({ ...editForm, campaign: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setEditingDonation(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Donation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Add Donation{batchMode && ` - Batch Mode (${batchCount} entered)`}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setBatchMode(false);
                    setBatchCount(0);
                    searchParams.delete("action");
                    searchParams.delete("donorId");
                    setSearchParams(searchParams);
                  }}
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={batchMode}
                  onChange={(e) => {
                    setBatchMode(e.target.checked);
                    if (!e.target.checked) setBatchCount(0);
                  }}
                  className="w-4 h-4 text-emerald-600 border-gray-300 rounded focus:ring-emerald-500"
                />
                <span className="text-gray-700 font-medium">
                  Batch entry mode
                </span>
                <span className="text-gray-500 text-xs">
                  (form stays open after saving)
                </span>
              </label>
            </div>
            <form onSubmit={handleAddDonation} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Donor *
                </label>
                <select
                  required
                  value={form.donorId}
                  onChange={(e) =>
                    setForm({ ...form, donorId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                >
                  <option value="">Select a donor</option>
                  {donors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.firstName} {d.lastName}
                      {d.email ? ` (${d.email})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount *
                  </label>
                  <input
                    type="number"
                    name="amount"
                    step="0.01"
                    min="0.01"
                    required
                    value={form.amount}
                    onChange={(e) =>
                      setForm({ ...form, amount: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.donationDate}
                    onChange={(e) =>
                      setForm({ ...form, donationDate: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment method
                  </label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) =>
                      setForm({ ...form, paymentMethod: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  >
                    <option value="">Select</option>
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Check number
                  </label>
                  <input
                    type="text"
                    value={form.checkNumber}
                    onChange={(e) =>
                      setForm({ ...form, checkNumber: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fund
                  </label>
                  <select
                    value={form.fund}
                    onChange={(e) =>
                      setForm({ ...form, fund: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  >
                    <option value="">Select fund</option>
                    {funds
                      .filter((f) => f.isActive)
                      .map((f) => (
                        <option key={f.id} value={f.name}>
                          {f.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Campaign
                  </label>
                  <input
                    type="text"
                    value={form.campaign}
                    onChange={(e) =>
                      setForm({ ...form, campaign: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                />
              </div>
              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setBatchMode(false);
                    setBatchCount(0);
                    setForm({
                      donorId: "",
                      amount: "",
                      donationDate: new Date().toISOString().split("T")[0],
                      paymentMethod: "",
                      checkNumber: "",
                      fund: "",
                      campaign: "",
                      notes: "",
                    });
                    searchParams.delete("action");
                    searchParams.delete("donorId");
                    setSearchParams(searchParams);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {batchMode ? `Finish Batch (${batchCount} entered)` : "Cancel"}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700"
                >
                  {batchMode ? "Save & Next" : "Record Donation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
