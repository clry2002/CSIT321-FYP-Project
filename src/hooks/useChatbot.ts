import { useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';

// Define the Content interface with cfid
export interface Content {
  title: string;
  description: string;
  contenturl: string;
  coverimage: string;
  cfid: number; // 1 = video, 2 = book
}

// Define the Message interface
export interface Message {
  content: string | Content[]; // Text or array of content
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

      const response = await axios.post('http://127.0.0.1:5000/api/chat', {
        question: message,
      });

      console.log("API Response:", response.data);

      if (response.data.books || response.data.videos) {
        const content: Content[] = [];

        if (Array.isArray(response.data.books)) {
          content.push(
            ...response.data.books.map((book: any) => ({
              ...book,
              coverimage: book.coverimage || '',
              cfid: book.cfid || 2, // Default to book
            }))
          );
        }

        if (Array.isArray(response.data.videos)) {
          content.push(
            ...response.data.videos.map((video: any) => ({
              ...video,
              coverimage: video.coverimage || '',
              cfid: video.cfid || 1, // Default to video
            }))
          );
        }

        console.log("Combined content:", content);

        setMessages((prev) => [...prev, { role: 'assistant', content }]);
      } else {
        // Fallback to text response (e.g. from AI)
        setMessages((prev) => [...prev, { role: 'assistant', content: response.data.answer }]);
      }
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

  // Auto-scroll to the bottom on new messages
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
