import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface ReadingSchedule {
  id?: number;
  date: Date;
  bookTitle: string;
  pages: number;
  status: 'pending' | 'completed';
  content_id?: number;
}

/**
 * Custom hook to fetch and manage a user's pending reading schedules
 * @param trigger Optional dependency to trigger a refresh (e.g., when calendar closes)
 * @returns Object containing pendingSchedules and related state and functions
 */
export const usePendingSchedules = (trigger?: unknown) => {
  const [pendingSchedules, setPendingSchedules] = useState<ReadingSchedule[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPendingSchedules = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setIsLoading(false);
        setError('User not authenticated');
        return;
      }

      const { data, error: scheduleError } = await supabase
        .from('reading_schedules')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending');

      if (scheduleError) {
        console.error('Error fetching schedules:', scheduleError);
        setError('Error fetching reading schedules');
        setIsLoading(false);
        return;
      }

      setPendingSchedules(data || []);
    } catch (err) {
      console.error('Error in fetchPendingSchedules:', err);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingSchedules();
  }, [trigger]); // Re-fetch when trigger changes

  return { 
    pendingSchedules, 
    isLoading, 
    error, 
    refreshPendingSchedules: fetchPendingSchedules 
  };
};

export default usePendingSchedules;