'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/contexts/SessionContext';

// const GENRES = [
//   'Fantasy', 'Science Fiction', 'Mystery', 'Romance', 'Thriller',
//   'Horror', 'Historical Fiction', 'Literary Fiction', 'Young Adult',
//   'Biography', 'Self-Help', 'Business', 'Poetry', 'Drama'
// ];

const USER_TYPES = ['Parent', 'Publisher', 'Educator'];

export default function SetupPage() {
  const router = useRouter();
  const { refreshProfile } = useSession();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [userType, setUserType] = useState('');
  // const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  // const [setSelectedGenres] = useState<string[]>([]);
  // const [parentEmail, setParentEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [children, setChildren] = useState<Array<{
    user_id: string;
    fullname: string;
    username: string;
    age: number;
  }>>([]);
  const [selectedChild, setSelectedChild] = useState<string>('');

  // const handleGenreToggle = (genre: string) => {
  //   setSelectedGenres(prev => {
  //     if (prev.includes(genre)) {
  //       return prev.filter(g => g !== genre);
  //     } else if (prev.length < 3) {
  //       return [...prev, genre];
  //     }
  //     return prev;
  //   });
  // };

  const checkUsername = async (username: string) => {
    if (!username) {
      setUsernameAvailable(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_account')
        .select('username')
        .eq('username', username);

      if (error) {
        console.error('Error checking username:', error);
        return;
      }

      // If no data or empty array returned, username is available
      setUsernameAvailable(!data || data.length === 0);
    } catch (error) {
      console.error('Error checking username:', error);
    }
  };

  const handleUsernameChange = (value: string) => {
    const sanitizedUsername = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(sanitizedUsername);
    checkUsername(sanitizedUsername);
  };

  const fetchChildrenForParent = async (email: string) => {
    try {
      // First get child profiles that match the parent email
      const { data: childProfiles, error: childProfileError } = await supabase
        .from('child_profile')
        .select('child_id, parent_email')
        .eq('parent_email', email);

      if (childProfileError) throw childProfileError;
      if (!childProfiles?.length) return;

      // Get the user details for each child
      const { data: childUsers, error: childUsersError } = await supabase
        .from('user_account')
        .select('user_id, fullname, username, age')
        .in('user_id', childProfiles.map(profile => profile.child_id));

      if (childUsersError) throw childUsersError;
      if (childUsers) {
        setChildren(childUsers);
      }
    } catch (error) {
      console.error('Error fetching children:', error);
    }
  };

  const handleUserTypeChange = async (value: string) => {
    setUserType(value);
    if (value === 'Parent') {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        await fetchChildrenForParent(user.email);
      }
    } else {
      setChildren([]);
      setSelectedChild('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userType) {
      setError('Please select your role');
      return;
    }
    if (userType === 'Parent' && children.length > 0 && !selectedChild) {
      setError('Please select your child');
      return;
    }
    if (!usernameAvailable) {
      setError('Please choose a different username');
      return;
    }
    if (parseInt(age) < 18) {
      setError('You must be at least 18 years old to complete setup');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError) {
        console.error('Auth error:', userError);
        throw userError;
      }
      if (!user) throw new Error('No user found');

      // Determine upid based on selected role
      const upid = userType === 'Parent' ? 2 :
        userType === 'Publisher' ? 1 :
        userType === 'Educator' ? 5 : null;

      if (!upid) {
        throw new Error('Invalid user type');
      }

      const userData = {
        user_id: user.id,
        username,
        fullname: name,
        age: parseInt(age),
        upid,
        updated_at: new Date().toISOString()
      };

      console.log('Saving user data:', userData);

      // First, check if user already exists
      const { data: existingUser, error: checkError } = await supabase
        .from('user_account')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing user:', checkError);
        throw checkError;
      }

      let error;
      if (existingUser) {
        // If user exists, update their profile
        const { error: updateError } = await supabase
          .from('user_account')
          .update(userData)
          .eq('user_id', user.id);
        error = updateError;
      } else {
        // If user doesn't exist, create new profile
        const { error: insertError } = await supabase
          .from('user_account')
          .insert({
            ...userData,
            created_at: new Date().toISOString()
          });
        error = insertError;
      }

      if (error) {
        console.error('Database operation error:', error);
        throw error;
      }

      // Handle profile creation based on user type
      if (upid === 1) { // Publisher
        // Publisher role is already set via upid in user_account table
        router.push('/publisherpage');
      } else if (upid === 2) { // Parent
        // Parent role is already set via upid in user_account table
        router.push('/parentpage');
      } else if (upid === 5) { // Educator
        // Educator role is already set via upid in user_account table
        router.push('/educatorpage');
      }

      await refreshProfile();
      
    } catch (err) {
      console.error('Submission error:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        setError(err.message as string);
      } else {
        setError('An error occurred while saving your preferences');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900">Complete your profile</h2>
          <p className="mt-2 text-sm text-gray-600">
            Tell us a bit about yourself to get personalized recommendations
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent !text-black"
              />
            </div>

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <div className="mt-1 relative">
                <input
                  id="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  className={`block w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:border-transparent !text-black ${
                    username && (
                      usernameAvailable
                        ? 'border-green-500 focus:ring-green-500'
                        : 'border-red-500 focus:ring-red-500'
                    )
                  }`}
                  pattern="[a-z0-9_]+"
                  title="Username can only contain lowercase letters, numbers, and underscores"
                />
                {username && (
                  <div className={`mt-1 text-sm ${usernameAvailable ? 'text-green-600' : 'text-red-600'}`}>
                    {usernameAvailable ? 'Username is available' : 'Username is taken'}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="age" className="block text-sm font-medium text-gray-700">
                Age
              </label>
              <input
                id="age"
                type="number"
                required
                min="1"
                max="120"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent !text-black"
              />
            </div>

            <div>
              <label htmlFor="userType" className="block text-sm font-medium text-gray-700">
                I am a:
              </label>
              <select
                id="userType"
                value={userType}
                onChange={(e) => handleUserTypeChange(e.target.value)}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent !text-black"
              >
                <option value="">Select your role</option>
                {USER_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              {userType === 'Parent' && children.length > 0 && (
                <div className="mt-4">
                  <label htmlFor="childSelect" className="block text-sm font-medium text-gray-700">
                    Select your child:
                  </label>
                  <select
                    id="childSelect"
                    value={selectedChild}
                    onChange={(e) => setSelectedChild(e.target.value)}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent !text-black"
                  >
                    <option value="">Select a child</option>
                    {children.map((child) => (
                      <option key={child.user_id} value={child.user_id}>
                        {child.fullname} ({child.username}) - {child.age} years old
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !usernameAvailable}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-rose-500 hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Finish setup'}
          </button>
        </form>
      </div>
    </div>
  );
} 