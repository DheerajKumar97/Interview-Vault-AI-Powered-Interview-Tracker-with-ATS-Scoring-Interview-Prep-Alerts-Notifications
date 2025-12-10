import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  TrendingUp,
  Calendar,
  Target,
  BarChart3,
  ArrowRight,
  Briefcase,
  CheckCircle2,
  Lightbulb,
  FileSearch,
  MessageSquare
} from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

import Header from "@/components/Header";

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  const features = [
    {
      icon: Target,
      title: t("Track Applications"),
      description: t("Monitor all your job applications in one centralized dashboard")
    },
    {
      icon: Calendar,
      title: t("Interview Timeline"),
      description: t("Keep track of interview dates and follow-up schedules")
    },
    {
      icon: TrendingUp,
      title: t("Progress Analytics"),
      description: t("Visualize your job search progress with detailed analytics")
    },
    {
      icon: BarChart3,
      title: t("Smart Insights"),
      description: t("Get insights on your application success rates and trends")
    }
  ];

  const stats = [
    { value: "7", label: t("Stages Tracked") },
    { value: "600+", label: t("Top Companies") },
    { value: "24/7", label: t("Always Available") }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="absolute top-0 left-0 right-0 z-10 p-4">
        <Header />
      </div>
      {/* Hero Section */}
      <div
        className="relative overflow-hidden"
        style={{
          backgroundImage: `url(${heroBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/90 via-purple-600/80 to-blue-800/90"></div>

        <div className="relative container mx-auto px-4 pt-40 pb-24 lg:pt-56 lg:pb-32">
          <div className="max-w-4xl mx-auto text-center text-white space-y-8">

            {!user && (
              <div className="inline-flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1 sm:py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/20 mb-4 sm:mb-6">
                <CheckCircle2 className="h-3 w-3 sm:h-4 md:h-5 sm:w-4 md:w-5 text-green-300" />
                <span className="text-xs sm:text-sm font-medium">{t("Start tracking your interviews")}</span>
              </div>
            )}

            <h1 className="text-3xl sm:text-4xl lg:text-7xl font-bold leading-tight">
              {t("Your Interview Journey,")}
              <span className="block bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">
                {t("Simplified & Tracked")}
              </span>
            </h1>

            <p className="text-base sm:text-lg lg:text-2xl text-blue-100 max-w-2xl mx-auto">
              {t("Track, manage, and visualize your entire interview journey across top companies with smart analytics, automated email alerts, and notifications.")}
            </p>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center items-center pt-4">
              {user ? (
                <>
                  <Button
                    size="lg"
                    onClick={() => navigate("/applications")}
                    className="bg-white text-blue-600 hover:bg-blue-50 shadow-xl hover:shadow-2xl transition-all duration-300 text-sm sm:text-base lg:text-lg px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-6 group"
                  >
                    {t("View Applications")}
                    <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate("/dashboard")}
                    className="bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white/20 text-sm sm:text-base lg:text-lg px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-6"
                  >
                    <BarChart3 className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    {t("View Dashboard")}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate("/skill-analysis?tab=skills")}
                    className="bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white/20 text-sm sm:text-base lg:text-lg px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-6"
                  >
                    <FileSearch className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    {t("Match Your Skills")}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate("/skill-analysis?tab=projects")}
                    className="bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white/20 text-sm sm:text-base lg:text-lg px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-6"
                  >
                    <Lightbulb className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    {t("Generate Project Ideas")}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate("/interview-preparation")}
                    className="bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white/20 text-sm sm:text-base lg:text-lg px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-6"
                  >
                    <MessageSquare className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    {t("Prepare for Interview")}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="lg"
                    onClick={() => navigate("/auth/signup")}
                    className="bg-white text-blue-600 hover:bg-blue-50 shadow-xl hover:shadow-2xl transition-all duration-300 text-sm sm:text-base lg:text-lg px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-6 group"
                  >
                    {t("Get Started")}
                    <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => navigate("/auth/login")}
                    className="bg-white/10 backdrop-blur-md border-white/30 text-white hover:bg-white/20 text-sm sm:text-base lg:text-lg px-4 sm:px-6 lg:px-8 py-3 sm:py-4 lg:py-6"
                  >
                    {t("Sign In")}
                  </Button>
                </>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto pt-12">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-2xl sm:text-3xl lg:text-5xl font-bold mb-2">{stat.value}</div>
                  <div className="text-blue-200 text-xs sm:text-sm lg:text-base">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Wave Divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 0L60 10C120 20 240 40 360 46.7C480 53 600 47 720 43.3C840 40 960 40 1080 46.7C1200 53 1320 67 1380 73.3L1440 80V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V0Z" fill="white" />
          </svg>
        </div>
      </div>

      {/* Features Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-gray-900 mb-4">
            {t("Everything You Need to Track Interviews")}
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600 max-w-2xl mx-auto">
            {t("Powerful features designed to help you stay organized and land your dream job")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-2 border-0 shadow-card bg-white/80 backdrop-blur-sm"
            >
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg">
                <feature.icon className="h-7 w-7 text-white" />
              </div>
              <h3 className="text-base sm:text-lg lg:text-xl font-semibold mb-2 text-gray-900">{feature.title}</h3>
              <p className="text-sm sm:text-base text-gray-600">{feature.description}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="container mx-auto px-4 pb-20">
        <Card className="p-6 md:p-12 text-center bg-gradient-to-br from-blue-600 to-purple-700 border-0 shadow-2xl">
          <Briefcase className="h-12 w-12 sm:h-16 sm:w-16 text-white mx-auto mb-4 sm:mb-6" />
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4">
            {t("Ready to Organize Your Job Search?")}
          </h2>
          <p className="text-sm sm:text-lg lg:text-xl text-blue-100 mb-6 sm:mb-8 max-w-2xl mx-auto">
            {t("Start tracking your applications and interviews today. No credit card required.")}
          </p>
          <Button
            size="lg"
            onClick={() => navigate("/applications")}
            className="bg-white text-blue-600 hover:bg-blue-50 shadow-xl hover:shadow-2xl transition-all duration-300 text-xs sm:text-lg px-4 sm:px-8 py-3 sm:py-6 h-auto whitespace-normal"
          >
            <span className="line-clamp-1">{t("Start Tracking Now")}</span>
            <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
          </Button>
        </Card>
      </div>
    </div>
  );
};

export default Home;