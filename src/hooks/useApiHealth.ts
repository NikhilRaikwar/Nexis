import { useState, useEffect } from 'react';
import { API_CONFIG } from '../config/api';

export const useApiHealth = () => {
  const [isHealthy, setIsHealthy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.HEALTH}`);
        const data = await response.json();
        setIsHealthy(data.status === 'healthy');
        setError(null);
      } catch (err) {
        setIsHealthy(false);
        setError('Backend server is not responding');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return { isHealthy, error };
};
