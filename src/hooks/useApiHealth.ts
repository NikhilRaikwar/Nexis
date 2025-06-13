import { useState, useEffect } from 'react';
import { checkBackendHealth } from '../config/api';

export const useApiHealth = () => {
  const [isHealthy, setIsHealthy] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    
    const checkHealth = async () => {
      if (!mounted) return;
      
      setIsChecking(true);
      try {
        const healthy = await checkBackendHealth();
        if (mounted) {
          setIsHealthy(healthy);
          setError(healthy ? null : 'Backend server is not responding');
        }
      } catch (err) {
        if (mounted) {
          setIsHealthy(false);
          setError('Failed to connect to backend server');
        }
      } finally {
        if (mounted) {
          setIsChecking(false);
        }
      }
    };

    // Initial health check
    checkHealth();
    
    // Check health every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return { isHealthy, isChecking, error };
};