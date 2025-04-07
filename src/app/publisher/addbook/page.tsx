'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const AddBooks: React.FC = () => {
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [genres, setGenres] = useState<{ gid: number; genrename: string }[]>([]);
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null); // For cover image
  const [minimumAge, setMinimumAge] = useState<number | ''>('');
  const [credits, setCredits] = useState('');  // New state for credits input
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setFile(event.target.files[0]);
    }
  };

  const handleCoverImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setCoverImage(event.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    // Step 1: Ensure the user is logged in
    const { data: userData, error: userError } = await supabase.auth.getUser();
    const user = userData?.user;

    console.log('User data:', user);  // Log the user data to check if the user is correctly authenticated

    if (!user || userError) {
      alert('You must be logged in to upload a book.');
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

    if (!title || !genre || !description || !file || !coverImage || minimumAge === '') {
      alert('Please fill in all fields and upload both a book file and cover image.');
      return;
    }

    // file upload (directly into the root of 'content-pdf' bucket)
    const filePath = file.name;  // Uploading book file directly to the root of 'content-pdf' bucket
    const { error: uploadError } = await supabase.storage
      .from('content-pdf') // Uploading book file to 'content-pdf' bucket
      .upload(filePath, file);

    if (uploadError) {
      alert('File upload failed!');
      console.error('File upload error:', uploadError.message || uploadError);
      return;
    }

    // public url for book file
    const { data: publicURLData } = supabase.storage
      .from('content-pdf')
      .getPublicUrl(filePath);
    const contenturl = publicURLData.publicUrl;

    // cover image upload (directly into the root of 'book-covers' bucket)
    const coverImagePath = coverImage.name;  // Uploading cover image directly to the root of 'book-covers' bucket
    const { error: coverImageUploadError } = await supabase.storage
      .from('book-covers') // Uploading cover image to 'book-covers' bucket
      .upload(coverImagePath, coverImage);

    if (coverImageUploadError) {
      alert('Cover image upload failed!');
      console.error('Cover image upload error:', coverImageUploadError.message || coverImageUploadError);
      return;
    }

    // public url for cover image
    const { data: coverImagePublicURLData } = supabase.storage
      .from('book-covers')
      .getPublicUrl(coverImagePath);
    const coverImageUrl = coverImagePublicURLData.publicUrl;

    // Insert book details into db
    const { data: insertedContent, error: insertError } = await supabase
      .from('temp_content')
      .insert([
        {
          coverimage: coverImageUrl, // Save the cover image URL
          title,
          credit: credits || 'Unknown', // Use credits field instead of user email
          cfid: 2, // Assuming 2 is for PDF content type
          minimumage: minimumAge,
          description,
          contenturl,
          status: 'approved',
          uaid_publisher, // Use the UUID (uaid) as the foreign key reference
        },
      ])
      .select();

    if (insertError || !insertedContent || insertedContent.length === 0) {
      console.error('Insert error:', insertError?.message || insertError);
      alert('Failed to save book to database!');
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

    alert('Book uploaded successfully!');
    setTitle('');
    setGenre('');
    setDescription('');
    setFile(null);
    setCoverImage(null);
    setMinimumAge('');
    setCredits('');  // Reset credits input
  };

  const handleCancel = () => {
    setTitle('');
    setGenre('');
    setDescription('');
    setFile(null);
    setCoverImage(null);
    setMinimumAge('');
    setCredits(''); // Reset credits input
    router.push('/publisherpage');
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 p-6">
      <h1 className="text-2xl font-serif text-black mb-6">Add a New Book</h1>

      <div className="bg-white rounded-lg shadow-md p-4 space-y-4">
        <div>
          <label className="block text-sm text-gray-600 mb-2">Title:</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter book title"
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
          <label className="block text-sm text-gray-600 mb-2">Upload Book File (PDF):</label>
          <input
            type="file"
            onChange={handleFileUpload}
            className="w-full px-4 py-2 border rounded-lg text-gray-700"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-600 mb-2">Upload Cover Image:</label>
          <input
            type="file"
            onChange={handleCoverImageUpload}
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
            Add Book
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddBooks;
