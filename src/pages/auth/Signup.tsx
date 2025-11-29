import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Eye, EyeOff, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { validateEmailComplete } from '@/utils/emailValidation';

const Signup = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailValid, setEmailValid] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailValidating, setEmailValidating] = useState(false);
  const [emailError, setEmailError] = useState('');
  const { signUp } = useAuth();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error(t('Passwords do not match'));
      return;
    }

    if (password.length < 6) {
      toast.error(t('Password must be at least 6 characters'));
      return;
    }

    if (!agreeTerms) {
      toast.error(t('Please accept the terms and conditions'));
      return;
    }

    setLoading(true);

    const { error } = await signUp(email, password, fullName);

    if (error) {
      toast.error(error.message || t('Failed to sign up'));
    }

    setLoading(false);
  };

  const handleEmailChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value;
    setEmail(newEmail);
    setEmailError('');

    if (!newEmail) {
      setEmailValid(false);
      setEmailValidating(false);
      return;
    }

    // Start validation
    setEmailValidating(true);
    setEmailValid(false);

    try {
      const result = await validateEmailComplete(newEmail);

      if (result.mailboxExists === true) {
        setEmailValid(true);
        setEmailVerified(true);
        setEmailError('');
      } else if (result.mailboxExists === false) {
        setEmailValid(false);
        setEmailVerified(false);
        setEmailError(result.reason || 'Email does not exist');
      } else {
        // Unknown or format-only validation
        setEmailValid(result.valid);
        setEmailVerified(false);
        setEmailError(result.valid ? '' : result.reason);
      }
    } catch (error) {
      setEmailValid(false);
      setEmailVerified(false);
      setEmailError('Validation failed');
    } finally {
      setEmailValidating(false);
    }
  };

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
          <p className="text-muted-foreground">{t("Create your account to get started")}</p>
        </div>

        <Card className="glass-card shadow-card">
          <CardHeader>
            <CardTitle>{t("Create Account")}</CardTitle>
            <CardDescription>{t("Join Interview Vault Analytics")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">{t("Full Name")}</Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t("Email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={handleEmailChange}
                  required
                  disabled={loading}
                />
                {emailValidating && (
                  <div className="flex items-center gap-1 text-sm text-blue-600">
                    <Clock className="h-4 w-4 animate-spin" />
                    <span>Validating...</span>
                  </div>
                )}
                {!emailValidating && email && emailValid && (
                  <div className={`flex items-center gap-1 text-sm ${emailVerified ? 'text-green-600' : 'text-yellow-600'}`}>
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium">
                      {emailVerified ? 'Verified - Email exists' : 'Format valid (Verification unavailable)'}
                    </span>
                  </div>
                )}
                {!emailValidating && email && !emailValid && emailError && (
                  <div className="flex items-center gap-1 text-sm text-red-600">
                    <XCircle className="h-4 w-4" />
                    <span>{emailError}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t("Password")}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("Confirm Password")}</Label>
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="terms"
                  checked={agreeTerms}
                  onCheckedChange={(checked) => setAgreeTerms(checked as boolean)}
                />
                <label htmlFor="terms" className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  {t("I agree to the")}{' '}
                  <a href="#" className="text-primary hover:underline">
                    {t("Terms & Conditions")}
                  </a>{' '}
                  {t("and")}{' '}
                  <a href="#" className="text-primary hover:underline">
                    {t("Privacy Policy")}
                  </a>
                </label>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("Creating Account...")}
                  </>
                ) : (
                  t('Create Account')
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <div className="text-sm text-muted-foreground text-center">
              {t("Already have an account?")}{' '}
              <Link to="/auth/login" className="text-primary hover:underline font-medium">
                {t("Sign in")}
              </Link>
            </div>
          </CardFooter>
        </Card>

        <div className="mt-6 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            ← {t("Back to Home")}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
