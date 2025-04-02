'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ParentHome() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [parentName, setParentName] = useState<string | null>(null);
  const [parentUsername, setParentUsername] = useState<string | null>(null);
  const [children, setChildren] = useState<Array<{
    id: string;
    name: string;
    age: number;
    history: string[];
  }>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [childToDelete, setChildToDelete] = useState<string | null>(null);

  useEffect(() => {
    // Check for success message in URL
    const success = searchParams.get('success');
    if (success) {
      setNotificationMessage(success);
      setShowNotification(true);
      // Remove the success parameter from URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      // Hide notification after 5 seconds
      setTimeout(() => setShowNotification(false), 5000);
    }
    
    // Always fetch parent data when component mounts or when url params change
    fetchParentData();
  }, [searchParams]);

  const fetchParentData = async () => {
    setLoading(true);
    setError(null);
    console.log("Fetching parent data...");
    
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error("Error getting auth user:", userError);
        setError("Authentication error. Please log in again.");
        router.push('/landing');
        return;
      }
      
      if (!user) {
        console.log("No authenticated user found");
        setError("No authenticated user found. Please log in.");
        router.push('/landing');
        return;
      }
      
      console.log("Authenticated user ID:", user.id);

      // Fetch parent's full name from user_account
      const { data: parentData, error: parentError } = await supabase
        .from('user_account')
        .select('fullname, username')
        .eq('user_id', user.id)
        .eq('upid', 4) // upid for parent
        .single();

      if (parentError) {
        console.error('Error fetching parent data:', parentError);
        setError("Error fetching parent profile. Please refresh the page.");
        return;
      }

      if (!parentData) {
        console.log("No parent profile found for user ID:", user.id);
        setError("Parent profile not found. Please contact support.");
        return;
      }

      console.log("Parent data fetched:", parentData);
      setParentName(parentData.fullname || 'Parent');
      setParentUsername(parentData.username);

      // Fetch children through isparentof relationship
      const { data: childrenRelations, error: relationsError } = await supabase
        .from('isparentof')
        .select('child')
        .eq('parent', parentData.username);

      if (relationsError) {
        console.error('Error fetching children relations:', relationsError);
        setError("Error fetching children relationships. Please refresh the page.");
        return;
      }

      console.log("Children relations fetched:", childrenRelations);

      if (!childrenRelations || childrenRelations.length === 0) {
        console.log("No children found for parent:", parentData.username);
        setChildren([]);
        return;
      }

      // Get child usernames from the relations
      const childUsernames = childrenRelations.map(relation => relation.child);
      console.log("Child usernames:", childUsernames);

      // Fetch children data from user_account
      const { data: childrenData, error: childrenError } = await supabase
        .from('user_account')
        .select('user_id, username, fullname, age')
        .in('username', childUsernames)
        .eq('upid', 5); // upid for child

      if (childrenError) {
        console.error('Error fetching children:', childrenError);
        setError("Error fetching children profiles. Please refresh the page.");
        return;
      }

      console.log("Children data fetched:", childrenData);

      // Map the data to match the expected type
      const mappedChildren = (childrenData || []).map(child => ({
        id: child.username,
        name: child.fullname || 'Child',
        age: child.age || 0,
        history: [] // We'll fetch history separately if needed
      }));

      setChildren(mappedChildren);
    } catch (error) {
      console.error('Error in fetchParentData:', error);
      setError("An unexpected error occurred. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  };

  // Function to handle delete confirmation
  const handleDeleteClick = (childId: string) => {
    setChildToDelete(childId);
    setShowDeleteConfirm(true);
  };

  // Function to handle actual deletion
  const handleDeleteConfirm = async () => {
    if (!childToDelete) return;
    await deleteChild(childToDelete);
    setShowDeleteConfirm(false);
    setChildToDelete(null);
  };

  // Function to cancel deletion
  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setChildToDelete(null);
  };

  // Function to delete a child profile
  const deleteChild = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      // First get the child's username
      const { data: childData, error: childError } = await supabase
        .from('user_account')
        .select('username')
        .eq('user_id', id)
        .single();

      if (childError) throw childError;
      if (!childData) throw new Error('Child not found');

      // Delete from isparentof
      const { error: relationError } = await supabase
        .from('isparentof')
        .delete()
        .eq('child', childData.username);

      if (relationError) throw relationError;

      // Delete from child_profile
      const { error: profileError } = await supabase
        .from('child_profile')
        .delete()
        .eq('child_id', id);

      if (profileError) throw profileError;

      // Delete from user_account
      const { error: accountError } = await supabase
        .from('user_account')
        .delete()
        .eq('user_id', id);

      if (accountError) throw accountError;

      // Refresh the children list
      await fetchParentData();
      setNotificationMessage('Child profile successfully deleted');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    } catch (err) {
      console.error('Error deleting child:', err);
      setError('Error deleting child profile');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      {/* Floating Notification */}
      {showNotification && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {notificationMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {error}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Confirm Deletion</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this child's profile? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* Header Section */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-serif text-black">Welcome back, {parentName || ""}!</h1>
          <div className="flex space-x-3">
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded-lg"
              onClick={() => fetchParentData()}
            >
              Refresh Data
            </button>
            <button
              className="bg-gray-900 text-white px-4 py-2 rounded-lg"
              onClick={() => console.log('Open Settings')}
            >
              Settings
            </button>
            <button
              className="bg-red-600 text-white px-4 py-2 rounded-lg"
              onClick={async () => {
                await supabase.auth.signOut();
                router.push('/landing');
              }}
            >
              Logout
            </button>
          </div>
        </div>

        <div className="space-y-5">
          {/* Child Profiles Section */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-serif mb-3 text-black">Child Profiles</h2>
            {children.length > 0 ? (
              children.map((child) => (
                <div key={child.id} className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-black text-sm">{child.name}</h3>
                    <p className="text-gray-500 text-xs">Age: {child.age || 'Unknown'}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      className="text-blue-500 text-xs underline"
                      onClick={() => router.push('/parent/editchild')}
                    >
                      Manage Profile
                    </button>
                    <button
                      className="text-red-500 text-xs underline"
                      onClick={() => handleDeleteClick(child.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No child profiles available.</p>
            )}
            <button
              className="bg-green-500 text-white px-4 py-2 rounded-lg w-full mt-4"
              onClick={() => router.push('/parent/createchild')}
            >
              + Add Child
            </button>
          </div>

          {/* Child Chatbot History Section */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-serif mb-3 text-black">Child ChatBot History</h2>
            {children.length > 0 ? (
              children.map((child) => (
                <div key={child.id} className="mb-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium text-sm text-black">{child.name}'s History</h3>
                      <ul className="list-disc list-inside text-gray-600 text-xs">
                        {child.history?.length ? (
                          child.history.map((entry, index) => <li key={index}>{entry}</li>)
                        ) : (
                          <li>No history available</li>
                        )}
                      </ul>
                    </div>
                    <button
                      className="text-blue-500 text-xs underline ml-4"
                      onClick={() => router.push('/parent/chathistory')}
                    >
                      View History
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No chatbot history available.</p>
            )}
          </div>

          {/* Child Profile Settings Section */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-serif mb-3 text-black">Parental Control</h2>
            {children.length > 0 ? (
              children.map((child) => (
                <button
                  key={child.id}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg w-full mb-2"
                  onClick={() => router.push('/parent/parentalcontrol')}
                >
                  Manage {child.name}'s Profile
                </button>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No children to manage.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}