'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/contexts/SessionContext';

const GENRES = [
  'Fantasy', 'Science Fiction', 'Mystery', 'Romance', 'Thriller',
  'Horror', 'Historical Fiction', 'Literary Fiction', 'Young Adult',
  'Biography', 'Self-Help', 'Business', 'Poetry', 'Drama',
];

function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [children]);

  return hasError ? (
    <div className="text-red-600 bg-red-50 p-4 rounded-lg">
      Oops! Something went wrong. Please try reloading the page.
    </div>
  ) : (
    <>{children}</>
  );
}

export default function ProfilePage() {
  const { userProfile, refreshProfile } = useSession();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [currentUsername, setCurrentUsername] = useState('');
  const [usernameEdited, setUsernameEdited] = useState(false);

  useEffect(() => {
    if (userProfile) {
      setName(userProfile.full_name || '');
      setUsername(userProfile.username || '');
      setAge(userProfile.age ? userProfile.age.toString() : '');
      setSelectedGenres(userProfile.favorite_genres || []);
      setCurrentUsername(userProfile.username || '');
    }
  }, [userProfile]);

  const handleGenreToggle = (genre: string) => {
    setSelectedGenres((prev) => {
      if (prev.includes(genre)) {
        return prev.filter((g) => g !== genre);
      } else if (prev.length < 3) {
        return [...prev, genre];
      }
      return prev;
    });
  };

  const checkUsername = async (username: string) => {
    if (!username || username === currentUsername) {
      setUsernameAvailable(true);
      return;
    }
    try {
      const { error } = await supabase
        .from('user_account')
        .select('username')
        .eq('username', username)
        .single();

      setUsernameAvailable(!error || error.code === 'PGRST116');
    } catch (err) {
      console.error('Error checking username:', err);
      setUsernameAvailable(false);
    }
  };

  const handleUsernameChange = (value: string) => {
    setUsernameEdited(true);
    const sanitizedUsername = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(sanitizedUsername);

    if (sanitizedUsername !== currentUsername) {
      checkUsername(sanitizedUsername);
    } else {
      setUsernameAvailable(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedGenres.length === 0) {
      setError('Please select at least one favorite genre.');
      return;
    }

    if (usernameEdited && !usernameAvailable) {
      setError('Username is already taken. Please choose another.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (!user || userError) throw new Error('User authentication failed.');

      // Update user_account table with username, full_name, age
      const { error: userAccountError } = await supabase
        .from('user_account')
        .update({
          username: usernameEdited ? username : currentUsername,
          full_name: name,
          age: parseInt(age),
        })
        .eq('user_id', user.id);

      if (userAccountError) throw userAccountError;

      // Now ensure that the favorite_genres is correctly updated in the child_profile table
      const { error: childProfileError } = await supabase
        .from('child_profile')
        .upsert({
          child_id  : user.id,
          favorite_genres: selectedGenres, // Ensure selectedGenres is passed correctly
        })
        .eq('user_id', user.id);

      if (childProfileError) throw childProfileError;

      await refreshProfile();
      setError('Profile updated successfully.');
      setUsernameEdited(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while updating your profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-white overflow-hidden">
        <Navbar />
        <div className="flex-1 overflow-y-auto pt-16">
          <div className="px-6 py-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Edit Profile</h2>
            <div className="max-w-2xl">
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <div
                    className={`p-3 rounded-lg text-sm ${
                      error.includes('successfully')
                        ? 'bg-green-50 text-green-600'
                        : 'bg-red-50 text-red-500'
                    }`}
                  >
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
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-rose-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                      Username
                    </label>
                    <input
                      id="username"
                      type="text"
                      required
                      value={username}
                      onChange={(e) => handleUsernameChange(e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-rose-500"
                      pattern="[a-z0-9_]+"
                      title="Username can only contain lowercase letters, numbers, and underscores."
                    />
                    {username && username !== currentUsername && (
                      <span
                        className={`mt-1 text-sm ${
                          usernameAvailable ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {usernameAvailable ? 'Username is available.' : 'Username is taken.'}
                      </span>
                    )}
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
                      className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Select up to 3 favorite genres:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {GENRES.map((genre) => (
                        <button
                          key={genre}
                          type="button"
                          onClick={() => handleGenreToggle(genre)}
                          className={`p-2 text-sm rounded-lg ${
                            selectedGenres.includes(genre)
                              ? 'bg-rose-500 text-white'
                              : 'border-gray-300 text-gray-700'
                          }`}
                        >
                          {genre}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-4">
                  <Link
                    href="/settings"
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
