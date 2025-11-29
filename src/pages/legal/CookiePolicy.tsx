import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const CookiePolicy = () => {
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
                        <CardTitle className="text-3xl">Cookie Policy</CardTitle>
                        <p className="text-sm text-muted-foreground">Last updated: November 29, 2024</p>
                    </CardHeader>
                    <CardContent className="prose prose-sm max-w-none">
                        <h2>1. What Are Cookies</h2>
                        <p>
                            Cookies are small text files that are placed on your device when you visit our website. They are widely used to make websites work more efficiently and provide information to the owners of the site.
                        </p>

                        <h2>2. How We Use Cookies</h2>
                        <p>We use cookies for the following purposes:</p>
                        <ul>
                            <li><strong>Essential Cookies:</strong> Required for the operation of our Service</li>
                            <li><strong>Authentication Cookies:</strong> To identify you when you sign in</li>
                            <li><strong>Preference Cookies:</strong> To remember your settings and preferences</li>
                            <li><strong>Analytics Cookies:</strong> To understand how you use our Service</li>
                        </ul>

                        <h2>3. Types of Cookies We Use</h2>

                        <h3>3.1 Session Cookies</h3>
                        <p>
                            These are temporary cookies that expire when you close your browser. They help us maintain your session while you navigate through our Service.
                        </p>

                        <h3>3.2 Persistent Cookies</h3>
                        <p>
                            These cookies remain on your device for a set period or until you delete them. They help us remember your preferences and settings.
                        </p>

                        <h3>3.3 First-Party Cookies</h3>
                        <p>
                            These cookies are set by Interview Vault and can only be read by our Service.
                        </p>

                        <h3>3.4 Third-Party Cookies</h3>
                        <p>
                            These cookies are set by third-party services we use, such as analytics providers.
                        </p>

                        <h2>4. Specific Cookies We Use</h2>
                        <table className="min-w-full border-collapse border border-gray-300">
                            <thead>
                                <tr>
                                    <th className="border border-gray-300 px-4 py-2">Cookie Name</th>
                                    <th className="border border-gray-300 px-4 py-2">Purpose</th>
                                    <th className="border border-gray-300 px-4 py-2">Duration</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border border-gray-300 px-4 py-2">session_token</td>
                                    <td className="border border-gray-300 px-4 py-2">Authentication</td>
                                    <td className="border border-gray-300 px-4 py-2">Session</td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-300 px-4 py-2">user_preferences</td>
                                    <td className="border border-gray-300 px-4 py-2">Store user settings</td>
                                    <td className="border border-gray-300 px-4 py-2">1 year</td>
                                </tr>
                                <tr>
                                    <td className="border border-gray-300 px-4 py-2">analytics_id</td>
                                    <td className="border border-gray-300 px-4 py-2">Usage analytics</td>
                                    <td className="border border-gray-300 px-4 py-2">2 years</td>
                                </tr>
                            </tbody>
                        </table>

                        <h2>5. Managing Cookies</h2>
                        <p>
                            You can control and manage cookies in various ways:
                        </p>
                        <ul>
                            <li><strong>Browser Settings:</strong> Most browsers allow you to refuse or accept cookies</li>
                            <li><strong>Delete Cookies:</strong> You can delete cookies that have already been set</li>
                            <li><strong>Third-Party Tools:</strong> Use browser extensions to manage cookies</li>
                        </ul>

                        <h2>6. Disabling Cookies</h2>
                        <p>
                            You can disable cookies through your browser settings. However, please note that disabling cookies may affect the functionality of our Service and prevent you from using certain features.
                        </p>

                        <h2>7. Cookie Consent</h2>
                        <p>
                            By using our Service, you consent to the use of cookies as described in this Cookie Policy. If you do not agree to our use of cookies, you should disable them through your browser settings or refrain from using our Service.
                        </p>

                        <h2>8. Changes to This Policy</h2>
                        <p>
                            We may update this Cookie Policy from time to time. We will notify you of any changes by posting the new Cookie Policy on this page and updating the "Last updated" date.
                        </p>

                        <h2>9. More Information</h2>
                        <p>
                            For more information about how we use cookies and protect your privacy, please see our{' '}
                            <Link to="/legal/privacy-policy" className="text-blue-600 hover:underline">
                                Privacy Policy
                            </Link>
                            .
                        </p>

                        <h2>10. Contact Us</h2>
                        <p>
                            If you have any questions about our use of cookies, please contact us at cookies@interviewvault.com
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default CookiePolicy;
