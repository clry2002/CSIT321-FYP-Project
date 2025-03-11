export interface Book {
    id: number;
    title: string;
    series?: string | null;
    author?: string | null;
    min_age?: number | null;
    max_age?: number | null;
    rating?: string | null;
    ratings?: string | null;
    price?: number | null;
    cover_type?: string | null;
    publication_date?: string | null;
    best_seller?: string | null;
    link?: string | null;
    genres?: string[] | null;
}

export interface Database {
    public: {
        Tables: {
            books: {
                Row: Book;
                Insert: Omit<Book, 'id'>;
                Update: Partial<Omit<Book, 'id'>>;
            };
        };
    };
} 