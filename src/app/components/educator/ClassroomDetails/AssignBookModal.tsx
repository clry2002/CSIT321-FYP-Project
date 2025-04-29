'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X } from 'lucide-react';

interface AssignBookModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookId: number;
  bookTitle: string;
}

interface Classroom {
  crid: number;
  name: string;
  description: string;
}

const AssignBookModal: React.FC<AssignBookModalProps> = ({
  isOpen,
  onClose,
  bookId,
  bookTitle,
}) => {
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [selectedClassroom, setSelectedClassroom] = useState<number | null>(null);
  const [message, setMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchClassrooms = async () => {
      try {
        setIsLoading(true);
        // Fetch classrooms where the current user is the educator
        const { data, error } = await supabase
          .from('temp_classroom')
          .select('crid, name, description');

        if (error) throw error;
        setClassrooms(data || []);
      } catch (err) {
        console.error('Error fetching classrooms:', err);
        setError('Failed to load classrooms');
      } finally {
        setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchClassrooms();
      // Reset states
      setSelectedClassroom(null);
      setMessage('');
      setError(null);
      setSuccess(null);
    }
  }, [isOpen]);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClassroom) {
      setError('Please select a classroom');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Insert into announcement_board table
      const { error } = await supabase
        .from('announcement_board')
        .insert({
          cid: bookId,
          crid: selectedClassroom,
          message: message || `Book "${bookTitle}" has been assigned to this classroom.`,
          created_at: new Date().toISOString()
        });
      
      if (error) throw error;
      
      // Show success message
      setSuccess(`Successfully assigned "${bookTitle}" to the classroom!`);
      
      // Close modal after successful assignment
      setTimeout(() => {
        onClose();
      }, 2000);
      
    } catch (err) {
      console.error('Error assigning book:', err);
      setError('Failed to assign book to classroom');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X className="h-6 w-6" />
        </button>
        
        <h2 className="text-xl text-black font-semibold mb-4">Assign Book</h2>
        <p className="text-gray-600 mb-4">
          Assign <span className="font-bold">{bookTitle}</span> to a classroom
        </p>
        
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 text-green-700 p-3 rounded-md mb-4">
            {success}
          </div>
        )}
        
        <form onSubmit={handleAssign}>
          <div className="mb-4">
            <label htmlFor="classroom" className="block text-sm font-medium text-gray-700 mb-1">
              Select Classroom
            </label>
            {isLoading ? (
              <div className="h-10 bg-gray-100 rounded animate-pulse"></div>
            ) : classrooms.length > 0 ? (
              <select
                id="classroom"
                value={selectedClassroom || ''}
                onChange={(e) => setSelectedClassroom(parseInt(e.target.value))}
                className="text-black w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">-- Select a classroom --</option>
                {classrooms.map((classroom) => (
                  <option key={classroom.crid} value={classroom.crid}>
                    {classroom.name}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-gray-500">No classrooms available. Please create a classroom first.</p>
            )}
          </div>
          
          <div className="mb-4">
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
              Assignment Message (optional)
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="text-black w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Instructions for students..."
            />
          </div>
          
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="mr-2 px-4 py-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !selectedClassroom || classrooms.length === 0}
              className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300"
            >
              {isLoading ? 'Assigning...' : 'Assign Book'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignBookModal;