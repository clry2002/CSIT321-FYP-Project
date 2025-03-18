import { useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';

// Define the Message interface
export interface Message {
  content: string;
  role: 'user' | 'assistant';
}

export const useChatbot = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I can help you find books and videos based on your interests. What are you looking for?'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);

  // Ref for auto-scrolling
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  const sendMessage = useCallback(async (message: string) => {
    try {
      setIsLoading(true);
      setMessages((prev) => [...prev, { role: 'user', content: message }]);

      const response = await axios.post<{ answer: string }>('http://127.0.0.1:5000/api/chat', {
        question: message, // Backend expects `question` field
      });

      setMessages((prev) => [...prev, { role: 'assistant', content: response.data.answer }]);
    } catch (error) {
      console.error('Error calling API:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I have encountered an error. Please try again.'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Auto-scroll to the latest message whenever `messages` updates
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return {
    messages,
    isLoading,
    sendMessage,
    chatContainerRef,
  };
};
