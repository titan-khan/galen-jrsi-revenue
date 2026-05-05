import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

interface DevOnlyProps {
  children: ReactNode;
}

/**
 * DevOnly - Wrapper component that restricts access to development mode only
 * 
 * Redirects to home page if accessed in production mode.
 * Used to protect debug routes and development-only features.
 */
export function DevOnly({ children }: DevOnlyProps) {
  // Check if running in development mode
  const isDevelopment = import.meta.env.DEV;

  if (!isDevelopment) {
    // Redirect to home in production
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
