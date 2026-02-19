import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Heart,
  ArrowLeft,
  ChevronDown,
  Users,
  DollarSign,
  FileText,
  BarChart3,
  Download,
  CreditCard,
  HelpCircle,
  BookOpen,
} from "lucide-react";
import { usePageTitle } from "../hooks/usePageTitle";

interface FaqItem {
  q: string;
  a: string;
}

function Accordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-4 py-3 text-left bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
          >
            <span className="text-sm font-medium text-gray-900 dark:text-white">{item.q}</span>
            <ChevronDown className={`w-4 h-4 text-gray-500 flex-shrink-0 ml-3 transition-transform ${open === i ? "rotate-180" : ""}`} />
          </button>
          {open === i && (
            <div className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
              {item.a}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SectionBlock({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-5 h-5 text-emerald-600" />
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Step({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex gap-3 mb-3">
      <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
        {number}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">{title}</p>
        <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
      </div>
    </div>
  );
}

const navSections = [
  { id: "getting-started", label: "Getting Started" },
  { id: "donors", label: "Donors" },
  { id: "donations", label: "Donations" },
  { id: "tax-letters", label: "Tax Letters" },
  { id: "reports", label: "Reports" },
  { id: "csv", label: "CSV Import & Export" },
  { id: "billing", label: "Billing & Plans" },
  { id: "faq", label: "FAQ" },
];

export default function Help() {
  usePageTitle("Help & Documentation");

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
          <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-emerald-600" />
            <span className="font-bold text-emerald-700 dark:text-emerald-400">DonorTrack</span>
            <span className="text-gray-400 dark:text-gray-500">/</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">Documentation</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8 flex gap-8">
        {/* Sidebar Nav */}
        <aside className="hidden lg:block w-48 flex-shrink-0">
          <div className="sticky top-20">
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">Contents</span>
            </div>
            <nav className="space-y-1">
              {navSections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className="block w-full text-left text-sm text-gray-600 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 py-1 transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </nav>
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">Still need help?</p>
              <Link to="/contact" className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                Contact support →
              </Link>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Help & Documentation</h1>
            <p className="text-gray-600 dark:text-gray-400">Everything you need to get the most out of DonorTrack.</p>
          </div>

          {/* Getting Started */}
          <div id="getting-started" className="scroll-mt-20">
            <SectionBlock icon={BookOpen} title="Getting Started">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Setting up your account</h3>
                <Step number={1} title="Create your account" description="Register with your email and organization name. You'll get a 14-day free trial with full access to all features." />
                <Step number={2} title="Verify your email" description="Click the link in the verification email we send you. This unlocks your dashboard." />
                <Step number={3} title="Fill in your organization profile" description="Go to Settings → Organization Profile and add your address, EIN, and logo. This information appears on tax letters." />
                <Step number={4} title="Add your first donors" description="Go to Donors → Add Donor, or import a CSV file if you have an existing list." />
                <Step number={5} title="Record donations" description="Go to Donations → Add Donation and select a donor, amount, date, and fund." />
              </div>
            </SectionBlock>
          </div>

          {/* Donors */}
          <div id="donors" className="scroll-mt-20">
            <SectionBlock icon={Users} title="Donors">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Donor types</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">DonorTrack supports four donor types: <strong>Individual</strong>, <strong>Family</strong>, <strong>Business</strong>, and <strong>Foundation</strong>. The type affects how the name appears on tax letters.</p>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Tags</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Use tags to group donors however makes sense for your organization — e.g. "Board Member", "Major Donor", "Volunteer". You can filter the donor list by tag to quickly find a group.</p>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Donor detail page</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Click any donor to view their full profile, complete donation history, total giving, and any tax letters that have been generated for them.</p>
              </div>
            </SectionBlock>
          </div>

          {/* Donations */}
          <div id="donations" className="scroll-mt-20">
            <SectionBlock icon={DollarSign} title="Donations">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Recording a donation</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">When adding a donation you can record: donor, amount, date, payment method (cash, check, card, ACH, online, in-kind), check number, fund, campaign, and notes.</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">The <strong>Fund</strong> field categorizes where the money is going (e.g. General, Building, Missions). You can manage your funds in Settings.</p>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Batch entry mode</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Turn on <strong>Batch Entry</strong> in the add donation form to quickly enter multiple donations in a row. After saving, the modal stays open and clears only the amount and check number — keeping the donor, fund, and date the same for faster data entry.</p>
              </div>
            </SectionBlock>
          </div>

          {/* Tax Letters */}
          <div id="tax-letters" className="scroll-mt-20">
            <SectionBlock icon={FileText} title="Tax Letters">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">What is a tax letter?</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">A year-end tax acknowledgment letter (also called a donation receipt) is required by the IRS for any single donation of $250 or more. DonorTrack generates IRS-compliant letters that include your organization's name, EIN, the donor's total giving for the year, and the required "no goods or services" statement.</p>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Generating letters</h3>
                <Step number={1} title="Go to Tax Letters" description='Navigate to Tax Letters in the sidebar and select the tax year.' />
                <Step number={2} title="Generate for a donor" description="Click Generate next to any donor. DonorTrack totals all their donations for that year and creates the letter." />
                <Step number={3} title="Download or send" description="Download as PDF to print and mail, or send directly to the donor's email address if they have one on file." />
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Requirements</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Tax letters require your organization's name and address to be filled in under Settings → Organization Profile. An EIN is recommended but not required to generate a letter.</p>
              </div>
            </SectionBlock>
          </div>

          {/* Reports */}
          <div id="reports" className="scroll-mt-20">
            <SectionBlock icon={BarChart3} title="Reports">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Summary Report</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total donations, donor count, average gift, and a chart of giving over time for your selected date range.</p>
                  </div>
                  <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Fund Breakdown</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">See how donations are distributed across your funds as a bar chart and percentage breakdown.</p>
                  </div>
                  <div className="border-t border-gray-100 dark:border-gray-700 pt-3">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Top Donors</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Ranked list of your highest-giving donors for the selected period, with total amounts and gift counts.</p>
                  </div>
                </div>
              </div>
            </SectionBlock>
          </div>

          {/* CSV */}
          <div id="csv" className="scroll-mt-20">
            <SectionBlock icon={Download} title="CSV Import & Export">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Importing donors</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Go to Donors → Import CSV. Your file must include these columns:</p>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-xs font-mono text-gray-700 dark:text-gray-300">
                  firstName, lastName, email, phone, addressLine1, addressLine2, city, state, zip, donorType, tags, notes
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2"><strong>tags</strong> should be semicolon-separated (e.g. <code>Board Member;Major Donor</code>). <strong>donorType</strong> must be one of: Individual, Family, Business, Foundation.</p>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Importing donations</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Go to Donations → Import CSV. Required columns:</p>
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 text-xs font-mono text-gray-700 dark:text-gray-300">
                  donorFirstName, donorLastName, donorEmail, amount, donationDate, paymentMethod, checkNumber, fund, campaign, notes
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2"><strong>donorEmail</strong> must match an existing donor in your account. <strong>donationDate</strong> format: YYYY-MM-DD. <strong>amount</strong> as a number (e.g. 100.00).</p>
              </div>
            </SectionBlock>
          </div>

          {/* Billing */}
          <div id="billing" className="scroll-mt-20">
            <SectionBlock icon={CreditCard} title="Billing & Plans">
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Free trial</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Every new account gets a 14-day free trial with full access to all features including tax letter generation. No credit card required to start. A countdown timer in the sidebar shows how much trial time remains.</p>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 mb-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Plans</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-700">
                    <span className="font-medium text-gray-900 dark:text-white">Starter</span>
                    <span className="text-gray-600 dark:text-gray-400">Donors, donations, basic reports</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-100 dark:border-gray-700">
                    <span className="font-medium text-gray-900 dark:text-white">Growth</span>
                    <span className="text-gray-600 dark:text-gray-400">Everything + tax letter generation</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="font-medium text-gray-900 dark:text-white">Plus</span>
                    <span className="text-gray-600 dark:text-gray-400">Everything + priority support</span>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Cancellation</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">You can cancel your subscription at any time from Settings → Subscription. Your access continues until the end of your current billing period. Your data is preserved and you can resubscribe at any time.</p>
              </div>
            </SectionBlock>
          </div>

          {/* FAQ */}
          <div id="faq" className="scroll-mt-20">
            <SectionBlock icon={HelpCircle} title="Frequently Asked Questions">
              <Accordion items={[
                {
                  q: "Can I import my existing donor list?",
                  a: "Yes. Go to Donors → Import CSV. Your CSV needs firstName, lastName, and email columns at minimum. Download the export from any existing spreadsheet or database, reformat the column headers to match, and import."
                },
                {
                  q: "Are the tax letters IRS-compliant?",
                  a: "Yes. DonorTrack generates letters that include your organization's name and address, the donor's name, total contributions for the year, and the required IRS statement: 'No goods or services were provided in exchange for this contribution.' Make sure your organization profile is complete in Settings for the letter to be fully accurate."
                },
                {
                  q: "What happens to my data if I cancel?",
                  a: "Your data is preserved when you cancel. If you resubscribe, everything will be exactly as you left it. You can also export all your donors and donations as CSV files before canceling."
                },
                {
                  q: "Can multiple people use the same account?",
                  a: "Currently DonorTrack supports one login per organization. Multi-user support with role-based access is planned for a future release."
                },
                {
                  q: "Can I send tax letters to donors who don't have an email?",
                  a: "Yes. Download the letter as a PDF and print and mail it. An email address on file is only required if you want to send the letter via email directly from DonorTrack."
                },
                {
                  q: "What payment methods can I record?",
                  a: "You can record donations made by cash, check, credit/debit card, ACH/bank transfer, online, or in-kind. This is for your records only — DonorTrack does not process payments."
                },
                {
                  q: "Can I use DonorTrack to collect online donations?",
                  a: "DonorTrack is a donor management and record-keeping tool, not a payment processor. It doesn't have a donation widget or payment collection feature. You'd collect payments through a separate tool (like Stripe, PayPal, or your church management software) and then record those donations in DonorTrack."
                },
                {
                  q: "Is my data secure?",
                  a: "Yes. All data is stored in an encrypted PostgreSQL database, all traffic is encrypted via HTTPS, and passwords are hashed with bcrypt. We never store payment card data — billing is handled entirely by Stripe."
                },
              ]} />
            </SectionBlock>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-8 text-center">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Didn't find what you were looking for?</p>
            <Link to="/contact" className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
              Contact Support
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
