import { Link } from "react-router-dom";
import { usePageTitle } from "../hooks/usePageTitle";
import { useDarkMode } from "../hooks/useDarkMode";
import {
  Heart,
  Users,
  DollarSign,
  FileText,
  BarChart3,
  Mail,
  Download,
  Shield,
  Zap,
  CheckCircle,
  ArrowRight,
  Moon,
  Sun,
} from "lucide-react";

const features = [
  {
    icon: Users,
    title: "Donor Management",
    description: "Track donor information, contact details, and complete giving history in one place.",
  },
  {
    icon: DollarSign,
    title: "Donation Tracking",
    description: "Record and categorize donations with flexible filtering by fund, campaign, and date.",
  },
  {
    icon: FileText,
    title: "IRS-Compliant Tax Letters",
    description: "Generate official year-end tax receipts with one click. Send via email or download as PDF.",
  },
  {
    icon: BarChart3,
    title: "Insightful Reports",
    description: "View summary reports, fund breakdowns, and top donor lists to understand your giving.",
  },
  {
    icon: Mail,
    title: "Email Integration",
    description: "Send tax letters and receipts directly to donors via email with professional formatting.",
  },
  {
    icon: Download,
    title: "Data Export",
    description: "Export your data to CSV and PDF formats for backup, analysis, or board presentations.",
  },
];

const benefits = [
  "Simple and intuitive interface",
  "No complicated setup or training needed",
  "Secure cloud-based storage",
  "Access from anywhere, any device",
  "IRS Publication 1771 compliant",
  "Batch operations save time",
];

const howItWorks = [
  {
    step: "1",
    title: "Create Your Account",
    description: "Sign up in seconds with your organization name and email.",
  },
  {
    step: "2",
    title: "Add Your Donors",
    description: "Import from CSV or add donors one by one with all their details.",
  },
  {
    step: "3",
    title: "Track Donations",
    description: "Record donations as they come in, organize by funds and campaigns.",
  },
  {
    step: "4",
    title: "Generate Tax Letters",
    description: "At year-end, create IRS-compliant tax letters with one click.",
  },
];

export default function Landing() {
  usePageTitle("");
  const { isDark, toggleDark } = useDarkMode();

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Heart className="w-8 h-8 text-emerald-600" />
              <span className="text-xl font-bold text-gray-900 dark:text-white">DonorTrack</span>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="#features"
                className="hidden md:block text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-sm font-medium"
              >
                Features
              </a>
              <a
                href="#pricing"
                className="hidden md:block text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white text-sm font-medium"
              >
                Pricing
              </a>
              <button
                onClick={toggleDark}
                className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Toggle dark mode"
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              <Link
                to="/login"
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-4 py-2 text-sm font-medium"
              >
                Log In
              </Link>
              <Link
                to="/register"
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-emerald-50 to-white dark:from-gray-800 dark:to-gray-900">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 rounded-full text-sm font-medium mb-8">
            <Zap className="w-4 h-4" />
            Simple donor management for small nonprofits
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Track Donations.
            <br />
            <span className="text-emerald-600">Strengthen Relationships.</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-10 max-w-3xl mx-auto">
            DonorTrack is the easiest way for small nonprofits and churches to manage
            donors, track donations, and generate IRS-compliant tax letters—all in one place.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-emerald-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-emerald-700 transition-colors"
            >
              Start Free Today
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-8 py-4 rounded-lg text-lg font-semibold border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 transition-colors"
            >
              Learn More
            </a>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            No credit card required • Free to start • Cancel anytime
          </p>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Everything You Need
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Built specifically for small nonprofits and churches. Simple, powerful,
              and affordable.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-lg transition-all"
              >
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
                Built for Nonprofits Like Yours
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
                Stop using spreadsheets and outdated software. DonorTrack gives you
                professional donor management without the complexity or high cost.
              </p>
              <div className="space-y-3">
                {benefits.map((benefit) => (
                  <div key={benefit} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-2xl p-8 text-white shadow-2xl">
                <Shield className="w-16 h-16 mb-6" />
                <h3 className="text-2xl font-bold mb-4">
                  Secure & Compliant
                </h3>
                <p className="text-emerald-50 mb-6">
                  Your donor data is protected with bank-level security. All tax
                  letters are IRS Publication 1771 compliant, giving you peace of mind.
                </p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-3xl font-bold">256-bit</div>
                    <div className="text-emerald-100">Encryption</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold">100%</div>
                    <div className="text-emerald-100">IRS Compliant</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400">
              Get started in minutes, not hours
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {howItWorks.map((item, index) => (
              <div key={item.step} className="relative">
                <div className="text-center">
                  <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">{item.description}</p>
                </div>
                {index < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-6 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-emerald-600 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Choose the plan that fits your organization. Start small and upgrade as you grow.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* Starter Plan */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-8 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Starter</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">Perfect for small organizations just getting started</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">$29</span>
                <span className="text-gray-600 dark:text-gray-400">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span>Up to 100 donors</span>
                </li>
                <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span>Unlimited donations</span>
                </li>
                <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span>All reports & exports</span>
                </li>
                <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span>CSV import & batch entry</span>
                </li>
                <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span>Email support</span>
                </li>
              </ul>
              <Link
                to="/upgrade"
                className="block w-full text-center px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Start Free Trial
              </Link>
            </div>

            {/* Growth Plan - Highlighted */}
            <div className="bg-emerald-600 rounded-xl border-2 border-emerald-600 p-8 relative shadow-xl transform md:scale-105">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-amber-400 text-gray-900 px-4 py-1 rounded-full text-sm font-bold">
                Most Popular
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Growth</h3>
              <p className="text-emerald-50 mb-6">For growing organizations with expanding donor bases</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-white">$59</span>
                <span className="text-emerald-100">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-white">
                  <CheckCircle className="w-5 h-5 text-emerald-200 flex-shrink-0" />
                  <span>Up to 500 donors</span>
                </li>
                <li className="flex items-center gap-2 text-white">
                  <CheckCircle className="w-5 h-5 text-emerald-200 flex-shrink-0" />
                  <span>Unlimited donations</span>
                </li>
                <li className="flex items-center gap-2 text-white">
                  <CheckCircle className="w-5 h-5 text-emerald-200 flex-shrink-0" />
                  <span>All reports & exports</span>
                </li>
                <li className="flex items-center gap-2 text-white">
                  <CheckCircle className="w-5 h-5 text-emerald-200 flex-shrink-0" />
                  <span>Tax letter generation</span>
                </li>
                <li className="flex items-center gap-2 text-white">
                  <CheckCircle className="w-5 h-5 text-emerald-200 flex-shrink-0" />
                  <span>Priority email support</span>
                </li>
              </ul>
              <Link
                to="/upgrade"
                className="block w-full text-center px-6 py-3 bg-white text-emerald-600 rounded-lg font-semibold hover:bg-emerald-50 transition-colors"
              >
                Start Free Trial
              </Link>
            </div>

            {/* Plus Plan */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 p-8 hover:border-emerald-500 dark:hover:border-emerald-500 transition-all">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Plus</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">For established organizations with large donor communities</p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">$99</span>
                <span className="text-gray-600 dark:text-gray-400">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span>Unlimited donors</span>
                </li>
                <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span>Unlimited donations</span>
                </li>
                <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span>All reports & exports</span>
                </li>
                <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span>Tax letter generation</span>
                </li>
                <li className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span>Priority support</span>
                </li>
              </ul>
              <Link
                to="/upgrade"
                className="block w-full text-center px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Start Free Trial
              </Link>
            </div>
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-600 dark:text-gray-400 mb-2">
              All plans include a <strong>14-day free trial</strong> • No credit card required
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Cancel anytime • Annual plans save 20%
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-emerald-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Simplify Your Donor Management?
          </h2>
          <p className="text-xl text-emerald-50 mb-8">
            Join organizations already using DonorTrack to strengthen donor
            relationships and save time.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-white text-emerald-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors"
          >
            Get Started Free
            <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="text-sm text-emerald-100 mt-4">
            No credit card required • Set up in minutes
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Heart className="w-6 h-6 text-emerald-500" />
                <span className="text-lg font-bold text-white">DonorTrack</span>
              </div>
              <p className="text-sm">
                Simple donor management for small nonprofits and churches.
              </p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3">Product</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><Link to="/register" className="hover:text-white">Get Started</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3">Support</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="https://github.com/jacobotero/DonorTrack" className="hover:text-white">Documentation</a></li>
                <li><a href="https://github.com/jacobotero/DonorTrack/issues" className="hover:text-white">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-3">Legal</h3>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            <p>&copy; 2026 DonorTrack. Built for nonprofits, by people who care.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
