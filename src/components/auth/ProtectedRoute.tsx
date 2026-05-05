// Auth temporarily disabled - bypass login
// import { Navigate, useLocation } from 'react-router-dom';
// import { useAuth } from '@/contexts/AuthContext';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  // TODO: Re-enable auth when ready
  // const { user, loading } = useAuth();
  // const location = useLocation();

  // if (loading) {
  //   return (
  //     <div className="flex h-screen items-center justify-center">
  //       <div className="flex flex-col items-center gap-3">
  //         <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  //         <p className="text-sm text-muted-foreground">Loading...</p>
  //       </div>
  //     </div>
  //   );
  // }

  // if (!user) {
  //   return <Navigate to="/login" state={{ from: location }} replace />;
  // }

  return <>{children}</>;
};
