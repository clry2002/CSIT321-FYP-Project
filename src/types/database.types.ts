export interface Book {
    book_id: string;
    title: string;
    author: string;
    genre: string[];
    cover_image?: string | null;
    publication_date?: string | null;
    pdf_link?: string | null;
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
