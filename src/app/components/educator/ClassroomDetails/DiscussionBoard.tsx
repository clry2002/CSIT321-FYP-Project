'use client';

import React from 'react';
import { X, AlertCircle } from 'lucide-react';
import { DiscussionResponse } from '../../../../types/database.types';
import { formatDate } from '../../../../services/discussionBoard/discussion-utils';

// Content limitations
export const MAX_WORDS = 148;
export const MAX_VISIBLE_CHARACTERS = 200;

// Styling constants
export const STICKY_NOTE_STYLES = {
  colors: ['bg-yellow-200', 'bg-pink-200', 'bg-blue-200', 'bg-green-200', 'bg-orange-200', 'bg-purple-200'],
  rotations: ['-rotate-2', 'rotate-1', '-rotate-1', 'rotate-2'],
  width: 'w-60',
  margin: 'mr-4 mb-4'
};

// Welcome Popup Component
export interface WelcomePopupProps {
  isEducator: boolean;
  hasExistingDiscussion: boolean;
  onClose: () => void;
}

export const WelcomePopup: React.FC<WelcomePopupProps> = ({
  isEducator,
  hasExistingDiscussion,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold text-blue-600">Welcome to Your Discussion Board!</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="mb-4">
          <p className="text-gray-700 mb-3">
            This is where you can create a discussion topic for your classroom:
          </p>
          
          <ul className="list-disc pl-6 mb-3 text-gray-700 space-y-1">
            <li>Create a discussion question for your students</li>
            <li>Engage your students in meaningful conversations</li>
            <li>Update your discussion question anytime</li>
          </ul>
          
          <p className="text-gray-700">
            {isEducator 
              ? hasExistingDiscussion 
                ? "You've already created a discussion question. You can edit it anytime."
                : "You'll be prompted to create your first discussion question after closing this message."
              : "Your teacher will create discussion questions for the class."}
          </p>
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
};

// Question Editor Component
export interface QuestionEditorProps {
  question: string;
  isEditing: boolean;
  error: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export const QuestionEditor: React.FC<QuestionEditorProps> = ({
  question,
  isEditing,
  error,
  onChange,
  onSave,
  onCancel
}) => {
  if (!isEditing) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-200 bg-opacity-90">
      <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-lg">
        <h3 className="text-lg font-semibold text-black mb-3">
          {question ? "Edit Discussion Question" : "Create Discussion Question"}
        </h3>
        {error && <p className="text-red-500 mb-2">{error}</p>}
        <textarea
          value={question}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-2 border rounded text-black"
          rows={4}
          placeholder="Enter your discussion question here..."
          autoFocus={true}
        />
        <div className="flex justify-end mt-4 space-x-2">
          <button
            onClick={onCancel}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            {question ? 'Save Changes' : 'Create Discussion'}
          </button>
        </div>
      </div>
    </div>
  );
};

// Confirmation Modal Component
export interface ConfirmationModalProps {
  title: string;
  message: string;
  confirmButtonText: string;
  isProcessing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  title,
  message,
  confirmButtonText,
  isProcessing,
  onConfirm,
  onCancel
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-200 bg-opacity-90">
      <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-lg">
        <div className="flex items-start mb-4">
          <AlertCircle className="text-red-500 mr-3 mt-0.5" size={24} />
          <div>
            <h3 className="text-lg font-semibold text-black">{title}</h3>
            <p className="text-gray-600 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex justify-end mt-4 space-x-2">
          <button
            onClick={onCancel}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
            disabled={isProcessing}
          >
            {isProcessing ? 'Processing...' : confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};

// Response Item Component
export interface ResponseItemProps {
  response: DiscussionResponse;
  colorIndex: number;
  rotationIndex: number;
  currentUserAccountId: string | null;
  isEducator: boolean;
  onReadMore: (response: DiscussionResponse) => void;
  onDeleteRequest: (responseId: number) => void;
  isDeleteConfirmationVisible: boolean;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}

export const ResponseItem: React.FC<ResponseItemProps> = ({
  response,
  colorIndex,
  rotationIndex,
  currentUserAccountId,
  isEducator,
  onReadMore,
  onDeleteRequest,
  isDeleteConfirmationVisible,
  onDeleteConfirm,
  onDeleteCancel
}) => {
  const color = STICKY_NOTE_STYLES.colors[colorIndex % STICKY_NOTE_STYLES.colors.length];
  const rotation = STICKY_NOTE_STYLES.rotations[rotationIndex % STICKY_NOTE_STYLES.rotations.length];
  
  const isLong = response.message.length > MAX_VISIBLE_CHARACTERS;
  const displayedMessage = isLong 
    ? `${response.message.slice(0, MAX_VISIBLE_CHARACTERS)}...` 
    : response.message;

  return (
    <div
      className={`p-4 ${STICKY_NOTE_STYLES.width} shadow-md rounded-lg ${color} ${rotation} transition-transform duration-300 shrink-0 hover:scale-105 hover:shadow-xl cursor-grab relative flex flex-col justify-between`}
    >
      <p className="text-lg text-gray-800 break-words">{displayedMessage}</p>
      <div className="flex flex-col items-end mt-2">
        {isLong && (
          <button
            type="button"
            onClick={() => onReadMore(response)}
            className="text-blue-500 text-sm hover:underline mb-1"
          >
            Read More
          </button>
        )}
        {(response.uaid === currentUserAccountId || isEducator) && (
          <button
            type="button"
            onClick={() => onDeleteRequest(response.id)}
            className="text-red-500 hover:underline text-sm"
          >
            Delete
          </button>
        )}
        <span className="text-sm text-gray-600 self-start">– {response.sender_name}</span>
      </div>
      
      {isDeleteConfirmationVisible && (
        <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
          <div className="bg-white p-6 rounded-md shadow-lg">
            <p className="text-lg text-gray-800 mb-4">Are you sure you want to delete this response?</p>
            <div className="flex justify-end gap-4">
              <button
                type="button"
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 rounded-md text-gray-700"
                onClick={onDeleteCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-md text-white"
                onClick={onDeleteConfirm}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Response Form Component
export interface ResponseFormProps {
  onSubmit: (message: string) => Promise<void>;
  isSubmitting: boolean;
}

export const ResponseForm: React.FC<ResponseFormProps> = ({ onSubmit, isSubmitting }) => {
  const [message, setMessage] = React.useState('');
  const [wordCount, setWordCount] = React.useState(0);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    if (words <= MAX_WORDS) {
      setMessage(text);
      setWordCount(words);
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    
    try {
      await onSubmit(message);
      setMessage('');
      setWordCount(0);
    } catch (error) {
      console.error('Error submitting message:', error);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3">
      <div className="flex-1">
        <textarea
          placeholder={`Add your own response (Max ${MAX_WORDS} words)`}
          value={message}
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
        disabled={isSubmitting || wordCount > MAX_WORDS || message.trim() === ''}
        className={`bg-blue-500 hover:bg-blue-600 text-white font-semibold px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:bg-gray-400 self-end ${
          wordCount > MAX_WORDS || message.trim() === '' ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {isSubmitting ? 'Sending...' : 'Submit Response'}
      </button>
    </form>
  );
};

// Response Modal Component
export interface ResponseModalProps {
  response: DiscussionResponse;
  onClose: () => void;
}

export const ResponseModal: React.FC<ResponseModalProps> = ({ response, onClose }) => {
  return (
    <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
        >
          <X size={24} />
        </button>
        <h3 className="text-lg font-semibold text-blue-700 mb-2">Response by {response.sender_name}</h3>
        <p className="text-gray-800 break-words">{response.message}</p>
        <p className="text-sm text-gray-500 mt-4">{formatDate(response.created_at)}</p>
      </div>
    </div>
  );
};