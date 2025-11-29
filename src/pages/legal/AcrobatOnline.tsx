import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AcrobatOnline = () => {
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
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Acrobat Online
          </h1>

          <div className="text-gray-600 space-y-6">
            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                About Interview Vault - Acrobat Integration
              </h2>
              <p>
                Interview Vault integrates seamlessly with Adobe Acrobat Online
                to enhance your interview preparation and documentation workflows.
                This integration allows you to manage PDF documents, job offers,
                and interview materials directly within the Interview Vault
                platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Key Features
              </h2>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>
                  Attach and store PDF documents related to your job applications
                </li>
                <li>
                  View and annotate job offers and interview schedules in real-time
                </li>
                <li>
                  Organize documents by application for easy reference
                </li>
                <li>
                  Export interview notes and outcomes as PDF documents
                </li>
                <li>
                  Secure cloud storage integration for all your application materials
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                How to Use
              </h2>
              <p>
                To use the Acrobat Online integration with Interview Vault:
              </p>
              <ol className="list-decimal list-inside space-y-2 ml-2 mt-3">
                <li>
                  Connect your Adobe account to Interview Vault through settings
                </li>
                <li>Upload relevant documents to your application profiles</li>
                <li>Access and manage PDFs within the application details page</li>
                <li>Generate interview reports and export as PDF documents</li>
                <li>Share documents securely with team members if needed</li>
              </ol>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                File Size and Format Support
              </h2>
              <p>
                Interview Vault supports PDF documents up to 50MB in size. Supported
                formats include:
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2 mt-2">
                <li>PDF (.pdf)</li>
                <li>Microsoft Office files (.docx, .xlsx, .pptx)</li>
                <li>Text files (.txt, .rtf)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Security and Privacy
              </h2>
              <p>
                All documents uploaded through Interview Vault's Acrobat integration
                are encrypted and stored securely. Your documents are never shared
                with third parties without your explicit consent. For more
                information, please refer to our Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-800 mb-3">
                Support
              </h2>
              <p>
                For technical support related to Acrobat Online integration, please
                contact our support team at <strong>interviewvault.2026@gmail.com</strong>. 
                We're available Monday through Friday, 9:00 AM to 5:00 PM EST.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcrobatOnline;
