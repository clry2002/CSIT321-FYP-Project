'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface DeleteClassroomProps {
  classroomId: number;
  classroomName: string;
}

export default function DeleteClassroom({ classroomId, classroomName }: DeleteClassroomProps) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const router = useRouter();

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setDeleteError(null);

      // First, delete all students associated with this classroom
      const { error: deleteStudentsError } = await supabase
        .from('temp_classroomstudents')
        .delete()
        .eq('crid', classroomId);

      if (deleteStudentsError) {
        setDeleteError('Failed to remove students from the classroom.');
        console.error('Delete classroom students error:', deleteStudentsError);
        setIsDeleting(false);
        return;
      }

      // Then delete the classroom itself
      const { error: deleteClassroomError } = await supabase
        .from('temp_classroom')
        .delete()
        .eq('crid', classroomId);

      if (deleteClassroomError) {
        setDeleteError('Failed to delete classroom.');
        console.error('Delete classroom error:', deleteClassroomError);
      } else {
        router.back();
      }
    } catch (err) {
      console.error('Error in deletion process:', err);
      setDeleteError('An unexpected error occurred while deleting the classroom.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsConfirmingDelete(true)}
        className="bg-red-500 text-white px-4 py-2 rounded mt-4"
      >
        Delete Classroom
      </button>

      {/* Delete confirmation modal */}
      {isConfirmingDelete && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg w-1/3">
            <h2 className="text-lg font-semibold text-black mb-4">
              Are you sure you want to delete &quot;{classroomName}&quot;?
            </h2>
            <p className="text-gray-600 mb-4">
              This will permanently delete the classroom and remove all associated students.
            </p>
            {deleteError && (
              <p className="text-red-500 mb-4">{deleteError}</p>
            )}
            <div className="flex justify-end gap-4">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className={`bg-red-500 text-white px-4 py-2 rounded ${isDeleting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button
                onClick={() => setIsConfirmingDelete(false)}
                disabled={isDeleting}
                className="bg-gray-500 text-white px-4 py-2 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}