'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function CreateClassroom() {
  const router = useRouter();
  const [classroomName, setClassroomName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(''); // Reset error message
  
    try {
      // Get the current authenticated user
      const {
        data: { user },
        error: userError
      } = await supabase.auth.getUser();
  
      if (userError || !user) {
        throw new Error(userError?.message || 'User not authenticated');
      }
  
      const {
        data: userData,
        error: userAccountError
      } = await supabase
        .from('user_account')
        .select('id')
        .eq('user_id', user.id)
        .single();
  
      if (userAccountError || !userData) {
        throw new Error(userAccountError?.message || 'Failed to fetch user account');
      }
  
      const uaid_educator = userData.id;
  
      // Check if classroom name already exists
      const { data: existingClassroom, error: duplicateCheckError } = await supabase
        .from('temp_classroom')
        .select('name')
        .eq('name', classroomName)
        .single();
  
      if (existingClassroom) {
        setErrorMessage('Classroom name already exists. Please type another classroom name.');
        return;
      }

      const { error: insertError } = await supabase
        .from('temp_classroom')
        .insert([
          {
            name: classroomName,
            description,
            uaid_educator
          }
        ]);
  
      if (insertError) {
        throw new Error(insertError.message);
      }
  
      router.push('/teacherpage');
  
    } catch (error: any) {
      console.error('Error creating classroom:', error);
      setErrorMessage(error.message || 'Failed to create classroom');
    } finally {
      setLoading(false);
    }
  };
  

  // Optional: Check for authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error || !data.session) {
        console.log('User not authenticated, redirecting to login');
        router.push('/login'); // Redirect to login if not authenticated
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-6 py-30">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-serif text-black">Create Classroom</h1>
        </div>

        {/* Form Section */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="classroomName" className="text-gray-700">Classroom Name</label>
              <input
                id="classroomName"
                type="text"
                value={classroomName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setClassroomName(e.target.value)}
                className="mt-2 px-4 py-2 w-full border border-gray-300 rounded-lg text-black"
                placeholder="Enter classroom name"
                required
              />
            </div>
            {errorMessage && (
            <p className="text-red-600 text-sm mt-1">{errorMessage}</p>
            )}
            <div>
              <label htmlFor="description" className="text-gray-700">Description</label>
              <textarea
                id="description"
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setDescription(e.target.value)}
                className="mt-2 px-4 py-2 w-full border border-gray-300 rounded-lg text-black"
                placeholder="Enter classroom description"
                required
              />
            </div>

            <div className="flex justify-end mt-4">
              <button
                type="submit"
                className="bg-blue-500 text-white px-6 py-2 rounded-lg"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Classroom'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
