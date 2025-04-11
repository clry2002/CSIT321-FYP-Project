'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function ParentalControlPage() {
    const router = useRouter();
    const params = useParams();
    const childUserId = params?.user_id as string;

    const [timeLimit, setTimeLimit] = useState(0);
    const [bannedGenres, setBannedGenres] = useState<string[]>([]);
    const [allGenres, setAllGenres] = useState<{ gid: number; genrename: string }[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [parentUsername, setParentUsername] = useState<string | null>(null);
    const [childProfile, setChildProfile] = useState<any>(null);

    useEffect(() => {
        const fetchParentalControls = async () => {
            setLoading(true);
            try {
                // Get all genres from temp_genre
                const { data: genreList, error: genreListError } = await supabase
                    .from('temp_genre')
                    .select('*');

                if (genreListError) throw genreListError;
                setAllGenres(genreList || []);

                // Get child profile based on user_id from route
                const { data: child, error: childError } = await supabase
                    .from('user_account')
                    .select('*')
                    .eq('user_id', childUserId)
                    .single();

                if (childError || !child) throw childError || new Error('Child profile not found.');
                setChildProfile(child);

                // Get parent-child relationship and time limit
                const { data: relation, error: relationError } = await supabase
                    .from('isparentof')
                    .select('parent, timeLimitMinute')
                    .eq('child', child.username)
                    .single();

                if (relationError || !relation) throw relationError || new Error('Parent relationship not found.');
                setParentUsername(relation.parent);
                setTimeLimit(relation.timeLimitMinute || 0);

                // Fetch banned genres for the child
                const { data: blockedGenres, error: genreError } = await supabase
                    .from('blockedgenres')
                    .select('genreid')
                    .eq('child_id', child.user_id); 

                if (genreError) throw genreError;

                // Log to verify the fetched blocked genres
                console.log('Fetched blocked genres for child ID:', child.id);
                console.log('Blocked genres:', blockedGenres);

                // Ensure genreId mapping works correctly
                const genreIds = blockedGenres.map((genre) => genre.genreid);
                console.log('Mapped genre IDs:', genreIds);

                const banned = genreList
                    .filter((g) => genreIds.includes(g.gid))
                    .map((g) => g.genrename);

                console.log('Mapped banned genres:', banned); // Debugging log
                setBannedGenres(banned);
            } catch (err) {
                console.error('Error fetching parental controls:', err);
                setError('An error occurred while fetching parental control settings.');
            } finally {
                setLoading(false);
            }
        };

        if (childUserId) {
            fetchParentalControls();
        }
    }, [childUserId]);

    const handleGenreToggle = (genre: string) => {
        setBannedGenres((prev) => {
            const updated = prev.includes(genre)
                ? prev.filter((g) => g !== genre)
                : [...prev, genre];
            console.log('Updated banned genres:', updated); // Debugging log
            return updated;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setLoading(true);

        try {
            if (!childProfile || !parentUsername) throw new Error('Child or parent not loaded');

            // Update time limit
            const { error: updateParentError } = await supabase
                .from('isparentof')
                .update({ timeLimitMinute: timeLimit })
                .eq('parent', parentUsername)
                .eq('child', childProfile.username);

            if (updateParentError) throw updateParentError;

            // Remove old blocked genres
            const { error: deleteGenresError } = await supabase
                .from('blockedgenres')
                .delete()
                .eq('child_id', childProfile.user_id);

            if (deleteGenresError) throw deleteGenresError;

            // Insert updated blocked genres
            const genreInserts = bannedGenres.map((genre) => {
                const genreObj = allGenres.find((g) => g.genrename === genre);
                return {
                    genreid: genreObj?.gid,
                    child_id: childProfile.user_id,
                    genrename: genre,
                };
            });

            const { error: insertGenresError } = await supabase
                .from('blockedgenres')
                .insert(genreInserts);

            if (insertGenresError) throw insertGenresError;

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
                                onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    setTimeLimit(Number.isNaN(val) ? 0 : val);
                                }}
                                className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-rose-500 text-black"
                            />
                        </div>

                        {/* Banned Genres */}
                        <div className="p-6 bg-gray-100 border border-gray-300 rounded-lg">
                            <h3 className="text-xl font-semibold text-gray-800 mb-4">Banned Genres</h3>
                            <label className="block text-sm font-medium text-gray-700">
                                Select Genres to Ban
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {allGenres.map((genre) => (
                                    <button
                                        key={genre.gid}
                                        type="button"
                                        onClick={() => handleGenreToggle(genre.genrename)}
                                        className={`p-2 text-sm rounded-lg ${
                                            bannedGenres.includes(genre.genrename)
                                                ? 'bg-red-500 text-white'
                                                : 'border border-gray-300 text-gray-700'
                                        }`}
                                    >
                                        {genre.genrename}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Save Changes and Cancel Buttons */}
                        <div className="flex justify-end space-x-4">
                            <button
                                type="button"
                                onClick={() => router.push('/parentpage')}
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
