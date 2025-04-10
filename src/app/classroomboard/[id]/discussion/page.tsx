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
        // Ensure id is treated as an integer (if crid is an integer in the DB)
        const classroomId = parseInt(id as string, 10);
        if (isNaN(classroomId)) throw new Error('Invalid classroom ID');

        // Fetch classroom name and crid using the correct type
        const { data: classroomData, error: classroomError } = await supabase
          .from('temp_classroom')
          .select('name, crid') // Fetch both name and crid
          .eq('crid', classroomId) // Use crid to find the classroom
          .single();
        if (classroomError) throw classroomError;

        // Set classroom name
        setClassroomName(classroomData?.name || '');

        // Fetch teacher's question using the crid
        const { data: questionData, error: questionError } = await supabase
          .from('discussionboard')
          .select('question')
          .eq('crid', classroomData?.crid) // Use crid to find the question
          .order('created_at', { ascending: true })
          .limit(1)
          .single();
        if (questionError) throw questionError;

        // Set teacher's question
        setTeacherQuestion(questionData?.question || '');

        // Fetch responses using crid
        const { data: responsesData, error: responsesError } = await supabase
          .from('discussionboard')
          .select('response, uaid, created_at')
          .eq('crid', classroomData?.crid) // Use crid to fetch responses
          .not('response', 'is', null)
          .order('created_at', { ascending: true });
        if (responsesError) throw responsesError;

        // Include responses with student names
        const enriched = await Promise.all(
          (responsesData || []).map(async (entry: any) => {
            const { data: profileData } = await supabase
              .from('user_account')
              .select('fullname')
              .eq('user_id', entry.uaid) // Use the user_id (UUID)
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

        // Fetch logged-in user's child name
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError || !user) throw authError;

        const { data: childData, error: childError } = await supabase
          .from('user_account')
          .select('fullname')
          .eq('user_id', user!.id) // Correctly handle `user_id` as UUID
          .single();
        if (childError) throw childError;
        setChildName(childData!.fullname);
      } catch (error) {
        console.error('Error loading discussion board:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDiscussion();
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
          crid: parseInt(id as string, 10), // Ensure crid is treated as an integer
          uaid: user!.id,
          response: newMessage,
        },
      ]);
      if (error) throw error;

      // Add new messages
      setResponses((prev) => [
        ...prev,
        {
          id: Date.now(), // Ensure each entry has a unique id
          message: newMessage,
          sender_name: childName,
          created_at: new Date().toISOString(),
        },
      ]);

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
        {/* Classroom Name and Teacher's Question */}
        <div className="bg-white rounded-xl shadow p-6">
          <h2 className="text-2xl font-bold text-blue-700 mb-1">🏫 {classroomName}</h2>
          <h3 className="text-xl font-semibold text-blue-700 mb-2">📚 Teacher's Question</h3>
          <p className="text-lg text-gray-800">{teacherQuestion || 'No question available yet.'}</p>
        </div>

        {/* Children's Responses */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="text-xl font-semibold text-blue-700 mb-4">💬 Student Responses</h3>
          {responses.length > 0 ? (
            <ul className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              {responses.map((entry) => (
                <li
                  key={`${entry.id}-${entry.created_at}`} // Ensuring unique key by combining id and created_at
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

        {/* Response Form */}
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
