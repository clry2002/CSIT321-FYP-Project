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

export default function RootPage() {
  const router = useRouter();
  const { popularBooks } = useBooks();
  const { videos } = useVideos();
  const { calendarDays, currentMonth } = useCalendar();

  useEffect(() => {
    router.push('/home');
  }, [router]);

  return null;
}
