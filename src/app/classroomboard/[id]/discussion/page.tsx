'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navbar from '../../../components/Navbar';

type DiscussionEntry = {
  id: number;
  message: string;
  sender_name: string;
  created_at: string;
  uaid: string;
};

const MAX_WORDS = 148;

export default function DiscussionBoardPage() {
  const { id } = useParams(); // id = crid (classroom ID)
  const [classroomName, setClassroomName] = useState('');
  const [teacherQuestion, setTeacherQuestion] = useState('');
  const [responses, setResponses] = useState<DiscussionEntry[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState(0);

  const stickyNoteColors = ['bg-yellow-200', 'bg-pink-200', 'bg-blue-200', 'bg-green-200', 'bg-orange-200', 'bg-purple-200'];
  const rotations = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2'];
  const stickyNoteWidth = 'w-48'; // Reduced width
  const stickyNoteMargin = 'mr-4 mb-4'; // Added margin for spacing

  useEffect(() => {
    const fetchDiscussion = async () => {
      setLoading(true);
      try {
        const classroomId = parseInt(id as string, 10);
        if (isNaN(classroomId)) throw new Error('Invalid classroom ID');

        const { data: classroomData, error: classroomError } = await supabase
          .from('temp_classroom')
          .select('name, crid')
          .eq('crid', classroomId)
          .single();
        if (classroomError) throw classroomError;
        setClassroomName(classroomData?.name || '');

        const { data: questionData, error: questionError } = await supabase
          .from('discussionboard')
          .select('question')
          .eq('crid', classroomData?.crid)
          .not('question', 'is', null)
          .order('created_at', { ascending: true })
          .limit(1);

        if (questionError) throw questionError;
        setTeacherQuestion(questionData?.[0]?.question || '');

        const { data: responsesData, error: responsesError } = await supabase
          .from('discussionboard')
          .select('did, response, uaid, created_at')
          .eq('crid', classroomData?.crid)
          .not('response', 'is', null)
          .order('created_at', { ascending: true });
        if (responsesError) throw responsesError;

        const enriched = await Promise.all(
          (responsesData || []).map(async (entry) => {
            const { data: profileData } = await supabase
              .from('user_account')
              .select('fullname')
              .eq('user_id', entry.uaid)
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
        setResponses(enriched);

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError || !user) throw authError;
        setCurrentUserId(user.id);
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error('Error loading discussion board:', error.message);
        } else {
          console.error('An unknown error occurred:', error);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDiscussion();
  }, [id]);

  useEffect(() => {
    const classroomId = parseInt(id as string, 10);
    if (isNaN(classroomId)) return;

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
            .eq('user_id', newEntry.uaid)
            .single();

          setResponses((prev) => [
            ...prev, // Append new messages to the end of the array
            {
              id: newEntry.did || newEntry.id,
              message: newEntry.response,
              sender_name: profileData?.fullname || 'Unknown',
              created_at: newEntry.created_at,
              uaid: newEntry.uaid,
            },
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    if (words <= MAX_WORDS) {
      setNewMessage(text);
      setWordCount(words);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error } = await supabase.from('discussionboard').insert([
        {
          crid: parseInt(id as string, 10),
          uaid: user!.id,
          response: newMessage,
        },
      ]);
      if (error) throw error;

      setNewMessage('');
      setWordCount(0);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (responseId: number) => {
    const confirm = window.confirm('Are you sure you want to delete this response?');
    if (!confirm) return;

    try {
      const { error } = await supabase
        .from('discussionboard')
        .delete()
        .eq('did', responseId);

      if (error) throw error;

      setResponses((prev) => prev.filter((entry) => entry.id !== responseId));
    } catch (err) {
      console.error('Failed to delete response:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-blue-100">
        <div className="text-xl text-blue-600">Loading discussion board...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen w-full bg-gradient-to-br from-yellow-100 via-pink-100 to-blue-100 flex flex-col items-center pb-16">
      <Navbar />

      {/* Fixed Classroom Name and Description */}
      <div className="bg-white rounded-xl shadow p-6 max-w-3xl w-full mt-25 text-center">
        <h2 className="text-2xl font-bold text-blue-700 mb-2"> {classroomName}</h2>
        <h3 className="text-lg font-semibold text-blue-700 mb-3"> Teacher&apos;s Question</h3>
        <p className="text-2xl font-bold text-gray-800">{teacherQuestion || 'No question available yet.'}</p>
      </div>

      {/* Container for Sticky Notes */}
      <div className="py-8 flex justify-center w-full">
        <div className="bg-gray-100 rounded-lg shadow-inner p-6 max-w-5xl w-full flex flex-col items-center">
          <h3 className="text-lg font-semibold text-blue-700 mb-3"> Student&apos;s Response</h3>
          <div className="flex flex-row flex-wrap justify-center items-start gap-4">
            {responses.map((entry, idx) => {
              const color = stickyNoteColors[idx % stickyNoteColors.length];
              const rotation = rotations[idx % rotations.length];

              return (
                <div
                  key={`${entry.id}-${entry.created_at}`}
                  className={`p-4 ${stickyNoteWidth} ${stickyNoteMargin} shadow-md rounded-lg ${color} ${rotation} transition-transform duration-300 shrink-0 hover:scale-105 hover:shadow-xl cursor-grab`}
                >
                  <p className="text-lg text-gray-800 break-words">{entry.message}</p>
                  <div className="mt-2 text-sm text-gray-600 flex justify-between items-center">
                    <span>– {entry.sender_name}</span>
                    {entry.uaid === currentUserId && (
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-red-500 hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Response Form at the bottom */}
      <div className="fixed bottom-0 left-0 w-full bg-white bg-opacity-90 py-3 px-6 z-20 shadow-inner flex justify-center">
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row items-center gap-4 max-w-3xl w-full">
          <div className="flex-1">
            <textarea
              placeholder={`Type your response here! (Max ${MAX_WORDS} words)`}
              value={newMessage}
              onChange={handleInputChange}
              className="border rounded-lg p-2 h-20 w-full text-black placeholder-gray-500 focus:ring-blue-300 focus:border-blue-300"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {wordCount} / {MAX_WORDS} words
            </p>
          </div>
          <button
            type="submit"
            disabled={submitting || wordCount > MAX_WORDS || newMessage.trim() === ''}
            className={`bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-400 ${
              wordCount > MAX_WORDS || newMessage.trim() === '' ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {submitting ? 'Sending...' : 'Submit Response'}
          </button>
        </form>
      </div>
    </main>
  );
}