'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { UserAccount, NewUser, ParentChildRelationship, ClassroomData, DiscussionData } from './types';
import * as api from './api';
import * as handlers from './handlers';
import * as utils from './utils';
import UserDetailsModal from './components/UserDetailsModal';
import ResetPasswordModal from './components/ResetPasswordModal';

export default function AdminPage() {
  const router = useRouter();
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  const [suspendComment, setSuspendComment] = useState('');
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [newUser, setNewUser] = useState<NewUser>({
    fullname: '',
    username: '',
    age: null,
    upid: 1,
    email: '',
    password: '',
  });
  const [modalMessage, setModalMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [step, setStep] = useState<'auth' | 'details'>('auth');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [selectedUserType, setSelectedUserType] = useState<number | null>(null);
  const [showUserTypeDropdown, setShowUserTypeDropdown] = useState(false);
  const [relationships, setRelationships] = useState<ParentChildRelationship[]>([]);
  const [showModifyModal, setShowModifyModal] = useState(false);
  const [selectedParentForModify, setSelectedParentForModify] = useState<{
    username: string;
    name: string;
    age: number | null;
  } | null>(null);
  const [newChildStep, setNewChildStep] = useState<'auth' | 'details'>('auth');
  const [newChild, setNewChild] = useState<NewUser>({
    fullname: '',
    username: '',
    age: null,
    upid: 5, // Child type
    email: '',
    password: '',
  });
  const [newChildAuthUserId, setNewChildAuthUserId] = useState<string | null>(null);
  const [newChildModalMessage, setNewChildModalMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [showAllRelationships, setShowAllRelationships] = useState(false);
  const [isCreatingParent, setIsCreatingParent] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showDeleteParentModal, setShowDeleteParentModal] = useState(false);
  const [deleteParentError, setDeleteParentError] = useState<string | null>(null);
  const [deleteUserError, setDeleteUserError] = useState<string | null>(null);
  const [classrooms, setClassrooms] = useState<ClassroomData[]>([]);
  const [loadingClassrooms, setLoadingClassrooms] = useState(true);
  const [showAllClassrooms, setShowAllClassrooms] = useState(false);
  const [showDiscussionModal, setShowDiscussionModal] = useState(false);
  const [selectedDiscussion, setSelectedDiscussion] = useState<DiscussionData | null>(null);
  const [loadingDiscussion, setLoadingDiscussion] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUserTypeFilter, setSelectedUserTypeFilter] = useState<number | null>(null);
  const [showUserTypeDropdown, setShowUserTypeDropdown] = useState(false);
  const [deleteSuccessMessage, setDeleteSuccessMessage] = useState<string | null>(null);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedUserForPasswordReset, setSelectedUserForPasswordReset] = useState<UserAccount | null>(null);
  const [showRemoveChildModal, setShowRemoveChildModal] = useState(false);
  const [childToRemove, setChildToRemove] = useState<{ username: string; fullname: string; parentUsername: string } | null>(null);
  const [removeChildSuccess, setRemoveChildSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [accountsData, relationshipsData, classroomsData] = await Promise.all([
        api.fetchUserAccounts(),
        api.fetchRelationships(),
        api.fetchClassrooms()
      ]);

      setUserAccounts(accountsData);
      setRelationships(relationshipsData.map(rel => ({
        parent: rel.parent.username,
        child: rel.child.username
      })));
      setClassrooms(classroomsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
    } finally {
      setLoading(false);
      setLoadingClassrooms(false);
    }
  };

  const handleCreateAuth = () => {
    handlers.handleCreateAuth(newUser, setModalMessage, setAuthUserId, setStep);
  };

  const handleCreateAccount = () => {
    handlers.handleCreateAccount(newUser, authUserId, setModalMessage, () => {
      fetchData();
        setShowNewUserModal(false);
        router.refresh();
    });
  };

  const handleSuspendUser = async () => {
    if (!selectedUser) return;

    try {
      await handlers.handleSuspendUser(user, suspendComment, (username, suspended, comments) => {
      setUserAccounts(userAccounts.map(u => 
          u.username === username 
            ? { ...u, suspended, comments }
          : u
      ));
      setShowSuspendModal(false);
      setSelectedUser(null);
      setSuspendComment('');
      setShowUserModal(false);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while suspending user');
    }
  };

  const handleRevertSuspension = async () => {
    if (!selectedUser) return;

    try {
      await handlers.handleRevertSuspension(user, (username, suspended, comments) => {
      setUserAccounts(userAccounts.map(u => 
          u.username === username 
            ? { ...u, suspended, comments }
          : u
      ));
      setShowRevertModal(false);
      setSelectedUser(null);
      setShowUserModal(false);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while reverting suspension');
    }
  };

  const handleDeleteUsers = () => {
    const deletedUsers = userAccounts.filter(user => selectedRows.includes(user.username));
    handlers.handleDeleteUsers(selectedRows, userAccounts, () => {
      setUserAccounts(userAccounts.filter(user => !selectedRows.includes(user.username)));
      setSelectedRows([]);
      setShowDeleteModal(false);
      setDeleteSuccessMessage(`Successfully deleted ${deletedUsers.map(u => u.fullname).join(', ')}`);
      setTimeout(() => {
        setDeleteSuccessMessage(null);
        router.refresh();
      }, 3000);
    }, setDeleteUserError);
  };

  const handleUpdateUser = async (username: string, field: string, value: string | number) => {
    try {
      await handlers.handleUpdateUser(username, field, value, (username, field, value) => {
        setUserAccounts(userAccounts.map(user => 
          user.username === username 
            ? { ...user, [field]: value }
            : user
        ));
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while updating user');
    }
  };

  const handleResetPassword = (user: UserAccount) => {
    setSelectedUserForPasswordReset(user);
    setShowResetPasswordModal(true);
    setShowUserModal(false); // Close the user details modal
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push('/');
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  const handleUserClick = async (username: string) => {
    try {
      // First try to find the user in userAccounts
      const user = userAccounts.find(u => u.username === username || u.fullname === username);
      if (user) {
        setSelectedUser(user);
        setShowUserModal(true);
        return;
      }

      // If not found in userAccounts, fetch from database
      const { data, error } = await supabase
        .from('user_account')
        .select('*')
        .or(`username.eq.${username},fullname.eq.${username}`)
        .single();

      if (error) throw error;
      
      if (data) {
        setSelectedUser(data as UserAccount);
        setShowUserModal(true);
      }
    } catch (err) {
      console.error('Error fetching user details:', err);
    }
  };

  const fetchDiscussionData = async (classroomId: number, classroomName: string) => {
    setLoadingDiscussion(true);
    try {
      const discussionData = await api.fetchDiscussionData(classroomId);
      setSelectedDiscussion({
        classroomName,
        ...discussionData
      });
    } catch (err) {
      console.error('Error fetching discussion data:', err);
    } finally {
      setLoadingDiscussion(false);
    }
  };

  const filteredAndSortedUsers = utils.filterAndSortUsers(
    userAccounts,
    searchQuery,
    selectedStatusFilter,
    selectedUserTypeFilter,
    sortOrder,
    createdAtSort,
    updatedAtSort
  );


  const getChildrenForParent = (parentUsername: string) => {
    // First, get the child usernames from isparentof table for this parent
    const childUsernames = relationships
      .filter(rel => rel.parent === parentUsername)
      .map(rel => rel.child);
    
    // Then, get the full user objects for these children from user_account table
    return userAccounts.filter(user => childUsernames.includes(user.username) && user.upid === 3); // upid 3 for Child
  };

  const getChildName = (username: string) => {
    const child = userAccounts.find(user => user.username === username);
    return child ? child.fullname : username;
  };

  const getChildAge = (username: string) => {
    const child = userAccounts.find(user => user.username === username);
    return child ? child.age : null;
  };

  const getGroupedRelationships = () => {
    // First, get all parents from user_account
    const allParents = userAccounts.filter(user => user.upid === 2);
    
    // Create a map of existing relationships
    const relationshipMap = relationships.reduce((acc, rel) => {
      if (!acc[rel.parent]) {
        acc[rel.parent] = [];
      }
      acc[rel.parent].push({
        username: rel.child,
        fullname: getChildName(rel.child),
        age: getChildAge(rel.child)
      });
      return acc;
    }, {} as Record<string, { 
      username: string; 
      fullname: string;
      age: number | null;
    }[]>);

    // Create grouped data for all parents
    return allParents.map(parent => ({
      parentUsername: parent.username,
      parentName: parent.fullname,
      parentAge: parent.age,
      children: relationshipMap[parent.username] || []
    }));
  };


  const handleRemoveChild = async (parentUsername: string, childUsername: string) => {
    try {
      // First get the parent and child IDs
      const { data: parentData, error: parentError } = await supabase
        .from('user_account')
        .select('id')
        .eq('username', parentUsername)
        .single();

      if (parentError) throw parentError;

      const { data: childData, error: childError } = await supabase
        .from('user_account')
        .select('id, user_id')
        .eq('username', childUsername)
        .single();

      if (childError) throw childError;

      if (!parentData?.id || !childData?.id) {
        throw new Error('Could not find parent or child account');
      }

      // Delete in order of dependencies to avoid foreign key constraint errors

      // 1. Delete from userInteractions2 if exists
      const { error: interactionsError } = await supabase
        .from('userInteractions2')
        .delete()
        .eq('child_id', childData.id);

      if (interactionsError) {
        console.warn('Warning: Could not delete user interactions. This might be ok if none existed:', interactionsError);
      }

      // 2. Delete from temp_classroomstudents if exists
      const { error: classroomError } = await supabase
        .from('temp_classroomstudents')
        .delete()
        .eq('uaid_child', childData.id);

      if (classroomError) {
        console.warn('Warning: Could not delete classroom relationships. This might be ok if none existed:', classroomError);
      }

      // 3. Delete from isparentof
      const { error: relationshipError } = await supabase
        .from('isparentof')
        .delete()
        .eq('child_id', childData.id);

      if (relationshipError) throw relationshipError;

      // 4. Delete from child_details
      const { error: detailsError } = await supabase
        .from('child_details')
        .delete()
        .eq('child_id', childData.id);

      if (detailsError) {
        console.warn('Warning: Could not delete child details. This might be ok if none existed:', detailsError);
      }

      // 5. Delete the auth user if it exists
      if (childData.user_id) {
        try {
          await api.deleteAuthUser(childData.user_id);
        } catch (authError) {
          console.warn('Warning: Could not delete auth user. This might be ok if already deleted:', authError);
        }
      }

      // 6. Finally delete from user_account
      const { error: deleteError } = await supabase
        .from('user_account')
        .delete()
        .eq('id', childData.id);

      if (deleteError) throw deleteError;

      // Refresh the data
      await fetchData();

      // Show success message
      setRemoveChildSuccess(`Successfully removed child account: ${childToRemove?.fullname}`);
      setTimeout(() => setRemoveChildSuccess(null), 3000);

      // Reset any errors
      setError(null);
      
      // Close the confirmation modal
      setShowRemoveChildModal(false);
      setChildToRemove(null);
    } catch (err) {
      console.error('Error removing child:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while removing child');
    }
  };

  const handleCreateChildAuth = async () => {
    try {
      setNewChildModalMessage(null);
      
      if (!newChild.email || !newChild.password) {
        setNewChildModalMessage({ type: 'error', text: 'Please enter both email and password' });
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newChild.email,
        password: newChild.password,
      });

      if (authError) {
        console.error('Auth error:', authError);
        setNewChildModalMessage({ type: 'error', text: authError.message });
        return;
      }

      setNewChildAuthUserId(authData.user?.id || null);
      setNewChildModalMessage({ type: 'success', text: 'Authentication created successfully!' });
      setNewChildStep('details');
    } catch (err) {
      console.error('Auth error:', err);
      setNewChildModalMessage({ 
        type: 'error', 
        text: err instanceof Error ? err.message : 'An error occurred during authentication'
      });
    }
  };

  const handleCreateChildAccount = async () => {
    try {
      setNewChildModalMessage(null);

      if (!newChild.fullname || !newChild.username || newChild.age === null || !newChildAuthUserId || !selectedParentForModify) {
        setNewChildModalMessage({ type: 'error', text: 'Please fill in all fields' });
        return;
      }

      const userToInsert = {
        fullname: newChild.fullname,
        username: newChild.username,
        age: newChild.age,
        upid: 3, // Set upid to 3 for Child
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        suspended: false,
        user_id: newChildAuthUserId
      };

      const { error } = await supabase
        .from('user_account')
        .insert([userToInsert])
        .select();

      if (error) {
        console.error('Database error:', error);
        setNewChildModalMessage({ type: 'error', text: error.message });
        return;
      }

      // Create parent-child relationship
      const { error: relationshipError } = await supabase
        .from('isparentof')
        .insert([{ 
          parent: selectedParentForModify.username, 
          child: newChild.username 
        }]);

      if (relationshipError) {
        console.error('Relationship error:', relationshipError);
        setNewChildModalMessage({ type: 'error', text: relationshipError.message });
        return;
      }

      // Create child_details record with default values
      const { error: detailsError } = await supabase
        .from('child_details')
        .insert([{
          child_id: childData.id,
          favourite_genres: [], // Initialize with empty array
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);

      if (detailsError) {
        console.error('Child details error:', detailsError);
        setNewChildModalMessage({ type: 'error', text: detailsError.message });
        return;
      }

      // Try to initialize userInteractions2 with default values for each genre
      // But don't block the account creation if this fails
      try {
        const { data: genres } = await supabase
          .from('temp_genre')
          .select('gid, genrename');

        if (genres && genres.length > 0) {
          const currentDate = new Date().toISOString();
          const interactions = genres.map(genre => ({
            child_id: childData.id,
            genreid: genre.gid,
            score: 0,
            created_at: currentDate,
            updated_at: currentDate,
            total_books_read: 0,
            total_pages_read: 0,
            total_time_spent: 0,
            average_rating: 0
          }));

          // Insert interactions in batches
          const batchSize = 50;
          for (let i = 0; i < interactions.length; i += batchSize) {
            const batch = interactions.slice(i, i + batchSize);
            await supabase
              .from('userInteractions2')
              .insert(batch);
          }
        }
      } catch (interactionErr) {
        // Log the error but don't prevent account creation
        console.warn('Non-critical warning: Could not initialize genre interactions. This is expected for admin-created accounts:', interactionErr);
      }

      setNewChildModalMessage({ type: 'success', text: 'Child account created and linked successfully!' });
      
      // Refresh the data and reset form
      setTimeout(async () => {
        await fetchData();
        resetNewChildForm();
        setNewChildStep('auth');
      }, 1500);
    } catch (err) {
      console.error('Account creation error:', err);
      setNewChildModalMessage({ 
        type: 'error', 
        text: err instanceof Error ? err.message : 'An error occurred while creating the account'
      });
    }
  };

  const resetNewChildForm = () => {
    setNewChild({
      fullname: '',
      username: '',
      age: null,
      upid: 3, // Set upid to 3 for Child
      email: '',
      password: '',
    });
    setNewChildAuthUserId(null);
    setNewChildStep('auth');
    setNewChildModalMessage(null);
  };

  const resetForm = () => {
    setNewUser({
      fullname: '',
      username: '',
      age: null,
      upid: 1,
      email: '',
      password: '',
    });
    setAuthUserId(null);
    setStep('auth');
    setModalMessage(null);
    setIsCreatingParent(false);
  };

  const handleDeleteParent = async () => {
    if (!selectedParentForModify) return;

    try {
      setDeleteParentError(null);
      
      // First, get all children of this parent
      const children = getChildrenForParent(selectedParentForModify.username);
      
      // Delete all children accounts
      for (const child of children) {
        const { error: childError } = await supabase
          .from('user_account')
          .delete()
          .eq('username', child.username);
        
        if (childError) throw childError;
      }

      // Delete the parent account
      const { error: parentError } = await supabase
        .from('user_account')
        .delete()
        .eq('username', selectedParentForModify.username);

      if (parentError) throw parentError;

      // Refresh the data
      await fetchData();
      
      // Close the modals
      setShowDeleteParentModal(false);
      setShowModifyModal(false);
      setSelectedParentForModify(null);
    } catch (err) {
      console.error('Error deleting parent:', err);
      setDeleteParentError(err instanceof Error ? err.message : 'An error occurred while deleting parent');
    }
  };

  const handleDeleteFromUserDetails = async (user: UserAccount) => {
    if (user.upid === 3) { // If it's a child account
      try {
        // Get parent info first
        const { data: parentRelation, error: parentError } = await supabase
          .from('isparentof')
          .select('parent_id')
          .eq('child_id', user.id)
          .single();

        if (parentError) {
          console.error('Error finding parent:', parentError);
          setError('Error finding parent relationship');
          return;
        }

        if (parentRelation) {
          const { data: parentData, error: parentUserError } = await supabase
            .from('user_account')
            .select('username')
            .eq('id', parentRelation.parent_id)
            .single();

          if (parentUserError) {
            console.error('Error finding parent user:', parentUserError);
            setError('Error finding parent user');
            return;
          }

          if (parentData) {
            // Set up the confirmation modal with complete information
            setChildToRemove({
              username: user.username,
              fullname: user.fullname,
              parentUsername: parentData.username
            });
            setShowRemoveChildModal(true);
            return;
          }
        }
      } catch (err) {
        console.error('Error preparing child deletion:', err);
        setError('Error preparing child deletion');
      }
    }

    // For non-child accounts, proceed with normal deletion
    setSelectedRows([user.username]);
    setShowUserModal(false);
    setShowDeleteModal(true);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Success Popup */}
      {deleteSuccessMessage && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in-out">
          {deleteSuccessMessage}
        </div>
      )}

      {/* Success Popup for Remove Child */}
      {removeChildSuccess && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in-out">
          {removeChildSuccess}
        </div>
      )}

      {/* Header */}
      <header className="p-4 border-b border-gray-800 bg-gray-900">
        <div className="flex justify-between items-center">
          <div className="flex items-center cursor-pointer" onClick={() => router.push('/')}>
            <Image
              src="/logo2.png"
              alt="Logo"
              width={40}
              height={40}
              className="mr-2"
            />
            <h1 className="text-2xl font-bold">CoReadability</h1>
          </div>
          <button
            onClick={() => setShowLogoutModal(true)}
            className="text-sm text-gray-400 hover:text-white font-medium"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* User Accounts Table */}
        <div className="bg-gray-900 rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">User Accounts</h2>
            <div className="flex items-center space-x-4">
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="px-4 py-2 bg-gray-800 rounded-lg text-white placeholder-gray-400"
              />
              <button
                onClick={() => setShowDeleteModal(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
                disabled={selectedRows.length === 0}
              >
                Delete User{selectedRows.length > 1 ? 's' : ''}
              </button>
              <button
                onClick={() => setShowNewUserModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
              >
                Add User
              </button>
            </div>
          </div>
          
          {error && (
            <div className="bg-red-900 text-red-200 p-4 rounded-lg mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-4">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-800">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Select
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Full Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Username</th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-800"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : sortOrder === 'desc' ? null : 'asc')}
                    >
                      Age {sortOrder === 'asc' ? '↑' : sortOrder === 'desc' ? '↓' : ''}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-800 relative"
                      onClick={() => setShowUserTypeDropdown(!showUserTypeDropdown)}
                    >
                      <div className="relative">
                        User Type {selectedUserTypeFilter !== null ? `(${utils.getUpidLabel(selectedUserTypeFilter)})` : ''}
                        {showUserTypeDropdown && (
                          <div className="absolute top-full left-0 mt-1 w-48 bg-gray-800 rounded-lg shadow-lg z-50">
                            <div className="py-1">
                              <button
                                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedUserTypeFilter(null);
                                  setShowUserTypeDropdown(false);
                                }}
                              >
                                All Types
                              </button>
                              {utils.userTypes.map(type => (
                                <button
                                  key={type.id}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedUserTypeFilter(type.id);
                                    setShowUserTypeDropdown(false);
                                  }}
                                >
                                  {type.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-800"
                      onClick={() => {
                        setCreatedAtSort(createdAtSort === 'asc' ? 'desc' : createdAtSort === 'desc' ? null : 'asc');
                        setUpdatedAtSort(null);
                        setSortOrder(null);
                      }}
                    >
                      Created At {createdAtSort === 'asc' ? '↑' : createdAtSort === 'desc' ? '↓' : ''}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-800"
                      onClick={() => {
                        setUpdatedAtSort(updatedAtSort === 'asc' ? 'desc' : updatedAtSort === 'desc' ? null : 'asc');
                        setCreatedAtSort(null);
                        setSortOrder(null);
                      }}
                    >
                      Updated At {updatedAtSort === 'asc' ? '↑' : updatedAtSort === 'desc' ? '↓' : ''}
                    </th>
                    <th 
                      className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-800 relative"
                      onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                    >
                      Status {selectedStatusFilter !== null ? `(${selectedStatusFilter ? 'Suspended' : 'Active'})` : ''}
                      {showStatusDropdown && (
                        <div className="absolute top-full left-0 mt-1 w-48 bg-gray-800 rounded-lg shadow-lg z-50">
                          <div className="py-1">
                            <button
                              className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedUserType(null);
                                setShowUserTypeDropdown(false);
                              }}
                            >
                              All Users
                            </button>
                            {userTypes.map(type => (
                              <button
                                key={type.id}
                                className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedUserType(type.id);
                                  setShowUserTypeDropdown(false);
                                }}
                              >
                                {type.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Created At</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Updated At</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredAndSortedUsers.slice(0, showAllUsers ? undefined : 3).map((account, index) => (
                    <tr key={index} className="hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedRows.includes(account.username)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedRows([...selectedRows, account.username]);
                            } else {
                              setSelectedRows(selectedRows.filter(username => username !== account.username));
                            }
                          }}
                          className="rounded bg-gray-800 border-gray-700"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div
                          onClick={() => handleUserClick(account.username)}
                          className={`cursor-pointer hover:bg-gray-700 px-2 py-1 rounded ${
                            account.suspended ? 'text-red-400' : 'text-white'
                          }`}
                        >
                          {account.fullname}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div
                          onClick={() => handleUserClick(account.username)}
                          className={`cursor-pointer hover:bg-gray-700 px-2 py-1 rounded ${
                            account.suspended ? 'text-red-400' : 'text-white'
                          }`}
                        >
                          {account.username}
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap ${account.suspended ? 'text-red-400' : 'text-white'}`}>
                        <div
                          onClick={() => handleUserClick(account.username)}
                          className="cursor-pointer hover:bg-gray-700 px-2 py-1 rounded"
                        >
                          {account.age}
                        </div>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap ${account.suspended ? 'text-red-400' : 'text-white'}`}>
                        {account.upid === 3 ? (
                          <div className="px-2 py-1 rounded">
                            {utils.getUpidLabel(account.upid)}
                          </div>
                        ) : (
                          <div className="px-2 py-1 rounded">
                            {utils.getUpidLabel(account.upid)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(account.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {new Date(account.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => {
                            if (account.suspended) {
                              setSelectedUser(account);
                              setShowRevertModal(true);
                            } else {
                              setSelectedUser(account);
                              setShowSuspendModal(true);
                            }
                          }}
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            account.suspended 
                              ? 'bg-red-900 text-red-200 cursor-pointer hover:bg-red-800' 
                              : 'bg-green-900 text-green-200 cursor-pointer hover:bg-green-800'
                          }`}
                        >
                          {account.suspended ? 'Suspended' : 'Active'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredAndSortedUsers.length > 3 && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setShowAllUsers(!showAllUsers)}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    {showAllUsers ? 'Show Less' : `Show All (${filteredAndSortedUsers.length} users)`}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Parent-Child Relationship Table */}
        <div className="bg-gray-900 rounded-lg shadow-lg p-6 mt-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Parent-Child Relationship</h2>
            <button
              onClick={() => {
                setNewUser({
                  fullname: '',
                  username: '',
                  age: null,
                  upid: 2,
                  email: '',
                  password: '',
                });
                setStep('auth');
                setIsCreatingParent(true);
                setShowNewUserModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
            >
              Add Parent
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-800">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Parent Username</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Parent Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Parent Age</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Children</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {getGroupedRelationships().slice(0, showAllRelationships ? undefined : 3).map((group, index) => (
                  <tr key={index} className="hover:bg-gray-800">
                    <td className="px-6 py-4 whitespace-nowrap">{group.parentUsername}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{group.parentName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{group.parentAge}</td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        {group.children.map((child, childIndex) => (
                          <div key={childIndex} className="flex items-center space-x-2">
                            <span className="text-gray-400">{child.username}</span>
                            <span className="text-gray-500">({child.fullname})</span>
                            <span className="text-gray-500">- Age: {child.age}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedParentForModify({
                            username: group.parentUsername,
                            name: group.parentName,
                            age: group.parentAge
                          });
                          setShowModifyModal(true);
                        }}
                        className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded"
                      >
                        Modify
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {getGroupedRelationships().length > 3 && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowAllRelationships(!showAllRelationships)}
                  className="text-blue-400 hover:text-blue-300"
                >
                  {showAllRelationships ? 'Show Less' : `Show All (${getGroupedRelationships().length} relationships)`}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* New User Modal */}
      {showNewUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-900 p-6 rounded-lg w-[800px]">
            <h3 className="text-xl font-bold mb-4">
              {step === 'auth' ? 'Step 1: Create Authentication' : 'Step 2: User Details'}
            </h3>
            
            {modalMessage && (
              <div className={`mb-4 p-3 rounded ${
                modalMessage.type === 'success' 
                  ? 'bg-green-900 text-green-200' 
                  : 'bg-red-900 text-red-200'
              }`}>
                {modalMessage.text}
              </div>
            )}

            <div className="space-y-4">
              {step === 'auth' ? (
                <div className="flex items-center space-x-4">
                  <input
                    type="email"
                    placeholder="Email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    className="flex-1 p-2 bg-gray-800 rounded"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    className="flex-1 p-2 bg-gray-800 rounded"
                  />
                  <button
                    onClick={handleCreateAuth}
                    className="w-12 h-12 bg-green-600 hover:bg-green-700 text-white rounded flex items-center justify-center"
                    disabled={!newUser.email || !newUser.password}
                  >
                    →
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center space-x-4">
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={newUser.fullname}
                      onChange={(e) => setNewUser({...newUser, fullname: e.target.value})}
                      className="flex-1 p-2 bg-gray-800 rounded"
                    />
                    <input
                      type="text"
                      placeholder="Username"
                      value={newUser.username}
                      onChange={(e) => setNewUser({...newUser, username: e.target.value})}
                      className="flex-1 p-2 bg-gray-800 rounded"
                    />
                    <input
                      type="number"
                      placeholder="Age"
                      value={newUser.age === null ? '' : newUser.age}
                      onChange={(e) => setNewUser({
                        ...newUser, 
                        age: e.target.value ? parseInt(e.target.value) : null
                      })}
                      className="w-24 p-2 bg-gray-800 rounded"
                    />
                    {isCreatingParent ? (
                      <div className="flex-1 p-2 bg-gray-800 rounded text-gray-400">
                        Parent
                      </div>
                    ) : (
                      <select
                        value={newUser.upid}
                        onChange={(e) => setNewUser({...newUser, upid: parseInt(e.target.value)})}
                        className="flex-1 p-2 bg-gray-800 rounded"
                      >
                        {utils.userTypes.map(type => (
                          <option key={type.id} value={type.id}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    )}
                    <button
                      onClick={handleCreateAccount}
                      className="w-12 h-12 bg-green-600 hover:bg-green-700 text-white rounded flex items-center justify-center"
                      disabled={!newUser.fullname || !newUser.username || newUser.age === null}
                    >
                      →
                    </button>
                  </div>
                </>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowNewUserModal(false);
                  resetForm();
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend User Modal */}
      {showSuspendModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-900 p-6 rounded-lg w-96">
            <h3 className="text-xl font-bold mb-4">Suspend User?</h3>
            <textarea
              placeholder="Enter suspension reason..."
              value={suspendComment}
              onChange={(e) => setSuspendComment(e.target.value)}
              className="w-full p-2 bg-gray-800 rounded h-32"
            />
            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowSuspendModal(false);
                  setSelectedUser(null);
                  setSuspendComment('');
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSuspendUser}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revert Suspension Modal */}
      {showRevertModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-900 p-6 rounded-lg w-96">
            <h3 className="text-xl font-bold mb-4">Revert suspension?</h3>
            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowRevertModal(false);
                  setSelectedUser(null);
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              >
                No
              </button>
              <button
                onClick={handleRevertSuspension}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded"
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-lg w-[600px]">
            <h3 className="text-xl font-bold mb-4">Confirm Deletion</h3>
            {deleteUserError && (
              <div className="mb-4 p-3 bg-red-900 text-red-200 rounded">
                {deleteUserError}
              </div>
            )}
            {selectedRows.length > 0 && (
              <>
                {userAccounts.filter(user => selectedRows.includes(user.username) && user.upid === 2).length > 0 ? (
                  <>
                    <p className="mb-4 text-red-400">
                      Warning: This action will delete parent accounts and all their associated child accounts. This action cannot be undone.
                    </p>
                    <p className="mb-4">
                      The following accounts will be deleted:
                    </p>
                    <ul className="mb-4 list-disc list-inside">
                      {userAccounts
                        .filter(user => selectedRows.includes(user.username))
                        .map((user, index) => (
                          <li key={index}>
                            {user.upid === 2 ? (
                              <>
                                Parent: {user.fullname} ({user.username})
                                {getChildrenForParent(user.username).map((child, childIndex) => (
                                  <li key={childIndex} className="ml-8">
                                    Child: {child.fullname} ({child.username})
                                  </li>
                                ))}
                              </>
                            ) : (
                              `${user.fullname} (${user.username})`
                            )}
                          </li>
                        ))}
                    </ul>
                  </>
                ) : (
                  <p className="mb-4">
                    Are you sure you want to delete {selectedRows.length} user{selectedRows.length > 1 ? 's' : ''}? This action cannot be undone.
                  </p>
                )}
              </>
            )}
            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteUserError(null);
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUsers}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-900 p-6 rounded-lg w-96">
            <h3 className="text-xl font-bold mb-4">Confirm Logout</h3>
            <p className="mb-4">Are you sure you want to logout?</p>
            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Parent Confirmation Modal */}
      {showDeleteParentModal && selectedParentForModify && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-lg w-[600px]">
            <h3 className="text-xl font-bold mb-4">Delete Parent Account</h3>
            {deleteParentError && (
              <div className="mb-4 p-3 bg-red-900 text-red-200 rounded">
                {deleteParentError}
              </div>
            )}
            <p className="mb-4 text-red-400">
              Warning: This action will delete the parent account &quot;{selectedParentForModify.name}&quot; and all associated child accounts. This action cannot be undone.
            </p>
            <p className="mb-4">
              The following accounts will be deleted:
            </p>
            <ul className="mb-4 list-disc list-inside">
              <li>Parent: {selectedParentForModify.name} ({selectedParentForModify.username})</li>
              {getChildrenForParent(selectedParentForModify.username).map((child, index) => (
                <li key={index}>Child: {child.fullname} ({child.username})</li>
              ))}
            </ul>
            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowDeleteParentModal(false);
                  setDeleteParentError(null);
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteParent}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
              >
                Delete All Accounts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modify Relationships Modal */}
      {showModifyModal && selectedParentForModify && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-900 p-6 rounded-lg w-[800px] max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4 border-b border-gray-800 pb-4">
              <h3 className="text-xl font-bold">
                Modify Children for {selectedParentForModify.name}
              </h3>
              <button
                onClick={() => setShowDeleteParentModal(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
              >
                Delete Parent
              </button>
            </div>
            <div className="mb-6">
              <div className="pb-2 mb-2 border-b border-gray-800">
                <h4 className="text-lg font-semibold">Current Children</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-800">
                  <thead>
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Username</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Full Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Age</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {getChildrenForParent(selectedParentForModify.username).map((child, index) => (
                      <tr key={index} className="hover:bg-gray-800">
                        <td className="px-6 py-4 whitespace-nowrap">{child.username}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{child.fullname}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{child.age}</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setChildToRemove({
                                username: child.username,
                                fullname: child.fullname,
                                parentUsername: selectedParentForModify.username
                              });
                              setShowRemoveChildModal(true);
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-lg font-semibold mb-2">Add New Child</h4>
              
              {newChildModalMessage && (
                <div className={`mb-4 p-3 rounded ${
                  newChildModalMessage.type === 'success' 
                    ? 'bg-green-900 text-green-200' 
                    : 'bg-red-900 text-red-200'
                }`}>
                  {newChildModalMessage.text}
                </div>
              )}

              <div className="space-y-4">
                {newChildStep === 'auth' ? (
                  <div className="flex items-center space-x-4">
                    <input
                      type="email"
                      placeholder="Email"
                      value={newChild.email}
                      onChange={(e) => setNewChild({...newChild, email: e.target.value})}
                      className="flex-1 p-2 bg-gray-800 rounded"
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={newChild.password}
                      onChange={(e) => setNewChild({...newChild, password: e.target.value})}
                      className="flex-1 p-2 bg-gray-800 rounded"
                    />
                    <button
                      onClick={handleCreateChildAuth}
                      className="w-12 h-12 bg-green-600 hover:bg-green-700 text-white rounded flex items-center justify-center"
                      disabled={!newChild.email || !newChild.password}
                    >
                      →
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-4">
                    <input
                      type="text"
                      placeholder="Full Name"
                      value={newChild.fullname}
                      onChange={(e) => setNewChild({...newChild, fullname: e.target.value})}
                      className="flex-1 p-2 bg-gray-800 rounded"
                    />
                    <input
                      type="text"
                      placeholder="Username"
                      value={newChild.username}
                      onChange={(e) => setNewChild({...newChild, username: e.target.value})}
                      className="flex-1 p-2 bg-gray-800 rounded"
                    />
                    <input
                      type="number"
                      placeholder="Age"
                      value={newChild.age === null ? '' : newChild.age}
                      onChange={(e) => setNewChild({
                        ...newChild, 
                        age: e.target.value ? parseInt(e.target.value) : null
                      })}
                      className="w-24 p-2 bg-gray-800 rounded"
                    />
                    <button
                      onClick={handleCreateChildAccount}
                      className="w-12 h-12 bg-green-600 hover:bg-green-700 text-white rounded flex items-center justify-center"
                      disabled={!newChild.fullname || !newChild.username || newChild.age === null}
                    >
                      →
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => {
                  resetNewChildForm();
                  setShowModifyModal(false);
                  setSelectedParentForModify(null);
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Child Confirmation Modal */}
      {showRemoveChildModal && childToRemove && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-gray-900 p-6 rounded-lg w-[500px]">
            <h3 className="text-xl font-bold mb-4">Confirm Remove Child</h3>
            <p className="mb-4 text-red-400">
              Warning: This action will permanently delete the child account &quot;{childToRemove.fullname}&quot;. This action cannot be undone.
            </p>
            <p className="mb-6 text-gray-300">
              All associated data including reading history, preferences, and classroom relationships will be deleted.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowRemoveChildModal(false);
                  setChildToRemove(null);
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleRemoveChild(childToRemove.parentUsername, childToRemove.username);
                  setShowRemoveChildModal(false);
                  setShowUserModal(false);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
              >
                Remove Child
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discussion Modal */}
      {showDiscussionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded-lg w-[800px] max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold">
                {selectedDiscussion?.classroomName} - Discussion Board
              </h3>
              <button
                onClick={() => {
                  setShowDiscussionModal(false);
                  setSelectedDiscussion(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {loadingDiscussion ? (
              <div className="text-center py-4">Loading discussion board...</div>
            ) : selectedDiscussion ? (
              <div className="space-y-6">
                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-lg font-semibold mb-2">Teacher&apos;s Question</h4>
                  <p className="text-gray-300">
                    {selectedDiscussion.teacherQuestion || 'No question available yet.'}
                  </p>
                </div>

                <div className="bg-gray-800 rounded-lg p-4">
                  <h4 className="text-lg font-semibold mb-4">Student Responses</h4>
                  {selectedDiscussion.responses.length > 0 ? (
                    <div className="space-y-4">
                      {selectedDiscussion.responses.map((response) => (
                        <div
                          key={response.id}
                          className="bg-gray-700 rounded-lg p-4"
                        >
                          <p className="text-gray-300">{response.message}</p>
                          <div className="text-sm text-gray-400 mt-2 text-right">
                            – {response.sender_name} • {new Date(response.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-400 italic">No responses yet.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-4">No discussion data available.</div>
            )}
          </div>
        </div>
      )}

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <UserDetailsModal
          user={selectedUser}
          onClose={() => {
            setShowUserModal(false);
            setSelectedUser(null);
          }}
          onStatusClick={(user) => {
            if (user.suspended) {
              setShowRevertModal(true);
              setSelectedUser(user);
            } else {
              setShowSuspendModal(true);
              setSelectedUser(user);
            }
            setShowUserModal(false);
          }}
          onEdit={handleUpdateUser}
          onDelete={handleDeleteFromUserDetails}
          onResetPassword={handleResetPassword}
          userTypes={utils.userTypes}
          getUpidLabel={utils.getUpidLabel}
        />
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && selectedUserForPasswordReset && (
        <ResetPasswordModal
          user={selectedUserForPasswordReset}
          onClose={() => {
            setShowResetPasswordModal(false);
            setSelectedUserForPasswordReset(null);
          }}
        />
      )}
    </div>
  );
} 
