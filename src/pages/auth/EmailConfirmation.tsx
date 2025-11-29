import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const EmailConfirmation = () => {
    const navigate = useNavigate();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Confirming your email...');

    useEffect(() => {
        const handleEmailConfirmation = async () => {
            try {
                // Get the hash from URL (contains the access token)
                const hashParams = new URLSearchParams(window.location.hash.substring(1));
                const accessToken = hashParams.get('access_token');
                const type = hashParams.get('type');

                console.log('Email confirmation - Type:', type);
                console.log('Email confirmation - Access Token:', accessToken ? 'Present' : 'Missing');

                if (type === 'signup' && accessToken) {
                    // Set the session with the access token
                    const { data, error } = await supabase.auth.setSession({
                        access_token: accessToken,
                        refresh_token: hashParams.get('refresh_token') || '',
                    });

                    if (error) {
                        console.error('Error setting session:', error);
                        setStatus('error');
                        setMessage('Failed to confirm email. Please try again.');
                        return;
                    }

                    if (data.user) {
                        console.log('✅ Email confirmed for user:', data.user.email);
                        setStatus('success');
                        setMessage('Email confirmed successfully! Redirecting to dashboard...');

                        // Redirect to dashboard after 2 seconds
                        setTimeout(() => {
                            navigate('/applications');
                        }, 2000);
                    }
                } else {
                    // No confirmation token found
                    setStatus('error');
                    setMessage('Invalid confirmation link.');
                }
            } catch (error) {
                console.error('Email confirmation error:', error);
                setStatus('error');
                setMessage('An error occurred during confirmation.');
            }
        };

        handleEmailConfirmation();
    }, [navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-secondary/5 p-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-2">
                        <img
                            src="/logo.png"
                            alt="Interview Vault Logo"
                            className="h-40 w-40 object-contain"
                        />
                    </div>
                    <h1 className="text-4xl font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 rounded-lg shadow-lg mb-2 inline-block">
                        Interview Vault
                    </h1>
                </div>

                <Card className="glass-card shadow-card">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center gap-2">
                            {status === 'loading' && <Loader2 className="h-6 w-6 animate-spin text-primary" />}
                            {status === 'success' && <CheckCircle2 className="h-6 w-6 text-green-600" />}
                            {status === 'error' && <XCircle className="h-6 w-6 text-red-600" />}
                            {status === 'loading' && 'Confirming Email'}
                            {status === 'success' && 'Email Confirmed!'}
                            {status === 'error' && 'Confirmation Failed'}
                        </CardTitle>
                        <CardDescription className="text-center">{message}</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {status === 'success' && (
                            <div className="space-y-4">
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                                    <p className="text-sm text-green-800">
                                        Your account is now active. You'll be redirected to the dashboard shortly.
                                    </p>
                                </div>
                                <Button
                                    onClick={() => navigate('/applications')}
                                    className="w-full"
                                >
                                    Go to Dashboard Now
                                </Button>
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="space-y-4">
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                                    <p className="text-sm text-red-800">
                                        {message}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => navigate('/auth/signup')}
                                        variant="outline"
                                        className="flex-1"
                                    >
                                        Sign Up Again
                                    </Button>
                                    <Button
                                        onClick={() => navigate('/auth/login')}
                                        className="flex-1"
                                    >
                                        Go to Login
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default EmailConfirmation;
