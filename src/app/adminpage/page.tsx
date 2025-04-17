'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { PostgrestError } from '@supabase/supabase-js';

interface UserAccount {
  fullname: string;
  username: string;
  age: number;
  upid: number;
  created_at: string;
  updated_at: string;
  suspended: boolean;
  comments?: string;
  user_id?: string;
  id?: string;
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

interface RelationshipData {
  parent_id: string;
  child_id: string;
  parent: {
    username: string;
    fullname: string;
  };
  child: {
    username: string;
    fullname: string;
  };
}

interface ClassroomData {
  crid: number;
  name: string;
  description: string;
  educatorName: string;
  students: {
    username: string;
    fullname: string;
    invitation_status: string;
  }[];
}

interface StudentData {
  invitation_status: string;
  user_account: {
    username: string;
    fullname: string;
  };
}

interface ClassroomWithStudents {
  crid: number;
  name: string;
  description: string;
  uaid_educator: string;
}

interface DiscussionEntry {
  id: number;
  message: string;
  sender_name: string;
  created_at: string;
}

interface DiscussionData {
  classroomName: string;
  teacherQuestion: string;
  responses: DiscussionEntry[];
}

interface EditingCell {
  username: string;
  field: string;
  value: string | number;
}

interface UserDetailsModalProps {
  user: UserAccount | null;
  onClose: () => void;
  onStatusClick: (user: UserAccount) => void;
  onEdit: (username: string, field: string, value: string | number) => void;
  userTypes: { id: number; label: string; }[];
  getUpidLabel: (upid: number) => string;
}

const UserDetailsModal: React.FC<UserDetailsModalProps> = ({
  user,
  onClose,
  onStatusClick,
  onEdit,
  userTypes,
  getUpidLabel,
}) => {
  type EditingCell = {
    username: string;
    field: string;
    value: string | number;
  };
  
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);

  const getEditableUserTypes = (currentUpid: number) => {
    if (currentUpid === 3) return [];
    return userTypes.filter(type => type.id !== 3);
  };

  if (!user) return null;

  const handleEditingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (editingCell) {
      setEditingCell({ ...editingCell, value: parseInt(e.target.value) });
    }
  };

  const startEditing = (field: string, value: string | number) => {
    setEditingCell({ username: user.username, field, value });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-900 p-6 rounded-lg w-[1000px]">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <h3 className="text-2xl font-bold">User Details</h3>
            <button
              onClick={() => onStatusClick(user)}
              className={`px-6 py-2 inline-flex items-center justify-center text-sm leading-5 font-semibold rounded-full whitespace-nowrap min-w-[100px] ${
                user.suspended 
                  ? 'bg-red-900 text-red-200 hover:bg-red-800' 
                  : 'bg-green-900 text-green-200 hover:bg-green-800'
              }`}
            >
              {user.suspended ? 'Suspended' : 'Active'}
            </button>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        <div className="space-y-4">
          {editingCell ? (
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="mb-2">
                <label className="text-sm text-gray-400">
                  Editing {editingCell.field === 'upid' ? 'User Type' : editingCell.field.charAt(0).toUpperCase() + editingCell.field.slice(1)}
                </label>
              </div>
              {editingCell.field === 'upid' ? (
                <select
                  value={editingCell.value as number}
                  onChange={(e) => setEditingCell({ ...editingCell, value: parseInt(e.target.value) })}
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 mb-4"
                  autoFocus
                >
                  {getEditableUserTypes(user.upid).map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.label}
                    </option>
                  ))}
                </select>
              ) : editingCell.field === 'age' ? (
                <input
                  type="number"
                  value={editingCell.value as number}
                  onChange={(e) => setEditingCell({ ...editingCell, value: parseInt(e.target.value) })}
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 mb-4"
                  autoFocus
                />
              ) : (
                <input
                  type="text"
                  value={editingCell.value as string}
                  onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                  className="w-full bg-gray-700 text-white rounded px-3 py-2 mb-4"
                  autoFocus
                />
              )}
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setEditingCell(null)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    onEdit(user.username, editingCell.field, editingCell.value);
                    setEditingCell(null);
                  }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white"
                >
                  Save Changes
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-4">
                <div 
                  className="col-span-2 bg-gray-800 p-4 rounded-lg cursor-pointer hover:bg-gray-700"
                  onClick={() => setEditingCell({ username: user.username, field: 'fullname', value: user.fullname })}
                >
                  <div className="text-sm text-gray-400 mb-1">FULL NAME</div>
                  <div className="text-white break-all">{user.fullname}</div>
                </div>
                <div 
                  className="col-span-2 bg-gray-800 p-4 rounded-lg cursor-pointer hover:bg-gray-700"
                  onClick={() => setEditingCell({ username: user.username, field: 'username', value: user.username })}
                >
                  <div className="text-sm text-gray-400 mb-1">USERNAME</div>
                  <div className="text-white break-all">{user.username}</div>
                </div>
                <div 
                  className="bg-gray-800 p-4 rounded-lg cursor-pointer hover:bg-gray-700"
                  onClick={() => setEditingCell({ username: user.username, field: 'age', value: user.age })}
                >
                  <div className="text-sm text-gray-400 mb-1">AGE</div>
                  <div className="text-white">{user.age}</div>
                </div>
                <div 
                  className={`col-span-2 bg-gray-800 p-4 rounded-lg ${user.upid === 3 ? '' : 'cursor-pointer hover:bg-gray-700'}`}
                >
                  <div className="text-sm text-gray-400 mb-1">USER TYPE</div>
                  {user.upid === 3 ? (
                    <div className="text-white">{getUpidLabel(user.upid)}</div>
                  ) : (
                    editingCell?.username === user.username && editingCell?.field === 'upid' ? (
                      <div className="flex items-center space-x-2">
                        <select
                          value={editingCell.value as number}
                          onChange={handleEditingChange}
                          className="w-full bg-gray-700 text-white rounded px-3 py-2 mb-4"
                          autoFocus
                        >
                          {userTypes.filter(type => type.id !== 3).map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => onEdit(user.username, 'upid', editingCell.value)}
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
                        onClick={() => startEditing('upid', user.upid)}
                        className="text-white cursor-pointer"
                      >
                        {getUpidLabel(user.upid)}
                      </div>
                    )
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">CREATED AT</div>
                  <div className="text-white">{new Date(user.created_at).toLocaleString()}</div>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="text-sm text-gray-400 mb-1">UPDATED AT</div>
                  <div className="text-white">{new Date(user.updated_at).toLocaleString()}</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

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
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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

  const userTypes = [
    { id: 1, label: 'Publisher' },
    { id: 2, label: 'Parent' },
    { id: 3, label: 'Child' },
    { id: 5, label: 'Teacher' }
  ];

  const getUpidLabel = (upid: number) => {
    switch (upid) {
      case 1: return 'Publisher';
      case 2: return 'Parent';
      case 3: return 'Child';
      case 5: return 'Teacher';
      default: return 'Unknown';
    }
  };

  useEffect(() => {
    fetchUserAccounts();
    fetchRelationships();
    fetchClassrooms();
  }, []);

  const fetchUserAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('user_account')
        .select('fullname, username, age, upid, created_at, updated_at, suspended, comments');

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
        .select(`
          parent_id,
          child_id,
          parent:user_account!fk_parent_id(username, fullname),
          child:user_account!fk_child_id(username, fullname)
        `) as { data: RelationshipData[] | null, error: PostgrestError | null };

      if (error) throw error;

      // Transform the data to match the expected format
      const transformedRelationships = (data || []).map(rel => ({
        parent: rel.parent.username,
        child: rel.child.username
      }));

      setRelationships(transformedRelationships);
    } catch (err) {
      console.error('Error fetching relationships:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching relationships');
    }
  };

  const fetchClassrooms = async () => {
    try {
      // First, get all classrooms
      const { data: classroomData, error: classroomError } = await supabase
        .from('temp_classroom')
        .select(`
          crid,
          name,
          description,
          uaid_educator
        `) as { data: ClassroomWithStudents[] | null, error: PostgrestError | null };

      if (classroomError) throw classroomError;

      // For each classroom, get the educator's name and students
      const classroomsWithDetails = await Promise.all((classroomData || []).map(async (classroom) => {
        // Get educator name
        const { data: educatorData } = await supabase
          .from('user_account')
          .select('fullname')
          .eq('id', classroom.uaid_educator)
          .single() as { data: { fullname: string } | null };

        // Get students
        const { data: studentData } = await supabase
          .from('temp_classroomstudents')
          .select(`
            invitation_status,
            user_account:uaid_child(
              username,
              fullname
            )
          `)
          .eq('crid', classroom.crid) as { data: StudentData[] | null };

        const students = (studentData || []).map(student => ({
          username: student.user_account.username,
          fullname: student.user_account.fullname,
          invitation_status: student.invitation_status
        }));

        return {
          crid: classroom.crid,
          name: classroom.name,
          description: classroom.description,
          educatorName: educatorData?.fullname || 'Unknown Educator',
          students
        };
      }));

      setClassrooms(classroomsWithDetails);
    } catch (err) {
      console.error('Error fetching classrooms:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching classrooms');
    } finally {
      setLoadingClassrooms(false);
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

      // Add age validation
      if (newUser.age < 18) {
        setModalMessage({ type: 'error', text: 'Age must be 18 or older' });
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

  const handleSuspendUser = async (user: UserAccount) => {
    try {
      const { error } = await supabase
        .from('user_account')
        .update({ 
          suspended: true,
          comments: suspendComment,
          updated_at: new Date().toISOString()
        })
        .eq('username', user.username);

      if (error) throw error;

      setUserAccounts(userAccounts.map(u => 
        u.username === user.username 
          ? { ...u, suspended: true, comments: suspendComment }
          : u
      ));
      
      setShowSuspendModal(false);
      setSelectedUser(null);
      setSuspendComment('');
      setShowUserModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while suspending user');
    }
  };

  const handleRevertSuspension = async (user: UserAccount) => {
    try {
      const { error } = await supabase
        .from('user_account')
        .update({ 
          suspended: false,
          comments: 'na',
          updated_at: new Date().toISOString()
        })
        .eq('username', user.username);

      if (error) throw error;

      setUserAccounts(userAccounts.map(u => 
        u.username === user.username 
          ? { ...u, suspended: false, comments: 'na' }
          : u
      ));
      
      setShowRevertModal(false);
      setSelectedUser(null);
      setShowUserModal(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while reverting suspension');
    }
  };

  const handleDeleteUsers = async () => {
    if (selectedRows.length === 0) return;

    try {
      setDeleteUserError(null);

      // Check if any of the selected users are parents
      const selectedUsers = userAccounts.filter(user => selectedRows.includes(user.username));
      const parentsToDelete = selectedUsers.filter(user => user.upid === 2);

      // If there are parents to delete, get their children
      if (parentsToDelete.length > 0) {
        for (const parent of parentsToDelete) {
          const children = getChildrenForParent(parent.username);
          
          // First, delete parent-child relationships
          for (const child of children) {
            // Get the parent and child IDs
            const { data: parentData } = await supabase
              .from('user_account')
              .select('id')
              .eq('username', parent.username)
              .single();

            const { data: childData } = await supabase
              .from('user_account')
              .select('id')
              .eq('username', child.username)
              .single();

            if (parentData && childData) {
              // Delete the relationship
              const { error: relationshipError } = await supabase
                .from('isparentof')
                .delete()
                .match({ 
                  parent_id: parentData.id, 
                  child_id: childData.id 
                });
              
              if (relationshipError) throw relationshipError;
            }

            // Delete the child's auth user
            const childUser = userAccounts.find(u => u.username === child.username);
            if (childUser?.user_id) {
              const { error: authError } = await supabase.auth.admin.deleteUser(
                childUser.user_id
              );
              if (authError) throw authError;
            }

            // Delete the child's user account
            const { error: childError } = await supabase
              .from('user_account')
              .delete()
              .eq('username', child.username);
            
            if (childError) throw childError;
          }

          // Delete the parent's auth user
          if (parent.user_id) {
            const { error: authError } = await supabase.auth.admin.deleteUser(
              parent.user_id
            );
            if (authError) throw authError;
          }
        }
      }

      // Delete remaining selected users' auth accounts
      for (const user of selectedUsers.filter(user => user.upid !== 2)) {
        if (user.user_id) {
          const { error: authError } = await supabase.auth.admin.deleteUser(
            user.user_id
          );
          if (authError) throw authError;
        }
      }

      // Delete the selected users from user_account table
      const { error } = await supabase
        .from('user_account')
        .delete()
        .in('username', selectedRows);

      if (error) throw error;

      setUserAccounts(userAccounts.filter(user => !selectedRows.includes(user.username)));
      setSelectedRows([]);
      setShowDeleteModal(false);
    } catch (err) {
      console.error('Error deleting users:', err);
      setDeleteUserError(err instanceof Error ? err.message : 'An error occurred while deleting users');
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
      
      const matchesStatus = selectedStatusFilter === null || user.suspended === selectedStatusFilter;
      
      const matchesUserType = selectedUserTypeFilter === null || user.upid === selectedUserTypeFilter;
      
      return matchesSearch && matchesStatus && matchesUserType;
    })
    .sort((a, b) => {
      if (sortOrder === null && createdAtSort === null && updatedAtSort === null) return 0;
      
      if (sortOrder !== null) {
        return sortOrder === 'asc' ? a.age - b.age : b.age - a.age;
      }
      
      if (createdAtSort !== null) {
        return createdAtSort === 'asc' 
          ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          : new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      
      if (updatedAtSort !== null) {
        return updatedAtSort === 'asc'
          ? new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
          : new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      }
      
      return 0;
    });

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
        .select('id')
        .eq('username', childUsername)
        .single();

      if (childError) throw childError;

      if (!parentData?.id || !childData?.id) {
        throw new Error('Could not find parent or child account');
      }

      // First remove the relationship using the IDs
      const { error: relationshipError } = await supabase
        .from('isparentof')
        .delete()
        .match({ 
          parent_id: parentData.id, 
          child_id: childData.id 
        });

      if (relationshipError) throw relationshipError;

      // Delete the child's user account
      const { error: deleteError } = await supabase
        .from('user_account')
        .delete()
        .eq('username', childUsername);

      if (deleteError) throw deleteError;
      
      // Refresh both user accounts and relationships after removing
      await fetchUserAccounts();
      await fetchRelationships();

      // Reset any errors
      setError(null);
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

  const fetchDiscussionData = async (classroomId: number, classroomName: string) => {
    setLoadingDiscussion(true);
    try {
      // Fetch teacher's question
      const { data: questionData, error: questionError } = await supabase
        .from('discussionboard')
        .select('question')
        .eq('crid', classroomId)
        .not('question', 'is', null)
        .order('created_at', { ascending: true })
        .limit(1);
      
      if (questionError) throw questionError;

      // Fetch student responses
      const { data: responsesData, error: responsesError } = await supabase
        .from('discussionboard')
        .select('did, response, uaid, created_at')
        .eq('crid', classroomId)
        .not('response', 'is', null)
        .order('created_at', { ascending: true });

      if (responsesError) throw responsesError;

      // Enrich responses with sender names
      const enriched = await Promise.all(
        (responsesData || []).map(async (entry) => {
          const { data: profileData, error: profileError } = await supabase
            .from('user_account')
            .select('fullname')
            .eq('user_id', entry.uaid)
            .single();

          if (profileError) {
            console.error('Error fetching profile data:', profileError);
            return {
              id: entry.did,
              message: entry.response,
              sender_name: 'Unknown',
              created_at: entry.created_at,
            };
          }

          return {
            id: entry.did,
            message: entry.response,
            sender_name: profileData?.fullname || 'Unknown',
            created_at: entry.created_at,
          };
        })
      );

      setSelectedDiscussion({
        classroomName,
        teacherQuestion: questionData && questionData.length > 0 ? questionData[0].question : '',
        responses: enriched
      });
    } catch (err) {
      console.error('Error fetching discussion data:', err);
    } finally {
      setLoadingDiscussion(false);
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

  const handleEditingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (editingCell) {
      setEditingCell({ ...editingCell, value: parseInt(e.target.value) });
    }
  };

  const startEditing = (username: string, field: string, value: string | number) => {
    setEditingCell({ username, field, value });
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
                      className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-800"
                      onClick={() => setShowUserTypeDropdown(!showUserTypeDropdown)}
                    >
                      <div className="relative">
                        User Type {selectedUserTypeFilter !== null ? `(${getUpidLabel(selectedUserTypeFilter)})` : ''}
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
                              {userTypes.map(type => (
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
                                setSelectedStatusFilter(null);
                                setShowStatusDropdown(false);
                              }}
                            >
                              All Status
                            </button>
                            <button
                              className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedStatusFilter(false);
                                setShowStatusDropdown(false);
                              }}
                            >
                              Active
                            </button>
                            <button
                              className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
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
                      )}
                    </th>
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
                              className="bg-gray-800 rounded px-2 py-1 w-full text-white"
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
                            className={`cursor-pointer hover:bg-gray-700 px-2 py-1 rounded ${
                              account.suspended ? 'text-red-400' : 'text-white'
                            }`}
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
                              className="bg-gray-800 rounded px-2 py-1 w-full text-white"
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
                            className={`cursor-pointer hover:bg-gray-700 px-2 py-1 rounded ${
                              account.suspended ? 'text-red-400' : 'text-white'
                            }`}
                          >
                            {account.username}
                          </div>
                        )}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap ${account.suspended ? 'text-red-400' : 'text-white'}`}>
                        {editingCell?.username === account.username && editingCell?.field === 'age' ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              value={editingCell.value as number}
                              onChange={(e) => setEditingCell({ ...editingCell, value: parseInt(e.target.value) })}
                              className="bg-gray-800 rounded px-2 py-1 w-full text-white"
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
                            {account.age}
                          </div>
                        )}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap ${account.suspended ? 'text-red-400' : 'text-white'}`}>
                        {account.upid === 3 ? (
                          <div className="px-2 py-1 rounded">
                            {getUpidLabel(account.upid)}
                          </div>
                        ) : (
                          editingCell?.username === account.username && editingCell?.field === 'upid' ? (
                            <div className="flex items-center space-x-2">
                              <select
                                value={editingCell.value as number}
                                onChange={handleEditingChange}
                                className="bg-gray-800 rounded px-2 py-1 w-full text-white"
                                autoFocus
                              >
                                {userTypes.filter(type => type.id !== 3).map((type) => (
                                  <option key={type.id} value={type.id}>
                                    {type.label}
                                  </option>
                                ))}
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
                              onClick={() => startEditing(account.username, 'upid', account.upid)}
                              className="cursor-pointer hover:bg-gray-700 px-2 py-1 rounded"
                            >
                              {getUpidLabel(account.upid)}
                            </div>
                          )
                        )}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap ${account.suspended ? 'text-red-400' : 'text-white'}`}>
                        {new Date(account.created_at).toLocaleDateString()}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap ${account.suspended ? 'text-red-400' : 'text-white'}`}>
                        {new Date(account.updated_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap min-w-[120px] text-center">
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
                          className={`px-6 py-2 inline-flex items-center justify-center text-sm leading-5 font-semibold rounded-full whitespace-nowrap min-w-[100px] ${
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
                    <td 
                      className={`px-6 py-4 whitespace-nowrap cursor-pointer hover:text-blue-400 ${
                        userAccounts.find(u => u.username === group.parentUsername)?.suspended ? 'text-red-400' : 'text-white'
                      }`}
                      onClick={() => handleUserClick(group.parentUsername)}
                    >
                      {group.parentUsername}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap ${
                      userAccounts.find(u => u.username === group.parentUsername)?.suspended ? 'text-red-400' : 'text-white'
                    }`}>
                      {group.parentName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{group.parentAge}</td>
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

        {/* Classrooms Table */}
        <div className="bg-gray-900 rounded-lg shadow-lg p-6 mt-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Classrooms</h2>
          </div>
          
          {loadingClassrooms ? (
            <div className="text-center py-4">Loading classrooms...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-800">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Classroom Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Educator</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Students</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {classrooms.slice(0, showAllClassrooms ? undefined : 3).map((classroom) => (
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
              {classrooms.length > 3 && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setShowAllClassrooms(!showAllClassrooms)}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    {showAllClassrooms ? 'Show Less' : `Show All (${classrooms.length} classrooms)`}
                  </button>
                </div>
              )}
            </div>
          )}
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
                        {userTypes.map(type => (
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
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
          userTypes={userTypes}
          getUpidLabel={getUpidLabel}
        />
      )}
    </div>
  );
} 