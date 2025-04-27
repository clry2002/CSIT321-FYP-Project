'use client';

import { supabase } from '@/lib/supabase';
import { useState } from 'react';

interface RemoveAnnouncementProps {
  announcementId: number;
  classroomId: number;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export const removeAnnouncement = async ({
  announcementId,
  classroomId,
  onSuccess,
  onError
}: RemoveAnnouncementProps): Promise<boolean> => {
  try {
    // Verify classroom ID matches the announcement's classroom (security check)
    const { data: announcementCheck, error: checkError } = await supabase
      .from('announcement_board')
      .select('crid')
      .eq('abid', announcementId)
      .single();
      
    if (checkError) {
      console.error('Error verifying announcement:', checkError);
      onError?.('Failed to verify announcement');
      return false;
    }
    
    // Make sure the announcement belongs to this classroom
    if (announcementCheck.crid !== classroomId) {
      console.error('Classroom ID mismatch');
      onError?.('This announcement does not belong to this classroom');
      return false;
    }
    
    // Delete the announcement
    const { error } = await supabase
      .from('announcement_board')
      .delete()
      .eq('abid', announcementId);
      
    if (error) {
      console.error('Error removing announcement:', error);
      onError?.('Failed to remove announcement');
      return false;
    }
    
    // Call the success callback if provided
    onSuccess?.();
    return true;
    
  } catch (err) {
    console.error('Error in removeAnnouncement:', err);
    onError?.(err instanceof Error ? err.message : 'An unknown error occurred');
    return false;
  }
};

/**
 * Hook to manage announcement removal state and actions
 * 
 * @returns Object containing removal functions and state
 */
export const useAnnouncementRemoval = (classroomId: number) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Handle removal with state management
  const handleRemoveAnnouncement = async (announcementId: number) => {
    setIsRemoving(true);
    setError(null);
    setSuccessMessage(null);
    
    const success = await removeAnnouncement({
      announcementId,
      classroomId,
      onSuccess: () => {
        setSuccessMessage('Announcement removed successfully');
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      },
      onError: (errorMsg) => {
        setError(errorMsg);
      }
    });
    
    setIsRemoving(false);
    return success;
  };
  
  return {
    handleRemoveAnnouncement,
    isRemoving,
    error,
    successMessage,
    clearError: () => setError(null),
    clearSuccessMessage: () => setSuccessMessage(null)
  };
};


export const RemoveAnnouncementButton: React.FC<{
  announcementId: number;
  classroomId: number;
  onRemoved: () => void;
}> = ({ announcementId, classroomId, onRemoved }) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  
  const handleRemove = async () => {
    setIsRemoving(true);
    
    await removeAnnouncement({
      announcementId,
      classroomId,
      onSuccess: () => {
        onRemoved();
      },
      onError: (error) => {
        alert(`Error: ${error}`);
      }
    });
    
    setIsRemoving(false);
    setIsConfirming(false);
  };
  
  if (isConfirming) {
    return (
      <div className="flex items-center space-x-2">
        <button
          onClick={handleRemove}
          disabled={isRemoving}
          className="bg-red-600 text-white text-xs px-2 py-1 rounded hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isRemoving ? 'Removing...' : 'Confirm'}
        </button>
        <button
          onClick={() => setIsConfirming(false)}
          disabled={isRemoving}
          className="bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded hover:bg-gray-300 disabled:bg-gray-100 disabled:cursor-not-allowed"
        >
          Cancel
        </button>
      </div>
    );
  }
  
  return (
    <button
      onClick={() => setIsConfirming(true)}
      className="text-red-600 text-xs hover:text-red-800 hover:underline"
    >
      Remove
    </button>
  );
};

export default removeAnnouncement;