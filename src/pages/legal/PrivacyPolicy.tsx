import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const PrivacyPolicy = () => {
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
                        <CardTitle className="text-3xl">Privacy Policy</CardTitle>
                        <p className="text-sm text-muted-foreground">Last updated: November 29, 2024</p>
                    </CardHeader>
                    <CardContent className="prose prose-sm max-w-none">
                        <h2>1. Information We Collect</h2>
                        <p>We collect information you provide directly to us, including:</p>
                        <ul>
                            <li><strong>Account Information:</strong> Name, email address, and password</li>
                            <li><strong>Application Data:</strong> Job applications, company information, interview details</li>
                            <li><strong>Resume Information:</strong> Resume text and related documents</li>
                            <li><strong>Usage Data:</strong> How you interact with our Service</li>
                        </ul>

                        <h2>2. How We Use Your Information</h2>
                        <p>We use the information we collect to:</p>
                        <ul>
                            <li>Provide, maintain, and improve our Service</li>
                            <li>Process and complete transactions</li>
                            <li>Send you technical notices and support messages</li>
                            <li>Respond to your comments and questions</li>
                            <li>Analyze usage patterns and trends</li>
                        </ul>

                        <h2>3. Information Sharing</h2>
                        <p>
                            We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:
                        </p>
                        <ul>
                            <li>With your consent</li>
                            <li>To comply with legal obligations</li>
                            <li>To protect our rights and safety</li>
                            <li>With service providers who assist in our operations</li>
                        </ul>

                        <h2>4. Data Security</h2>
                        <p>
                            We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
                        </p>

                        <h2>5. Data Retention</h2>
                        <p>
                            We retain your personal information for as long as necessary to provide you with our Service and as described in this Privacy Policy. You may request deletion of your account and associated data at any time.
                        </p>

                        <h2>6. Your Rights</h2>
                        <p>You have the right to:</p>
                        <ul>
                            <li>Access your personal information</li>
                            <li>Correct inaccurate data</li>
                            <li>Request deletion of your data</li>
                            <li>Object to processing of your data</li>
                            <li>Export your data</li>
                        </ul>

                        <h2>7. Cookies and Tracking</h2>
                        <p>
                            We use cookies and similar tracking technologies to track activity on our Service and hold certain information. You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent.
                        </p>

                        <h2>8. Third-Party Services</h2>
                        <p>
                            Our Service may contain links to third-party websites or services. We are not responsible for the privacy practices of these third parties.
                        </p>

                        <h2>9. Children's Privacy</h2>
                        <p>
                            Our Service is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13.
                        </p>

                        <h2>10. Changes to This Policy</h2>
                        <p>
                            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
                        </p>

                        <h2>11. Contact Us</h2>
                        <p>
                            If you have any questions about this Privacy Policy, please contact us at privacy@interviewvault.com
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
