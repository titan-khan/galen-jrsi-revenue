import { User } from '@supabase/supabase-js';

/**
 * Get user initials from email or full name
 */
export const getUserInitials = (user: User | null): string => {
  if (!user) return 'U';
  
  const fullName = user.user_metadata?.full_name;
  if (fullName) {
    const names = fullName.split(' ');
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return fullName.charAt(0).toUpperCase();
  }
  
  return user.email?.charAt(0).toUpperCase() || 'U';
};

/**
 * Get user display name
 */
export const getUserDisplayName = (user: User | null): string => {
  if (!user) return 'User';
  return user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';
};

/**
 * Check if user email is verified
 */
export const isEmailVerified = (user: User | null): boolean => {
  return user?.email_confirmed_at !== null;
};

/**
 * Format user metadata for display
 */
export const formatUserMetadata = (user: User | null) => {
  if (!user) return null;
  
  return {
    id: user.id,
    email: user.email,
    fullName: user.user_metadata?.full_name,
    avatarUrl: user.user_metadata?.avatar_url,
    createdAt: user.created_at,
    emailVerified: isEmailVerified(user),
  };
};
