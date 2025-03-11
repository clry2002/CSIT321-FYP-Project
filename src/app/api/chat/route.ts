import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Simple keyword-based analysis (replacing natural package)
function analyzeQuery(query: string) {
  const tokens = query.toLowerCase().split(/\s+/);
  
  const genreKeywords = ['fantasy', 'fiction', 'romance', 'mystery', 'thriller', 'horror', 'sci-fi', 'science', 'adventure'];
  const genres = tokens.filter(token => genreKeywords.includes(token));
  
  // Extract age information
  const ageMatch = query.match(/\d+/);
  const age = ageMatch ? parseInt(ageMatch[0]) : null;
  
  const hasRatingKeywords = tokens.some(token => 
    ['best', 'top', 'popular', 'rated', 'rating'].includes(token)
  );
  
  return { genres, age, hasRatingKeywords };
}

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    const analysis = analyzeQuery(message);
    
    let query = supabase.from('books').select('*');
    
    // Apply genre filter if genres are mentioned
    if (analysis.genres.length > 0) {
      query = query.contains('genres', analysis.genres);
    }
    
    // Apply age filter if age is mentioned
    if (analysis.age !== null) {
      query = query.lte('max_age', analysis.age).gte('min_age', analysis.age);
    }
    
    // Apply rating order if requested
    if (analysis.hasRatingKeywords) {
      query = query.order('rating', { ascending: false });
    }
    
    const { data: books, error } = await query.limit(5);
    
    if (error) {
      throw error;
    }
    
    let response = '';
    if (books.length === 0) {
      response = "I couldn't find any books matching your criteria. Could you try asking in a different way?";
    } else {
      response = "Based on your request, here are some book recommendations:\n\n";
      books.forEach((book, index) => {
        response += `${index + 1}. "${book.title}" by ${book.author || 'Unknown Author'}`;
        if (book.rating) {
          response += ` (Rating: ${book.rating})`;
        }
        if (book.genres && book.genres.length > 0) {
          response += `\n   Genres: ${book.genres.join(', ')}`;
        }
        if (book.min_age && book.max_age) {
          response += `\n   Age Range: ${book.min_age}-${book.max_age} years`;
        }
        response += '\n\n';
      });
    }
    
    return NextResponse.json({ response });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
} 