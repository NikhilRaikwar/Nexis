// API Configuration for Render Backend
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_BACKEND_URL || 'https://nexis-zona.onrender.com',
  ENDPOINTS: {
    AGENT: '/agent', // Direct agent endpoint
  },
  TIMEOUT: 30000, // 30 seconds timeout for Render cold starts
};

export interface ApiResponse {
  response?: string;
  error?: string;
  timestamp: string;
  chain_support?: string[];
}

export const makeApiRequest = async (endpoint: string, data: any): Promise<ApiResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

  try {
    console.log(`Making API request to: ${API_CONFIG.BASE_URL}${endpoint}`);
    
    const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('API response received:', result);
    return result;
    
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - the server may be starting up. Please try again in a moment.');
      }
      console.error('API Error:', error.message);
      throw error;
    }
    
    throw new Error('Failed to connect to backend server');
  }
};

// Test backend connection by making a simple request
export const testBackendConnection = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.AGENT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ input: 'test connection' }),
      signal: AbortSignal.timeout(10000), // 10 second timeout for connection test
    });
    
    return response.ok;
  } catch (error) {
    console.error('Backend connection test failed:', error);
    return false;
  }
};