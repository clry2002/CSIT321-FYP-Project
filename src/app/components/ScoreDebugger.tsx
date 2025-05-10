// ScoreDebugger.tsx
'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { cleanupDuplicateInteractions } from '../../services/userInteractionsService';

interface GenreScore {
    uiid: string;
    genre: string;
    score: number;
    genreId: number;
  }

// This component displays and manages user interaction scores for debugging
export default function ScoreDebugger() {
  const [scores, setScores] = useState<GenreScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [, setUaid] = useState<string | null>(null);

  useEffect(() => {
    fetchUserScores();
  }, []);

  const fetchUserScores = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // Get user account ID
      const { data: userAccount, error: userError } = await supabase
        .from('user_account')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (userError || !userAccount) {
        console.error('Failed to get user account');
        setLoading(false);
        return;
      }

      const userAccountId = userAccount.id;
      setUaid(userAccountId);
      
      // Automatically clean up duplicates first
      console.log('Automatically cleaning up duplicates before fetching scores');
      await cleanupDuplicateInteractions(userAccountId);
      console.log('Cleanup completed, now fetching scores');

      // Get user interaction scores
      const { data: interactionScores, error: scoresError } = await supabase
        .from('userInteractions')
        .select('uiid, gid, score')
        .eq('uaid', userAccountId)
        ;

      if (scoresError) {
        console.error('Error fetching scores:', scoresError);
        setLoading(false);
        return;
      }

      // Get genre names
      const gids = interactionScores?.map(item => item.gid) || [];
      if (gids.length > 0) {
        const { data: genres } = await supabase
          .from('temp_genre')
          .select('gid, genrename')
          .in('gid', gids);

        const genreMap: Record<number, string> = {};
        if (genres) {
          genres.forEach(genre => {
            genreMap[genre.gid] = genre.genrename;
          });
        }

        // Combine data
        const formattedScores = interactionScores?.map(item => ({
          uiid: item.uiid,
          genre: genreMap[item.gid] || `Unknown (${item.gid})`,
          score: item.score,
          genreId: item.gid
        })) || [];

        setScores(formattedScores);
      } else {
        setScores([]);
      }
    } catch (error) {
      console.error('Error in fetchUserScores:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-serif text-black">User Interaction Scores</h2>
        <div>
          <button
            onClick={fetchUserScores}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg text-sm"
            disabled={loading}
          >
            Refresh Scores
          </button>
        </div>
      </div>
      
      {loading ? (
        <div className="text-center py-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-gray-600">Loading scores...</p>
        </div>
      ) : scores.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  GENRE
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SCORE
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  GENRE ID
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {scores.map((score) => (
                <tr key={score.uiid} className={score.score > 0 ? "bg-green-50" : ""}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {score.genre}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {score.score > 0 ? `+${score.score}` : score.score}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {score.genreId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-center py-4 text-gray-500">No interaction scores found</p>
      )}
      
      {/* Score Legend */}
      <div className="mt-6 bg-gray-50 p-4 rounded-lg text-black">
        <h3 className="text-lg font-medium mb-2 text-black">Score Legend:</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="text-sm text-black">+5</div>
          <div className="text-sm text-black">Bookmark a book</div>
          
          <div className="text-sm text-black">-5</div>
          <div className="text-sm text-black">Remove bookmark</div>
          
          <div className="text-sm text-black">+1</div>
          <div className="text-sm text-black">View a book</div>
          
          <div className="text-sm text-black">+1</div>
          <div className="text-sm text-black">Search for a book</div>
          
          <div className="text-sm text-black">+50</div>
          <div className="text-sm text-black">Add favorite genre</div>
          
          <div className="text-sm text-black">-50</div>
          <div className="text-sm text-black">Remove favorite genre</div>
          
          <div className="text-sm text-black">0</div>
          <div className="text-sm text-black">Parent blocked genre</div>
        </div>
      </div>
    </div>
  );
}