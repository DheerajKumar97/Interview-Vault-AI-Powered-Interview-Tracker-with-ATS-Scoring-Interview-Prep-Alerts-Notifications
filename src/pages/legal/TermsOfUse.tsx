import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TermsOfUse = () => {
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
            Terms of Use
          </h1>
          <p className="text-gray-500 text-sm mb-8">
            Last Updated: November 25, 2025
          </p>

          <div className="text-gray-600 space-y-6">
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Agreement to Terms
              </h2>
              <p>
                These Terms of Use constitute a legally binding agreement made
                between you and Interview Vault, Inc. ("Company," "we," "us," or
                "our"), concerning your access to and use of the Interview Vault
                website and mobile application (the "Site").
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                User Responsibilities
              </h2>
              <p className="mb-3">By accessing and using Interview Vault, you agree to:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Provide accurate and complete information during registration</li>
                <li>Maintain the confidentiality of your account credentials</li>
                <li>
                  Use the platform solely for lawful purposes and in a way that does
                  not infringe on the rights of others
                </li>
                <li>Not engage in any conduct that restricts or inhibits anyone's use or enjoyment of the Site</li>
                <li>Not harass, abuse, or harm other users of the platform</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Intellectual Property Rights
              </h2>
              <p>
                The Site and its entire contents, features, and functionality
                (including but not limited to all information, software, text,
                displays, images, video, and audio) are owned by Interview Vault,
                its licensors, or other providers of such material and are protected
                by United States and international copyright, trademark, and other
                intellectual property laws.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                User-Generated Content
              </h2>
              <p>
                Any content you create, upload, or share on Interview Vault,
                including job application details, interview notes, and analytics,
                remains your property. However, by posting content on the Site, you
                grant us a worldwide, non-exclusive, royalty-free license to use,
                copy, reproduce, process, adapt, modify, publish, transmit, display,
                and distribute such content for the purpose of providing and
                improving the Site.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Limitation of Liability
              </h2>
              <p>
                To the fullest extent permissible by law, in no event shall
                Interview Vault, its directors, employees, or agents be liable to
                you or any third party for any direct, indirect, consequential,
                exemplary, incidental, special, or punitive damages arising out of
                related to this Site or the use thereof, even if advised of the
                possibility of such damages.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Disclaimer of Warranties
              </h2>
              <p>
                The Site is provided on an "as is" and "as available" basis. Interview
                Vault makes no warranties, expressed or implied, regarding the Site
                and specifically disclaims the warranties of merchantability, fitness
                for a particular purpose, and non-infringement. We do not guarantee
                that the Site will always be available or uninterrupted.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Indemnification
              </h2>
              <p>
                You agree to defend, indemnify, and hold harmless Interview Vault
                and its officers, directors, employees, and agents from and against
                any claims, liabilities, damages, losses, and expenses, including
                attorney fees, arising out of or related to your use of the Site or
                violation of these Terms of Use.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Modifications to Terms
              </h2>
              <p>
                Interview Vault reserves the right to modify or replace these Terms
                at any time. If a revision is material, we will notify you of such
                changes by updating the "Last Updated" date of these Terms. Your
                continued use of the Site following notification of such changes
                constitutes your acceptance of the updated Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Termination
              </h2>
              <p>
                We may terminate or suspend your account and access to the Site
                immediately, without prior notice or liability, for any reason
                whatsoever, including if you breach these Terms of Use.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Contact Us
              </h2>
              <p>
                If you have any questions about these Terms of Use, please contact us at:
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

export default TermsOfUse;
