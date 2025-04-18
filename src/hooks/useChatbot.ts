import { useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

const API_URL = "https://csit321-fyp-project.onrender.com";

// Define the Content interface with cfid and cid
export interface Content {
  title: string;
  description: string;
  contenturl: string;
  coverimage: string;
  cfid: number; // 1 = video, 2 = book
  cid: number; // Content unique ID
}

// Define the Message interface
export interface Message {
  content: string | Content[]; // Text or array of content
  role: 'user' | 'assistant';
  audio_url?: string; 
}

// Define response types for better type safety
interface BookResponse {
  title: string;
  description: string;
  contenturl: string;
  coverimage?: string;
  cfid: number;
  cid: number;
}

interface VideoResponse {
  title: string;
  description: string;
  contenturl: string;
  coverimage?: string;
  cfid: number;
  cid: number;
}

export const useChatbot = () => {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Hello! I can help you find books and videos based on your interests. What are you looking for?'
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [uaid_child, setUaidChild] = useState<string | null>(null);
  const [userFullName, setUserFullName] = useState<string | null>(null);

  // Ref for auto-scrolling
  const chatContainerRef = useRef<HTMLDivElement | null>(null);

  // Internal fetchChildData function
  const fetchChildData = useCallback(async () => {
    setIsLoading(true);
    console.log("Fetching child data...");

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error("Error getting auth user:", userError);
        router.push('/landing');
        return null;
      }

      if (!user) {
        console.log("No authenticated user found");
        router.push('/landing');
        return null;
      }

      console.log("Authenticated user ID:", user.id);

      // Fetch the 'user_account' data, ensuring we get 'id' as 'uaid_child'
      const { data, error } = await supabase
        .from('user_account')
        .select('id, fullname') // Select 'id' from user_account
        .eq('user_id', user.id) // Match the user_id with the authenticated user's ID
        .single();

      if (error) {
        console.error('Error fetching child fullname:', error);
        return null;
      }

      setUserFullName(data?.fullname || null);
      
      return data?.id || null;  // Return uaid_child
    } catch (error) {
      console.error('Error in fetchChildData:', error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [router]); // Include router in the dependency array

  // Fetch the user data and set the user ID (uaid_child)
  useEffect(() => {
    const fetchUser = async () => {
      const userId = await fetchChildData();
      setUaidChild(userId);
    };

    fetchUser();
  }, [fetchChildData]); // Add fetchChildData to the dependency array

  const sendMessage = useCallback(async (message: string) => {
    if (!uaid_child) {
      console.error('User ID (uaid_child) is not available');
      return;
    }

    try {
      setIsLoading(true);
      setMessages((prev) => [...prev, { role: 'user', content: message }]);

      const response = await axios.post(
        `${API_URL}/api/chat`,
        // 'http://127.0.0.1:5000/api/chat',
        JSON.stringify({
          question: message,
          uaid_child: uaid_child,
        }),
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      console.log("API Response:", response.data);

      if (response.data.books || response.data.videos) {
        const content: Content[] = [];

        if (Array.isArray(response.data.books)) {
          content.push(
            ...response.data.books.map((book: BookResponse) => ({
              ...book,
              coverimage: book.coverimage || '',
              cfid: book.cfid || 2,
              cid: book.cid || 0,
            }))
          );
        }

        if (Array.isArray(response.data.videos)) {
          content.push(
            ...response.data.videos.map((video: VideoResponse) => ({
              ...video,
              coverimage: video.coverimage || '',
              cfid: video.cfid || 1,
              cid: video.cid || 0,
            }))
          );
        }

        console.log("Combined content:", content);

        setMessages((prev) => [...prev, { role: 'assistant', content }]);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: response.data.answer }]);
      }
    } catch (error) {
      console.error('Error calling API:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I have encountered an error. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [uaid_child]);

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
    userFullName,
  };
};
