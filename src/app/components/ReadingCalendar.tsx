'use client';

import { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths, isBefore, startOfDay } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface ReadingSchedule {
  id?: number;
  date: Date;
  bookTitle: string;
  pages: number;
  status: 'pending' | 'completed';
  content_id?: number;
}

interface Book {
  cid: number;
  title: string;
}

interface ReadingCalendarProps {
  selectedBook?: Book;
  onClose?: () => void;
}

export default function ReadingCalendar({ selectedBook, onClose }: ReadingCalendarProps) {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [schedules, setSchedules] = useState<ReadingSchedule[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    bookTitle: selectedBook?.title || '',
    pages: 0,
    content_id: selectedBook?.cid || 0
  });
  const [bookSearch, setBookSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);

  // Fetch schedules on mount and store in localStorage
  useEffect(() => {
    const fetchSchedules = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('reading_schedules')
          .select('*')
          .eq('user_id', user.id);

        if (error) throw error;

        const formattedSchedules = data.map(schedule => ({
          ...schedule,
          date: new Date(schedule.date),
          bookTitle: schedule.book_title,
          status: schedule.status || 'pending'
        }));

        setSchedules(formattedSchedules);
        // Store in localStorage
        localStorage.setItem('readingSchedules', JSON.stringify(data));
      } catch (error) {
        console.error('Error fetching schedules:', error);
        // Try to load from localStorage if fetch fails
        const savedSchedules = localStorage.getItem('readingSchedules');
        if (savedSchedules) {
          const parsed = JSON.parse(savedSchedules);
          setSchedules(parsed.map((schedule: any) => ({
            ...schedule,
            date: new Date(schedule.date),
            bookTitle: schedule.book_title,
            status: schedule.status || 'pending'
          })));
        }
      }
    };

    fetchSchedules();
  }, []);

  // Update localStorage whenever schedules change
  useEffect(() => {
    if (schedules.length > 0) {
      localStorage.setItem('readingSchedules', JSON.stringify(schedules));
    }
  }, [schedules]);

  // Search books from temp_content
  const searchBooks = async (query: string) => {
    if (!query) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('temp_content')
        .select('cid, title')
        .eq('cfid', 2) // Only books
        .ilike('title', `%${query}%`)
        .limit(5);

      if (error) throw error;

      setSearchResults(data || []);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Error searching books:', error);
    }
  };

  const handleBookSelect = (book: Book) => {
    setNewSchedule(prev => ({
      ...prev,
      bookTitle: book.title,
      content_id: book.cid
    }));
    setBookSearch(book.title);
    setShowSearchResults(false);
  };

  const handleCompleteSchedule = async (scheduleId: number) => {
    try {
      const { error } = await supabase
        .from('reading_schedules')
        .update({ status: 'completed' })
        .eq('id', scheduleId);

      if (error) throw error;

      // Update local state
      setSchedules(prev =>
        prev.map(schedule =>
          schedule.id === scheduleId
            ? { ...schedule, status: 'completed' }
            : schedule
        )
      );
    } catch (error) {
      console.error('Error completing schedule:', error);
    }
  };

  const handleRemoveSchedule = async (scheduleId: number) => {
    try {
      const { error } = await supabase
        .from('reading_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;

      // Update local state
      setSchedules(prev =>
        prev.filter(schedule => schedule.id !== scheduleId)
      );
    } catch (error) {
      console.error('Error removing schedule:', error);
    }
  };

  // Get all days in current month
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get the day of week of the first day (0-6, 0 is Sunday)
  const firstDayOfMonth = monthStart.getDay();
  
  // Create array for empty cells before the first day
  const emptyDays = Array(firstDayOfMonth).fill(null);

  const handlePrevMonth = () => {
    setCurrentDate(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => addMonths(prev, 1));
  };

  const handleDateClick = (date: Date) => {
    // Check if date is before today
    if (isBefore(date, startOfDay(new Date()))) {
      return; // Don't allow selection of past dates
    }
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  const navigateToBookDetail = (contentId: number) => {
    router.push(`/readingschedule/${contentId}`);
  };

  const handleScheduleSubmit = async () => {
    if (!selectedDate || !newSchedule.bookTitle || newSchedule.pages <= 0) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('reading_schedules')
        .insert({
          user_id: user.id,
          date: selectedDate.toISOString(),
          book_title: newSchedule.bookTitle,
          pages: newSchedule.pages,
          content_id: newSchedule.content_id
        });

      if (error) throw error;

      // Update local state
      setSchedules([...schedules, {
        date: selectedDate,
        bookTitle: newSchedule.bookTitle,
        pages: newSchedule.pages,
        status: 'pending',
        content_id: newSchedule.content_id
      }]);

      // Reset form
      setNewSchedule({ bookTitle: '', pages: 0, content_id: 0 });
      setIsModalOpen(false);
      
      // Close the parent modal if onClose is provided
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error('Error saving schedule:', error);
    }
  };

  // Split schedules into pending and completed
  const pendingSchedules = schedules.filter(schedule => schedule.status !== 'completed');
  const completedSchedules = schedules.filter(schedule => schedule.status === 'completed');

  const openScheduleModal = (date: Date = new Date()) => {
    setSelectedDate(date);
    setIsModalOpen(true);
  };

  return (
    <div>
      <div className="mb-20"></div>
      <h2 className="text-2xl font-serif mb-6 text-black text-center">Reading Schedule</h2>
      <div className="w-full max-w-sm mx-auto bg-white rounded-xl shadow-sm">
        {/* Calendar Header */}
        <div className="flex justify-between items-center p-4">
          <button onClick={handlePrevMonth} className="text-gray-600 hover:text-gray-800">
            ‹
          </button>
          <h3 className="font-medium text-gray-900">
            {format(currentDate, 'MMMM yyyy')}
          </h3>
          <button onClick={handleNextMonth} className="text-gray-600 hover:text-gray-800">
            ›
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-7 mb-2">
            {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
              <div key={day} className="text-center text-xs text-gray-500 py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {emptyDays.map((_, index) => (
              <div key={`empty-${index}`} className="p-2" />
            ))}
            
            {days.map((day) => {
              const schedule = schedules.find((s) => isSameDay(s.date, day));
              const isPastDate = isBefore(day, startOfDay(new Date()));
              const isPendingSchedule = schedule && schedule.status !== 'completed';
              
              return (
                <button
                  key={day.toString()}
                  onClick={() => handleDateClick(day)}
                  disabled={isPastDate}
                  className={`
                    relative p-2 text-center rounded-lg text-sm
                    ${isSameDay(day, new Date()) 
                      ? 'bg-blue-500 text-white' 
                      : isPastDate
                        ? 'text-gray-400 cursor-not-allowed bg-gray-50'
                        : 'text-gray-700 hover:bg-gray-100'}
                    ${isPendingSchedule ? 'ring-2 ring-blue-500' : ''}
                  `}
                >
                  {format(day, 'd')}
                  {isPendingSchedule && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Schedules Display */}
        <div className="px-4 pb-4 mt-2">
          {schedules.length === 0 ? (
            <p className="text-sm text-gray-600 text-center">
              No scheduled reading. Click on a date to start scheduling!
            </p>
          ) : (
            <div className="space-y-4">
              {/* Pending Schedules */}
              <div className="space-y-2">
                <h3 className="font-medium text-gray-900">Current Schedule</h3>
                {pendingSchedules.length > 0 ? (
                  pendingSchedules
                    .sort((a, b) => a.date.getTime() - b.date.getTime())
                    .map((schedule, index) => (
                      <div key={index} className="text-sm text-gray-900 p-2 bg-gray-50 rounded-lg">
                        <div className="font-medium">{format(schedule.date, 'MMM d, yyyy')}</div>
                        <div>
                          <button
                            onClick={() => schedule.content_id && navigateToBookDetail(schedule.content_id)}
                            className="text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            {schedule.bookTitle}
                          </button>
                          {' - '}{schedule.pages} pages
                        </div>
                        <div className="flex justify-end space-x-2 mt-2">
                          <button
                            onClick={() => schedule.id && handleCompleteSchedule(schedule.id)}
                            className="px-2 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600"
                          >
                            Complete
                          </button>
                          <button
                            onClick={() => schedule.id && handleRemoveSchedule(schedule.id)}
                            className="px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))
                ) : (
                  <p className="text-sm text-gray-600 text-center py-2">
                    No pending schedules. Click{' '}
                    <button 
                      onClick={() => openScheduleModal()}
                      className="font-bold underline text-blue-600 hover:text-blue-800"
                    >
                      here
                    </button>
                    {' '}or on a date to start scheduling!
                  </p>
                )}
              </div>

              {/* Completed Schedules */}
              {completedSchedules.length > 0 && (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowCompleted(!showCompleted)}
                    className="flex items-center justify-between w-full text-left font-medium text-gray-900 hover:text-gray-600"
                  >
                    <span>Completed ({completedSchedules.length})</span>
                    <span className="transform transition-transform duration-200" style={{ 
                      transform: showCompleted ? 'rotate(180deg)' : 'rotate(0deg)'
                    }}>
                      ▼
                    </span>
                  </button>
                  
                  {showCompleted && (
                    <div className="space-y-2 mt-2">
                      {completedSchedules
                        .sort((a, b) => b.date.getTime() - a.date.getTime()) // Most recent first
                        .map((schedule, index) => (
                          <div key={index} className="text-sm text-gray-900 p-2 bg-gray-50 rounded-lg border-l-4 border-green-500">
                            <div className="font-medium">{format(schedule.date, 'MMM d, yyyy')}</div>
                            <div className="flex justify-between items-center">
                              <button
                                onClick={() => schedule.content_id && navigateToBookDetail(schedule.content_id)}
                                className="text-blue-600 hover:text-blue-800 hover:underline"
                              >
                                {schedule.bookTitle}
                              </button>
                              <span className="text-xs text-green-600">✓ Completed</span>
                            </div>
                            <div className="text-gray-500">{schedule.pages} pages</div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Schedule Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl w-96">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-black">
                Schedule Reading
              </h3>
              <input
                type="date"
                value={selectedDate ? format(selectedDate, 'yyyy-MM-dd') : ''}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="border rounded-lg p-2 text-black"
              />
            </div>
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-black mb-1">Book Title</label>
                <input
                  type="text"
                  className="w-full border rounded-lg p-2 text-black"
                  value={bookSearch}
                  onChange={(e) => {
                    const value = e.target.value;
                    setBookSearch(value);
                    setNewSchedule(prev => ({
                      ...prev,
                      bookTitle: value
                    }));
                    searchBooks(value);
                  }}
                  placeholder="Search for a book..."
                />
                {showSearchResults && searchResults.length > 0 && (
                  <div className="absolute z-10 w-full bg-white border rounded-lg mt-1 shadow-lg max-h-60 overflow-y-auto">
                    {searchResults.map((book) => (
                      <button
                        key={book.cid}
                        className="w-full text-left px-4 py-2 hover:bg-gray-100 text-black"
                        onClick={() => handleBookSelect(book)}
                      >
                        {book.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-black mb-1">Pages to Read</label>
                <input
                  type="number"
                  min="1"
                  className="w-full border rounded-lg p-2 text-black"
                  value={newSchedule.pages || ''}
                  onChange={(e) => setNewSchedule(prev => ({ ...prev, pages: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  className="px-4 py-2 text-black hover:bg-gray-100 rounded-lg"
                  onClick={() => {
                    setIsModalOpen(false);
                    setBookSearch('');
                    setShowSearchResults(false);
                  }}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                  onClick={handleScheduleSubmit}
                  disabled={!newSchedule.bookTitle || newSchedule.pages <= 0}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 