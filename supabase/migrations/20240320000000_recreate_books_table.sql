-- Create the books table with the exact schema from the types
CREATE TABLE IF NOT EXISTS books (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    title TEXT NOT NULL,
    series TEXT,
    author TEXT,
    min_age INTEGER,
    max_age INTEGER,
    rating TEXT,
    ratings TEXT,
    price NUMERIC,
    cover_type TEXT,
    publication_date TEXT,
    best_seller TEXT,
    link TEXT,
    genres TEXT[]
);

-- Create an index on the title for faster search
CREATE INDEX IF NOT EXISTS idx_books_title ON books USING gin (to_tsvector('english', title));

-- Add some sample books
INSERT INTO books (title, series, author, min_age, max_age, rating, genres, cover_type, best_seller) VALUES
('Harry Potter and the Philosopher''s Stone', 'Harry Potter', 'J.K. Rowling', 9, 12, '4.5', ARRAY['Fantasy', 'Young Adult'], 'Hardcover', 'Yes'),
('The Hobbit', 'The Lord of the Rings', 'J.R.R. Tolkien', 12, 18, '4.7', ARRAY['Fantasy', 'Adventure'], 'Paperback', 'Yes'),
('Percy Jackson & The Lightning Thief', 'Percy Jackson', 'Rick Riordan', 10, 14, '4.4', ARRAY['Fantasy', 'Mythology'], 'Paperback', 'Yes'),
('The Hunger Games', 'The Hunger Games', 'Suzanne Collins', 12, 17, '4.3', ARRAY['Dystopian', 'Young Adult'], 'Hardcover', 'Yes'),
('Wonder', NULL, 'R.J. Palacio', 8, 12, '4.8', ARRAY['Fiction', 'Contemporary'], 'Hardcover', 'Yes'),
('The Gruffalo', NULL, 'Julia Donaldson', 3, 7, '4.9', ARRAY['Picture Book', 'Children'], 'Hardcover', 'Yes'),
('Diary of a Wimpy Kid', 'Diary of a Wimpy Kid', 'Jeff Kinney', 8, 12, '4.6', ARRAY['Humor', 'Fiction'], 'Hardcover', 'Yes'),
('The Very Hungry Caterpillar', NULL, 'Eric Carle', 2, 5, '4.9', ARRAY['Picture Book', 'Children'], 'Board Book', 'Yes'); 