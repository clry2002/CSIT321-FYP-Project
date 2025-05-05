'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { screenTimeService } from '@/services/screenTimeService';

export type UserProfile = {
    id: string;
    user_id: string;
    fullname: string;
    email: string;
};

export type Genre = {
    gid: number;
    genrename: string;
};

export interface UseParentalControlsProps {
    childUserId: string;
}

export interface UseParentalControlsReturn {
    // State
    timeLimitEnabled: boolean;
    timeLimit: number;
    bannedGenres: string[];
    allGenres: Genre[];
    error: string | null;
    success: string | null;
    loading: boolean;
    childProfile: UserProfile | null;
    parentProfile: UserProfile | null;

    // Actions
    setTimeLimitEnabled: (enabled: boolean) => void;
    setTimeLimit: (limit: number) => void;
    handleGenreToggle: (genre: string) => void;
    updateTimeLimit: () => Promise<void>;
    updateBlockedGenres: () => Promise<void>;
    resetToDefaults: () => void;
}

export const useParentalControls = ({ childUserId }: UseParentalControlsProps): UseParentalControlsReturn => {
    const [timeLimitEnabled, setTimeLimitEnabled] = useState(false);
    const [timeLimit, setTimeLimit] = useState(60); // Default to 60 minutes when enabled
    const [bannedGenres, setBannedGenres] = useState<string[]>([]);
    const [allGenres, setAllGenres] = useState<Genre[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [childProfile, setChildProfile] = useState<UserProfile | null>(null);
    const [parentProfile, setParentProfile] = useState<UserProfile | null>(null);
    
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
                    .eq('id', childUserId)
                    .single();

                if (childError || !child) throw childError || new Error('Child profile not found.');
                setChildProfile(child);

                // Get the logged-in user (parent) information
                const { data: { user }, error: authError } = await supabase.auth.getUser();
                if (authError) throw authError;

                // Get parent profile info
                const { data: parent, error: parentProfileError } = await supabase
                    .from('user_account')
                    .select('*')
                    .eq('user_id', user?.id)
                    .single();

                if (parentProfileError || !parent) {
                    console.error('Error getting parent profile:', parentProfileError);
                    throw parentProfileError || new Error('Parent profile not found.');
                }
                
                setParentProfile(parent);
                
                // Check if both parent and child have valid IDs
                if (parent.id && child.id) {
                    // Look for parent-child relationship
                    const { data: relation, error: relationError } = await supabase
                        .from('isparentof')
                        .select('*')
                        .eq('parent_id', parent.id)
                        .eq('child_id', child.id)
                        .single();

                    if (relationError) {
                        console.log('No direct relationship found, checking case insensitive or creating new');
                        
                        // Try with case insensitive match
                        const { data: caseInsensitiveRelation } = await supabase
                            .from('isparentof')
                            .select('parent_id, timeLimitMinute')
                            .ilike('child_id', child.id)
                            .single();
                            
                        if (caseInsensitiveRelation) {
                            // Use case insensitive match if found
                            const fetchedTimeLimit = caseInsensitiveRelation.timeLimitMinute || 0;
                            setTimeLimitEnabled(fetchedTimeLimit > 0);
                            setTimeLimit(fetchedTimeLimit > 0 ? fetchedTimeLimit : 60);
                        } else {
                            // No relation found, set default values
                            setTimeLimitEnabled(false);
                            setTimeLimit(60); // Default to 60 minutes when enabled
                        }
                    } else if (relation) {
                        // Use existing relationship data
                        const fetchedTimeLimit = relation.timeLimitMinute || 0;
                        setTimeLimitEnabled(fetchedTimeLimit > 0);
                        setTimeLimit(fetchedTimeLimit > 0 ? fetchedTimeLimit : 60);
                    }
                    
                    // Fetch blocked genres
                    const { data: blockedGenres, error: genreError } = await supabase
                        .from('blockedgenres')
                        .select('genreid')
                        .eq('child_id', child.id);

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

    const updateTimeLimit = async () => {
        try {
            setLoading(true);
            setError(null);
            
            if (!childProfile?.id || !parentProfile?.id) {
                throw new Error('Profile information not available');
            }
            
            // Calculate the actual time limit value to store
            const actualTimeLimit = timeLimitEnabled ? timeLimit : 0;

            // First check if relationship exists
            const { data: existingRelation, error: checkError } = await supabase
                .from('isparentof')
                .select('*')
                .eq('parent_id', parentProfile.id)
                .eq('child_id', childProfile.id);
                
            if (checkError) throw checkError;
            
            // Update or insert relationship
            if (existingRelation && existingRelation.length > 0) {
                // Update existing relationship
                const { error: updateError } = await supabase
                    .from('isparentof')
                    .update({ timeLimitMinute: actualTimeLimit })
                    .eq('parent_id', parentProfile.id)
                    .eq('child_id', childProfile.id);
        
                if (updateError) throw updateError;
            } else {
                // Insert new relationship
                const { error: insertError } = await supabase
                    .from('isparentof')
                    .insert({
                        parent_id: parentProfile.id,
                        child_id: childProfile.id,
                        timeLimitMinute: actualTimeLimit
                    });
                    
                if (insertError) throw insertError;
            }

            // Reset the child's time usage data in the database
            const today = new Date();
            const todayStr = today.toISOString().split('T')[0];
            const startOfDay = todayStr + 'T00:00:00Z';
            const endOfDay = todayStr + 'T23:59:59Z';

            // Delete today's usage records
            const { error: deleteError } = await supabase
                .from('screen_usage')
                .delete()
                .eq('child_id', childProfile.id)
                .gte('usage_date', startOfDay)
                .lte('usage_date', endOfDay);

            if (deleteError) {
                console.error("Error deleting usage records:", deleteError);
                // Don't throw here, as the time limit was still updated
            }

            // Reset the child's time limit state
            await screenTimeService.resetLimitState(childProfile.id);
            
            setSuccess('Time limit updated successfully');
        } catch (err) {
            console.error('Error updating time limit:', err);
            setError(err instanceof Error ? err.message : 'Failed to update time limit');
        } finally {
            setLoading(false);
        }
    };

    const updateBlockedGenres = async () => {
        try {
            setLoading(true);
            setError(null);
            
            if (!childProfile?.id) throw new Error('Child profile ID not available');
            
            // Handle banned genres
            const { error: deleteGenresError } = await supabase
                .from('blockedgenres')
                .delete()
                .eq('child_id', childProfile.id);

            if (deleteGenresError) throw deleteGenresError;

            // Only insert genres if there are some to ban
            if (bannedGenres.length > 0) {
                const genreInserts = bannedGenres.map((genre) => {
                    const genreObj = allGenres.find((g) => g.genrename === genre);
                    return {
                        genreid: genreObj?.gid,
                        child_id: childProfile.id,
                    };
                });

                const { error: insertGenresError } = await supabase
                    .from('blockedgenres')
                    .insert(genreInserts);

                if (insertGenresError) throw insertGenresError;
            }
            
            setSuccess(`Blocked genres for ${childProfile?.fullname || 'child'} updated successfully!`);
        } catch (err) {
            console.error('Error updating blocked genres:', err);
            setError(err instanceof Error ? err.message : 'An error occurred while updating the blocked genres.');
        } finally {
            setLoading(false);
        }
    };

    const resetToDefaults = () => {
        // Reset to default values
        setError(null);
        setSuccess(null);
        
        // Set default values
        setTimeLimitEnabled(false);
        setTimeLimit(60);
        setBannedGenres([]);
        
        setSuccess('Settings reset to default values.');
    };

    return {
        // State
        timeLimitEnabled,
        timeLimit,
        bannedGenres,
        allGenres,
        error,
        success,
        loading,
        childProfile,
        parentProfile,

        // Actions
        setTimeLimitEnabled,
        setTimeLimit,
        handleGenreToggle,
        updateTimeLimit,
        updateBlockedGenres,
        resetToDefaults
    };
};