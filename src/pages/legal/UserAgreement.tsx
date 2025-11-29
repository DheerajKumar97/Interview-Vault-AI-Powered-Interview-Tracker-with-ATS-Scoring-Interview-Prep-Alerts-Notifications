import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const UserAgreement = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
            <div className="container mx-auto max-w-4xl py-8">
                <Link to="/auth/login">
                    <Button variant="ghost" className="mb-6">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Login
                    </Button>
                </Link>

                <Card className="glass-card shadow-card">
                    <CardHeader>
                        <CardTitle className="text-3xl">User Agreement</CardTitle>
                        <p className="text-sm text-muted-foreground">Last updated: November 29, 2024</p>
                    </CardHeader>
                    <CardContent className="prose prose-sm max-w-none">
                        <h2>1. Acceptance of Terms</h2>
                        <p>
                            By accessing and using Interview Vault ("the Service"), you accept and agree to be bound by the terms and provision of this agreement.
                        </p>

                        <h2>2. Description of Service</h2>
                        <p>
                            Interview Vault is a job application tracking and management platform that helps users organize their job search process, track applications, and manage interview schedules.
                        </p>

                        <h2>3. User Accounts</h2>
                        <p>
                            To use certain features of the Service, you must register for an account. You agree to:
                        </p>
                        <ul>
                            <li>Provide accurate, current, and complete information during registration</li>
                            <li>Maintain and promptly update your account information</li>
                            <li>Maintain the security of your password and account</li>
                            <li>Accept responsibility for all activities that occur under your account</li>
                        </ul>

                        <h2>4. User Responsibilities</h2>
                        <p>You agree not to:</p>
                        <ul>
                            <li>Use the Service for any illegal purpose or in violation of any laws</li>
                            <li>Attempt to gain unauthorized access to the Service or its related systems</li>
                            <li>Interfere with or disrupt the Service or servers</li>
                            <li>Upload or transmit viruses or malicious code</li>
                            <li>Collect or harvest any information from the Service</li>
                        </ul>

                        <h2>5. Intellectual Property</h2>
                        <p>
                            The Service and its original content, features, and functionality are owned by Interview Vault and are protected by international copyright, trademark, and other intellectual property laws.
                        </p>

                        <h2>6. User Content</h2>
                        <p>
                            You retain all rights to the content you submit, post, or display on or through the Service. By submitting content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, and display such content solely for the purpose of providing the Service.
                        </p>

                        <h2>7. Termination</h2>
                        <p>
                            We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including breach of these Terms.
                        </p>

                        <h2>8. Limitation of Liability</h2>
                        <p>
                            In no event shall Interview Vault, its directors, employees, or agents be liable for any indirect, incidental, special, consequential, or punitive damages arising out of your use of the Service.
                        </p>

                        <h2>9. Changes to Terms</h2>
                        <p>
                            We reserve the right to modify or replace these Terms at any time. We will provide notice of any significant changes by posting the new Terms on this page.
                        </p>

                        <h2>10. Contact Information</h2>
                        <p>
                            If you have any questions about this User Agreement, please contact us at support@interviewvault.com
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default UserAgreement;
