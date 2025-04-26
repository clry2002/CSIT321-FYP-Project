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
  const [parentSearchQuery, setParentSearchQuery] = useState('');
  const [classroomSearchQuery, setClassroomSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<boolean | null>(null);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [createdAtSort, setCreatedAtSort] = useState<'asc' | 'desc' | null>(null);
  const [updatedAtSort, setUpdatedAtSort] = useState<'asc' | 'desc' | null>(null);
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
  const [pendingContentCount, setPendingContentCount] = useState(0);
  const [showSuspendAllModal, setShowSuspendAllModal] = useState(false);
  const [selectedProfileToSuspend, setSelectedProfileToSuspend] = useState<string | null>(null);
  const [showRevertAllModal, setShowRevertAllModal] = useState(false);
  const [selectedProfileToRevert, setSelectedProfileToRevert] = useState<string | null>(null);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedProfilePermissions, setSelectedProfilePermissions] = useState<string | null>(null);
  const [publisherDeletePermission, setPublisherDeletePermission] = useState(false);

  useEffect(() => {
    fetchData();
    fetchPendingContentCount();
    fetchPublisherPermissions();
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

  const fetchPendingContentCount = async () => {
    try {
      const { data, error } = await supabase
        .from('temp_content')
        .select('cid')
        .eq('status', 'pending');

      if (error) throw error;
      setPendingContentCount(data?.length || 0);
    } catch (err) {
      console.error('Error fetching pending content count:', err);
    }
  };

  const fetchPublisherPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('publisherpermissions')
        .select('*')
        .eq('permission', 'publisher delete all content')
        .single();

      if (error) throw error;
      setPublisherDeletePermission(data?.active || false);
    } catch (err) {
      console.error('Error fetching publisher permissions:', err);
    }
  };

  const handleTogglePublisherPermission = async () => {
    try {
      const { error } = await supabase
        .from('publisherpermissions')
        .update({ active: !publisherDeletePermission })
        .eq('permission', 'publisher delete all content');

      if (error) throw error;
      setPublisherDeletePermission(!publisherDeletePermission);
    } catch (err) {
      console.error('Error updating publisher permission:', err);
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

  const handleSuspendUser = async (user: UserAccount) => {
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

  const handleRevertSuspension = async (user: UserAccount) => {
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
    const groupedData = allParents.map(parent => ({
      parentUsername: parent.username,
      parentName: parent.fullname,
      parentAge: parent.age,
      children: relationshipMap[parent.username] || []
    }));

    // Filter based on search query if it exists
    if (parentSearchQuery) {
      const lowerQuery = parentSearchQuery.toLowerCase();
      return groupedData.filter(group => 
        group.parentUsername.toLowerCase().includes(lowerQuery) ||
        group.parentName.toLowerCase().includes(lowerQuery) ||
        group.children.some(child => 
          child.username.toLowerCase().includes(lowerQuery) ||
          child.fullname.toLowerCase().includes(lowerQuery)
        )
      );
    }

    return groupedData;
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

      // Add age validation for children
      if (newChild.age > 13) {
        setNewChildModalMessage({ type: 'error', text: 'Child must be 13 years old or younger' });
        return;
      }

      // First, create the child user account
      const { data: childData, error: childError } = await supabase
        .from('user_account')
        .insert([{
          fullname: newChild.fullname,
          username: newChild.username,
          age: newChild.age,
          upid: 3, // Set upid to 3 for Child
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          suspended: false,
          user_id: newChildAuthUserId
        }])
        .select('id')
        .single();

      if (childError) {
        console.error('Database error:', childError);
        setNewChildModalMessage({ type: 'error', text: childError.message });
        return;
      }

      // Get the parent's ID
      const { data: parentData, error: parentError } = await supabase
        .from('user_account')
        .select('id')
        .eq('username', selectedParentForModify.username)
        .single();

      if (parentError) {
        console.error('Database error:', parentError);
        setNewChildModalMessage({ type: 'error', text: parentError.message });
        return;
      }

      // Create parent-child relationship using IDs
      const { error: relationshipError } = await supabase
        .from('isparentof')
        .insert([{ 
          parent_id: parentData.id, 
          child_id: childData.id 
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

  const handleSuspendAllUsers = async (profileName: string) => {
    try {
      // Get the profile ID
      const profileId = utils.userTypes.find(type => type.label === profileName)?.id;
      if (!profileId) throw new Error('Invalid profile type');

      // Suspend all non-suspended users of this profile type
      const { error: updateError } = await supabase
        .from('user_account')
        .update({ 
          suspended: true,
          comments: `Mass suspension of ${profileName} profiles`,
          updated_at: new Date().toISOString()
        })
        .eq('upid', profileId)
        .eq('suspended', false);  // Only update non-suspended users

      if (updateError) throw updateError;

      // Refresh the data
      await fetchData();
      setShowSuspendAllModal(false);
      setSelectedProfileToSuspend(null);
    } catch (err) {
      console.error('Error suspending users:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while suspending users');
    }
  };

  const handleRevertAllUsers = async (profileName: string) => {
    try {
      // Get the profile ID
      const profileId = utils.userTypes.find(type => type.label === profileName)?.id;
      if (!profileId) throw new Error('Invalid profile type');

      // Revert only suspended users of this profile type
      const { error: updateError } = await supabase
        .from('user_account')
        .update({ 
          suspended: false,
          comments: 'na',
          updated_at: new Date().toISOString()
        })
        .eq('upid', profileId)
        .eq('suspended', true);  // Only update suspended users

      if (updateError) throw updateError;

      // Refresh the data
      await fetchData();
      setShowRevertAllModal(false);
      setSelectedProfileToRevert(null);
    } catch (err) {
      console.error('Error reverting users:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while reverting users');
    }
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
          <div className="flex items-center space-x-6">
            <button
              onClick={() => router.push('/adminpage/content')}
              className="flex items-center text-gray-400 hover:text-white text-sm font-medium relative group mr-12"
            >
              <div className="relative">
                {pendingContentCount > 0 && (
                  <span className="absolute -top-2 -left-2 bg-red-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                    {pendingContentCount}
                  </span>
                )}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              Content Review
            </button>
            <button
              onClick={() => router.push('/adminpage/profiles')}
              className="flex items-center text-gray-400 hover:text-white text-sm font-medium relative group mr-12"
            >
              <div className="relative">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              Profile Management
            </button>
            <button
              onClick={() => setShowLogoutModal(true)}
              className="text-gray-400 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* User Accounts Table */}
        <div className="bg-gray-900 rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-bold">User Accounts</h2>
              <button
                onClick={() => setShowNewUserModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg relative group"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                  Add user
                </span>
              </button>
              {showAllUsers && (
                <button
                  onClick={() => setShowAllUsers(false)}
                  className="text-blue-400 hover:text-blue-300"
                >
                  Show Less
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder=""
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10 py-2 bg-gray-800 rounded-lg text-white placeholder-gray-400"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
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
              <div className="max-h-[600px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-800 [&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded">
                <table className="min-w-full divide-y divide-gray-800">
                  <thead className="bg-gray-900 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Full Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Username</th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-800"
                        onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : sortOrder === 'desc' ? null : 'asc')}
                      >
                        Age {sortOrder === 'asc' ? '↑' : sortOrder === 'desc' ? '↓' : ''}
                      </th>
                      <th 
                        className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-800"
                        onClick={() => setShowUserTypeDropdown(!showUserTypeDropdown)}
                      >
                        <div className="relative">
                          User Type {selectedUserTypeFilter !== null ? `(${utils.getUpidLabel(selectedUserTypeFilter)})` : ''}
                          {showUserTypeDropdown && (
                            <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-gray-900 ring-1 ring-black ring-opacity-5 z-50">
                              <div className="py-1">
                                <button
                                  className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedUserTypeFilter(null);
                                    setShowUserTypeDropdown(false);
                                  }}
                                >
                                  All Types
                                </button>
                                {[
                                  { id: 3, label: 'Child' },
                                  { id: 2, label: 'Parent' },
                                  { id: 1, label: 'Publisher' },
                                  { id: 4, label: 'Educator' }
                                ].map(type => (
                                  <button
                                    key={type.id}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
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
                        className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-800 relative"
                        onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                      >
                        Status {selectedStatusFilter !== null ? `(${selectedStatusFilter ? 'Suspended' : 'Active'})` : ''}
                        {showStatusDropdown && (
                          <>
                            <div 
                              className="fixed inset-0" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowStatusDropdown(false);
                              }}
                            />
                            <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-gray-900 ring-1 ring-black ring-opacity-5 z-50">
                              <div className="py-1">
                                <button
                                  className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedStatusFilter(null);
                                    setShowStatusDropdown(false);
                                  }}
                                >
                                  All Status
                                </button>
                                <button
                                  className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedStatusFilter(false);
                                    setShowStatusDropdown(false);
                                  }}
                                >
                                  Active
                                </button>
                                <button
                                  className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedStatusFilter(true);
                                    setShowStatusDropdown(false);
                                  }}
                                >
                                  Suspended
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </th>
                      <th className="px-6 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {filteredAndSortedUsers.slice(0, showAllUsers ? undefined : 3).map((account, index) => (
                      <tr key={index} className="hover:bg-gray-800">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            onClick={() => handleUserClick(account.username)}
                            className={`cursor-pointer hover:text-blue-400 ${
                              account.suspended ? 'text-red-400' : 'text-white'
                            }`}
                          >
                            {account.fullname}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            onClick={() => handleUserClick(account.username)}
                            className={`cursor-pointer hover:text-blue-400 ${
                              account.suspended ? 'text-red-400' : 'text-white'
                            }`}
                          >
                            {account.username}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            onClick={() => handleUserClick(account.username)}
                            className={`cursor-pointer hover:text-blue-400 ${
                              account.suspended ? 'text-red-400' : 'text-white'
                            }`}
                          >
                            {account.age}
                          </span>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap ${account.suspended ? 'text-red-400' : 'text-white'}`}>
                          <span>
                            {utils.getUpidLabel(account.upid)}
                          </span>
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap ${account.suspended ? 'text-red-400' : 'text-white'}`}>
                          {new Date(account.created_at).toLocaleDateString()}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap ${account.suspended ? 'text-red-400' : 'text-white'}`}>
                          {new Date(account.updated_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
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
                            className={`relative px-6 py-2 inline-flex items-center justify-center text-sm leading-5 font-semibold rounded-full whitespace-nowrap min-w-[100px] ${
                              account.suspended 
                                ? 'bg-red-900 text-red-200 cursor-pointer hover:bg-red-800' 
                                : 'bg-green-900 text-green-200 cursor-pointer hover:bg-green-800'
                            } group`}
                          >
                            {account.suspended ? 'Suspended' : 'Active'}
                            <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                              {account.suspended ? 'Remove suspension' : 'Suspend user'}
                            </span>
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            onClick={() => {
                              setSelectedRows([account.username]);
                              setShowDeleteModal(true);
                            }}
                            className="text-gray-400 hover:text-red-500 transition-colors relative group"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                              Delete user
                            </span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {filteredAndSortedUsers.length > 3 && !showAllUsers && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setShowAllUsers(true)}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    Show All ({filteredAndSortedUsers.length} users)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Parent-Child Relationship Table */}
        <div className="bg-gray-900 rounded-lg shadow-lg p-6 mt-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
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
                className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg relative group"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                  Add parent
                </span>
              </button>
              {showAllRelationships && (
                <button
                  onClick={() => setShowAllRelationships(false)}
                  className="text-blue-400 hover:text-blue-300"
                >
                  Show Less
                </button>
              )}
            </div>
            <div className="relative">
              <input
                type="text"
                placeholder=""
                value={parentSearchQuery}
                onChange={(e) => setParentSearchQuery(e.target.value)}
                className="pl-10 pr-10 py-2 bg-gray-800 rounded-lg text-white placeholder-gray-400"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              {parentSearchQuery && (
                <button
                  onClick={() => setParentSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <div className="max-h-[600px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-800 [&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded">
              <table className="min-w-full divide-y divide-gray-800">
                <thead className="bg-gray-900 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Parent Username</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Parent Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Parent Age</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Children</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {getGroupedRelationships().slice(0, showAllRelationships ? undefined : 3).map((group, index) => (
                    <tr key={index} className="hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span 
                          className={`cursor-pointer hover:text-blue-400 ${
                            userAccounts.find(u => u.username === group.parentUsername)?.suspended ? 'text-red-400' : 'text-white'
                          }`}
                          onClick={() => handleUserClick(group.parentUsername)}
                        >
                          {group.parentUsername}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span 
                          className={`cursor-pointer hover:text-blue-400 ${
                            userAccounts.find(u => u.username === group.parentUsername)?.suspended ? 'text-red-400' : 'text-white'
                          }`}
                          onClick={() => handleUserClick(group.parentUsername)}
                        >
                          {group.parentName}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span 
                          className={`cursor-pointer hover:text-blue-400 ${
                            userAccounts.find(u => u.username === group.parentUsername)?.suspended ? 'text-red-400' : 'text-white'
                          }`}
                          onClick={() => handleUserClick(group.parentUsername)}
                        >
                          {group.parentAge}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          {group.children.map((child, childIndex) => (
                            <div key={childIndex} className="flex items-center space-x-2">
                              <span 
                                className={`cursor-pointer hover:text-blue-400 ${
                                  userAccounts.find(u => u.username === child.username)?.suspended ? 'text-red-400' : 'text-gray-400'
                                }`}
                                onClick={() => handleUserClick(child.username)}
                              >
                                {child.username}
                              </span>
                              <span className={`${
                                userAccounts.find(u => u.username === child.username)?.suspended ? 'text-red-400' : 'text-gray-500'
                              }`}>
                                ({child.fullname})
                              </span>
                              <span className="text-gray-500">- Age: {child.age}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={() => {
                            setSelectedParentForModify({
                              username: group.parentUsername,
                              name: group.parentName,
                              age: group.parentAge
                            });
                            setShowModifyModal(true);
                          }}
                          className="text-gray-400 hover:text-white transition-colors relative group"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                          </svg>
                          <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                            Modify
                          </span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {getGroupedRelationships().length > 3 && !showAllRelationships && (
              <div className="mt-4 text-center">
                <button
                  onClick={() => setShowAllRelationships(true)}
                  className="text-blue-400 hover:text-blue-300"
                >
                  Show All ({getGroupedRelationships().length} relationships)
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Classrooms Table */}
        <div className="bg-gray-900 rounded-lg shadow-lg p-6 mt-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-bold">Classrooms</h2>
              {showAllClassrooms && (
                <button
                  onClick={() => setShowAllClassrooms(false)}
                  className="text-blue-400 hover:text-blue-300"
                >
                  Show Less
                </button>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder=""
                  value={classroomSearchQuery}
                  onChange={(e) => setClassroomSearchQuery(e.target.value)}
                  className="pl-10 pr-10 py-2 bg-gray-800 rounded-lg text-white placeholder-gray-400"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                {classroomSearchQuery && (
                  <button
                    onClick={() => setClassroomSearchQuery('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          </div>
          
          {loadingClassrooms ? (
            <div className="text-center py-4">Loading classrooms...</div>
          ) : (
            <div className="overflow-x-auto">
              <div className="max-h-[600px] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-800 [&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded">
                <table className="min-w-full divide-y divide-gray-800">
                  <thead className="bg-gray-900 sticky top-0 z-10">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Classroom Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Description</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Educator</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Students</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {classrooms
                      .filter((classroom: ClassroomData) => {
                        if (!classroomSearchQuery) return true;
                        const query = classroomSearchQuery.toLowerCase();
                        return (
                          classroom.name.toLowerCase().includes(query) ||
                          classroom.educatorName.toLowerCase().includes(query) ||
                          classroom.students.some(student => 
                            student.username.toLowerCase().includes(query) ||
                            student.fullname.toLowerCase().includes(query)
                          )
                        );
                      })
                      .slice(0, showAllClassrooms ? undefined : 3)
                      .map((classroom: ClassroomData) => (
                      <tr key={classroom.crid} className="hover:bg-gray-800">
                        <td 
                          className="px-6 py-4 whitespace-nowrap cursor-pointer hover:text-blue-400"
                          onClick={() => {
                            setShowDiscussionModal(true);
                            fetchDiscussionData(classroom.crid, classroom.name);
                          }}
                        >
                          {classroom.name}
                        </td>
                        <td className="px-6 py-4">{classroom.description}</td>
                        <td 
                          className={`px-6 py-4 whitespace-nowrap cursor-pointer hover:text-blue-400 ${
                            userAccounts.find(u => u.fullname === classroom.educatorName)?.suspended ? 'text-red-400' : 'text-white'
                          }`}
                          onClick={() => {
                            const educator = userAccounts.find(u => u.fullname === classroom.educatorName);
                            if (educator) {
                              handleUserClick(educator.username);
                            }
                          }}
                        >
                          {classroom.educatorName}
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-2">
                            {classroom.students.map((student, index) => (
                              <div key={index} className="flex items-center space-x-2">
                                <span 
                                  className={`cursor-pointer hover:text-blue-400 ${
                                    userAccounts.find(u => u.username === student.username)?.suspended ? 'text-red-400' : 'text-gray-400'
                                  }`}
                                  onClick={() => handleUserClick(student.username)}
                                >
                                  {student.username}
                                </span>
                                <span className={`${
                                  userAccounts.find(u => u.username === student.username)?.suspended ? 'text-red-400' : 'text-gray-500'
                                }`}>
                                  ({student.fullname})
                                </span>
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  student.invitation_status === 'accepted' 
                                    ? 'bg-green-900 text-green-200' 
                                    : student.invitation_status === 'pending'
                                    ? 'bg-yellow-900 text-yellow-200'
                                    : 'bg-red-900 text-red-200'
                                }`}>
                                  {student.invitation_status}
                                </span>
                              </div>
                            ))}
                            {classroom.students.length === 0 && (
                              <span className="text-gray-500">No students</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {classrooms.length > 3 && !showAllClassrooms && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setShowAllClassrooms(true)}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    Show All ({classrooms.length} classrooms)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Suspend User Modal */}
      {showSuspendModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 overflow-hidden">
          <div className="bg-gray-900 p-6 rounded-lg w-96">
            <h3 className="text-xl font-bold mb-4">Suspend User?</h3>
            {selectedUser.suspended && selectedUser.comments && selectedUser.comments !== 'na' && (
              <div className="mb-4">
                <div className="text-sm text-gray-400 mb-1">Current Suspension Reason:</div>
                <div className="p-3 bg-gray-800 rounded text-white mb-4">
                  {selectedUser.comments}
                </div>
              </div>
            )}
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
                onClick={() => handleSuspendUser(selectedUser)}
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
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 overflow-hidden">
          <div className="bg-gray-900 p-6 rounded-lg w-[400px]">
            <h3 className="text-xl font-bold mb-4">Revert suspension?</h3>
            <div className="mb-4">
              <div className="text-sm text-gray-400 mb-1">Reason:</div>
              <div className="p-3 bg-gray-800 rounded text-white">
                {selectedUser.comments && selectedUser.comments !== 'na' 
                  ? selectedUser.comments 
                  : 'No reason provided'}
              </div>
            </div>
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
                onClick={() => handleRevertSuspension(selectedUser)}
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
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 overflow-hidden">
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
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 overflow-hidden">
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
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 overflow-hidden">
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
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 overflow-hidden">
          <div className="bg-gray-900 p-6 rounded-lg w-[800px] max-h-[80vh]">
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
            <div className="overflow-y-auto max-h-[calc(80vh-120px)] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-gray-800 [&::-webkit-scrollbar-thumb]:bg-gray-600 [&::-webkit-scrollbar-thumb]:rounded pr-2">
              <div className="mb-6">
                <div className="pb-2 border-b border-gray-800">
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
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 overflow-hidden">
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
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 overflow-hidden">
          <div className="bg-gray-900 p-6 rounded-lg w-[800px] max-h-[80vh]">
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
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 overflow-hidden">
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
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && selectedUserForPasswordReset && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 overflow-hidden">
          <ResetPasswordModal
            user={selectedUserForPasswordReset}
            onClose={() => {
              setShowResetPasswordModal(false);
              setSelectedUserForPasswordReset(null);
            }}
          />
        </div>
      )}

      {/* New User Modal */}
      {showNewUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 overflow-hidden">
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

      {/* Suspend All Users Confirmation Modal */}
      {showSuspendAllModal && selectedProfileToSuspend && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 overflow-hidden">
          <div className="bg-gray-900 p-6 rounded-lg w-[500px]">
            <div className="flex items-center space-x-3 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <h3 className="text-xl font-bold">Warning: Mass Suspension</h3>
            </div>
            <p className="mb-4 text-red-400">
              This action will suspend ALL users with the profile type &quot;{selectedProfileToSuspend}&quot;. This is a significant action that will affect multiple user accounts.
            </p>
            <p className="mb-6 text-gray-300">
              Are you sure you want to proceed with this mass suspension?
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowSuspendAllModal(false);
                  setSelectedProfileToSuspend(null);
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSuspendAllUsers(selectedProfileToSuspend)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded flex items-center space-x-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>Suspend All</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revert All Users Confirmation Modal */}
      {showRevertAllModal && selectedProfileToRevert && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 overflow-hidden">
          <div className="bg-gray-900 p-6 rounded-lg w-[500px]">
            <div className="flex items-center space-x-3 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-7.536 5.879a1 1 0 001.415 0 3 3 0 014.242 0 1 1 0 001.415-1.415 5 5 0 00-7.072 0 1 1 0 000 1.415z" clipRule="evenodd" />
              </svg>
              <h3 className="text-xl font-bold">Revert All Suspensions</h3>
            </div>
            <p className="mb-4 text-green-400">
              This action will revert the suspension of ALL users with the profile type &quot;{selectedProfileToRevert}&quot;.
            </p>
            <p className="mb-6 text-gray-300">
              Would you like to proceed with reverting all suspensions?
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowRevertAllModal(false);
                  setSelectedProfileToRevert(null);
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRevertAllUsers(selectedProfileToRevert)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded flex items-center space-x-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm7-1a1 1 0 11-2 0 1 1 0 012 0zm-7.536 5.879a1 1 0 001.415 0 3 3 0 014.242 0 1 1 0 001.415-1.415 5 5 0 00-7.072 0 1 1 0 000 1.415z" clipRule="evenodd" />
                </svg>
                <span>Revert All</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Permissions Modal */}
      {showPermissionsModal && selectedProfilePermissions && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 overflow-hidden">
          <div className="bg-gray-900 p-6 rounded-lg w-[500px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">{selectedProfilePermissions} Profile Settings</h3>
              <button
                onClick={() => {
                  setShowPermissionsModal(false);
                  setSelectedProfilePermissions(null);
                }}
                className="text-gray-400 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {selectedProfilePermissions === 'Publisher' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                  <div>
                    <h4 className="font-semibold">Delete Own Content</h4>
                    <p className="text-sm text-gray-400">Allow publishers to delete their own content regardless of status</p>
                  </div>
                  <button
                    onClick={handleTogglePublisherPermission}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      publisherDeletePermission ? 'bg-indigo-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        publisherDeletePermission ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {selectedProfilePermissions !== 'Publisher' && (
              <div className="text-gray-400 text-center py-4">
                No configurable permissions available for this profile type.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 
