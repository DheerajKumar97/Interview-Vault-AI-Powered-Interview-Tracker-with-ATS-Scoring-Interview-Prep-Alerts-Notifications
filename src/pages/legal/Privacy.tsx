import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="absolute inset-0 bg-white/60 backdrop-blur-2xl"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.08),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(168,85,247,0.08),transparent_50%)]"></div>

      <div className="relative container mx-auto px-4 py-8">
        <div className="mb-6">
          <Header />
        </div>

        <Button
          variant="outline"
          onClick={() => navigate("/")}
          className="mb-6 glass-card border-gray-200 bg-white/80"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        <div className="glass-card border-gray-200 bg-white/90 shadow-lg p-8 md:p-12 rounded-lg max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
            Privacy Policy
          </h1>
          <p className="text-gray-500 text-sm mb-8">
            Last Updated: November 25, 2025
          </p>

          <div className="text-gray-600 space-y-6">
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Introduction
              </h2>
              <p>
                Interview Vault ("we," "us," "our," or "Company") is committed to
                protecting your privacy. This Privacy Policy explains how we collect,
                use, disclose, and safeguard your information when you visit our
                website and use our job interview tracking and analytics platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Information We Collect
              </h2>
              <p className="mb-3">We may collect information about you in a variety of ways. The information we may collect on the Site includes:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>
                  <strong>Personal Data:</strong> Name, email address, phone number, job preferences
                </li>
                <li>
                  <strong>Application Data:</strong> Job titles, company names, application dates, interview status
                </li>
                <li>
                  <strong>Interview Data:</strong> Interview dates, event types, outcomes, notes
                </li>
                <li>
                  <strong>Usage Data:</strong> IP address, browser type, pages visited, time spent on site
                </li>
                <li>
                  <strong>Account Data:</strong> Username, password (encrypted), account preferences
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Use of Your Information
              </h2>
              <p className="mb-3">Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Site to:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Create and manage your user account</li>
                <li>Process transactions and send related information</li>
                <li>Generate interview tracking analytics and insights</li>
                <li>Send email alerts and notifications about job opportunities</li>
                <li>Respond to your inquiries and fulfill your requests</li>
                <li>Monitor and analyze usage patterns to improve our services</li>
                <li>Personalize your experience on the platform</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Disclosure of Your Information
              </h2>
              <p>
                We do not sell, trade, or rent your personal information to third
                parties. We may share aggregated, non-identifying information with
                third parties for research, marketing, analytics, and other
                purposes without your consent. However, we may disclose your
                information when required by law or in good faith to protect the
                rights, property, or safety of Interview Vault.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Security of Your Information
              </h2>
              <p>
                We use administrative, technical, and physical security measures to
                protect your personal information. However, no transmission over the
                Internet is 100% secure. While we strive to protect your personal
                information, we cannot guarantee its absolute security. Any
                transmission of personal data is at your own risk.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Contact Us
              </h2>
              <p>
                If you have questions or comments about this Privacy Policy, please
                contact us at:
              </p>
              <p className="mt-3 text-gray-700">
                <strong>Email:</strong> interviewvault.2026@gmail.com<br />
                <strong>Mail:</strong> Interview Vault Privacy Team<br />
                <strong>Hours:</strong> Monday-Friday, 9:00 AM - 5:00 PM EST
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
