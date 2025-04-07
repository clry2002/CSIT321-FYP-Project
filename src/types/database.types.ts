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
        };
    };
}
