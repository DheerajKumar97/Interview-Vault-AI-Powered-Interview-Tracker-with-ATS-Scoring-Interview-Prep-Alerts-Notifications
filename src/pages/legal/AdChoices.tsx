import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AdChoices = () => {
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
            Ad Choices
          </h1>
          <p className="text-gray-500 text-sm mb-8">
            Last Updated: November 25, 2025
          </p>

          <div className="text-gray-600 space-y-6">
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                About Advertising on Interview Vault
              </h2>
              <p>
                Interview Vault may display advertisements to support our free and
                premium services. We are committed to showing you relevant and
                non-intrusive ads while respecting your privacy preferences. This page
                explains your advertising choices and how you can control the ads you see.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Types of Advertisements
              </h2>
              <ul className="space-y-3 ml-2">
                <li>
                  <strong>Contextual Ads:</strong> Ads based on the content you are
                  viewing on Interview Vault, such as job search or interview
                  preparation resources.
                </li>
                <li>
                  <strong>Personalized Ads:</strong> Ads tailored to your interests
                  based on your activity on our platform and partner websites (if you
                  have not opted out).
                </li>
                <li>
                  <strong>Sponsored Content:</strong> Partnered content from career
                  development companies and job search services relevant to job
                  seekers.
                </li>
                <li>
                  <strong>Remarketing Ads:</strong> Ads from companies whose products
                  or services you have previously viewed or interacted with.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                How We Use Your Information for Advertising
              </h2>
              <p>
                We use the following information to serve relevant advertisements:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Your job title and career interests</li>
                <li>Your industry and experience level</li>
                <li>Your browsing behavior on Interview Vault</li>
                <li>Analytics data from our advertising partners</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Your Advertising Choices
              </h2>
              <p className="mb-3">You have several options to control the ads you see:</p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                1. Personalized Advertising Preferences
              </h3>
              <p>
                You can manage your personalized advertising preferences by logging into
                your Interview Vault account and navigating to Settings &gt; Privacy &gt;
                Ad Preferences. You can opt out of personalized ads while still seeing
                contextual ads based on the content you are viewing.
              </p>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                2. Browser-Level Ad Blocking
              </h3>
              <p>
                You can use browser extensions and built-in privacy features to block
                ads:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
                <li>Enable your browser's native ad-blocking features</li>
                <li>Install third-party ad-blocking browser extensions</li>
                <li>Enable "Do Not Track" signals in your browser</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                3. Third-Party Advertising Controls
              </h3>
              <p>
                You can manage personalized ads from third-party advertisers through
                industry opt-out mechanisms:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
                <li>
                  <strong>Digital Advertising Alliance (DAA):</strong> Visit
                  www.aboutads.info to opt out of interest-based advertising
                </li>
                <li>
                  <strong>Network Advertising Initiative (NAI):</strong> Visit
                  www.networkadvertising.org for opt-out options
                </li>
                <li>
                  <strong>Google Ad Preferences:</strong> Manage your ad preferences
                  at myaccount.google.com/ads
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Premium Membership - Ad-Free Experience
              </h2>
              <p>
                Interview Vault Premium members can enjoy a completely ad-free
                experience along with additional features and benefits. Visit our
                Pricing page to learn more about premium membership options.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Remarketing and Retargeting
              </h2>
              <p>
                We use remarketing technology to show you ads based on your previous
                interactions with Interview Vault. If you do not want to see remarketing
                ads, you can:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Opt out of remarketing through Google Ads Settings</li>
                <li>Adjust your Interview Vault account privacy settings</li>
                <li>Clear your browser cookies and browsing history</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Transparency and Accountability
              </h2>
              <p>
                Interview Vault is committed to transparency in advertising practices.
                All ads are clearly labeled as advertisements, and we maintain
                partnerships only with reputable advertisers who adhere to industry
                standards and ethical guidelines.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Contact Us
              </h2>
              <p>
                If you have questions about our advertising practices or would like to
                submit a complaint, please contact us at:
              </p>
              <p className="mt-3 text-gray-700">
                <strong>Email:</strong> interviewvault.2026@gmail.com<br />
                <strong>Hours:</strong> Monday-Friday, 9:00 AM - 5:00 PM EST
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdChoices;
