import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import { ArrowLeft, Edit2, Trash2, Plus } from "lucide-react";
import api from "../lib/api";
import type { Donor, Donation } from "../types";
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

export default function DonorDetail() {
  usePageTitle("Donor Details");
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [donor, setDonor] = useState<Donor & { donations?: Donation[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Donor>>({});

  useEffect(() => {
    api
      .get(`/donors/${id}`)
      .then((res) => {
        setDonor(res.data.donor);
        setEditForm(res.data.donor);
      })
      .catch(() => toast.error("Donor not found"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    try {
      const res = await api.put(`/donors/${id}`, editForm);
      setDonor({ ...donor, ...res.data.donor });
      setEditing(false);
      toast.success("Donor updated");
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to update");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this donor?")) return;
    try {
      await api.delete(`/donors/${id}`);
      toast.success("Donor deleted");
      navigate("/app/donors");
    } catch {
      toast.error("Failed to delete donor");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (!donor) {
    return <div className="text-center text-gray-500 py-8">Donor not found</div>;
  }

  return (
    <div>
      <Link
        to="/app/donors"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Donors
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {donor.firstName} {donor.lastName}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(!editing)}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Edit2 className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donor Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Information</h2>
          {editing ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  value={editForm.firstName || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, firstName: e.target.value })
                  }
                  placeholder="First name"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  value={editForm.lastName || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, lastName: e.target.value })
                  }
                  placeholder="Last name"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <input
                value={editForm.email || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, email: e.target.value })
                }
                placeholder="Email"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <input
                value={editForm.phone || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, phone: e.target.value })
                }
                placeholder="Phone"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <select
                value={editForm.donorType || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, donorType: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select donor type</option>
                <option value="Individual">Individual</option>
                <option value="Family">Family</option>
                <option value="Business">Business</option>
                <option value="Foundation">Foundation</option>
              </select>
              <input
                value={editForm.addressLine1 || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, addressLine1: e.target.value })
                }
                placeholder="Street address"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="grid grid-cols-3 gap-3">
                <input
                  value={editForm.city || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, city: e.target.value })
                  }
                  placeholder="City"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  value={editForm.state || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, state: e.target.value })
                  }
                  placeholder="State"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <input
                  value={editForm.zip || ""}
                  onChange={(e) =>
                    setEditForm({ ...editForm, zip: e.target.value })
                  }
                  placeholder="ZIP"
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <textarea
                value={editForm.notes || ""}
                onChange={(e) =>
                  setEditForm({ ...editForm, notes: e.target.value })
                }
                placeholder="Notes"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="px-3 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setEditForm(donor);
                  }}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd className="text-gray-900">{donor.email || "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Phone</dt>
                <dd className="text-gray-900">{donor.phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Type</dt>
                <dd className="text-gray-900">{donor.donorType || "—"}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Address</dt>
                <dd className="text-gray-900">
                  {donor.addressLine1
                    ? `${donor.addressLine1}, ${donor.city || ""} ${donor.state || ""} ${donor.zip || ""}`
                    : "—"}
                </dd>
              </div>
              {donor.notes && (
                <div>
                  <dt className="text-gray-500">Notes</dt>
                  <dd className="text-gray-900 whitespace-pre-wrap">
                    {donor.notes}
                  </dd>
                </div>
              )}
            </dl>
          )}
        </div>

        {/* Stats + Donation History */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-sm text-gray-500">Total Giving</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(donor.totalGiving || 0)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-sm text-gray-500">Donations</p>
              <p className="text-2xl font-bold text-gray-900">
                {donor.donations?.length || 0}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Donation History</h2>
              <Link
                to={`/app/donations?action=add&donorId=${donor.id}`}
                className="flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
              >
                <Plus className="w-4 h-4" />
                Add Donation
              </Link>
            </div>
            {donor.donations && donor.donations.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {donor.donations.map((d: Donation) => (
                  <div
                    key={d.id}
                    className="px-6 py-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-sm text-gray-500">
                        {formatDate(d.donationDate)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {d.fund || "General"} · {d.paymentMethod || "—"}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {formatCurrency(Number(d.amount))}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-sm text-gray-500">
                No donations recorded yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
