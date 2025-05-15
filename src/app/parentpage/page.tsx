'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { RefreshCw, Settings, LogOut, PlusCircle, User, Clock, Shield, Edit, Trash2 } from 'lucide-react';
import { deleteChildAccount } from '@/app/components/parent/ChildDeletion';

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
      .from('profile_permissions')
      .select('active')
      .eq('upid', 2)
      .eq('permission_key', 'disable_child_deletion')
      .single();

      if (permissionError && permissionError.code !== 'PGRST116') { // PGRST116 is "not found" error
      console.error('Error fetching parent permissions:', permissionError);
      } else {
      // If permission exists and is active, disable child deletion
      setCanDeleteChild(!(permissionData?.active || false));
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
    
    const childToRemove = children.find(child => child.id === childToDelete);
    if (!childToRemove) {
      setError('Child not found');
      setShowDeleteConfirm(false);
      return;
    }
    
    const result = await deleteChildAccount(
      childToDelete,
      childToRemove,
      setLoading,
      setError
    );
    
    if (result.success) {
      // Update local state without refetching
      setChildren(children.filter(child => child.id !== childToDelete));
      setNotificationMessage(result.message);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    }
    
    setShowDeleteConfirm(false);
    setChildToDelete(null);
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    setChildToDelete(null);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-200">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-700 text-lg font-medium">Loading dashboard...</p>
      </div>
    );
  }

  // Function to get a color based on the child's name (for consistent avatar colors)
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-pink-500', 
      'bg-yellow-500', 'bg-red-500', 'bg-indigo-500', 'bg-cyan-500'
    ];
    
    // Simple hash function to get consistent color for the same name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  // Function to get initials from name
  const getInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length === 1) return name.charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-200 py-6 px-4 md:px-6 lg:px-8 shadow-xl overflow-hidden">
      {/* Notification */}
      {showNotification && (
        <div className="fixed top-8 right-8 bg-emerald-500 text-white px-5 py-3 rounded-md shadow-lg z-50 animate-fade-in">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            {notificationMessage}
          </div>
        </div>
      )}

      {/* Error notification */}
      {error && (
        <div className="fixed top-8 right-8 bg-rose-500 text-white px-5 py-3 rounded-md shadow-lg z-50 animate-fade-in">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white p-8 rounded-xl shadow-2xl max-w-md w-full mx-4 animate-scale-in">
            <div className="flex items-center justify-center mb-5 w-16 h-16 mx-auto bg-red-100 text-red-600 rounded-full">
              <Trash2 size={30} />
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2 text-center">Confirm Deletion</h3>
            <p className="text-gray-600 mb-6 leading-relaxed text-center">
              Are you sure you want to permanently delete{' '}
              <span className="font-medium text-indigo-600">{childNameToDelete}</span>&apos;s account?
              <br />
              <span className="text-sm text-red-500">This action cannot be undone.</span>
            </p>
            <div className="flex justify-center space-x-4">
              <button
                onClick={handleDeleteCancel}
                className="px-5 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50 transition-all font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-5 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-all font-medium flex items-center"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Header with user welcome */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
                Welcome back, <span className="text-indigo-600">{parentName || 'Parent'}</span>!
              </h1>
              <p className="mt-1 text-md text-gray-500">Manage your child&apos;s digital world from one place</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                className="inline-flex items-center px-4 py-2 bg-emerald-500 text-white rounded-md font-medium text-sm hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-opacity-50 transition-all shadow-sm"
                onClick={() => router.push('/parent/createchild')}
              >
                <PlusCircle className="h-5 w-5 mr-2" />
                Add Child
              </button>
              <button
                className="inline-flex items-center px-4 py-2 bg-indigo-500 text-white rounded-md font-medium text-sm hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition-all shadow-sm"
                onClick={fetchParentData}
              >
                <RefreshCw className="h-5 w-5 mr-2" />
                Refresh
              </button>
              <button
                className="inline-flex items-center px-4 py-2 bg-gray-800 text-white rounded-md font-medium text-sm hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-800 focus:ring-opacity-50 transition-all shadow-sm"
                onClick={() => router.push('/parent/settings')}
              >
                <Settings className="h-5 w-5 mr-2" />
                Settings
              </button>
              <button
                className="inline-flex items-center px-4 py-2 bg-red-500 text-white rounded-md font-medium text-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 transition-all shadow-sm"
                onClick={() => router.push('/logout')}
              >
                <LogOut className="h-5 w-5 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Child accounts section */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center">
            <User className="h-5 w-5 mr-2 text-indigo-500" />
            Child Accounts
            <span className="ml-3 bg-indigo-100 text-indigo-700 text-sm py-1 px-3 rounded-full">
              {children.length} {children.length === 1 ? 'Account' : 'Accounts'}
            </span>
          </h2>

          {children.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {children.map((child) => (
                <div
                  key={child.id}
                  className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-all flex flex-col"
                >
                  <div className="flex items-center mb-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg ${getAvatarColor(child.name)}`}>
                      {getInitials(child.name)}
                    </div>
                    <div className="ml-4">
                      <h3
                        className="font-semibold text-gray-800 text-lg cursor-pointer hover:text-indigo-600 transition-colors"
                        onClick={() => router.push(`/parent/viewchild?childId=${child.id}`)}
                      >
                        {child.name}
                      </h3>
                      <p className="text-gray-500 text-sm">
                        Age: {child.age !== null ? child.age : 'Not specified'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-auto grid grid-cols-2 gap-2">
                    <button
                      className="flex items-center justify-center px-3 py-2 bg-indigo-100 text-indigo-700 rounded-md text-sm hover:bg-indigo-200 focus:outline-none transition-colors"
                      onClick={() => router.push(`/parent/viewchild?childId=${child.id}`)}
                    >
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </button>
                    <button
                      className="flex items-center justify-center px-3 py-2 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200 focus:outline-none transition-colors"
                      onClick={() => router.push(`/parent/chathistory?childId=${child.id}`)}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      History
                    </button>
                    <button
                      className="flex items-center justify-center px-3 py-2 bg-yellow-100 text-yellow-700 rounded-md text-sm hover:bg-yellow-200 focus:outline-none transition-colors"
                      onClick={() => router.push(`/parent/parentalcontrol/${child.id}`)}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Controls
                    </button>
                    <button
                      className="flex items-center justify-center px-3 py-2 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200 focus:outline-none transition-colors"
                      onClick={() => router.push(`/parent/updatechild?childId=${child.id}`)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </button>
                    {canDeleteChild && (
                      <button
                        className="col-span-2 flex items-center justify-center px-3 py-2 bg-red-100 text-red-700 rounded-md text-sm hover:bg-red-200 focus:outline-none transition-colors mt-2"
                        onClick={() => handleDeleteClick(child.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Account
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="bg-indigo-100 text-indigo-500 rounded-full p-3">
                  <User size={32} />
                </div>
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-2">No child account added yet</h3>
              <p className="text-gray-600 mb-6">Create your first child account to get started</p>
              <button
                className="inline-flex items-center px-5 py-2 bg-indigo-500 text-white rounded-md font-medium text-sm hover:bg-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 transition-colors"
                onClick={() => router.push('/parent/createchild')}
              >
                <PlusCircle className="h-5 w-5 mr-2" />
                Add Your Child Now
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ParentHome() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-gray-50 to-gray-200">
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-700 text-lg font-medium">Loading parent dashboard...</p>
      </div>
    }>
      <ParentDataFetcher />
    </Suspense>
  );
}