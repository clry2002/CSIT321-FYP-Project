'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { UserAccount } from './types';

export default function ProfilesPage() {
  const [publisherDeletePermission, setPublisherDeletePermission] = useState(false);
  const [childPasswordPermission, setChildPasswordPermission] = useState(false);
  const [parentDeletePermission, setParentDeletePermission] = useState(false);
  const [educatorClassroomPermission, setEducatorClassroomPermission] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedProfilePermissions, setSelectedProfilePermissions] = useState<string | null>(null);
  const [showSuspendAllModal, setShowSuspendAllModal] = useState(false);
  const [selectedProfileToSuspend, setSelectedProfileToSuspend] = useState<string | null>(null);
  const [showRevertAllModal, setShowRevertAllModal] = useState(false);
  const [selectedProfileToRevert, setSelectedProfileToRevert] = useState<string | null>(null);
  const [showNewProfileModal, setShowNewProfileModal] = useState(false);
  const [showDeleteProfileModal, setShowDeleteProfileModal] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<string | null>(null);
  const [newProfileName, setNewProfileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);
  const [customProfiles, setCustomProfiles] = useState<{ name: string }[]>([]);

  useEffect(() => {
    fetchData();
    fetchPublisherPermissions();
    fetchChildPermissions();
    fetchParentPermissions();
    fetchEducatorPermissions();
    fetchCustomProfiles();
  }, []);

  const fetchData = async () => {
    try {
      const { data, error } = await supabase
        .from('user_account')
        .select('*');
      if (error) throw error;
      setUserAccounts(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while fetching data');
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

  const fetchChildPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('childpermissions')
        .select('*')
        .eq('permission', 'disable reset password')
        .single();

      if (error) throw error;
      setChildPasswordPermission(data?.active || false);
    } catch (err) {
      console.error('Error fetching child permissions:', err);
    }
  };

  const fetchParentPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('parentpermissions')
        .select('*')
        .eq('permission', 'disable child deletion')
        .single();

      if (error) throw error;
      setParentDeletePermission(data?.active || false);
    } catch (err) {
      console.error('Error fetching parent permissions:', err);
    }
  };

  const fetchEducatorPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('educatorpermissions')
        .select('*')
        .eq('permission', 'disable classroom creation')
        .single();

      if (error) throw error;
      setEducatorClassroomPermission(data?.active || false);
    } catch (err) {
      console.error('Error fetching educator permissions:', err);
    }
  };

  const fetchCustomProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('userprofile')
        .select('*')
        .gt('upid', 5); // Get only custom profiles (upid > 5)
      if (error) throw error;
      setCustomProfiles(data || []);
    } catch (err) {
      console.error('Error fetching custom profiles:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching custom profiles');
    }
  };

  const handleCreateCustomProfile = async () => {
    try {
      if (!newProfileName.trim()) return;

      // Get the next upid
      const { data: maxUpidData, error: maxError } = await supabase
        .from('userprofile')
        .select('upid')
        .order('upid', { ascending: false })
        .limit(1)
        .single();

      if (maxError) throw maxError;
      const nextUpid = (maxUpidData?.upid || 5) + 1;

      const { error } = await supabase
        .from('userprofile')
        .insert({ 
          upid: nextUpid,
          name: newProfileName.trim(),
          suspended: false
        });

      if (error) throw error;

      await fetchCustomProfiles();
      setShowNewProfileModal(false);
      setNewProfileName('');
    } catch (err) {
      console.error('Error creating custom profile:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while creating custom profile');
    }
  };

  const handleDeleteCustomProfile = async (name: string) => {
    try {
      const { error } = await supabase
        .from('userprofile')
        .delete()
        .eq('name', name);

      if (error) throw error;

      await fetchCustomProfiles();
      setShowDeleteProfileModal(false);
      setProfileToDelete(null);
    } catch (err) {
      console.error('Error deleting custom profile:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while deleting custom profile');
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

  const handleToggleChildPermission = async () => {
    try {
      const { error } = await supabase
        .from('childpermissions')
        .update({ active: !childPasswordPermission })
        .eq('permission', 'disable reset password');

      if (error) throw error;
      setChildPasswordPermission(!childPasswordPermission);
    } catch (err) {
      console.error('Error updating child permission:', err);
    }
  };

  const handleToggleParentPermission = async () => {
    try {
      const { error } = await supabase
        .from('parentpermissions')
        .update({ active: !parentDeletePermission })
        .eq('permission', 'disable child deletion');

      if (error) throw error;
      setParentDeletePermission(!parentDeletePermission);
    } catch (err) {
      console.error('Error updating parent permission:', err);
    }
  };

  const handleToggleEducatorPermission = async () => {
    try {
      const { error } = await supabase
        .from('educatorpermissions')
        .update({ active: !educatorClassroomPermission })
        .eq('permission', 'disable classroom creation');

      if (error) throw error;
      setEducatorClassroomPermission(!educatorClassroomPermission);
    } catch (err) {
      console.error('Error updating educator permission:', err);
    }
  };

  const handleSuspendAllUsers = async (profileName: string) => {
    try {
      // Get the profile ID
      const profileId = userTypes.find(type => type.label === profileName)?.id;
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
      const profileId = userTypes.find(type => type.label === profileName)?.id;
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

  const isProfileFullySuspended = (profileName: string) => {
    const profileId = userTypes.find(type => type.label === profileName)?.id;
    if (!profileId) return false;
    
    const usersOfType = userAccounts.filter(user => user.upid === profileId);
    return usersOfType.length > 0 && usersOfType.every(user => user.suspended);
  };

  const userTypes = [
    { id: 3, label: 'Child' },
    { id: 2, label: 'Parent' },
    { id: 1, label: 'Publisher' },
    { id: 4, label: 'Educator' }
  ];

  return (
    <div className="bg-gray-900 rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-bold">User Profiles</h2>
          <button
            onClick={() => setShowNewProfileModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg relative group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
              Add new profile
            </span>
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-900 text-red-200 p-4 rounded-lg mb-4">
          {error}
        </div>
      )}

      <div className="mb-8">
        <table className="min-w-full divide-y divide-gray-800">
          <thead className="bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Profile Name</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {/* Administrator Profile */}
            <tr className="hover:bg-gray-800">
              <td className="px-6 py-4">
                <div className="flex items-center">
                  Administrator
                  <div className="relative ml-3">
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className="h-6 w-6 text-yellow-500 animate-pulse" 
                      viewBox="0 0 24 24" 
                      fill="currentColor"
                    >
                      <path d="M2.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0zm15 0a3 3 0 1 1 6 0 3 3 0 0 1-6 0zm-7.5 3a3 3 0 1 1 6 0 3 3 0 0 1-6 0zM2 12h20l-2 8H4l-2-8z"/>
                    </svg>
                    <div className="absolute inset-0 animate-ping">
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-6 w-6 text-yellow-300 opacity-75" 
                        viewBox="0 0 24 24" 
                        fill="currentColor"
                      >
                        <path d="M2.5 5.5a3 3 0 1 1 6 0 3 3 0 0 1-6 0zm15 0a3 3 0 1 1 6 0 3 3 0 0 1-6 0zm-7.5 3a3 3 0 1 1 6 0 3 3 0 0 1-6 0zM2 12h20l-2 8H4l-2-8z"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="flex items-center justify-end">
                  {/* No buttons for Administrator */}
                </div>
              </td>
            </tr>
            {['Child', 'Parent', 'Publisher', 'Educator'].map((profile, index) => (
              <tr key={index} className="hover:bg-gray-800">
                <td className="px-6 py-4">{profile}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end">
                    <button
                      onClick={() => {
                        setSelectedProfilePermissions(profile);
                        setShowPermissionsModal(true);
                      }}
                      className="relative group mr-8"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 hover:text-white" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                      </svg>
                      <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                        Profile Settings
                      </span>
                    </button>
                    {isProfileFullySuspended(profile) ? (
                      <button
                        onClick={() => {
                          setSelectedProfileToRevert(profile);
                          setShowRevertAllModal(true);
                        }}
                        className="relative px-6 py-2 inline-flex items-center justify-center text-sm leading-5 font-semibold rounded-full whitespace-nowrap min-w-[100px] bg-green-900 text-green-200 cursor-pointer hover:bg-green-800 group"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Revert All
                        <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                          Revert suspension for all users of this type
                        </span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedProfileToSuspend(profile);
                          setShowSuspendAllModal(true);
                        }}
                        className="relative px-6 py-2 inline-flex items-center justify-center text-sm leading-5 font-semibold rounded-full whitespace-nowrap min-w-[100px] bg-yellow-900 text-yellow-200 cursor-pointer hover:bg-yellow-800 group"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                        Suspend All
                        <span className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-50">
                          Suspend all users of this type
                        </span>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Custom Profiles Table */}
      <div className="mt-12">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Custom Profiles</h2>
        </div>

        <table className="min-w-full divide-y divide-gray-800">
          <thead className="bg-gray-900">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Profile Name</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {customProfiles.map((profile, index) => (
              <tr key={index} className="hover:bg-gray-800">
                <td className="px-6 py-4">{profile.name}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end">
                    <button
                      onClick={() => {
                        setProfileToDelete(profile.name);
                        setShowDeleteProfileModal(true);
                      }}
                      className="text-red-400 hover:text-red-300"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {customProfiles.length === 0 && (
              <tr>
                <td colSpan={2} className="px-6 py-4 text-center text-gray-500">
                  No custom profiles created yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

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

            {selectedProfilePermissions === 'Child' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                  <div>
                    <h4 className="font-semibold">Disable Password Reset</h4>
                    <p className="text-sm text-gray-400">Prevent children from resetting their own passwords</p>
                  </div>
                  <button
                    onClick={handleToggleChildPermission}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      childPasswordPermission ? 'bg-indigo-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        childPasswordPermission ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {selectedProfilePermissions === 'Parent' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                  <div>
                    <h4 className="font-semibold">Disable Child Account Deletion</h4>
                    <p className="text-sm text-gray-400">Prevent parents from deleting their child accounts</p>
                  </div>
                  <button
                    onClick={handleToggleParentPermission}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      parentDeletePermission ? 'bg-indigo-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        parentDeletePermission ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {selectedProfilePermissions === 'Educator' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                  <div>
                    <h4 className="font-semibold">Disable Classroom Creation</h4>
                    <p className="text-sm text-gray-400">Prevent educators from creating new classrooms</p>
                  </div>
                  <button
                    onClick={handleToggleEducatorPermission}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                      educatorClassroomPermission ? 'bg-indigo-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        educatorClassroomPermission ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}

            {selectedProfilePermissions !== 'Publisher' && 
             selectedProfilePermissions !== 'Child' && 
             selectedProfilePermissions !== 'Parent' &&
             selectedProfilePermissions !== 'Educator' && (
              <div className="text-gray-400 text-center py-4">
                No configurable permissions available for this profile type.
              </div>
            )}
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

      {/* Add New Profile Modal */}
      {showNewProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 overflow-hidden">
          <div className="bg-gray-900 p-6 rounded-lg w-[500px]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Create New Profile</h3>
              <button
                onClick={() => {
                  setShowNewProfileModal(false);
                  setNewProfileName('');
                }}
                className="text-gray-400 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="profileName" className="block text-sm font-medium text-gray-400 mb-2">
                  Profile Name
                </label>
                <input
                  type="text"
                  id="profileName"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter profile name"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowNewProfileModal(false);
                  setNewProfileName('');
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCustomProfile}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
                disabled={!newProfileName.trim()}
              >
                Create Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Profile Confirmation Modal */}
      {showDeleteProfileModal && profileToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 overflow-hidden">
          <div className="bg-gray-900 p-6 rounded-lg w-[500px]">
            <div className="flex items-center space-x-3 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" />
              </svg>
              <h3 className="text-xl font-bold">Delete Custom Profile</h3>
            </div>
            <p className="mb-4 text-red-400">
              Are you sure you want to delete the custom profile &quot;{profileToDelete}&quot;? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowDeleteProfileModal(false);
                  setProfileToDelete(null);
                }}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCustomProfile(profileToDelete)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded flex items-center space-x-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span>Delete Profile</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 