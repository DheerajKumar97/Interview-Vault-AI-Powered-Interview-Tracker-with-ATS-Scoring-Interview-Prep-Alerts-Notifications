import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CookiePreferences = () => {
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
            Cookie Preferences
          </h1>
          <p className="text-gray-500 text-sm mb-8">
            Last Updated: November 25, 2025
          </p>

          <div className="text-gray-600 space-y-6">
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                About Cookies
              </h2>
              <p>
                Interview Vault uses cookies and similar tracking technologies to
                enhance your experience on our platform. A cookie is a small text
                file that is stored on your device when you visit our Site. Cookies
                help us remember information about your visit, including your
                preferences and login status.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Types of Cookies We Use
              </h2>
              <ul className="space-y-3 ml-2">
                <li>
                  <strong>Essential Cookies:</strong> These cookies are necessary for
                  the Site to function properly. They enable you to log in, maintain
                  your session, and perform critical functions like security and
                  compliance.
                </li>
                <li>
                  <strong>Performance Cookies:</strong> These cookies collect
                  information about how you use the Site, such as which pages you visit
                  and how long you stay on each page. This helps us optimize the
                  platform.
                </li>
                <li>
                  <strong>Functionality Cookies:</strong> These cookies remember your
                  preferences and choices to provide a more personalized experience,
                  such as your language preferences and dashboard settings.
                </li>
                <li>
                  <strong>Analytics Cookies:</strong> These cookies help us understand
                  user behavior and measure the effectiveness of our marketing efforts
                  through anonymized analytics.
                </li>
                <li>
                  <strong>Marketing Cookies:</strong> These cookies are used by third
                  parties to track your activity and display personalized advertisements
                  based on your interests.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Managing Your Cookie Preferences
              </h2>
              <p className="mb-3">
                You have control over the cookies we use. You can manage your cookie
                preferences through:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>
                  <strong>Browser Settings:</strong> Most browsers allow you to refuse
                  cookies or alert you when cookies are being sent. Refer to your
                  browser's help pages for more information.
                </li>
                <li>
                  <strong>Opt-Out Tools:</strong> You can opt out of targeted
                  advertising through industry opt-out platforms.
                </li>
                <li>
                  <strong>Interview Vault Settings:</strong> Access your account
                  preferences to customize which non-essential cookies you allow.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Third-Party Cookies
              </h2>
              <p>
                We use third-party services such as Google Analytics, Supabase, and
                other analytics providers. These services may set their own cookies to
                track your behavior. We do not control these third-party cookies. For
                more information about their practices, please review their privacy
                policies.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Do Not Track
              </h2>
              <p>
                Some browsers include a "Do Not Track" feature. Currently, there is no
                industry standard for recognizing Do Not Track signals. Interview
                Vault does not respond to Do Not Track browser signals, but you can
                disable cookies through your browser settings as described above.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Cookie Duration
              </h2>
              <p>
                Essential cookies typically expire when you close your browser, while
                other cookies may remain on your device for extended periods (up to 2
                years) unless you manually delete them.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Changes to Cookie Usage
              </h2>
              <p>
                Interview Vault may update this Cookie Preferences page to reflect
                changes in our cookie practices. We recommend reviewing this page
                periodically for updates.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Questions?
              </h2>
              <p>
                If you have questions about our use of cookies, please contact us at:
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

export default CookiePreferences;
