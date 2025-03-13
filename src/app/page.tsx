'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Search, Home as HomeIcon, BookOpen, Clock, Bookmark, Settings, Bell, PlayCircle } from 'lucide-react';
import BookCard from './components/BookCard';
import Calendar from './components/Calendar';
import ChatBot from './components/ChatBot';
import { useBooks } from '../hooks/useBooks';
import { useVideos } from '../hooks/useVideos';
import { useCalendar } from '../hooks/useCalendar';
import { supabase } from '@/lib/supabase';

export default function RootPage() {
  const router = useRouter();
  const { popularBooks } = useBooks();
  const { videos } = useVideos();
  const { calendarDays, currentMonth } = useCalendar();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          router.push('/auth/login');
          return;
        }

        // Check if user has a profile
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (profile) {
          router.push('/home');
        } else {
          router.push('/setup');
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
        router.push('/auth/login');
      }
    };

    checkAuth();
  }, [router]);

  return null;
}