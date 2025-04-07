'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const AddVideos: React.FC = () => {
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [genres, setGenres] = useState<{ gid: number; genrename: string }[]>([]);
  const [description, setDescription] = useState('');
  const [videoUrl, setVideoUrl] = useState(''); // State for YouTube URL
  const [minimumAge, setMinimumAge] = useState<number | ''>('');
  const [credits, setCredits] = useState('');  // Credits state for the video
  const router = useRouter();

  useEffect(() => {
    const fetchGenres = async () => {
      const { data, error } = await supabase.from('temp_genre').select('gid, genrename');
      if (error) {
        console.error('Error fetching genres:', error);
      } else {
        setGenres(data);
      }
    };
    fetchGenres();
  }, []);

  const validateYouTubeUrl = (url: string) => {
    const regex = /^(https?\:\/\/)?(www\.)?(youtube|youtu|youtube-nocookie)\.(com|be)\/(?:.*\/.*\/.*|\S+)(?=\s|$)/;
    return regex.test(url);
  };

  const handleSubmit = async () => {
    // Step 1: Ensure the user is logged in
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData?.user;

    console.log('User data:', user);  // Log the user data to check if the user is correctly authenticated

    if (!user || userError) {
      alert('You must be logged in to upload a video.');
      return;
    }

    // Use the user auth to gain the user_id, then we use the user_id to get the ID.
    const { data: userAccountData, error: userAccountError } = await supabase
      .from('user_account') 
      .select('id') 
      .eq('user_id', user.id) 
      .single();

    if (userAccountError) {
      console.error('Error fetching user account:', userAccountError);
      alert('Error fetching user account data!');
      return;
    }

    const uaid_publisher = userAccountData?.id; 

    if (!uaid_publisher) {
      console.error('User UUID not found!');
      alert('User UUID not found!');
      return;
    }

    // Validation for required fields
    if (!title || !genre || !description || !videoUrl || minimumAge === '') {
      alert('Please fill in all fields and provide a YouTube video link.');
      return;
    }

    // Validate the YouTube video URL
    if (!validateYouTubeUrl(videoUrl)) {
      alert('Please provide a valid YouTube video link.');
      return;
    }

    // Insert video details into db with the YouTube URL
    const { data: insertedContent, error: insertError } = await supabase
      .from('temp_content')
      .insert([
        {
          coverimage: null, // No cover image for video
          title,
          credit: credits || 'Unknown', // Use credits field instead of user email
          cfid: 1, // Assuming 1 is for Video content type
          minimumage: minimumAge,
          description,
          contenturl: videoUrl, // Use YouTube URL here
          status: 'approved',
          uaid_publisher, // Use the UUID (uaid) as the foreign key reference
        },
      ])
      .select();

    if (insertError || !insertedContent || insertedContent.length === 0) {
      console.error('Insert error:', insertError?.message || insertError);
      alert('Failed to save video to database!');
      return;
    }

    const insertedCid = insertedContent[0].cid;

    // Insert the genre relation into the 'temp_contentgenres' table
    const { error: genreInsertError } = await supabase
      .from('temp_contentgenres')
      .insert([{ cid: insertedCid, gid: parseInt(genre) }]);

    if (genreInsertError) {
      console.error('Failed to insert genre relation:', genreInsertError.message || genreInsertError);
    }

    alert('Video uploaded successfully!');
    setTitle('');
    setGenre('');
    setDescription('');
    setVideoUrl(''); // Reset the YouTube URL input
    setMinimumAge('');
    setCredits('');  // Reset credits input
  };

  const handleCancel = () => {
    setTitle('');
    setGenre('');
    setDescription('');
    setVideoUrl(''); // Reset the YouTube URL
    setMinimumAge('');
    setCredits(''); // Reset credits input
    router.push('/publisherpage');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-serif text-black mb-6">Add a New Video</h1>

      <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-2">Title:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter video title"
            className="w-full px-4 py-2 border rounded-lg text-gray-700"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-2">Genre:</label>
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg text-gray-700"
          >
            <option value="">Select genre</option>
            {genres.map((g) => (
              <option key={g.gid} value={g.gid}>
                {g.genrename}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-2">Minimum Age:</label>
          <input
            type="number"
            value={minimumAge}
            onChange={(e) =>
              setMinimumAge(e.target.value === '' ? '' : parseInt(e.target.value))
            }
            className="w-full px-4 py-2 border rounded-lg text-gray-700"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-2">Description:</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="w-full px-4 py-2 border rounded-lg text-gray-700"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-2">Credits:</label>
          <input
            type="text"
            value={credits}
            onChange={(e) => setCredits(e.target.value)}
            placeholder="Enter credits"
            className="w-full px-4 py-2 border rounded-lg text-gray-700"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-2">YouTube Video Link:</label>
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Enter YouTube video link"
            className="w-full px-4 py-2 border rounded-lg text-gray-700"
          />
        </div>

        <div className="flex space-x-4">
          <button
            onClick={handleCancel}
            className="bg-red-500 text-white px-6 py-2 rounded-lg shadow-md hover:bg-red-600"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg shadow-md hover:bg-blue-600"
          >
            Add Video
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddVideos;
