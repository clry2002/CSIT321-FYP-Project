import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
// import type { Database } from '@/types/database.types';

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions';

async function queryDeepSeek(messages: any[]) {
  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: messages,
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to query DeepSeek API');
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function searchBooks(query: string) {
  // Extract potential book-related information from the query
  const analysis = await queryDeepSeek([
    {
      role: 'system',
      content: 'Analyze the following query and extract book-related information. Return a JSON object with these fields: genres (array), age (number or null), hasRatingKeywords (boolean), searchTerm (string or null).'
    },
    {
      role: 'user',
      content: query
    }
  ]);

  const parsedAnalysis = JSON.parse(analysis);
  
  let supabaseQuery = supabase.from('books').select('*');
  
  // Apply filters based on the analysis
  if (parsedAnalysis.genres?.length > 0) {
    supabaseQuery = supabaseQuery.contains('genres', parsedAnalysis.genres);
  }
  
  if (parsedAnalysis.age !== null) {
    supabaseQuery = supabaseQuery.lte('max_age', parsedAnalysis.age).gte('min_age', parsedAnalysis.age);
  }
  
  if (parsedAnalysis.hasRatingKeywords) {
    supabaseQuery = supabaseQuery.order('rating', { ascending: false });
  }
  
  if (parsedAnalysis.searchTerm) {
    supabaseQuery = supabaseQuery.ilike('title', `%${parsedAnalysis.searchTerm}%`);
  }
  
  const { data: books, error } = await supabaseQuery.limit(5);
  
  if (error) {
    throw error;
  }
  
  return books;
}

export async function POST(request: Request) {
  try {
    const { message } = await request.json();
    
    // First, search for relevant books
    const books = await searchBooks(message);
    
    // Then, use DeepSeek to generate a natural response
    const response = await queryDeepSeek([
      {
        role: 'system',
        content: 'You are a helpful book recommendation assistant. Use the provided book data to give personalized recommendations and explain why these books might interest the user.'
      },
      {
        role: 'user',
        content: `User query: "${message}"\n\nAvailable books: ${JSON.stringify(books)}`
      }
    ]);
    
    return NextResponse.json({ response });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
} 