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

export default function Terms() {
  usePageTitle("Terms of Service");
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
            <span className="text-sm text-gray-600 dark:text-gray-400">Terms of Service</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-500 dark:text-gray-500">Last updated: February 19, 2026</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 md:p-8">
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-8">
            These Terms of Service ("Terms") govern your access to and use of DonorTrack ("Service"), operated by DonorTrack ("we," "our," or "us"). By creating an account or using the Service, you agree to be bound by these Terms. If you do not agree, do not use the Service.
          </p>

          <Section title="1. The Service">
            <p>DonorTrack is a cloud-based donor management platform designed to help small nonprofits and churches track donors, record donations, generate tax acknowledgment letters, and view giving reports.</p>
            <p>We reserve the right to modify, suspend, or discontinue any part of the Service at any time. We will provide reasonable notice of significant changes where possible.</p>
          </Section>

          <Section title="2. Account Registration">
            <p>To use the Service, you must create an account with a valid email address and provide accurate information about your organization. You are responsible for:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Maintaining the confidentiality of your login credentials</li>
              <li>All activity that occurs under your account</li>
              <li>Notifying us immediately of any unauthorized use of your account</li>
            </ul>
            <p>You must be at least 18 years old and have the authority to bind your organization to these Terms.</p>
          </Section>

          <Section title="3. Free to Use">
            <p>DonorTrack is free to use. There are no paid plans, no subscriptions, and no payment information is ever collected.</p>
          </Section>

          <Section title="4. Your Data">
            <p>You retain full ownership of all donor records, donation data, and other content you enter into the Service. We do not claim any ownership rights over your data.</p>
            <p>You grant us a limited license to store, process, and display your data solely for the purpose of providing the Service to you.</p>
            <p>You are responsible for ensuring that your use of donor data complies with all applicable privacy laws and that you have obtained any necessary consent from your donors.</p>
          </Section>

          <Section title="5. Acceptable Use">
            <p>You agree not to use the Service to:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Violate any applicable law or regulation</li>
              <li>Store data related to illegal activities</li>
              <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
              <li>Transmit viruses, malware, or other malicious code</li>
              <li>Scrape, crawl, or otherwise extract data from the Service in an automated manner</li>
              <li>Resell or sublicense access to the Service without our written consent</li>
            </ul>
          </Section>

          <Section title="6. Tax Letter Disclaimer">
            <p>DonorTrack generates tax acknowledgment letters based on the donation data you enter. We are not tax or legal professionals. The letters are provided as a convenience tool and should be reviewed for accuracy before distribution.</p>
            <p>You are responsible for ensuring that your tax letters comply with IRS requirements and any other applicable regulations. We recommend consulting a tax professional for guidance specific to your organization.</p>
          </Section>

          <Section title="7. Intellectual Property">
            <p>The Service, including its design, code, and content (excluding your data), is owned by DonorTrack and protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works based on the Service without our written permission.</p>
          </Section>

          <Section title="8. Termination">
            <p>We may suspend or terminate your account at any time for violation of these Terms or other conduct we determine to be harmful to the Service or other users.</p>
            <p>Upon termination, you may request an export of your data within 30 days. After that period, we may permanently delete your data.</p>
            <p>You may delete your account at any time from the Settings page. Deletion is permanent and irreversible.</p>
          </Section>

          <Section title="9. Disclaimer of Warranties">
            <p>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.</p>
            <p>We do not warrant that the Service will be uninterrupted, error-free, or completely secure. We are not responsible for any loss of data due to outages or technical failures, though we make reasonable efforts to prevent such events.</p>
          </Section>

          <Section title="10. Limitation of Liability">
            <p>TO THE FULLEST EXTENT PERMITTED BY LAW, DONORTRACK SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF DATA, LOSS OF REVENUE, OR LOSS OF GOODWILL, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE.</p>
            <p>BECAUSE THE SERVICE IS PROVIDED FREE OF CHARGE, OUR TOTAL LIABILITY TO YOU FOR ANY CLAIMS ARISING FROM THESE TERMS OR YOUR USE OF THE SERVICE SHALL NOT EXCEED $100.</p>
          </Section>

          <Section title="11. Governing Law">
            <p>These Terms are governed by and construed in accordance with the laws of the United States, without regard to conflict of law principles. Any disputes arising from these Terms shall be resolved through binding arbitration, except that either party may seek injunctive relief in a court of competent jurisdiction.</p>
          </Section>

          <Section title="12. Changes to These Terms">
            <p>We may update these Terms from time to time. We will notify you of material changes by email or through the Service at least 14 days before they take effect. Your continued use of the Service after changes take effect constitutes your acceptance of the updated Terms.</p>
          </Section>

          <Section title="13. Contact Us">
            <p>If you have questions about these Terms, please contact us at:</p>
            <p>
              <a href="mailto:donortrackapp@gmail.com" className="text-emerald-600 hover:underline">donortrackapp@gmail.com</a>
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
