import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Mail, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const EmailSent = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = (location.state as any)?.email || '';
  const [resending, setResending] = useState(false);

  if (!email) {
    navigate('/register');
    return null;
  }

  const handleResendEmail = async () => {
    setResending(true);
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      });

      if (error) {
        toast({
          title: 'Failed to resend',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Email sent!',
          description: 'Please check your inbox for the verification link.',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to resend verification email',
        variant: 'destructive',
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Check your email</CardTitle>
          <CardDescription className="text-base">
            We've sent a verification link to
          </CardDescription>
          <p className="text-sm font-medium text-foreground">{email}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground">
            <p className="mb-2">
              <strong>Next steps:</strong>
            </p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Check your email inbox</li>
              <li>Click the verification link</li>
              <li>Return here to log in</li>
            </ol>
          </div>
          
          <div className="text-center text-sm text-muted-foreground">
            <p>Didn't receive the email?</p>
            <p className="mt-1">Check your spam folder or</p>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button 
            onClick={handleResendEmail} 
            variant="outline" 
            className="w-full"
            disabled={resending}
          >
            {resending ? 'Sending...' : 'Resend verification email'}
          </Button>
          <Link to="/login" className="w-full">
            <Button variant="ghost" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to login
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default EmailSent;
