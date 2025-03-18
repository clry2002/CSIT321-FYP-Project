'use client';

import { useState, useCallback } from 'react';
import axios from 'axios';

interface Message {
  content: string;
  role: 'user' | 'assistant';
}

export const useChatbot = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I can help you find books based on your interests. What kind of books are you looking for?'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (message: string) => {
    try {
      setIsLoading(true);
      setMessages((prev) => [...prev, { role: 'user', content: message }]);

      // Axios-based API call
      const response = await axios.post<{ response: string }>('http://127.0.0.1:5000/api/chat', { message });

      // Add assistant's response
      setMessages((prev) => [...prev, { role: 'assistant', content: response.data.response }]);
    } catch (error) {
      console.error('Error calling API:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error while searching for books. Please try again.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    messages,
    isLoading,
    sendMessage
  };
};