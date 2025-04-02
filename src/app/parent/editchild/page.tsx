'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const GENRES = [
  'Fantasy', 'Science Fiction', 'Mystery', 'Romance', 'Thriller',
  'Horror', 'Historical Fiction', 'Literary Fiction', 'Young Adult',
  'Biography', 'Self-Help', 'Business', 'Poetry', 'Drama',
];

export default function ManageChildAccount() {
  const [username, setUsername] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user }, error: userFetchError } = await supabase.auth.getUser();
        if (!user || userFetchError) throw new Error('Failed to fetch user profile.');

        const { data: profile, error: profileError } = await supabase
          .from('user_account')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (!profile || profileError) throw profileError;

        setUsername(profile.username);
        setSelectedGenres(profile.favorite_genres || []);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('An error occurred while fetching the profile.');
      }
    };

    fetchProfile();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data: { user }, error: userFetchError } = await supabase.auth.getUser();
      if (!user || userFetchError) throw new Error('User authentication failed.');

      // Update username
      if (newUsername) {
        const { error: usernameError } = await supabase
          .from('user_account')
          .update({ username: newUsername })
          .eq('user_id', user.id);

        if (usernameError) throw usernameError;
      }

      // Update genres
      const { error: genreError } = await supabase
        .from('user_account')
        .update({ favorite_genres: selectedGenres })
        .eq('user_id', user.id);

      if (genreError) throw genreError;

      // Update password
      if (newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (passwordError) throw passwordError;
      }

      setError('Account updated successfully.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while updating the account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <div className="flex-1 overflow-y-auto pt-16">
        <div className="px-6 py-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Manage Child Account</h2>
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
                  <label htmlFor="currentUsername" className="block text-sm font-medium text-gray-700">
                    Current Username
                  </label>
                  <input
                    id="currentUsername"
                    type="text"
                    readOnly
                    value={username}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm bg-gray-100 text-gray-600"
                  />
                </div>

                <div>
                  <label htmlFor="newUsername" className="block text-sm font-medium text-gray-700">
                    New Username
                  </label>
                  <input
                    id="newUsername"
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-rose-500"
                    pattern="[a-z0-9_]+"
                    title="Username can only contain lowercase letters, numbers, and underscores."
                  />
                </div>

                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-rose-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Update Favorite Genres:
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
                <button
                  type="button"
                  onClick={() => window.history.back()}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600"
                >
                  {loading ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
