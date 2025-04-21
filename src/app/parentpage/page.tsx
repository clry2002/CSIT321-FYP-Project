'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

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

  const fetchParentData = useCallback(async () => {
    setLoading(true);
    setError(null);
    console.log("Fetching parent data...");

    try {
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

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete child account');
      }
      // Update local state without refetching
      setChildren(children.filter(child => child.id !== id));
      setNotificationMessage('Child account successfully deleted');
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    }
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
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      {showNotification && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {notificationMessage}
        </div>
      )}

      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
          {error}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-black">Confirm Deletion</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <span className="font-medium">{childNameToDelete}</span>&apos;s account? This action cannot be undone.
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

      <div className="flex-1 overflow-y-auto px-6 py-5">
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
              onClick={() => router.push('/parent/settings')}
            >
              Settings
            </button>
            <button
              className="bg-red-600 text-white px-4 py-2 rounded-lg"
              onClick={() => router.push('/logout')}
            >
              Logout
            </button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-serif mb-3 text-black">Child Profiles</h2>
            {children.length > 0 ? (
              children.map((child) => (
                <div key={child.id} className="flex items-center justify-between mb-3 p-2 border border-gray-200 rounded">
                  <div>
                    <h3
                      className="font-medium text-black text-sm cursor-pointer hover:text-blue-500"
                      onClick={() => router.push(`/parent/viewchild?childId=${child.id}`)}
                    >
                      {child.name}
                    </h3>
                    <p className="text-gray-500 text-xs">Age: {child.age !== null ? child.age : 'Unknown'}</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
                      onClick={() => router.push(`/parent/viewchild?childId=${child.id}`)}
                    >
                      View
                    </button>
                    <button
                      className="bg-red-500 text-white px-2 py-1 rounded text-xs"
                      onClick={() => handleDeleteClick(child.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm p-3">No child profiles available. Add a child below.</p>
            )}
            <button
              className="bg-green-500 text-white px-4 py-2 rounded-lg w-full mt-4"
              onClick={() => router.push('/parent/createchild')}
            >
              + Add Child
            </button>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-serif mb-3 text-black">Child ChatBot History</h2>
            {children.length > 0 ? (
              children.map((child) => (
                <div key={child.id} className="mb-3 p-2 border border-gray-200 rounded">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-medium text-sm text-black">{child.name}&apos;s History</h3>
                      <ul className="list-disc list-inside text-gray-600 text-xs">
                        {child.history?.length ? (
                          child.history.map((entry, index) => <li key={index}>{entry}</li>)
                        ) : (
                          <li>No history available</li>
                        )}
                      </ul>
                    </div>
                    <button
                      className="bg-blue-500 text-white px-2 py-1 rounded text-xs"
                      onClick={() => router.push(`/parent/chathistory?childId=${child.id}`)}
                    >
                      View History
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm p-3">No chatbot history available. Add a child first.</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-serif mb-3 text-black">Parental Control</h2>
            {children.length > 0 ? (
              children.map((child) => (
                <button
                  key={child.id}
                  className="block w-full text-center text-md bg-blue-500 text-white mb-2 p-3 rounded"
                  onClick={() => router.push(`/parent/parentalcontrol/${child.id}`)}
                >
                  {child.name}&apos;s Settings
                </button>
              ))
            ) : (
              <p className="text-gray-500 text-sm p-3">No settings available. Add a child first.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ParentHome() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading parent data...</div>}>
      <ParentDataFetcher />
    </Suspense>
  );
}