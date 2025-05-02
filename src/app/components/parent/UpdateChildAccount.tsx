'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Save } from 'lucide-react';

// Define interface for child data
interface ChildData {
  id: string;
  user_id: string;
  username: string;
  fullname: string;
  age: string;
}

const UpdateChildAccount = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const childId = searchParams.get('childId');

  const [childData, setChildData] = useState<ChildData>({
    id: '',
    user_id: '',
    username: '',
    fullname: '',
    age: '',
  });
  
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [updateLoading, setUpdateLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [parentEmail, setParentEmail] = useState<string>('');

  const fetchChildData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Verify parent permissions to update this child
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Auth error:', userError);
        setError("Authentication error. Please log in again.");
        router.push('/landing');
        return;
      }

      if (!user) {
        setError("No authenticated user found. Please log in.");
        router.push('/landing');
        return;
      }

      // Get parent email from auth system for later use
      setParentEmail(user.email || '');
      
      // Get parent account - Only select the id field
      const { data: parentData, error: parentError } = await supabase
        .from('user_account')
        .select('id')
        .eq('user_id', user.id)
        .eq('upid', 2)
        .single();

      if (parentError) {
        console.error('Parent error:', parentError);
        setError("Error fetching parent profile. Please refresh the page.");
        return;
      }

      // Verify parent relationship with child
      const { data: relationship, error: relationshipError } = await supabase
        .from('isparentof')
        .select('*')
        .eq('parent_id', parentData.id)
        .eq('child_id', childId)
        .single();

      if (relationshipError || !relationship) {
        console.error('Relationship error:', relationshipError);
        setError("You don't have permission to edit this child account.");
        return;
      }

      // Fetch child account details
      const { data: child, error: childError } = await supabase
        .from('user_account')
        .select('id, user_id, username, fullname, age')
        .eq('id', childId)
        .eq('upid', 3)
        .single();

      if (childError) {
        console.error('Child error:', childError);
        setError("Error fetching child account details.");
        return;
      }

      setChildData({
        id: child.id,
        user_id: child.user_id,
        username: child.username || '',
        fullname: child.fullname || '',
        age: child.age ? child.age.toString() : '',
      });
    } catch (err) {
      console.error('Error fetching child data:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [childId, router]);

  useEffect(() => {
    if (!childId) {
      setError('Child ID is missing');
      setLoading(false);
      return;
    }

    fetchChildData();
  }, [childId, fetchChildData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setChildData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const validateProfileForm = () => {
    if (!childData.username.trim()) {
      setError('Username is required');
      return false;
    }
    
    if (!childData.fullname.trim()) {
      setError('Full name is required');
      return false;
    }
    
    if (!childData.age) {
      setError('Age is required');
      return false;
    }
    
    const ageNum = parseInt(childData.age, 10);
    if (Number.isNaN(ageNum) || ageNum <= 0 || ageNum > 17) {
      setError('Age must be a valid number between 1-17');
      return false;
    }
    
    return true;
  };

  const validatePasswordForm = () => {
    if (!newPassword && !confirmPassword) {
      // No password update requested
      return true;
    }
    
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return false;
    }
    
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return false;
    }
    
    return true;
  };

  const updateProfile = async () => {
    try {
      // Update user account profile info
      const { error: updateError } = await supabase
        .from('user_account')
        .update({
          username: childData.username,
          fullname: childData.fullname,
          age: parseInt(childData.age, 10),
        })
        .eq('id', childData.id);
      
      if (updateError) {
        console.error('Profile update error:', updateError);
        throw new Error(`Error updating profile: ${updateError.message}`);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Profile update error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      };
    }
  };

  const storePasswordUpdateData = () => {
    // Store the password update data in localStorage for the reauth flow
    if (typeof window !== 'undefined' && newPassword) {
      try {
        localStorage.setItem('childPasswordUpdate', JSON.stringify({
          childId: childData.id,
          childUserId: childData.user_id,
          newPassword: newPassword,
          parentEmail: parentEmail // Store parent email for the reauth page
        }));
        return true;
      } catch (err) {
        console.error('Error storing password update data:', err);
        return false;
      }
    }
    return false;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate both forms
    if (!validateProfileForm() || !validatePasswordForm()) {
      return;
    }
    
    setUpdateLoading(true);
    setError(null);
    setSuccessMessage('');
    
    try {
      // Update profile
      const profileResult = await updateProfile();
      if (!profileResult.success) {
        throw new Error(profileResult.error || 'Error updating profile');
      }
      
      // If password change is requested, start reauth flow
      if (newPassword) {
        if (storePasswordUpdateData()) {
          // Redirect to reauth page
          router.push(`/parent/reauth?reauth=true&action=updateChildPassword&childId=${childData.id}`);
          return;
        } else {
          throw new Error('Failed to prepare for password update');
        }
      }
      
      setSuccessMessage('Child account updated successfully!');
      
      // Redirect after 2 seconds if no password update
      setTimeout(() => {
        router.push(`/parentpage?success=Child account updated successfully!`);
      }, 2000);
      
    } catch (err) {
      console.error('Error updating child account:', err instanceof Error ? err.message : String(err));
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
    } finally {
      setUpdateLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 py-10 px-6">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-md p-8">
        <div className="flex items-center mb-6">
          <button
            type="button"
            onClick={() => router.push('/parentpage')}
            className="mr-4 p-2 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5 text-gray-700" />
          </button>
          <h1 className="text-2xl font-bold text-gray-800">Update Child Account</h1>
        </div>
        
        {error && (
          <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}
        
        {successMessage && (
          <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-md">
            {successMessage}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-5">
          <div>
            <label htmlFor="fullname" className="block text-sm font-medium text-gray-700 mb-1">
            Full Name
            </label>
          <input
            type="text"
            id="fullname"
            name="fullname"
            value={childData.fullname}
            className="w-full px-4 py-2 border border-gray-200 bg-gray-100 text-black rounded-md cursor-not-allowed"
            readOnly
            />
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={childData.username}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                required
              />
            </div>
            
            
            <div>
              <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1">
                Age
              </label>
              <input
                type="number"
                id="age"
                name="age"
                min="1"
                max="17"
                value={childData.age}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                required
              />
            </div>
            
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-lg font-medium text-gray-800 mb-4">Change Password (Optional)</h3>
              
              <div className="space-y-5">
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                  />
                  <p className="text-sm text-gray-500 mt-1">Leave blank to keep current password</p>
                </div>
                
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-black"
                  />
                </div>
              </div>
            </div>
            
            <div className="pt-6">
              <button
                type="submit"
                disabled={updateLoading}
                className="w-full flex justify-center items-center px-6 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition-colors"
              >
                {updateLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </span>
                ) : (
                  <span className="flex items-center">
                    <Save className="mr-2 h-5 w-5" />
                    Save Changes
                  </span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateChildAccount;