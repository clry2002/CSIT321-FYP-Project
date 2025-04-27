'use client';

import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { MessageCircle, Edit, Trash2 } from 'lucide-react';

// Types
import { Discussion, DiscussionResponse, DeleteConfirmationState } from '../../../types/database.types';

// Services and utilities
import { getUserData, isUserEducatorForClassroom } from '../../../services/discussionBoard/user-service';
import { 
  fetchDiscussion, 
  fetchResponses, 
  createDiscussion, 
  updateDiscussion, 
  submitResponse, 
  deleteResponse, 
  clearAllResponses, 
  resetDiscussionBoard, 
  formatDate, 
  setupRealtimeSubscription 
} from '../../../services/discussionBoard/discussion-utils';

// Components
import {
  WelcomePopup,
  QuestionEditor,
  ConfirmationModal,
  ResponseItem,
  ResponseForm,
  ResponseModal
} from '../../components/educator/ClassroomDetails/DiscussionBoard';


type DiscussionBoardProps = {
  classroomId: number;
};

export default function DiscussionBoardSection({ classroomId }: DiscussionBoardProps) {
  const searchParams = useSearchParams();
  const [discussion, setDiscussion] = useState<Discussion | null>(null);
  const [responses, setResponses] = useState<DiscussionResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditForm, setShowEditForm] = useState(false);
  const [editQuestion, setEditQuestion] = useState('');
  const [editModalError, setEditModalError] = useState('');
  const [userAccountId, setUserAccountId] = useState<string | null>(null);
  const [isEducator, setIsEducator] = useState(false);
  const [showWelcomePopup, setShowWelcomePopup] = useState(false);
  const [, setPopupShown] = useState(false);
  
  // Response viewing states
  const [selectedResponse, setSelectedResponse] = useState<DiscussionResponse | null>(null);
  const responsesContainerRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmationState>({ id: null, visible: false });
  
  // Content management states
  const [showClearAllResponses, setShowClearAllResponses] = useState(false);
  const [clearingResponses, setClearingResponses] = useState(false);
  const [showResetBoard, setShowResetBoard] = useState(false);
  const [resettingBoard, setResettingBoard] = useState(false);
  
  useEffect(() => {
    const initialize = async () => {
      try {
        // Get user data and check if educator
        const userData = await getUserData();
        setUserAccountId(userData.id);
        
        const isTeacher = await isUserEducatorForClassroom(userData.id, classroomId);
        setIsEducator(isTeacher);

        // Fetch discussion data
        const discussionData = await fetchDiscussion(classroomId);
        setDiscussion(discussionData);
        
        // Fetch student responses
        const responsesData = await fetchResponses(classroomId);
        setResponses(responsesData);
        
        // Get the popup shown state from localStorage
        const key = `discussion_popup_shown_${classroomId}`;
        const hasShownPopup = localStorage.getItem(key) === 'true';
        setPopupShown(hasShownPopup);
        
        // Show the welcome popup only if it hasn't been shown before and URL parameter is present
        const shouldShowPopup = searchParams.get('showDiscussionPopup') === 'true' && !hasShownPopup;
        if (shouldShowPopup) {
          setShowWelcomePopup(true);
          // Mark as shown in localStorage
          localStorage.setItem(key, 'true');
        }
      } catch (err) {
        console.error('Error during initialization:', err);
        setError('Failed to initialize');
      } finally {
        setLoading(false);
      }
    };

    initialize();
    
    // Set up realtime subscription for new responses
    const handleNewResponse = (newResponse: DiscussionResponse) => {
      setResponses((prev) => [...prev, newResponse]);
      // Scroll to the bottom when a new response arrives
      setTimeout(() => {
        responsesContainerRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    };
    
    const unsubscribe = setupRealtimeSubscription(classroomId, handleNewResponse);
    return () => {
      unsubscribe();
    };
  }, [classroomId, searchParams]);

  const handleCreateOrUpdateDiscussion = async () => {
    if (!editQuestion.trim()) {
      setEditModalError('Please provide a question');
      return;
    }

    try {
      if (!discussion) {
        // Create new discussion
        if (!userAccountId) {
          setError('User authentication required');
          return;
        }
        await createDiscussion(classroomId, userAccountId, editQuestion);
        const updatedDiscussion = await fetchDiscussion(classroomId);
        setDiscussion(updatedDiscussion);
      } else {
        // Update existing discussion
        await updateDiscussion(discussion.id, editQuestion);
        const updatedDiscussion = await fetchDiscussion(classroomId);
        setDiscussion(updatedDiscussion);
      }

      setShowEditForm(false);
      setEditModalError('');
    } catch (err) {
      console.error('Error creating/updating discussion:', err);
      setEditModalError('Failed to save discussion');
    }
  };
  
  const handleSubmitResponse = async (message: string) => {
    if (!userAccountId) {
      console.error('User account ID not found.');
      return;
    }

    setSubmitting(true);
    try {
      await submitResponse(classroomId, userAccountId, message);
      // Scroll to the bottom after submitting a new response
      setTimeout(() => {
        responsesContainerRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Failed to send message:', error);
      setError('Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteResponse = async () => {
    const responseIdToDelete = deleteConfirmation.id;
    if (responseIdToDelete !== null) {
      try {
        await deleteResponse(responseIdToDelete);
        setResponses((prev) => prev.filter((entry) => entry.id !== responseIdToDelete));
      } catch (err) {
        console.error('Failed to delete response:', err);
        setError('Failed to delete response');
      } finally {
        setDeleteConfirmation({ id: null, visible: false });
      }
    }
  };

  const handleClearAllResponses = async () => {
    if (!isEducator) return;
    
    setClearingResponses(true);
    try {
      await clearAllResponses(classroomId);
      setResponses([]);
      setShowClearAllResponses(false);
    } catch (err) {
      console.error('Error clearing responses:', err);
      setError('Failed to clear all responses');
    } finally {
      setClearingResponses(false);
    }
  };
  
  const handleResetDiscussionBoard = async () => {
    if (!isEducator) return;
    
    setResettingBoard(true);
    try {
      await resetDiscussionBoard(classroomId);
      setDiscussion(null);
      setResponses([]);
      setShowResetBoard(false);
    } catch (err) {
      console.error('Error resetting discussion board:', err);
      setError('Failed to reset discussion board');
    } finally {
      setResettingBoard(false);
    }
  };

  const startEditing = () => {
    if (discussion) {
      setEditQuestion(discussion.question);
    } else {
      setEditQuestion('');
    }
    setShowEditForm(true);
    setEditModalError('');
  };

  const dismissWelcomePopup = () => {
    setShowWelcomePopup(false);
    setPopupShown(true);
    
    // If there's no discussion and the user is the educator, prompt them to create one
    if (!discussion && isEducator) {
      setShowEditForm(true);
    }
  };

  return (
    <div className="mt-4">
      {/* Welcome Popup */}
      {showWelcomePopup && (
        <WelcomePopup 
          isEducator={isEducator} 
          hasExistingDiscussion={!!discussion} 
          onClose={dismissWelcomePopup} 
        />
      )}

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-black">
          <MessageCircle className="inline mr-2" size={20} />
          Discussion Board
        </h2>
        {isEducator && (
          <div className="flex gap-2">
            <button
              onClick={startEditing}
              className="flex items-center bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">
              <Edit size={16} className="mr-1" />
              {discussion ? 'Edit Question' : 'Create Discussion'}
            </button>
            {discussion && (
              <button
                onClick={() => setShowResetBoard(true)}
                className="flex items-center bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">
                <Trash2 size={16} className="mr-1" />
                Reset Board
              </button>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-red-500 mb-4">{error}</p>}

      {/* Edit Question Modal */}
      <QuestionEditor
        question={editQuestion}
        isEditing={showEditForm}
        error={editModalError}
        onChange={setEditQuestion}
        onSave={handleCreateOrUpdateDiscussion}
        onCancel={() => {
          setShowEditForm(false);
          setEditModalError('');
        }}
      />

      {/* Clear All Responses Confirmation */}
      {showClearAllResponses && (
        <ConfirmationModal
          title="Clear All Responses"
          message="Are you sure you want to delete all student responses? This action cannot be undone."
          confirmButtonText="Yes, Clear All"
          isProcessing={clearingResponses}
          onConfirm={handleClearAllResponses}
          onCancel={() => setShowClearAllResponses(false)}
        />
      )}

      {/* Reset Discussion Board Confirmation */}
      {showResetBoard && (
        <ConfirmationModal
          title="Reset Discussion Board"
          message="Are you sure you want to reset the entire discussion board? This will delete the question and all responses. This action cannot be undone."
          confirmButtonText="Yes, Reset Board"
          isProcessing={resettingBoard}
          onConfirm={handleResetDiscussionBoard}
          onCancel={() => setShowResetBoard(false)}
        />
      )}

      {loading ? (
        <p className="text-black">Loading discussion...</p>
      ) : discussion ? (
        <>
          <div className="bg-white p-4 rounded-lg shadow border border-gray-200 mb-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-black font-semibold">{discussion.question}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Posted by {discussion.educator_name} • {formatDate(discussion.created_at)}
                </p>
              </div>
              {isEducator && (
                <button onClick={startEditing}>
                  <Edit size={18} className="text-blue-600 hover:text-blue-800" />
                </button>
              )}
            </div>
          </div>
          
          {/* Student Responses Section */}
          <div className="mt-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-black">Student Responses</h3>
              {isEducator && responses.length > 0 && (
                <button
                  onClick={() => setShowClearAllResponses(true)}
                  className="text-red-500 hover:text-red-600 text-sm flex items-center"
                >
                  <Trash2 size={14} className="mr-1" />
                  Clear All Responses
                </button>
              )}
            </div>
            
            <div className="bg-gray-100 rounded-lg shadow-inner p-4">
              {responses.length > 0 ? (
                <div className="flex flex-wrap justify-center gap-4">
                  {responses.map((response, idx) => (
                    <ResponseItem
                      key={`${response.id}-${response.created_at}`}
                      response={response}
                      colorIndex={idx}
                      rotationIndex={idx}
                      currentUserAccountId={userAccountId}
                      isEducator={isEducator}
                      onReadMore={setSelectedResponse}
                      onDeleteRequest={(id) => setDeleteConfirmation({ id, visible: true })}
                      isDeleteConfirmationVisible={deleteConfirmation.visible && deleteConfirmation.id === response.id}
                      onDeleteConfirm={handleDeleteResponse}
                      onDeleteCancel={() => setDeleteConfirmation({ id: null, visible: false })}
                    />
                  ))}
                  <div ref={responsesContainerRef} className="w-full" /> {/* Anchor for scrolling */}
                </div>
              ) : (
                <p className="text-gray-600 text-center py-8">No responses yet. Students can respond to your discussion question.</p>
              )}
            </div>
            
            {/* Response input form */}
            <div className="mt-4 border-t pt-4">
              <ResponseForm 
                onSubmit={handleSubmitResponse} 
                isSubmitting={submitting} 
              />
            </div>
          </div>
          
          {/* Full response modal */}
          {selectedResponse && (
            <ResponseModal 
              response={selectedResponse} 
              onClose={() => setSelectedResponse(null)} 
            />
          )}
        </>
      ) : (
        <div className="flex flex-col items-center p-8 bg-white rounded-lg shadow border border-gray-200">
          <p className="text-gray-600 mb-4">No discussion question has been created yet.</p>
          {isEducator && (
            <button
              onClick={startEditing}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Create Discussion Question
            </button>
          )}
        </div>
      )}
    </div>
  );
}