import { useEffect } from "react";

const AboutUs = () => {
  useEffect(() => {
    // Redirect to external URL
    window.location.href = "https://dheerajkumar-k.netlify.app/";
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-lg text-muted-foreground">Redirecting to About Us...</p>
    </div>
  );
};

export default AboutUs;
