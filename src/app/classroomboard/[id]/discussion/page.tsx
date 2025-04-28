'use client';

import { useEffect, useState, useRef } from 'react';
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
const MAX_VISIBLE_CHARACTERS = 200;

export default function DiscussionBoardPage() {
  const { id } = useParams();
  const [classroomName, setClassroomName] = useState('');
  const [teacherQuestion, setTeacherQuestion] = useState('');
  const [responses, setResponses] = useState<DiscussionEntry[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserAccountId, setCurrentUserAccountId] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [selectedResponse, setSelectedResponse] = useState<DiscussionEntry | null>(null);
  const responsesContainerRef = useRef<HTMLDivElement>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    id: number | null;
    visible: boolean;
  }>({ id: null, visible: false });

  const stickyNoteColors = ['bg-yellow-200', 'bg-pink-200', 'bg-blue-200', 'bg-green-200', 'bg-orange-200', 'bg-purple-200'];
  const rotations = ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2'];
  const stickyNoteWidth = 'w-48';
  const stickyNoteMargin = 'mr-4 mb-4';

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
              .eq('id', entry.uaid) // Changed: Now using id instead of user_id
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

        // Get the current user's account ID
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError || !user) throw authError;
        
        // Fetch the user_account.id that matches the auth user
        const { data: userAccount, error: userAccountError } = await supabase
          .from('user_account')
          .select('id')
          .eq('user_id', user.id)
          .single();
          
        if (userAccountError || !userAccount) {
          console.error('Error fetching user account:', userAccountError);
          throw userAccountError;
        }
        
        setCurrentUserAccountId(userAccount.id);
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
            .eq('id', newEntry.uaid) // Changed: Now using id instead of user_id
            .single();

          setResponses((prev) => [
            ...prev,
            {
              id: newEntry.did || newEntry.id,
              message: newEntry.response,
              sender_name: profileData?.fullname || 'Unknown',
              created_at: newEntry.created_at,
              uaid: newEntry.uaid,
            },
          ]);
          // Scroll to the bottom when a new response arrives
          setTimeout(() => {
            responsesContainerRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 100);
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

      if (!user?.id) {
        console.error('User ID not found.');
        return;
      }

      // Get the user_account.id for the current auth user
      const { data: userAccount, error: userAccountError } = await supabase
        .from('user_account')
        .select('id')
        .eq('user_id', user.id)
        .single();
        
      if (userAccountError || !userAccount) {
        console.error('Error fetching user account:', userAccountError);
        return;
      }

      const { error } = await supabase.from('discussionboard').insert([
        {
          crid: parseInt(id as string, 10),
          uaid: userAccount.id, // Changed: Using user_account.id instead of auth user.id
          response: newMessage,
        },
      ]);

      if (error) {
        console.error('Failed to send message:', error.message);
      } else {
        setNewMessage('');
        setWordCount(0);
        // Scroll to the bottom after submitting a new response
        setTimeout(() => {
          responsesContainerRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      }
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const requestDeleteConfirmation = (responseId: number) => {
    setDeleteConfirmation({ id: responseId, visible: true });
  };

  const cancelDelete = () => {
    setDeleteConfirmation({ id: null, visible: false });
  };

  const confirmDelete = async () => {
    const responseIdToDelete = deleteConfirmation.id;
    if (responseIdToDelete !== null) {
      try {
        const { error } = await supabase
          .from('discussionboard')
          .delete()
          .eq('did', responseIdToDelete);

        if (error) {
          console.error('Failed to delete response:', error.message);
        } else {
          setResponses((prev) => prev.filter((entry) => entry.id !== responseIdToDelete));
        }
      } catch (err) {
        console.error('Failed to delete response:', err);
      } finally {
        setDeleteConfirmation({ id: null, visible: false });
      }
    }
  };

  const handleReadMore = (entry: DiscussionEntry) => {
    setSelectedResponse(entry);
  };

  const handleCloseModal = () => {
    setSelectedResponse(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-blue-100">
        <div className="text-xl text-blue-600">Loading discussion board...</div>
      </div>
    );
  }

 
  return (
    <main
      className="min-h-screen w-full bg-gradient-to-br from-yellow-100 via-pink-100 to-blue-100 flex flex-col items-center pb-20"
      style={{
        backgroundImage: 'url("/spaceclassroom.jpg")',
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <Navbar />
  
      <div className="bg-white rounded-xl shadow p-6 max-w-5xl w-full mt-25 text-center">
        <h2 className="text-2xl font-bold text-blue-700 mb-2"> {classroomName}</h2>
        <h3 className="text-lg font-semibold text-blue-700 mb-3"> Teacher&apos;s Question</h3>
        <p className="text-2xl font-bold text-gray-800">{teacherQuestion || 'No question available yet.'}</p>
  
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-blue-700 mb-3"> Student&apos;s Response</h3>
          <div className="flex flex-row flex-wrap justify-center items-start gap-4 relative">
            {responses.map((entry, idx) => {
              const color = stickyNoteColors[idx % stickyNoteColors.length];
              const rotation = rotations[idx % rotations.length];
              const isLong = entry.message.length > MAX_VISIBLE_CHARACTERS;
              const displayedMessage = isLong ? `${entry.message.slice(0, MAX_VISIBLE_CHARACTERS)}...` : entry.message;
  
              return (
                <div
                  key={`${entry.id}-${entry.created_at}`}
                  className={`p-4 ${stickyNoteWidth} ${stickyNoteMargin} shadow-md rounded-lg ${color} ${rotation} transition-transform duration-300 shrink-0 hover:scale-105 hover:shadow-xl cursor-grab relative flex flex-col justify-between`}
                >
                  <p className="text-lg text-gray-800 break-words">{displayedMessage}</p>
                  <div className="flex flex-col items-end mt-2">
                    {isLong && (
                      <button
                        type="button"
                        onClick={() => handleReadMore(entry)}
                        className="text-blue-500 text-sm hover:underline mb-1"
                      >
                        Read More
                      </button>
                    )}
                    {entry.uaid === currentUserAccountId && (
                      <button
                        type="button"
                        onClick={() => requestDeleteConfirmation(entry.id)}
                        className="text-red-500 hover:underline text-sm"
                      >
                        Delete
                      </button>
                    )}
                    <span className="text-sm text-gray-600 self-start">– {entry.sender_name}</span>
                  </div>
                  {deleteConfirmation.visible && deleteConfirmation.id === entry.id && (
                    <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                      <div className="bg-white p-6 rounded-md shadow-lg">
                        <p className="text-lg text-gray-800 mb-4">Are you sure you want to delete this response?</p>
                        <div className="flex justify-end gap-4">
                          <button
                            type="button"
                            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-md text-gray-700"
                            onClick={cancelDelete}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-md text-white"
                            onClick={confirmDelete}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div ref={responsesContainerRef} className="w-full" /> {/* Anchor for scrolling */}
          </div>
        </div>
      </div>
  
      {selectedResponse && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full relative">
            <button
              type="button"
              onClick={handleCloseModal}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
            >
              <svg className="h-6 w-6 fill-current" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            <h3 className="text-lg font-semibold text-blue-700 mb-2">Full Response by {selectedResponse.sender_name}</h3>
            <p className="text-gray-800 break-words">{selectedResponse.message}</p>
          </div>
        </div>
      )}
  
      <div className="fixed bottom-0 left-0 w-full bg-white bg-opacity-90 py-3 px-6 z-20 shadow-inner flex justify-center">
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row items-center gap-4 max-w-5xl w-full">
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