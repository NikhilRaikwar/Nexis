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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";

const queryClient = new QueryClient();

const BackendStatus = () => {
  const { isHealthy, isChecking, error } = useApiHealth();

  if (isChecking) {
    return (
      <div className="bg-yellow-500/20 text-yellow-300 p-2 text-center text-sm">
        Checking backend connection...
      </div>
    );
  }

  if (!isHealthy) {
    return (
      <Alert className="rounded-none border-red-500/20 bg-red-500/10 border-x-0 border-t-0">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="text-red-400">
          Backend server connection failed. The server may be starting up. Please wait a moment and try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="bg-green-500/20 text-green-300 p-2 text-center text-sm flex items-center justify-center gap-2">
      <CheckCircle className="h-4 w-4" />
      Connected to Nexis backend server
    </div>
  );
};

const App = () => {
  const civicAuthClientId = import.meta.env.VITE_CIVIC_AUTH_CLIENT_ID;

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
            <BackendStatus />
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