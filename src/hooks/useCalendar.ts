'use client';

import { useState } from 'react';

interface CalendarDay {
  date: number;
  dayOfWeek: string;
  isCurrentDay: boolean;
}

export const useCalendar = () => {
  const [calendarDays] = useState<CalendarDay[]>(
    Array.from({ length: 7 }, (_, i) => ({
      date: i + 11,
      dayOfWeek: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][i],
      isCurrentDay: i + 11 === 13
    }))
  );

  const [currentMonth] = useState('August');

  return {
    calendarDays,
    currentMonth
  };
}; 