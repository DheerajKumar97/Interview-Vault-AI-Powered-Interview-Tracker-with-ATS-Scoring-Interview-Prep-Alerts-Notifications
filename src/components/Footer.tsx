import { Link } from "react-router-dom";
import LanguageSelector from "./LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { t } = useLanguage();

  const footerLinks = [
    { label: "About Us", path: "/About Us" },
    { label: "Ad Choices", path: "/ad-choices" },
    { label: "Do Not Sell", path: "/do-not-sell" },
    { label: "Cookie Preferences", path: "/cookie-preferences" },
    { label: "Terms of Use", path: "/terms" },
    { label: "Privacy", path: "/privacy" },
    { label: "Acrobat Online", path: "/acrobat-online" },
  ];

  return (
    <footer className="w-full bg-blue-600 text-white py-4 shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 flex-wrap">
          {/* Language Selector - Left Aligned */}
          <div className="flex-shrink-0">
            <LanguageSelector />
          </div>

          {/* Right Side Group: Copyright + Links */}
          <div className="flex flex-col lg:flex-row items-center gap-4 lg:gap-8 flex-wrap justify-center md:justify-end">
            {/* Copyright Text */}
            <div className="text-sm md:text-base font-medium text-center lg:text-left">
              <p>
                {t(`Copyright © ${currentYear} Dheeraj Kumar K. All rights reserved.`)}
              </p>
            </div>

            {/* Footer Links */}
            <div className="flex flex-wrap justify-center gap-4 md:gap-6">
              {footerLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className="text-sm md:text-base text-white hover:underline transition-all duration-200 hover:opacity-80 whitespace-nowrap"
                >
                  {t(link.label)}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
