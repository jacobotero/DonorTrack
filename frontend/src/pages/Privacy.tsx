import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart } from "lucide-react";
import { usePageTitle } from "../hooks/usePageTitle";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{title}</h2>
      <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2 leading-relaxed">
        {children}
      </div>
    </div>
  );
}

export default function Privacy() {
  usePageTitle("Privacy Policy");
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-4 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <button
            onClick={() => window.history.length > 1 ? navigate(-1) : navigate("/")}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="h-4 w-px bg-gray-300 dark:bg-gray-600" />
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-emerald-600" />
            <span className="font-bold text-emerald-700 dark:text-emerald-400">DonorTrack</span>
            <span className="text-gray-400 dark:text-gray-500">/</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">Privacy Policy</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Privacy Policy</h1>
          <p className="text-sm text-gray-500 dark:text-gray-500">Last updated: February 19, 2026</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 md:p-8">
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
            DonorTrack ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard information when you use our donor management software at donortrackapp.com (the "Service"). By using the Service, you agree to the practices described in this policy.
          </p>

          <Section title="1. Information We Collect">
            <p><strong className="text-gray-800 dark:text-gray-200">Account information:</strong> When you register, we collect your email address, password (stored as a secure hash), and your organization's name.</p>
            <p><strong className="text-gray-800 dark:text-gray-200">Organization profile:</strong> Information you optionally provide such as your organization's address, phone number, EIN, tax-exempt status, and logo.</p>
            <p><strong className="text-gray-800 dark:text-gray-200">Donor and donation data:</strong> Names, contact information, addresses, giving history, and any other information you enter about your donors. This data belongs to you.</p>
            <p><strong className="text-gray-800 dark:text-gray-200">Usage data:</strong> Basic server logs including IP addresses and request timestamps for security and debugging purposes.</p>
          </Section>

          <Section title="2. How We Use Your Information">
            <p>We use the information we collect to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Provide, operate, and maintain the Service</li>
              <li>Authenticate your account</li>
              <li>Send transactional emails such as email verification and password reset</li>
              <li>Respond to support requests you submit</li>
              <li>Generate tax letters and reports on your behalf</li>
              <li>Detect and prevent fraud, abuse, or security incidents</li>
            </ul>
            <p>We do not sell, rent, or share your personal information or your donors' data with third parties for marketing purposes.</p>
          </Section>

          <Section title="3. Data Storage and Security">
            <p>Your data is stored in a PostgreSQL database hosted by Neon, with the application itself running on Amazon Web Services (AWS). All data is transmitted over HTTPS/TLS encryption. Passwords are hashed using bcrypt and are never stored in plain text.</p>
            <p>We implement reasonable technical and organizational measures to protect your information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.</p>
          </Section>

          <Section title="4. Third-Party Services">
            <p>We use the following third-party services to operate DonorTrack:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li><strong className="text-gray-800 dark:text-gray-200">Resend</strong> — transactional email delivery. Subject to <a href="https://resend.com/legal/privacy-policy" className="text-emerald-600 hover:underline" target="_blank" rel="noopener noreferrer">Resend's Privacy Policy</a>.</li>
              <li><strong className="text-gray-800 dark:text-gray-200">Amazon Web Services (AWS)</strong> — application hosting and infrastructure. Subject to <a href="https://aws.amazon.com/privacy/" className="text-emerald-600 hover:underline" target="_blank" rel="noopener noreferrer">AWS's Privacy Notice</a>.</li>
              <li><strong className="text-gray-800 dark:text-gray-200">Neon</strong> — database hosting. Subject to <a href="https://neon.tech/privacy-policy" className="text-emerald-600 hover:underline" target="_blank" rel="noopener noreferrer">Neon's Privacy Policy</a>.</li>
            </ul>
          </Section>

          <Section title="5. Your Data Rights">
            <p>You retain full ownership of the data you enter into DonorTrack, including all donor and donation records. You may:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Export all your data at any time via CSV export</li>
              <li>Request deletion of your account and all associated data by contacting us</li>
              <li>Update or correct your account information at any time in Settings</li>
            </ul>
            <p>If you are located in the European Economic Area (EEA) or California, you may have additional rights under GDPR or CCPA. Please contact us to exercise these rights.</p>
          </Section>

          <Section title="6. Data Retention">
            <p>We retain your account and organizational data for as long as your account is active. If you request account deletion, we will permanently delete your data within 30 days, except where we are required to retain certain information for legal compliance purposes.</p>
          </Section>

          <Section title="7. Cookies">
            <p>DonorTrack uses a single authentication token stored in your browser's local storage to keep you signed in. We do not use tracking cookies or third-party advertising cookies.</p>
          </Section>

          <Section title="8. Children's Privacy">
            <p>The Service is not directed at children under 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us so we can delete it.</p>
          </Section>

          <Section title="9. Changes to This Policy">
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by email or by displaying a notice in the Service. Your continued use of the Service after changes take effect constitutes acceptance of the updated policy.</p>
          </Section>

          <Section title="10. Contact Us">
            <p>If you have questions about this Privacy Policy or want to exercise your data rights, please contact us at:</p>
            <p>
              <a href="mailto:donortrackapp@gmail.com" className="text-emerald-600 hover:underline">donortrackapp@gmail.com</a>
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
