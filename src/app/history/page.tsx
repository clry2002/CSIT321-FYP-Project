'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Search, Home as HomeIcon, BookOpen, Clock, Settings, Bell, PlayCircle } from 'lucide-react';
import { useCalendar } from '@/hooks/useCalendar';

export default function HistoryPage() {
  const { calendarDays, currentMonth } = useCalendar();

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-20 border-r border-gray-200 flex flex-col items-center py-4 space-y-4">
        <div className="text-xl">✋</div>
        <nav className="flex flex-col space-y-3">
          <Link href="/" className="p-2.5 rounded-lg hover:bg-gray-100">
            <HomeIcon className="w-5 h-5 text-gray-800" />
          </Link>
          <Link href="/books" className="p-2.5 rounded-lg hover:bg-gray-100">
            <BookOpen className="w-5 h-5 text-gray-800" />
          </Link>
          <Link href="/videos" className="p-2.5 rounded-lg hover:bg-gray-100">
            <PlayCircle className="w-5 h-5 text-gray-800" />
          </Link>
          <Link href="/history" className="p-2.5 rounded-lg bg-rose-100">
            <Clock className="w-5 h-5 text-rose-500" />
          </Link>
          <Link href="/settings" className="p-2.5 rounded-lg hover:bg-gray-100">
            <Settings className="w-5 h-5 text-gray-800" />
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 px-6 py-4 overflow-y-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-5">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search history..."
              className="pl-9 pr-4 py-1.5 w-[400px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-200 placeholder-gray-800 !text-black text-sm font-medium"
            />
          </div>
          <div className="flex items-center space-x-3">
            <button><Bell className="w-5 h-5 text-gray-800" /></button>
            <div className="flex items-center space-x-2">
              <Image
                src="/avatar-mark.jpg"
                alt="Alexander Mark"
                width={32}
                height={32}
                className="rounded-full"
              />
              <span className="font-medium text-sm">Alexander Mark</span>
            </div>
          </div>
        </header>

        {/* History Content */}
        <div>
          <h2 className="text-2xl font-serif mb-6 text-black">Reading History</h2>
          <div className="bg-gray-50 p-6 rounded-xl">
            <div className="grid grid-cols-7 gap-4">
              {calendarDays.map((day, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg ${
                    day.isCurrentDay
                      ? 'bg-rose-500 text-white'
                      : 'bg-white'
                  }`}
                >
                  <div className="text-sm font-medium mb-1">{day.dayOfWeek}</div>
                  <div className="text-2xl font-bold">{day.date}</div>
                  <div className="mt-2 text-xs">
                    {day.isCurrentDay ? '2 hours read' : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 