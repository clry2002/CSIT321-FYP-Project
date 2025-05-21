'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

interface GenreData {
  genrename: string;
}

interface ContentGenre {
  gid: number;
  temp_genre: GenreData[];
}

interface BookDetail {
  title: string;
  description: string;
  coverimage: string;
  credit: string;
  minimumage: number;
  contenturl: string;
  temp_contentgenres: ContentGenre[];
  genresList: string[];
}

export default function PublisherBookDetail({ params }: { params: Promise<{ cid: string }> }) {
  const router = useRouter();
  const [bookDetails, setBookDetails] = useState<BookDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const resolvedParams = React.use(params);

  useEffect(() => {
    const fetchBookDetails = async () => {
      try {
        // First, let's log the CID to make sure we're getting the right parameter
        console.log('Fetching details for CID:', resolvedParams.cid);
        
        // Modified query to correctly fetch the join between content and genres
        const { data, error } = await supabase
          .from('temp_content')
          .select(`
            title,
            description,
            coverimage,
            credit,
            minimumage,
            contenturl,
            temp_contentgenres (
              gid,
              temp_genre (genrename)
            )
          `)
          .eq('cid', resolvedParams.cid)
          .single();

        if (error) throw error;

        if (data) {
          console.log('Raw data from Supabase:', data);
          
          // Process genres - updated extraction logic
          const genresList: string[] = [];
          
          if (data.temp_contentgenres && Array.isArray(data.temp_contentgenres)) {
            data.temp_contentgenres.forEach(item => {
              if (Array.isArray(item.temp_genre)) {
                item.temp_genre.forEach((genre: GenreData) => {
                  if (genre.genrename) {
                    genresList.push(genre.genrename);
                  }
                });
              } else if (item.temp_genre && (item.temp_genre as GenreData).genrename) {
                genresList.push((item.temp_genre as GenreData).genrename);
              }
            });
          }

          console.log('Extracted genres:', genresList);

          const formattedData: BookDetail = {
            title: data.title || 'Untitled',
            description: data.description || 'No description available',
            coverimage: data.coverimage || '',
            credit: data.credit || 'Unknown Author',
            minimumage: data.minimumage || 0,
            contenturl: data.contenturl || '#',
            temp_contentgenres: data.temp_contentgenres || [],
            genresList: genresList
          };
          
          setBookDetails(formattedData);
        }
      } catch (err) {
        console.error('Error fetching book details:', err);
        setError('Failed to load book details');
      } finally {
        setLoading(false);
      }
    };

    fetchBookDetails();
  }, [resolvedParams.cid]);

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (error) return <div className="text-center py-8 text-red-600">{error}</div>;
  if (!bookDetails) return <div className="text-center py-8">Book not found</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <button
          onClick={() => router.back()}
          className="mb-6 flex items-center text-gray-600 hover:text-gray-900"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="md:flex">
            <div className="md:flex-shrink-0 relative h-96 md:w-96">
              {bookDetails.coverimage ? (
                <Image
                  src={bookDetails.coverimage}
                  alt={bookDetails.title}
                  layout="fill"
                  objectFit="cover"
                  className="w-full h-full object-cover"
                  unoptimized
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400">No cover image</span>
                </div>
              )}
            </div>
            <div className="p-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{bookDetails.title}</h1>
              <div className="mb-4">
                <span className="text-gray-600">By </span>
                <span className="text-gray-900 font-semibold">{bookDetails.credit}</span>
              </div>
              <div className="mb-4">
                <span className="text-gray-600">Genre: </span>
                <span className="text-gray-900">
                  {bookDetails.genresList && bookDetails.genresList.length > 0 
                    ? bookDetails.genresList.join(', ') 
                    : 'Unknown'}
                </span>
              </div>
              <div className="mb-6">
                <span className="text-gray-600">Minimum Age: </span>
                <span className="text-gray-900">{bookDetails.minimumage}+</span>
              </div>
              <p className="text-gray-700 mb-6">{bookDetails.description}</p>
              <a
                href={bookDetails.contenturl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Read Book
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}