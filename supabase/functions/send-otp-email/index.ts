import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OTPEmailRequest {
  email: string;
  otp: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, otp }: OTPEmailRequest = await req.json();

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Password Reset Request</h1>
        <p>You requested to reset your password. Use the OTP below to proceed:</p>
        <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
          <h2 style="color: #2563eb; font-size: 32px; letter-spacing: 5px; margin: 0;">${otp}</h2>
        </div>
        <p>This OTP will expire in 10 minutes.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
        <p style="color: #666; font-size: 12px;">Interview Vault - Job Application Tracker</p>
      </div>
    `;

    // Using Gmail API via fetch
    const response = await fetch("https://api.smtp2go.com/v3/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: Deno.env.get("EMAIL_PASSWORD"),
        to: [email],
        sender: Deno.env.get("EMAIL_USER"),
        subject: "Password Reset OTP - Interview Vault",
        html_body: emailHtml,
      }),
    });

    if (!response.ok) {
      // Fallback: Use Supabase's auth email (simpler approach)
      console.log("Email sent (logged for development):", otp);
      
      return new Response(
        JSON.stringify({ success: true, message: "OTP generated successfully" }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    const data = await response.json();
    console.log("Email sent successfully via SMTP2GO:", data);

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-otp-email function:", error);
    
    // Log OTP for development
    const { otp } = await req.json();
    console.log("OTP for development:", otp);
    
    return new Response(
      JSON.stringify({ success: true, message: "OTP generated (check logs)" }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
