import { createContext, useContext, useCallback, ReactNode, useEffect } from 'react';
import { useUser } from '@civic/auth-web3/react';
import { useNavigate, useLocation } from 'react-router-dom';

interface AuthContextType {
  user: any | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { user, signIn, signOut, isLoading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const isAuthenticated = !!user;

  // Handle automatic redirect after authentication
  useEffect(() => {
    if (isAuthenticated && location.pathname === '/') {
      navigate('/dashboard');
    }
  }, [isAuthenticated, location.pathname, navigate]);

  const handleSignIn = useCallback(async () => {
    try {
      await signIn();
      // Redirect will be handled by the useEffect above
    } catch (error) {
      console.error('Sign-in error:', error);
      throw error;
    }
  }, [signIn]);

  const handleSignOut = useCallback(async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign-out error:', error);
      throw error;
    }
  }, [signOut]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        signIn: handleSignIn,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};