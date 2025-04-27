import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/lib/supabase';
import { Discussion, DiscussionResponse } from '../../types/database.types';

export const fetchDiscussion = async (classroomId: number): Promise<Discussion | null> => {
  try {
    // Get the discussion for this classroom
    const { data: discussionData, error: discussionError } = await supabase
      .from('discussionboard')
      .select('*')
      .eq('crid', classroomId)
      .is('response', null)
      .single();

    if (discussionError) {
      if (discussionError.code === 'PGRST116') {
        // No discussion found
        return null;
      }
      throw discussionError;
    }

    if (discussionData) {
      // Get creator's name
      const { data: userData, error: userError } = await supabase
        .from('user_account')
        .select('fullname')
        .eq('id', discussionData.uaid)
        .single();

      if (userError) {
        console.warn('Could not fetch user data for discussion:', userError);
      }

      return {
        id: discussionData.did,
        question: discussionData.question,
        created_at: discussionData.created_at,
        created_by: discussionData.uaid,
        educator_name: userData?.fullname || 'Unknown',
      };
    }
    return null;
  } catch (err) {
    console.error('Error fetching discussion:', err);
    throw new Error('Failed to load discussion');
  }
};

export const fetchResponses = async (classroomId: number): Promise<DiscussionResponse[]> => {
  try {
    // Get responses for this classroom's discussion
    const { data: responsesData, error: responsesError } = await supabase
      .from('discussionboard')
      .select('did, response, uaid, created_at')
      .eq('crid', classroomId)
      .not('response', 'is', null)
      .order('created_at', { ascending: true });
      
    if (responsesError) throw responsesError;

    const enriched = await Promise.all(
      (responsesData || []).map(async (entry) => {
        const { data: profileData } = await supabase
          .from('user_account')
          .select('fullname')
          .eq('id', entry.uaid)
          .single();

        return {
          id: entry.did,
          message: entry.response,
          sender_name: profileData?.fullname || 'Unknown',
          created_at: entry.created_at,
          uaid: entry.uaid,
        };
      })
    );
    
    return enriched;
  } catch (err) {
    console.error('Error fetching responses:', err);
    throw new Error('Failed to load student responses');
  }
};

export const createDiscussion = async (classroomId: number, userAccountId: string, question: string): Promise<void> => {
  if (!userAccountId) {
    throw new Error('User authentication required');
  }

  try {
    const { error } = await supabase
      .from('discussionboard')
      .insert({
        crid: classroomId,
        uaid: userAccountId,
        question: question,
        response: null,
        created_at: new Date().toISOString(),
      });

    if (error) throw error;
  } catch (err) {
    console.error('Error creating discussion:', err);
    throw new Error('Failed to create discussion');
  }
};

export const updateDiscussion = async (discussionId: number, question: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('discussionboard')
      .update({
        question: question,
        created_at: new Date().toISOString(),
      })
      .eq('did', discussionId);

    if (error) throw error;
  } catch (err) {
    console.error('Error updating discussion:', err);
    throw new Error('Failed to update discussion');
  }
};

export const submitResponse = async (classroomId: number, userAccountId: string, message: string): Promise<void> => {
  if (!userAccountId) {
    throw new Error('User authentication required');
  }

  try {
    const { error } = await supabase.from('discussionboard').insert([
      {
        crid: classroomId,
        uaid: userAccountId,
        response: message,
      },
    ]);

    if (error) throw error;
  } catch (error) {
    console.error('Failed to send message:', error);
    throw new Error('Failed to submit response');
  }
};

export const deleteResponse = async (responseId: number): Promise<void> => {
  try {
    const { error } = await supabase
      .from('discussionboard')
      .delete()
      .eq('did', responseId);

    if (error) throw error;
  } catch (err) {
    console.error('Failed to delete response:', err);
    throw new Error('Failed to delete response');
  }
};

export const clearAllResponses = async (classroomId: number): Promise<void> => {
  try {
    // Delete all responses but keep the question
    const { error } = await supabase
      .from('discussionboard')
      .delete()
      .eq('crid', classroomId)
      .not('response', 'is', null);
      
    if (error) throw error;
  } catch (err) {
    console.error('Error clearing responses:', err);
    throw new Error('Failed to clear all responses');
  }
};

export const resetDiscussionBoard = async (classroomId: number): Promise<void> => {
  try {
    // Delete everything including the question and responses
    const { error } = await supabase
      .from('discussionboard')
      .delete()
      .eq('crid', classroomId);
      
    if (error) throw error;
  } catch (err) {
    console.error('Error resetting discussion board:', err);
    throw new Error('Failed to reset discussion board');
  }
};

export const formatDate = (dateString: string): string => {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true });
  } catch {
    return 'Invalid date';
  }
};

export const setupRealtimeSubscription = (
  classroomId: number, 
  onNewResponse: (response: DiscussionResponse) => void
) => {
  const channel = supabase
    .channel('realtime-discussion')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'discussionboard',
        filter: `crid=eq.${classroomId}`,
      },
      async (payload) => {
        const newEntry = payload.new;
        if (!newEntry.response) return;

        const { data: profileData } = await supabase
          .from('user_account')
          .select('fullname')
          .eq('id', newEntry.uaid)
          .single();

        onNewResponse({
          id: newEntry.did || newEntry.id,
          message: newEntry.response,
          sender_name: profileData?.fullname || 'Unknown',
          created_at: newEntry.created_at,
          uaid: newEntry.uaid,
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};