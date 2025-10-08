import { useState } from 'react';
import { getAccessToken } from '@/lib/auth';

interface SendMessageRequest {
  user_id: number;
  message_content: string;
  zalo_customer_id: string;
  customer_type: 'private' | 'group';
}

interface SendMessageResponse {
  success: boolean;
  message: string;
  data: {
    user_id: number;
    zalo_customer_id: string;
    customer_type: 'private' | 'group';
    thread_type: string;
    original_message_content: string;
    processed_message_content: string;
    send_function: string;
    notes: string | null;
    zalo_api_response: {
      success: boolean;
      response: {
        status: number;
        ok: boolean;
        body: {
          error_code: number;
          error_message: string;
          data: string;
        };
      };
    };
    timestamp: string;
  };
  error: any;
}

interface UseSendMessageReturn {
  sendMessage: (params: SendMessageRequest) => Promise<SendMessageResponse>;
  isLoading: boolean;
  error: string | null;
}

export function useSendMessage(): UseSendMessageReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (params: SendMessageRequest): Promise<SendMessageResponse> => {
    setIsLoading(true);
    setError(null);

    try {
      const token = getAccessToken();
      if (!token) throw new Error('No access token available');

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-Master-Key': process.env.NEXT_PUBLIC_MASTER_KEY || 'nkcai',
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: SendMessageResponse = await response.json();
      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendMessage,
    isLoading,
    error,
  };
}
