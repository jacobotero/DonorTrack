import { useEffect, useState } from "react";
import { usePageTitle } from "../hooks/usePageTitle";
import {
  FileText, Download, Send, Calendar, CheckCircle, AlertCircle, Undo2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../lib/api";
import type { TaxLetter, Donor, Organization } from "../types";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function TaxLetters() {
  usePageTitle("Tax Letters");
  const [letters, setLetters] = useState<TaxLetter[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sendingEmail, setSendingEmail] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedDonors, setSelectedDonors] = useState<string[]>([]);
  const [filterYear, setFilterYear] = useState<number | "">(new Date().getFullYear());

  const yearOptions = Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - i);

  useEffect(() => {
    fetchOrganization();
    fetchLetters();
    fetchDonors();
  }, [filterYear]);

  const fetchOrganization = () => {
    api.get("/organization").then((res) => setOrganization(res.data.organization)).catch(console.error);
  };

  const fetchLetters = () => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (filterYear) params.year = String(filterYear);
    api.get("/tax-letters", { params }).then((res) => setLetters(res.data.letters)).catch(console.error).finally(() => setLoading(false));
  };

  const fetchDonors = () => {
    api.get("/donors", { params: { all: "true" } }).then((res) => setDonors(res.data.donors)).catch(console.error);
  };

  const handleGenerate = async () => {
    if (!selectedYear) { toast.error("Please select a year"); return; }
    setGenerating(true);
    try {
      const response = await api.post("/tax-letters/generate", { year: selectedYear, donorIds: selectedDonors.length > 0 ? selectedDonors : undefined });
      toast.success(response.data.message);
      setSelectedDonors([]);
      fetchLetters();
    } catch (err: any) {
      toast.error(err.response?.data?.error || "Failed to generate tax letters");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = async (letterId: string, donorName: string) => {
    try {
      const response = await api.get(`/tax-letters/${letterId}/pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `tax-letter-${donorName}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("PDF download error:", error);
      toast.error("Failed to download PDF");
    }
  };

  const handleDownloadBatch = async () => {
    try {
      const params: Record<string, string> = {};
      if (filterYear) params.year = String(filterYear);
      if (selectedDonors.length > 0) params.donorIds = selectedDonors.join(",");
      const response = await api.get("/tax-letters/batch/zip", { params, responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `tax-letters-${filterYear || "all"}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Batch ZIP downloaded successfully");
    } catch (error) {
      console.error("Batch download error:", error);
      toast.error("Failed to download batch ZIP");
    }
  };

  const handleMarkSent = async (letterId: string) => {
    try {
      await api.patch(`/tax-letters/${letterId}/mark-sent`);
      toast.success("Letter marked as sent");
      fetchLetters();
    } catch (error) {
      toast.error("Failed to mark letter as sent");
    }
  };

  const handleSendEmail = async (letterId: string, donorEmail: string) => {
    if (!donorEmail) { toast.error("This donor does not have an email address"); return; }
    setSendingEmail(letterId);
    try {
      const response = await api.post(`/tax-letters/${letterId}/send-email`);
      if (response.data.emailSent) {
        toast.success("Tax letter sent via email successfully!");
      } else {
        toast.success("Email logged to console (SMTP not configured in production)");
      }
      fetchLetters();
    } catch (error: any) {
      toast.error(error.response?.data?.error || "Failed to send email");
    } finally {
      setSendingEmail(null);
    }
  };

  const handleMarkUnsent = async (letterId: string) => {
    try {
      await api.patch(`/tax-letters/${letterId}/mark-unsent`);
      toast.success("Letter marked as not sent");
      fetchLetters();
    } catch (error) {
      toast.error("Failed to mark letter as unsent");
    }
  };

  const handleDonorToggle = (donorId: string) => {
    setSelectedDonors((prev) => prev.includes(donorId) ? prev.filter((id) => id !== donorId) : [...prev, donorId]);
  };

  const handleSelectAll = () => {
    if (selectedDonors.length === donors.length) {
      setSelectedDonors([]);
    } else {
      setSelectedDonors(donors.map((d) => d.id));
    }
  };

  if (loading || !organization) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  const selectClass = "px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white";

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tax Letters</h1>
      </div>

      {/* Generate Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Generate Tax Letters</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Tax Year</label>
              <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className={`w-full md:w-64 ${selectClass}`}>
                {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select Donors (optional - leave empty for all donors)
                </label>
                <button onClick={handleSelectAll} className="text-sm text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 font-medium">
                  {selectedDonors.length === donors.length ? "Deselect All" : "Select All"}
                </button>
              </div>
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg max-h-64 overflow-y-auto bg-white dark:bg-gray-700">
                {donors.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">No donors found</div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-600">
                    {donors.map((donor) => (
                      <label key={donor.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer">
                        <input type="checkbox" checked={selectedDonors.includes(donor.id)} onChange={() => handleDonorToggle(donor.id)} className="w-4 h-4 text-emerald-600 rounded border-gray-300 dark:border-gray-500 focus:ring-emerald-500" />
                        <span className="text-sm text-gray-900 dark:text-white">
                          {donor.firstName} {donor.lastName}
                          {donor.email && <span className="text-gray-500 dark:text-gray-400 ml-2">({donor.email})</span>}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              {selectedDonors.length > 0 && (
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{selectedDonors.length} donor(s) selected</p>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={handleGenerate} disabled={generating} className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed">
                <FileText className="w-4 h-4" />
                {generating ? "Generating..." : "Generate Tax Letters"}
              </button>
            </div>
          </div>
      </div>

      {/* Filter and Batch Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Year:</span>
            </div>
            <select value={filterYear} onChange={(e) => setFilterYear(e.target.value ? parseInt(e.target.value) : "")} className={selectClass}>
              <option value="">All Years</option>
              {yearOptions.map((year) => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
          {letters.length > 0 && (
            <button onClick={handleDownloadBatch} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
              <Download className="w-4 h-4" /> Download All as ZIP
            </button>
          )}
        </div>
      </div>

      {/* Letters List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">Generated Tax Letters</h2>
          {letters.length > 0 && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{letters.length} letter(s) generated</p>}
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto" />
          </div>
        ) : letters.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <FileText className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p>No tax letters generated yet.</p>
            <p className="text-sm mt-1">Select a year and generate letters above.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {letters.map((letter) => (
              <div key={letter.id} className="px-4 sm:px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        {letter.donor?.firstName} {letter.donor?.lastName}
                      </h3>
                      {letter.sentDate ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded">
                          <CheckCircle className="w-3 h-3" /> Sent
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded">
                          <AlertCircle className="w-3 h-3" /> Not Sent
                        </span>
                      )}
                    </div>
                    <div className="flex items-center flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500 dark:text-gray-400">
                      <span>Year: {letter.year}</span>
                      <span>Total: {formatCurrency(Number(letter.totalAmount))}</span>
                      <span>Generated: {formatDate(letter.letterDate)}</span>
                      {letter.sentDate && <span>Sent: {formatDate(letter.sentDate)}</span>}
                    </div>
                    {letter.donor?.email && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{letter.donor.email}</p>}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => handleDownloadPDF(letter.id, `${letter.donor?.firstName}-${letter.donor?.lastName}`)} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
                      <Download className="w-4 h-4" /> PDF
                    </button>
                    {letter.donor?.email && (
                      <button onClick={() => handleSendEmail(letter.id, letter.donor?.email || "")} disabled={sendingEmail === letter.id} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                        <Send className="w-4 h-4" /> <span className="hidden sm:inline">{sendingEmail === letter.id ? "Sending..." : "Send Email"}</span>
                      </button>
                    )}
                    {!letter.sentDate && (
                      <button onClick={() => handleMarkSent(letter.id)} className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600">
                        <Send className="w-4 h-4" /> <span className="hidden sm:inline">Mark Sent</span>
                      </button>
                    )}
                    {letter.sentDate && (
                      <button onClick={() => handleMarkUnsent(letter.id)} className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-600" title="Mark as not sent">
                        <Undo2 className="w-4 h-4" /> <span className="hidden sm:inline">Undo</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Section */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">IRS Compliance Note</h3>
        <p className="text-sm text-blue-800 dark:text-blue-400">
          These tax letters are generated in compliance with IRS Publication 1771. They include your organization's 501(c)(3) status, EIN, and the required disclaimer that no goods or services were provided in exchange for donations. Letters for donations of $250 or more include the required contemporaneous written acknowledgment.
        </p>
      </div>
    </div>
  );
}
