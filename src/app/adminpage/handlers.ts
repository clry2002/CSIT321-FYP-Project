import { UserAccount, NewUser } from './types';
import * as api from './api';
import { supabase } from '@/lib/supabase';

export const handleCreateAuth = async (
  newUser: NewUser,
  setModalMessage: (message: { type: 'success' | 'error'; text: string; } | null) => void,
  setAuthUserId: (id: string | null) => void,
  setStep: (step: 'auth' | 'details') => void
) => {
  try {
    setModalMessage(null);
    
    if (!newUser.email || !newUser.password) {
      setModalMessage({ type: 'error', text: 'Please enter both email and password' });
      return;
    }

    const authData = await api.createUserAuth(newUser.email, newUser.password);
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

export const handleCreateAccount = async (
  newUser: NewUser,
  authUserId: string | null,
  setModalMessage: (message: { type: 'success' | 'error'; text: string; } | null) => void,
  onSuccess: () => void
) => {
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

    await api.createUserAccount(userToInsert);
    setModalMessage({ type: 'success', text: 'User account created successfully!' });
    
    // Refresh the table and redirect after a short delay
    setTimeout(onSuccess, 1500);
  } catch (err) {
    console.error('Account creation error:', err);
    setModalMessage({ 
      type: 'error', 
      text: err instanceof Error ? err.message : 'An error occurred while creating the account'
    });
  }
};

export const handleSuspendUser = async (
  user: UserAccount,
  suspendComment: string,
  onSuccess: (username: string, suspended: boolean, comments: string) => void
) => {
  try {
    await api.updateUserStatus(user.username, true, suspendComment);
    onSuccess(user.username, true, suspendComment);
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'An error occurred while suspending user');
  }
};

export const handleRevertSuspension = async (
  user: UserAccount,
  onSuccess: (username: string, suspended: boolean, comments: string) => void
) => {
  try {
    await api.updateUserStatus(user.username, false, 'na');
    onSuccess(user.username, false, 'na');
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'An error occurred while reverting suspension');
  }
};

export const handleDeleteUsers = async (
  selectedRows: string[],
  userAccounts: UserAccount[],
  onSuccess: () => void,
  setDeleteUserError: (error: string | null) => void
) => {
  if (selectedRows.length === 0) return;

  try {
    setDeleteUserError(null);

    // Check if any of the selected users are parents
    const selectedUsers = userAccounts.filter(user => selectedRows.includes(user.username));
    const parentsToDelete = selectedUsers.filter(user => user.upid === 2);
    const nonParentUsers = selectedUsers.filter(user => user.upid !== 2);

    // Delete parents and their children
    for (const parent of parentsToDelete) {
      if (parent.user_id) {
        await api.deleteAuthUser(parent.user_id);
      }
      await api.deleteUser(parent.username);
    }

    // Delete remaining selected users
    for (const user of nonParentUsers) {
      if (user.upid === 3) {
        // For child users, first get parent-child relationship
        const { data: parentData, error: parentError } = await supabase
          .from('user_account')
          .select('id')
          .eq('username', user.username)
          .single();

        if (parentError) throw parentError;

        if (parentData?.id) {
          // First remove the relationship using the ID
          const { error: relationshipError } = await supabase
            .from('isparentof')
            .delete()
            .match({ 
              child_id: parentData.id 
            });

          if (relationshipError) throw relationshipError;
        }
      }

      // Delete the user's auth account if it exists
      if (user.user_id) {
        await api.deleteAuthUser(user.user_id);
      }
      
      // Delete the user account
      await api.deleteUser(user.username);
    }

    onSuccess();
  } catch (err) {
    console.error('Error deleting users:', err);
    setDeleteUserError(err instanceof Error ? err.message : 'An error occurred while deleting users');
  }
};

export const handleUpdateUser = async (
  username: string,
  field: string,
  value: string | number,
  onSuccess: (username: string, field: string, value: string | number) => void
) => {
  try {
    await api.updateUser(username, field, value);
    onSuccess(username, field, value);
  } catch (err) {
    throw new Error(err instanceof Error ? err.message : 'An error occurred while updating user');
  }
}; 