-- Create reading_schedules table
create table if not exists reading_schedules (
    id uuid default uuid_generate_v4() primary key,
    user_id uuid references auth.users(id) on delete cascade,
    date timestamp with time zone not null,
    book_title text not null,
    pages integer not null check (pages > 0),
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Add RLS policies
alter table reading_schedules enable row level security;

create policy "Users can view their own reading schedules"
    on reading_schedules for select
    using (auth.uid() = user_id);

create policy "Users can insert their own reading schedules"
    on reading_schedules for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own reading schedules"
    on reading_schedules for update
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);

create policy "Users can delete their own reading schedules"
    on reading_schedules for delete
    using (auth.uid() = user_id); 