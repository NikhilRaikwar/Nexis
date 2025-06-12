import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CivicAuthProvider } from "@civic/auth-web3/react";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import ProtectedRoute from "./components/ProtectedRoute";
import { useApiHealth } from './hooks/useApiHealth';

const queryClient = new QueryClient();

const App = () => {
  const civicAuthClientId = import.meta.env.VITE_CIVIC_AUTH_CLIENT_ID;
  const { isHealthy, error } = useApiHealth();

  if (!civicAuthClientId) {
    console.error('VITE_CIVIC_AUTH_CLIENT_ID is not defined in environment variables');
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Configuration Error</h1>
          <p className="text-muted-foreground">
            Civic Auth client ID is not configured. Please check your environment variables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <CivicAuthProvider clientId={civicAuthClientId}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="min-h-screen bg-background">
            <Toaster />
            <Sonner />
            {!isHealthy && (
              <div className="bg-red-500 text-white p-2">
                {error || 'Backend server is not responding'}
              </div>
            )}
            <BrowserRouter>
              <AuthProvider>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route 
                    path="/dashboard" 
                    element={
                      <ProtectedRoute>
                        <Dashboard />
                      </ProtectedRoute>
                    } 
                  />
                </Routes>
              </AuthProvider>
            </BrowserRouter>
          </div>
        </TooltipProvider>
      </QueryClientProvider>
    </CivicAuthProvider>
  );
};

export default App;