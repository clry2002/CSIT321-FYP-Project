'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { RefreshCw, Settings, LogOut } from 'lucide-react';

interface Child {
  id: string;
  user_id?: string;
  name: string;
  age: number | null;
  history: string[];
}

const ParentDataFetcher = () => {
  const router = useRouter();
  const searchParams = useSearchParams(); 
  const [parentName, setParentName] = useState<string | null>(null);
  const [, setParentId] = useState<string | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [childToDelete, setChildToDelete] = useState<string | null>(null);
  const [childNameToDelete, setChildNameToDelete] = useState<string | null>(null);
  const [canDeleteChild, setCanDeleteChild] = useState(true);

  const fetchParentData = useCallback(async () => {
    setLoading(true);
    setError(null);
    console.log("Fetching parent data...");

    try {
      // Fetch parent delete permission
      const { data: permissionData, error: permissionError } = await supabase
        .from('parentpermissions')
        .select('active')
        .eq('permission', 'disable child deletion')
        .single();

      if (permissionError) {
        console.error('Error fetching parent permissions:', permissionError);
      } else {
        setCanDeleteChild(!permissionData?.active);
      }

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

      const { data: parentData, error: parentError } = await supabase
        .from('user_account')
        .select('id, fullname, username')
        .eq('user_id', user.id)
        .eq('upid', 2)
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
      setParentId(parentData.id);

      const { data: childrenRelations, error: relationsError } = await supabase
        .from('isparentof')
        .select('child_id')
        .eq('parent_id', parentData.id);

      if (relationsError) {
        console.error('Error fetching children relations:', relationsError);
        setError("Error fetching children relationships. Please refresh the page.");
        return;
      }

      console.log("Children relations fetched:", childrenRelations);

      if (!childrenRelations || childrenRelations.length === 0) {
        console.log("No children found for parent:", parentData.id);
        setChildren([]);
        setLoading(false);
        return;
      }

      const childIds = childrenRelations.map(relation => relation.child_id);
      console.log("Child IDs:", childIds);

      const { data: childrenData, error: childrenError } = await supabase
        .from('user_account')
        .select('id, user_id, username, fullname, age')
        .in('id', childIds)
        .eq('upid', 3);

      if (childrenError) {
        console.error('Error fetching children:', childrenError);
        setError("Error fetching children profiles. Please refresh the page.");
        return;
      }

      console.log("Children data fetched:", childrenData);

      const mappedChildren = (childrenData || []).map(child => ({
        id: child.id,
        user_id: child.user_id,
        name: child.fullname || 'Child',
        age: child.age,
        history: []
      }));

      setChildren(mappedChildren);
    } catch (error) {
      console.error('Error in fetchParentData:', error);
      setError("An unexpected error occurred. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    const success = searchParams.get('success');
    if (success) {
      setNotificationMessage(success);
      setShowNotification(true);
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      setTimeout(() => setShowNotification(false), 5000);
    }

    fetchParentData();
  }, [searchParams, fetchParentData]);

  const handleDeleteClick = (childId: string) => {
    const child = children.find(c => c.id === childId);
    setChildToDelete(childId);
    setChildNameToDelete(child ? child.name : null);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!childToDelete) return;
    await deleteChild(childToDelete);
    setShowDeleteConfirm(false);
    setChildToDelete(null);
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setChildToDelete(null);
  };

  const deleteChild = async (id: string) => {
    try {
      setLoading(true);
      setError(null);

      const childToRemove = children.find(child => child.id === id);
      if (!childToRemove) {
        throw new Error('Child not found');
      }

      // Validate whether account deletion will succeed
      if (childToRemove.user_id) {
        try {
          // First validate that the API endpoint is reachable and working
          const testResponse = await fetch('/api/admin/delete-user/validate', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: childToRemove.user_id,
              account_id: childToRemove.id
            }),
          });
  
          if (!testResponse.ok) {
            const contentType = testResponse.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const errorData = await testResponse.json();
              throw new Error(errorData.error || `Validation failed: ${testResponse.status}`);
            } else {
              const text = await testResponse.text();
              throw new Error(`Validation failed: ${testResponse.status}. Response: ${text.substring(0, 100)}...`);
            }
          }
          
          await testResponse.json(); // Consume the response
        } catch (validationError: unknown) {
          console.error('Validation error:', validationError);
          const errorMessage = validationError instanceof Error 
            ? validationError.message 
            : 'Unknown validation error';
          throw new Error(`Cannot proceed with deletion: ${errorMessage}`);
        }
      }

      // Delete from isparentof table first
      const { error: relationError } = await supabase
        .from('isparentof')
        .delete()
        .eq('child_id', id);

      if (relationError) {
        console.error('Error deleting from isparentof:', relationError);
        throw relationError;
      }
      // Delete from child_details table
      const { error: profileError } = await supabase
        .from('child_details')
        .delete()
        .eq('child_id', childToRemove.id);

      if (profileError) {
        console.error('Error deleting from child_profile:', profileError);
        throw profileError;
      }

      // Delete auth user and user_account via API in api/admin/route.ts
      if (childToRemove.user_id){
      const response = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: childToRemove.user_id, account_id: childToRemove.id }),
      });

      if (!response.ok) {
        let errorMessage = `Server error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
        }
        throw new Error(errorMessage);
      }
      
      await response.json(); // Consume the response
    }
    
      // Update local state without refetching
      setChildren(children.filter(child => child.id !== id));
      setNotificationMessage('Child account successfully deleted');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
  } catch (err) {
    console.error('Error deleting child:', err);
    setError(err instanceof Error ? err.message : 'Error deleting child account');
  } finally {
    setLoading(false);
  }
};

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 py-10 px-6 shadow-xl overflow-hidden">
      {showNotification && (
        <div className="fixed top-8 right-8 bg-emerald-500 text-white px-5 py-3 rounded-md shadow-lg z-50 animate-slide-in-right">
          {notificationMessage}
        </div>
      )}

      {error && (
        <div className="fixed top-8 right-8 bg-rose-500 text-white px-5 py-3 rounded-md shadow-lg z-50 animate-slide-in-right">
          {error}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-800 mb-5">Confirm Deletion</h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              Are you sure you want to permanently delete{' '}
              <span className="font-medium text-indigo-600">{childNameToDelete}</span>&apos;s account? This action is irreversible.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={handleDeleteCancel}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
              Welcome back, <span className="text-indigo-600">{parentName || 'Parent'}</span>!
            </h1>
            <p className="mt-1 text-md text-gray-500">Manage your child&apos;s digital world.</p>
          </div>
          <div className="space-x-4">
            <button
              className="inline-flex items-center px-4 py-2 bg-indigo-500 text-white rounded-md font-semibold text-sm hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition-colors"
              onClick={fetchParentData}
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Refresh
            </button>
            <button
              className="inline-flex items-center px-4 py-2 bg-gray-800 text-white rounded-md font-semibold text-sm hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-opacity-50 transition-colors"
              onClick={() => router.push('/parent/settings')}
            >
              <Settings className="h-5 w-5 mr-2" />
              Settings
            </button>
            <button
              className="inline-flex items-center px-4 py-2 bg-red-500 text-white rounded-md font-semibold text-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-colors"
              onClick={() => router.push('/logout')}
            >
              <LogOut className="h-5 w-5 mr-2" />
              Logout
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-5">Child Accounts</h2>
          {children.length > 0 ? (
            <div className="space-y-4">
              {children.map((child) => (
                <div
                  key={child.id}
                  className="bg-gray-50 border border-gray-200 rounded-md p-4 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4">
                    <div>
                      <h3
                        className="font-medium text-gray-800 cursor-pointer hover:text-indigo-600 transition-colors"
                        onClick={() => router.push(`/parent/viewchild?childId=${child.id}`)}
                      >
                        {child.name}
                      </h3>
                      <p className="text-gray-500 text-sm">
                        Age: {child.age !== null ? child.age : 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <div className="space-x-2 flex items-center">
                    <button
                      className="bg-indigo-500 text-white px-3 py-1 rounded-md text-sm hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition-colors"
                      onClick={() => router.push(`/parent/viewchild?childId=${child.id}`)}
                    >
                      View
                    </button>
                    <button
                      className="bg-blue-400 text-white px-3 py-1 rounded-md text-sm hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 transition-colors"
                      onClick={() => router.push(`/parent/chathistory?childId=${child.id}`)}
                    >
                      Chat History
                    </button>
                    <button
                      className="bg-yellow-500 text-white px-3 py-1 rounded-md text-sm hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50 transition-colors"
                      onClick={() => router.push(`/parent/parentalcontrol/${child.id}`)}
                    >
                      Parental Controls
                    </button>
                    {canDeleteChild && (
                      <button
                        className="bg-red-500 text-white px-3 py-1 rounded-md text-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-colors"
                        onClick={() => handleDeleteClick(child.id)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 py-3">No child profiles added yet.</p>
          )}

          <button
            className="w-full mt-6 inline-flex items-center justify-center px-4 py-3 bg-emerald-500 text-white rounded-md font-semibold text-sm hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 transition-colors"
            onClick={() => router.push('/parent/createchild')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Child Account
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ParentHome() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading parent data...</div>}>
      <ParentDataFetcher />
    </Suspense>
  );
}