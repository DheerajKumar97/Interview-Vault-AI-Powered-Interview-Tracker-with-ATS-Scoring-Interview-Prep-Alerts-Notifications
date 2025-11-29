import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DoNotSell = () => {
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
            Do Not Sell or Share My Personal Information
          </h1>
          <p className="text-gray-500 text-sm mb-8">
            Last Updated: November 25, 2025
          </p>

          <div className="text-gray-600 space-y-6">
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Your Privacy Rights
              </h2>
              <p>
                Interview Vault respects your privacy rights. Under applicable laws
                such as the California Consumer Privacy Act (CCPA), Virginia Consumer
                Data Protection Act (VCDPA), and other similar state privacy
                regulations, you have the right to control how your personal
                information is used and shared.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Our Commitment to Not Selling Your Data
              </h2>
              <p>
                Interview Vault is committed to protecting your personal information.
                We do not and will not sell your personal information to third parties
                for monetary consideration. Additionally, we do not share your personal
                information with third parties for purposes of cross-context behavioral
                advertising (as defined by applicable privacy laws).
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                What We Do Not Sell or Share
              </h2>
              <p className="mb-3">We do not sell or share the following categories of your personal information:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Your name, email address, and contact information</li>
                <li>Job application details and interview information</li>
                <li>Account credentials and authentication data</li>
                <li>Interview notes, assessments, and analytics</li>
                <li>Company information and job title details</li>
                <li>Payment information and transaction history</li>
                <li>Location data and device identifiers</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Limited Third-Party Sharing
              </h2>
              <p>
                While we do not sell your data, we may share limited information with
                service providers who assist us in operating our platform, including:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Cloud hosting providers (Supabase)</li>
                <li>Analytics services (Google Analytics)</li>
                <li>Email and notification services</li>
                <li>Payment processing providers</li>
              </ul>
              <p className="mt-3">
                These service providers are contractually obligated to use your
                information only for the purposes we specify and to maintain the
                confidentiality and security of your information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Your Rights as a Consumer
              </h2>
              <p className="mb-3">Depending on your location, you may have the following rights:</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>
                  <strong>Right to Know:</strong> You have the right to request what
                  personal information we collect, use, share, and sell about you.
                </li>
                <li>
                  <strong>Right to Delete:</strong> You have the right to request
                  deletion of your personal information, subject to certain exceptions.
                </li>
                <li>
                  <strong>Right to Correct:</strong> You have the right to request
                  correction of inaccurate personal information.
                </li>
                <li>
                  <strong>Right to Opt-Out:</strong> You have the right to opt out of
                  sales or sharing of your personal information.
                </li>
                <li>
                  <strong>Right to Non-Discrimination:</strong> We will not discriminate
                  against you for exercising your privacy rights.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                How to Submit a Request
              </h2>
              <p>
                To exercise any of your privacy rights, please submit a request to:
              </p>
              <p className="mt-4 text-gray-700">
                <strong>Email:</strong> interviewvault.2026@gmail.com<br />
                <strong>Subject Line:</strong> "Data Request - [Your Request Type]"<br />
                <strong>Response Time:</strong> We will respond within 45 days
              </p>
              <p className="mt-4">
                To verify your identity, we may request additional information such as
                your email address or account ID.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Authorized Agents
              </h2>
              <p>
                You may designate an authorized agent to submit privacy requests on your
                behalf. If an authorized agent submits a request, we will require proof
                of authorization before processing the request.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Contact Us
              </h2>
              <p>
                If you have questions about this policy or your privacy rights, please
                contact us at:
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

export default DoNotSell;
