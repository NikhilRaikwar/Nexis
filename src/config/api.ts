// src/config/api.ts
export const API_CONFIG = {
    BASE_URL: 'http://localhost:3001/api',
    ENDPOINTS: {
      AGENT: '/agent',
      HEALTH: '/health'
    }
  };
  
  export const makeApiRequest = async (endpoint: string, data: any) => {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        credentials: 'include'
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API request failed');
      }
  
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  };