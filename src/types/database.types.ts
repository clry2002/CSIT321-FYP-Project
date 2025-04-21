// Database types for Supabase
export interface Book {
    cid: number; 
    title: string;
    credit: string;  
    genre: string[]; 
    coverimage?: string | null;
    minimumage: number;
    description: string;
    contenturl?: string | null;
    cfid: number;
    status: string; 
    createddate?: string | null;
    decisiondate?: string | null;
}

export interface Video {
    cid: number
    title: string;
    credit: string;
    genre: string[];
    coverimage?: null;
    minimumage: number;
    description: string;
    contenturl?: string | null;
    cfid: number;
    createddate?: string | null;
    decisiondate?: string | null;
    
}

// Additional for View Chatbot History
export type ChatMessage = {
    chid: number;
    context: string;
    ischatbot: boolean;
    createddate: string;
  };

  export type ContentResponse = {
    genre?: string;
    books?: Book[];
    videos?: Video[];
    books_ai?: string;
    videos_ai?: string;
    error?: string;
  };


// Database types for Supabase
export interface Database {
    public: {
        Tables: {
            temp_content: {
                Row: Book;
                Insert: Omit<Book, 'cid'>; 
                Update: Partial<Omit<Book, 'cid'>>;
            };
            temp_genre: {
                Row: {
                    gid: number;
                    genrename: string;
                };
            };
            temp_contentformat: {
                Row: {
                    cfid: number;
                    name: string;
                };
            };
            userInteractions: {
                Row: {
                    id: number;
                    uaid: string;
                    gid: number;
                    score: number;
                    created_at: string;
                    updated_at: string;
                };
                Insert: Omit<Database['public']['Tables']['userInteractions']['Row'], 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Omit<Database['public']['Tables']['userInteractions']['Row'], 'id'>>;
            };
        };
    };
}

// Additional for Searchbooks
export interface RawBook {
    cid: number;
    title: string;
    description: string;
    coverimage: string;
    credit: string;
    contenturl: string;
    content_format: string;
  }
  
  export interface BookWithGenres extends RawBook {
    genreNames?: string[];
  }
  