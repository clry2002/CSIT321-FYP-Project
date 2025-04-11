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
};

export default function DiscussionBoardPage() {
  const { id } = useParams(); // id = crid (classroom ID)
  const [classroomName, setClassroomName] = useState('');
  const [teacherQuestion, setTeacherQuestion] = useState('');
  const [responses, setResponses] = useState<DiscussionEntry[]>([]);
  const [childName, setChildName] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
          .order('created_at', { ascending: true })
          .limit(1)
          .single();
        if (questionError) throw questionError;
        setTeacherQuestion(questionData?.question || '');

        const { data: responsesData, error: responsesError } = await supabase
          .from('discussionboard')
          .select('did, response, uaid, created_at')
          .eq('crid', classroomData?.crid)
          .not('response', 'is', null)
          .order('created_at', { ascending: true });
        if (responsesError) throw responsesError;

        const enriched = await Promise.all(
          (responsesData || []).map(async (entry: any) => {
            const { data: profileData } = await supabase
              .from('user_account')
              .select('fullname')
              .eq('user_id', entry.uaid)
              .single();
            return {
              id: entry.id,
              message: entry.response,
              sender_name: profileData?.fullname || 'Unknown',
              created_at: entry.created_at,
            };
          })
        );
        setResponses(enriched);

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError || !user) throw authError;

        const { data: childData, error: childError } = await supabase
          .from('user_account')
          .select('fullname')
          .eq('user_id', user!.id)
          .single();
        if (childError) throw childError;
        setChildName(childData!.fullname);
      } catch (error: any) {
        console.error('Error loading discussion board:', error.message || error); // Enhanced error logging
      } finally {
        setLoading(false);
      }
    };

    fetchDiscussion();
  }, [id]);

  // Realtime subscription to new responses
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
            ...prev,
            {
              id: newEntry.id,
              message: newEntry.response,
              sender_name: profileData?.fullname || 'Unknown',
              created_at: newEntry.created_at,
            },
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

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
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSubmitting(false);
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-yellow-100 via-pink-100 to-blue-100">
      <Navbar />

      <main className="flex flex-col flex-1 p-25 max-w-4xl mx-auto space-y-8">
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-2xl font-bold text-blue-700 mb-1">🏫 {classroomName}</h2>
          <h3 className="text-xl font-semibold text-blue-700 mb-2">📚 Teacher's Question</h3>
          <p className="text-lg text-gray-800">{teacherQuestion || 'No question available yet.'}</p>
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-xl font-semibold text-blue-700 mb-4">💬 Student Responses</h3>
          {responses.length > 0 ? (
            <ul className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {responses.map((entry) => (
                <li
                  key={`${entry.id}-${entry.created_at}`}
                  className="p-4 bg-gray-100 rounded-lg border border-gray-200"
                >
                  <p className="text-gray-700">{entry.message}</p>
                  <div className="text-sm text-gray-500 mt-2 text-right">
                    – {entry.sender_name}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600 italic">No responses yet. Be the first to answer!</p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-xl font-semibold text-blue-700 mb-4">✍️ Your Response</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <textarea
              placeholder="Write your response..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="w-full border rounded-lg p-2 h-24"
              required
            />
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              {submitting ? 'Sending...' : 'Send Response'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
