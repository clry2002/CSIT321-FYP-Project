'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Import router for navigation
import { supabase } from '@/lib/supabase';

const GENRES = [
  'Fantasy', 'Science Fiction', 'Mystery', 'Romance', 'Thriller',
  'Horror', 'Historical Fiction', 'Literary Fiction', 'Young Adult',
  'Biography', 'Self-Help', 'Business', 'Poetry', 'Drama',
];

export default function ParentalControlPage() {
  const router = useRouter(); // Initialize router
  const [timeLimit, setTimeLimit] = useState(0); // Time limit in minutes
  const [bannedGenres, setBannedGenres] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchParentalControls = async () => {
      setLoading(true);
      try {
        const { data: { user }, error: userFetchError } = await supabase.auth.getUser();
        if (!user || userFetchError) throw new Error('Failed to fetch user details.');

        const { data: settings, error: settingsError } = await supabase
          .from('parental_controls')
          .select('*')
          .eq('parent_id', user.id)
          .single();

        if (!settings || settingsError) throw settingsError;

        setTimeLimit(settings.time_limit || 0);
        setBannedGenres(settings.banned_genres || []);
      } catch (err) {
        console.error('Error fetching parental controls:', err);
        setError('An error occurred while fetching parental control settings.');
      } finally {
        setLoading(false);
      }
    };

    fetchParentalControls();
  }, []);

  const handleGenreToggle = (genre: string) => {
    setBannedGenres((prev) => {
      if (prev.includes(genre)) {
        return prev.filter((g) => g !== genre);
      }
      return [...prev, genre];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const { data: { user }, error: userFetchError } = await supabase.auth.getUser();
      if (!user || userFetchError) throw new Error('Failed to authenticate user.');

      const { error: updateError } = await supabase
        .from('parental_controls')
        .upsert({
          parent_id: user.id, // Assuming parent_id matches the authenticated user ID
          time_limit: timeLimit,
          banned_genres: bannedGenres,
        });

      if (updateError) throw updateError;

      setSuccess('Parental controls updated successfully.');
    } catch (err) {
      console.error('Error updating parental controls:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while updating parental controls.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <div className="flex-1 overflow-y-auto pt-16">
        <div className="px-6 py-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Parental Controls</h2>
          <div className="max-w-2xl space-y-6">
            {error && (
              <div className="p-3 rounded-lg text-sm bg-red-50 text-red-500">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 rounded-lg text-sm bg-green-50 text-green-600">
                {success}
              </div>
            )}

            {/* Time Limit */}
            <div className="p-6 bg-gray-100 border border-gray-300 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Chatbot Time Limit</h3>
              <label htmlFor="timeLimit" className="block text-sm font-medium text-gray-700">
                Set Time Limit (Minutes)
              </label>
              <input
                id="timeLimit"
                type="number"
                value={timeLimit}
                min="0"
                onChange={(e) => setTimeLimit(parseInt(e.target.value, 10))}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-rose-500"
              />
            </div>

            {/* Banned Genres */}
            <div className="p-6 bg-gray-100 border border-gray-300 rounded-lg">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Banned Genres</h3>
              <label className="block text-sm font-medium text-gray-700">
                Select Genres to Ban
              </label>
              <div className="grid grid-cols-2 gap-2">
                {GENRES.map((genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => handleGenreToggle(genre)}
                    className={`p-2 text-sm rounded-lg ${
                      bannedGenres.includes(genre)
                        ? 'bg-red-500 text-white'
                        : 'border-gray-300 text-gray-700'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            {/* Save Changes and Cancel Buttons */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => router.push('/parentpage')} // Navigate back to parent page
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
