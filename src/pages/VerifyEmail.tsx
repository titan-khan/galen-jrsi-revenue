import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, Mail } from 'lucide-react';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');
      const type = searchParams.get('type');

      if (!token || type !== 'signup') {
        setStatus('error');
        setMessage('Invalid verification link');
        return;
      }

      try {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'signup',
        });

        if (error) {
          if (error.message.includes('expired')) {
            setStatus('expired');
            setMessage('Verification link has expired');
          } else {
            setStatus('error');
            setMessage(error.message);
          }
        } else {
          setStatus('success');
          setMessage('Email verified successfully!');
          
          // Redirect to login after 3 seconds
          setTimeout(() => {
            navigate('/login');
          }, 3000);
        }
      } catch (error) {
        setStatus('error');
        setMessage('An error occurred during verification');
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  const handleResendEmail = async () => {
    // This would need the user's email - you might want to ask for it
    setMessage('Please register again or contact support');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            {status === 'loading' && (
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            )}
            {status === 'success' && (
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            )}
            {(status === 'error' || status === 'expired') && (
              <XCircle className="h-12 w-12 text-destructive" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">
            {status === 'loading' && 'Verifying Email...'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
            {status === 'expired' && 'Link Expired'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Please wait while we verify your email address'}
            {status === 'success' && 'Your email has been successfully verified. Redirecting to login...'}
            {status === 'error' && message}
            {status === 'expired' && 'The verification link has expired. Please request a new one.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col space-y-4">
          {status === 'success' && (
            <Button onClick={() => navigate('/login')} className="w-full">
              Go to Login
            </Button>
          )}
          {(status === 'error' || status === 'expired') && (
            <>
              <Button onClick={() => navigate('/register')} className="w-full">
                Register Again
              </Button>
              <Button 
                variant="outline" 
                onClick={() => navigate('/login')} 
                className="w-full"
              >
                Back to Login
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;
