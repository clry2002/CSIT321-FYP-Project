'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

interface UserAccount {
  fullname: string;
  username: string;
  age: number;
  upid: number;
  created_at: string;
  updated_at: string;
  suspended: boolean;
  comments?: string;
}

interface NewUser {
  fullname: string;
  username: string;
  age: number | null;
  upid: number;
  email: string;
  password: string;
}

interface ParentChildRelationship {
  parent: string;
  child: string;
}

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
    upid: 4,
    email: '',
    password: '',
  });
  const [modalMessage, setModalMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [step, setStep] = useState<'auth' | 'details'>('auth');
  const [editingCell, setEditingCell] = useState<{
    username: string;
    field: string;
    value: string | number;
  } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [selectedUserType, setSelectedUserType] = useState<number | null>(null);
  const [showUserTypeDropdown, setShowUserTypeDropdown] = useState(false);
  const [selectedParent, setSelectedParent] = useState<string | null>(null);
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

  const userTypes = [
    { id: 3, label: 'Child' },
    { id: 2, label: 'Parent' },
    { id: 1, label: 'Publisher' },
    { id: 5, label: 'Educator' }
  ];

  useEffect(() => {
    fetchUserAccounts();
    fetchRelationships();
  }, []);

  const fetchUserAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('user_account')
        .select('fullname, username, age, upid, created_at, updated_at, suspended');

      if (error) throw error;
      setUserAccounts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching user accounts');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelationships = async () => {
    try {
      const { data, error } = await supabase
        .from('isparentof')
        .select('parent, child');

      if (error) throw error;
      setRelationships(data || []);
    } catch (err) {
      console.error('Error fetching relationships:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching relationships');
    }
  };

  const getUpidLabel = (upid: number) => {
    switch (upid) {
      case 1: return 'Publisher';
      case 2: return 'Parent';
      case 3: return 'Child';
      case 5: return 'Educator';
      default: return 'Unknown';
    }
  };

  const handleCreateAuth = async () => {
    try {
      setModalMessage(null);
      
      if (!newUser.email || !newUser.password) {
        setModalMessage({ type: 'error', text: 'Please enter both email and password' });
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
      });

      if (authError) {
        console.error('Auth error:', authError);
        setModalMessage({ type: 'error', text: authError.message });
        return;
      }

      setAuthUserId(authData.user?.id || null);
      setModalMessage({ type: 'success', text: 'Authentication created successfully!' });
      setStep('details');
    } catch (err) {
      console.error('Auth error:', err);
      setModalMessage({ 
        type: 'error', 
        text: err instanceof Error ? err.message : 'An error occurred during authentication'
      });
    }
  };

  const handleCreateAccount = async () => {
    try {
      setModalMessage(null);

      if (!newUser.fullname || !newUser.username || newUser.age === null || !authUserId) {
        setModalMessage({ type: 'error', text: 'Please fill in all fields' });
        return;
      }

      const userToInsert = {
        fullname: newUser.fullname,
        username: newUser.username,
        age: newUser.age,
        upid: newUser.upid,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        suspended: false,
        user_id: authUserId
      };

      const { error } = await supabase
        .from('user_account')
        .insert([userToInsert])
        .select();

      if (error) {
        console.error('Database error:', error);
        setModalMessage({ type: 'error', text: error.message });
        return;
      }

      setModalMessage({ type: 'success', text: 'User account created successfully!' });
      
      // Refresh the table and redirect after a short delay
      setTimeout(async () => {
        await fetchUserAccounts();
        setShowNewUserModal(false);
        router.refresh();
      }, 1500);
    } catch (err) {
      console.error('Account creation error:', err);
      setModalMessage({ 
        type: 'error', 
        text: err instanceof Error ? err.message : 'An error occurred while creating the account'
      });
    }
  };

  const resetForm = () => {
    setNewUser({
      fullname: '',
      username: '',
      age: null,
      upid: 4,
      email: '',
      password: '',
    });
    setAuthUserId(null);
    setStep('auth');
    setModalMessage(null);
    setIsCreatingParent(false);
  };

  const handleSuspendUser = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from('user_account')
        .update({ 
          suspended: true,
          comments: suspendComment,
          updated_at: new Date().toISOString()
        })
        .eq('username', selectedUser.username);

      if (error) throw error;

      setUserAccounts(userAccounts.map(user => 
        user.username === selectedUser.username 
          ? { ...user, suspended: true, comments: suspendComment }
          : user
      ));
      
      setShowSuspendModal(false);
      setSelectedUser(null);
      setSuspendComment('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while suspending user');
    }
  };

  const handleRevertSuspension = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase
        .from('user_account')
        .update({ 
          suspended: false,
          updated_at: new Date().toISOString()
        })
        .eq('username', selectedUser.username);

      if (error) throw error;

      setUserAccounts(userAccounts.map(user => 
        user.username === selectedUser.username 
          ? { ...user, suspended: false }
          : user
      ));
      
      setShowRevertModal(false);
      setSelectedUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while reverting suspension');
    }
  };

  const handleDeleteUsers = async () => {
    if (selectedRows.length === 0) return;

    try {
      const { error } = await supabase
        .from('user_account')
        .delete()
        .in('username', selectedRows);

      if (error) throw error;

      setUserAccounts(userAccounts.filter(user => !selectedRows.includes(user.username)));
      setSelectedRows([]);
      setShowDeleteModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while deleting users');
    }
  };

  const handleUpdateUser = async (username: string, field: string, value: string | number) => {
    try {
      const { error } = await supabase
        .from('user_account')
        .update({ 
          [field]: value,
          updated_at: new Date().toISOString()
        })
        .eq('username', username);

      if (error) throw error;

      setUserAccounts(userAccounts.map(user => 
        user.username === username 
          ? { ...user, [field]: value }
          : user
      ));
      
      setEditingCell(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while updating user');
    }
  };

  const filteredAndSortedUsers = userAccounts
    .filter(user => {
      const matchesSearch = 
        user.fullname.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesUserType = selectedUserType === null || user.upid === selectedUserType;
      
      return matchesSearch && matchesUserType;
    })
    .sort((a, b) => {
      if (sortOrder === null) return 0;
      return sortOrder === 'asc' ? a.age - b.age : b.age - a.age;
    });

  const getParentUsers = () => {
    // Get all users with upid 2 (Parent type) from user_account table
    return userAccounts.filter(user => user.upid === 2);
  };

  const getChildrenForParent = (parentUsername: string) => {
    // First, get the child usernames from isparentof table for this parent
    const childUsernames = relationships
      .filter(rel => rel.parent === parentUsername)
      .map(rel => rel.child);
    
    // Then, get the full user objects for these children from user_account table
    return userAccounts.filter(user => childUsernames.includes(user.username) && user.upid === 3); // upid 3 for Child
  };

  const getParentName = (username: string) => {
    const parent = userAccounts.find(user => user.username === username);
    return parent ? parent.fullname : username;
  };

  const getParentAge = (username: string) => {
    const parent = userAccounts.find(user => user.username === username);
    return parent ? parent.age : null;
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

  const handleAddChild = async (parentUsername: string, childUsername: string) => {
    try {
      const { error } = await supabase
        .from('isparentof')
        .insert([{ parent: parentUsername, child: childUsername }]);

      if (error) throw error;
      
      // Refresh relationships after adding
      await fetchRelationships();
    } catch (err) {
      console.error('Error adding child:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while adding child');
    }
  };

  const handleRemoveChild = async (parentUsername: string, childUsername: string) => {
    try {
      const { error } = await supabase
        .from('isparentof')
        .delete()
        .match({ parent: parentUsername, child: childUsername });

      if (error) throw error;
      
      // Refresh relationships after removing
      await fetchRelationships();
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

      setNewChildModalMessage({ type: 'success', text: 'Child account created and linked successfully!' });
      
      // Refresh the data and reset form
      setTimeout(async () => {
        await fetchUserAccounts();
        await fetchRelationships();
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

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.push('/');
    } catch (err) {
      console.error('Error logging out:', err);
    }
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
      await fetchUserAccounts();
      await fetchRelationships();
      
      // Close the modals
      setShowDeleteParentModal(false);
      setShowModifyModal(false);
      setSelectedParentForModify(null);
    } catch (err) {
      console.error('Error deleting parent:', err);
      setDeleteParentError(err instanceof Error ? err.message : 'An error occurred while deleting parent');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
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
                      User Type {selectedUserType !== null ? `(${getUpidLabel(selectedUserType)})` : ''}
                      {showUserTypeDropdown && (
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
                        {editingCell?.username === account.username && editingCell?.field === 'fullname' ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={editingCell.value as string}
                              onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                              className="bg-gray-800 rounded px-2 py-1 w-full"
                              autoFocus
                            />
                            <button
                              onClick={() => handleUpdateUser(account.username, 'fullname', editingCell.value)}
                              className="text-green-500 hover:text-green-400"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => setEditingCell(null)}
                              className="text-red-500 hover:text-red-400"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => setEditingCell({ username: account.username, field: 'fullname', value: account.fullname })}
                            className="cursor-pointer hover:bg-gray-700 px-2 py-1 rounded"
                          >
                            {account.fullname}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingCell?.username === account.username && editingCell?.field === 'username' ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="text"
                              value={editingCell.value as string}
                              onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                              className="bg-gray-800 rounded px-2 py-1 w-full"
                              autoFocus
                            />
                            <button
                              onClick={() => handleUpdateUser(account.username, 'username', editingCell.value)}
                              className="text-green-500 hover:text-green-400"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => setEditingCell(null)}
                              className="text-red-500 hover:text-red-400"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => setEditingCell({ username: account.username, field: 'username', value: account.username })}
                            className="cursor-pointer hover:bg-gray-700 px-2 py-1 rounded"
                          >
                            {account.username}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingCell?.username === account.username && editingCell?.field === 'age' ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              value={editingCell.value as number}
                              onChange={(e) => setEditingCell({ ...editingCell, value: parseInt(e.target.value) })}
                              className="bg-gray-800 rounded px-2 py-1 w-20"
                              autoFocus
                            />
                            <button
                              onClick={() => handleUpdateUser(account.username, 'age', editingCell.value)}
                              className="text-green-500 hover:text-green-400"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => setEditingCell(null)}
                              className="text-red-500 hover:text-red-400"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => setEditingCell({ username: account.username, field: 'age', value: account.age })}
                            className="cursor-pointer hover:bg-gray-700 px-2 py-1 rounded"
                          >
                            {account.age === null ? '' : account.age}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {editingCell?.username === account.username && editingCell?.field === 'upid' ? (
                          <div className="flex items-center space-x-2">
                            <select
                              value={editingCell.value as number}
                              onChange={(e) => setEditingCell({ ...editingCell, value: parseInt(e.target.value) })}
                              className="bg-gray-800 rounded px-2 py-1"
                              autoFocus
                            >
                              <option value={1}>Admin</option>
                              <option value={2}>Teacher</option>
                              <option value={3}>Publisher</option>
                              <option value={4}>Parent</option>
                              <option value={5}>Child</option>
                            </select>
                            <button
                              onClick={() => handleUpdateUser(account.username, 'upid', editingCell.value)}
                              className="text-green-500 hover:text-green-400"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => setEditingCell(null)}
                              className="text-red-500 hover:text-red-400"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => setEditingCell({ username: account.username, field: 'upid', value: account.upid })}
                            className="cursor-pointer hover:bg-gray-700 px-2 py-1 rounded"
                          >
                            {getUpidLabel(account.upid)}
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
                        <option value={1}>Admin</option>
                        <option value={2}>Teacher</option>
                        <option value={3}>Publisher</option>
                        <option value={4}>Parent</option>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-900 p-6 rounded-lg w-96">
            <h3 className="text-xl font-bold mb-4">Confirm Deletion</h3>
            <p className="mb-4">
              Are you sure you want to delete {selectedRows.length} user{selectedRows.length > 1 ? 's' : ''}? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => setShowDeleteModal(false)}
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
              Warning: This action will delete the parent account "{selectedParentForModify.name}" and all associated child accounts. This action cannot be undone.
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
          <div className="bg-gray-900 p-6 rounded-lg w-[800px]">
            <div className="flex justify-between items-center mb-4">
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
              <h4 className="text-lg font-semibold mb-2">Current Children</h4>
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
                            onClick={() => handleRemoveChild(selectedParentForModify.username, child.username)}
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
    </div>
  );
} 