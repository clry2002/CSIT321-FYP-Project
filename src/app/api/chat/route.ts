import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

// Initialize Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Extract genres from user query
function analyzeQuery(query: string) {
  const keywords = ['fantasy', 'fiction', 'romance', 'mystery', 'thriller', 'horror', 'sci-fi', 'science', 'adventure'];
  const tokens = query.toLowerCase().split(/\s+/);
  return tokens.find(token => keywords.includes(token)) || null;
}

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    const genre = analyzeQuery(message);

    if (!genre) {
      return NextResponse.json({ response: "I couldn't find a genre in your request. Can you specify one?" });
    }

    // Get genre ID
    const { data: genreData, error: genreError } = await supabase
      .from('temp_genre')
      .select('gid')
      .ilike('genrename', genre)
      .single();

    if (genreError || !genreData) {
      console.log("Genre not found:", genreError);
      return NextResponse.json({ response: "I couldn't find that genre in my database." });
    }

    const genreId = genreData.gid;
    console.log(`Genre found: ${genre} (ID: ${genreId})`);

    // Get book IDs associated with this genre
    const { data: bookIds, error: bookIdError } = await supabase
      .from('temp_contentgenres')
      .select('cid')
      .eq('gid', genreId);

    if (bookIdError || !bookIds || bookIds.length === 0) {
      console.log(`No books found for genre: ${genre}`);
      return NextResponse.json({ response: `I couldn't find books in the ${genre} genre.` });
    }

    const bookCidList = bookIds.map(entry => entry.cid);
    console.log("Book IDs found:", bookCidList);

    // Fetch book details using retrieved book IDs
    const { data: books, error: booksError } = await supabase
      .from('temp_content')
      .select('title, description, minimumage, contenturl')
      .in('cid', bookCidList);

    if (booksError || !books || books.length === 0) {
      console.log("Books not found:", booksError);
      return NextResponse.json({ response: `I found the genre but no books are available.` });
    }

    console.log("Books found:", books);

    return NextResponse.json({ books });
  } catch (error) {
    console.error("Error processing request:", error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
