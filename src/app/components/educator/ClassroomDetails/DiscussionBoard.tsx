'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { MessageCircle, Plus, Edit, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Discussion = {
  id: number; // Maps to did
  question: string;
  created_at: string;
  created_by: string;
  educator_name?: string;
};

type DiscussionBoardProps = {
  classroomId: number;
  educatorId: string | null;
};

export default function DiscussionBoardSection({ classroomId, educatorId }: DiscussionBoardProps) {
  const [discussions, setDiscussions] = useState<Discussion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalError, setModalError] = useState(''); // New state for create modal errors
  const [editModalError, setEditModalError] = useState(''); // New state for edit modal errors

  const [showNewDiscussionForm, setShowNewDiscussionForm] = useState(false);
  const [newDiscussionQuestion, setNewDiscussionQuestion] = useState('');

  const [editingDiscussionId, setEditingDiscussionId] = useState<number | null>(null);
  const [editQuestion, setEditQuestion] = useState('');

  const [userId, setUserId] = useState<string | null>(null);

  const [deletingDiscussionId, setDeletingDiscussionId] = useState<number | null>(null);

  useEffect(() => {
    const initialize = async () => {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData?.user) {
        console.error('User not authenticated', authError);
        setError('You are not authenticated');
        setLoading(false);
        return;
      }
      setUserId(userData.user.id);
    };

    initialize();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchDiscussions();
    }
  }, [classroomId, userId]);

  // Clear create modal error when typing
  useEffect(() => {
    if (newDiscussionQuestion.trim() && modalError === 'Please provide a question') {
      setModalError('');
    }
  }, [newDiscussionQuestion, modalError]);

  // Clear edit modal error when typing
  useEffect(() => {
    if (editQuestion.trim() && editModalError === 'Please provide a question') {
      setEditModalError('');
    }
  }, [editQuestion, editModalError]);

  const fetchDiscussions = async () => {
    setLoading(true);
    try {
      const { data: discussionsData, error: discussionError } = await supabase
        .from('discussionboard')
        .select('*')
        .eq('crid', classroomId)
        .is('response', null);

      if (discussionError) throw discussionError;

      const formattedDiscussions = await Promise.all(
        (discussionsData || []).map(async (discussion) => {
          // Get user info
          const { data: userData, error: userError } = await supabase
            .from('user_account')
            .select('fullname')
            .eq('user_id', discussion.uaid)
            .single();

          return {
            id: discussion.did,
            question: discussion.question,
            created_at: discussion.created_at,
            created_by: discussion.uaid,
            educator_name: userData?.fullname || 'Unknown',
          };
        })
      );

      setDiscussions(formattedDiscussions);
    } catch (err) {
      console.error('Error fetching discussions:', err);
      setError('Failed to load discussions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDiscussion = async () => {
    if (!newDiscussionQuestion.trim()) {
      setModalError('Please provide a question');
      return;
    }
    
    // Ensure we have a valid user ID
    if (!userId) {
      setModalError('User authentication required');
      return;
    }
  
    try {
      const { data, error } = await supabase
        .from('discussionboard')
        .insert({
          crid: classroomId,
          uaid: userId,
          question: newDiscussionQuestion,
          response: null,
          created_at: new Date().toISOString(),
        })
        .select();
  
      if (error) throw error;
  
      setNewDiscussionQuestion('');
      setShowNewDiscussionForm(false);
      setModalError(''); // Clear modal error on success
      await fetchDiscussions();
    } catch (err) {
      console.error('Error creating discussion:', err);
      setModalError('Failed to create discussion');
    }
  };

  const handleEditDiscussion = async () => {
    if (!editQuestion.trim()) {
      setEditModalError('Please provide a question');
      return;
    }

    try {
      const { error } = await supabase
        .from('discussionboard')
        .update({
          question: editQuestion,
          created_at: new Date().toISOString(),
        })
        .eq('did', editingDiscussionId);

      if (error) throw error;

      setEditingDiscussionId(null);
      setEditModalError(''); // Clear edit modal error on success
      await fetchDiscussions();
    } catch (err) {
      console.error('Error updating discussion:', err);
      setEditModalError('Failed to update discussion');
    }
  };

  const handleDeleteDiscussion = async () => {
    try {
      const { error } = await supabase
        .from('discussionboard')
        .delete()
        .eq('did', deletingDiscussionId);
  
      if (error) throw error;
  
      setDeletingDiscussionId(null);
      await fetchDiscussions();
    } catch (err) {
      console.error('Error deleting discussion:', err);
      setError('Failed to delete discussion');
    }
  };

  const confirmDelete = (discussionId: number) => {
    setDeletingDiscussionId(discussionId);
  };

  const startEditing = (discussion: Discussion) => {
    setEditingDiscussionId(discussion.id);
    setEditQuestion(discussion.question);
    setEditModalError(''); // Clear any previous edit errors
  };

  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'Invalid date';
    }
  };

  // Handle input changes and clear errors
  const handleNewQuestionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewDiscussionQuestion(e.target.value);
    if (e.target.value.trim() && modalError === 'Please provide a question') {
      setModalError('');
    }
  };

  const handleEditQuestionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditQuestion(e.target.value);
    if (e.target.value.trim() && editModalError === 'Please provide a question') {
      setEditModalError('');
    }
  };

  return (
    <div className="mt-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-black">
          <MessageCircle className="inline mr-2" size={20} />
          Discussion Board
        </h2>
        <button
          onClick={() => {
            setShowNewDiscussionForm(!showNewDiscussionForm);
            setModalError('');
          }}
          className="flex items-center bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">
          <Plus size={16} className="mr-1" />
          New Discussion
        </button>
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {showNewDiscussionForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center gray-200 bg-opacity-90">
          <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-lg">
            <h3 className="text-lg font-semibold text-black mb-3">Create New Discussion</h3>
            {modalError && <p className="text-red-500 mb-2">{modalError}</p>}
            <textarea
              value={newDiscussionQuestion}
              onChange={handleNewQuestionChange}
              className="w-full p-2 border rounded text-black"
              rows={4}
              placeholder="What would you like to discuss with your students?"
            />
            <div className="flex justify-end mt-4 space-x-2">
              <button
                onClick={() => {
                  setShowNewDiscussionForm(false);
                  setModalError('');
                  setNewDiscussionQuestion('');
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDiscussion}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Post Question
              </button>
            </div>
          </div>
        </div>
      )}

      {editingDiscussionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-20 bg-opacity-30">
          <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-lg">
            <h3 className="text-lg font-semibold text-black mb-3">Edit Discussion Question</h3>
            {editModalError && <p className="text-red-500 mb-2">{editModalError}</p>}
            <textarea
              value={editQuestion}
              onChange={handleEditQuestionChange}
              className="w-full p-2 border rounded text-black"
              rows={4}
            />
            <div className="flex justify-end mt-2 space-x-2">
              <button
                onClick={() => {
                  setEditingDiscussionId(null);
                  setEditModalError('');
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleEditDiscussion}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      
      {deletingDiscussionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-20 bg-opacity-30">
          <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-lg">
            <h3 className="text-lg font-semibold text-black mb-3">Delete Discussion Board</h3>
            <p className="text-black mb-4">Are you sure you want to delete this discussion board?</p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setDeletingDiscussionId(null)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteDiscussion}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-black">Loading discussions...</p>
      ) : discussions.length > 0 ? (
        <div className="space-y-4">
          {discussions.map((discussion) => (
            <div key={discussion.id} className="bg-white p-4 rounded-lg shadow border border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-black font-semibold">{discussion.question}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Posted by {discussion.educator_name} • {formatDate(discussion.created_at)}
                  </p>
                </div>
                {discussion.created_by === userId && (
                  <div className="flex space-x-2">
                    <button onClick={() => startEditing(discussion)}>
                      <Edit size={18} className="text-blue-600 hover:text-blue-800" />
                    </button>
                    <button onClick={() => confirmDelete(discussion.id)}>
                      <Trash2 size={18} className="text-red-600 hover:text-red-800" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-black">No discussion boards found.</p>
      )}
    </div>
  );
}