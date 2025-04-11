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
                // Fetch all genres
                const { data: genreList, error: genreListError } = await supabase
                    .from('temp_genre')
                    .select('*');

                if (genreListError) throw genreListError;
                setAllGenres(genreList || []);

                // Fetch child profile
                const { data: child, error: childError } = await supabase
                    .from('user_account')
                    .select('*')
                    .eq('user_id', childUserId)
                    .single();

                if (childError || !child) throw childError || new Error('Child profile not found.');
                setChildProfile(child);

                // Get the logged-in user (parent) information
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                if (authError) throw authError;
                
                // Look for parent-child relationship
                const { data: relation, error: relationError } = await supabase
                    .from('isparentof')
                    .select('parent, timeLimitMinute')
                    .eq('child', child.username)
                    .single();

                // Handle the case where relationship might not exist yet
                if (relationError) {
                    console.log('No direct relationship found, checking case insensitive or creating new');
                    
                    // Try with case insensitive match
                    const { data: caseInsensitiveRelation, error: caseInsensitiveError } = await supabase
                        .from('isparentof')
                        .select('parent, timeLimitMinute')
                        .ilike('child', child.username)
                        .single();
                        
                    if (caseInsensitiveRelation) {
                        // Use case insensitive match if found
                        setParentUsername(caseInsensitiveRelation.parent);
                        setTimeLimit(caseInsensitiveRelation.timeLimitMinute || 0);
                    } else {
                        // Get parent username from auth
                        const { data: parentProfile, error: parentProfileError } = await supabase
                            .from('user_account')
                            .select('username')
                            .eq('user_id', user?.id)
                            .single();
                            
                        if (parentProfileError || !parentProfile) {
                            console.error('Error getting parent profile:', parentProfileError);
                        } else {
                            // Set parent username but no time limit yet (new relationship)
                            setParentUsername(parentProfile.username);
                            setTimeLimit(0); // Default to 0 for new relationships
                        }
                    }
                } else if (relation) {
                    // Use existing relationship data
                    setParentUsername(relation.parent);
                    setTimeLimit(relation.timeLimitMinute || 0);
                }

                // Fetch blocked genres
                const { data: blockedGenres, error: genreError } = await supabase
                    .from('blockedgenres')
                    .select('genreid')
                    .eq('child_id', child.user_id); 

                if (genreError) throw genreError;

                // Handle case where blockedGenres might be null or empty
                if (blockedGenres && blockedGenres.length > 0) {
                    const genreIds = blockedGenres.map((genre) => genre.genreid);
                    const banned = genreList
                        .filter((g) => genreIds.includes(g.gid))
                        .map((g) => g.genrename);
                    setBannedGenres(banned);
                } else {
                    setBannedGenres([]);
                }
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
            return updated;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setLoading(true);

        try {
            if (!childProfile) throw new Error('Child profile not loaded');
            if (!parentUsername) throw new Error('Parent username not available');

            // First check if relationship exists
            const { data: existingRelation, error: checkError } = await supabase
                .from('isparentof')
                .select('*')
                .eq('parent', parentUsername)
                .eq('child', childProfile.username);
                
            if (checkError) {
                console.error("Error checking relationship:", checkError);
                throw checkError;
            }
            
            // Update or insert relationship
            if (existingRelation && existingRelation.length > 0) {
                // Update existing relationship
                const { error: updateParentError } = await supabase
                    .from('isparentof')
                    .update({ timeLimitMinute: timeLimit })
                    .eq('parent', parentUsername)
                    .eq('child', childProfile.username);
    
                if (updateParentError) throw updateParentError;
            } else {
                // Try case insensitive search as fallback
                const { data: caseInsensitiveRelation, error: caseCheckError } = await supabase
                    .from('isparentof')
                    .select('*')
                    .ilike('child', childProfile.username);
                    
                if (caseCheckError) {
                    console.error("Error in case insensitive check:", caseCheckError);
                }
                
                if (caseInsensitiveRelation && caseInsensitiveRelation.length > 0) {
                    // Update with the actual case from database
                    const { error: updateParentError } = await supabase
                        .from('isparentof')
                        .update({ timeLimitMinute: timeLimit })
                        .eq('id', caseInsensitiveRelation[0].id);
                        
                    if (updateParentError) throw updateParentError;
                } else {
                    // Insert new relationship
                    const { error: insertParentError } = await supabase
                        .from('isparentof')
                        .insert([{
                            parent: parentUsername,
                            child: childProfile.username,
                            timeLimitMinute: timeLimit
                        }]);
                        
                    if (insertParentError) throw insertParentError;
                }
            }

            // Handle banned genres
            const { error: deleteGenresError } = await supabase
                .from('blockedgenres')
                .delete()
                .eq('child_id', childProfile.user_id);

            if (deleteGenresError) throw deleteGenresError;

            // Only insert genres if there are some to ban
            if (bannedGenres.length > 0) {
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
            }

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
                    {/* Back Button */}
                    <button
                        onClick={() => router.back()}
                        className="mb-4 inline-flex items-center px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
                    >
                        ← Back
                    </button>

                    <h2 className="text-2xl font-bold text-gray-900 mb-1">Parental Controls</h2>
                    {childProfile?.fullname && (
                        <p className="text-gray-600 text-md mb-6">
                            Managing settings for: <span className="font-medium">{childProfile.fullname}</span>
                        </p>
                    )}
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
                            <p className="text-xs text-gray-500 mt-2">
                                {timeLimit === 0 ? 'No time limit (unlimited access)' : `${timeLimit} minutes per day`}
                            </p>
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