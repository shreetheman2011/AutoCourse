-- Create a table for public user profiles
create table profiles (
  id uuid references auth.users not null,
  first_name text,
  last_name text,
  updated_at timestamp with time zone,
  
  primary key (id),
  unique(id),
  constraint username_length check (char_length(first_name) >= 2)
);

alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Create a table for documents (PDFs)
create table documents (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  name text not null,
  content text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table documents enable row level security;

create policy "Users can view own documents."
  on documents for select
  using ( auth.uid() = user_id );

create policy "Users can insert own documents."
  on documents for insert
  with check ( auth.uid() = user_id );

create policy "Users can delete own documents."
  on documents for delete
  using ( auth.uid() = user_id );

-- Create a table for study tools
create table study_tools (
  id uuid default uuid_generate_v4() primary key,
  document_id uuid references documents on delete cascade not null,
  user_id uuid references auth.users not null,
  type text not null, -- 'quiz', 'flashcards', 'matching', 'frq'
  title text,
  data jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table study_tools enable row level security;

create policy "Users can view own study tools."
  on study_tools for select
  using ( auth.uid() = user_id );

create policy "Users can insert own study tools."
  on study_tools for insert
  with check ( auth.uid() = user_id );

create policy "Users can delete own study tools."
  on study_tools for delete
  using ( auth.uid() = user_id );

-- Create a table for FRQ attempts
create table frq_attempts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null,
  study_tool_id uuid references study_tools on delete cascade not null,
  question_index integer not null,
  user_answer text not null,
  feedback text not null,
  score integer not null, -- e.g. out of 10 or 100
  total_possible_score integer not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table frq_attempts enable row level security;

create policy "Users can view own frq attempts."
  on frq_attempts for select
  using ( auth.uid() = user_id );

create policy "Users can insert own frq attempts."
  on frq_attempts for insert
  with check ( auth.uid() = user_id );

-- Function to handle new user signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, first_name, last_name, updated_at)
  values (new.id, new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'last_name', now());
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
-- Drop trigger if exists to prevent errors on re-run (optional but good practice)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
