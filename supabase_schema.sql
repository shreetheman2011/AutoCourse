-- Create a table for public user profiles
create table profiles (
  id uuid references auth.users not null,
  email text,
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
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
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

-- Document sharing
create table document_groups (
  id uuid default uuid_generate_v4() primary key,
  owner_id uuid references auth.users not null,
  name text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(owner_id, name)
);

alter table document_groups enable row level security;

create policy "Users can manage own groups."
  on document_groups for all
  using ( auth.uid() = owner_id )
  with check ( auth.uid() = owner_id );

create table document_group_members (
  id uuid default uuid_generate_v4() primary key,
  group_id uuid references document_groups on delete cascade not null,
  user_id uuid references auth.users not null,
  added_by uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(group_id, user_id)
);

alter table document_group_members enable row level security;

create policy "Group owners can manage members."
  on document_group_members for all
  using (
    exists (
      select 1 from document_groups
      where document_groups.id = document_group_members.group_id
      and document_groups.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from document_groups
      where document_groups.id = document_group_members.group_id
      and document_groups.owner_id = auth.uid()
    )
  );

create table document_shares (
  id uuid default uuid_generate_v4() primary key,
  document_id uuid references documents on delete cascade not null,
  target_user_id uuid references auth.users,
  group_id uuid references document_groups on delete cascade,
  access_level text not null check (access_level in ('view', 'comment', 'edit')),
  created_by uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  check (target_user_id is not null or group_id is not null)
);

alter table document_shares enable row level security;

create unique index document_shares_user_unique
  on document_shares(document_id, target_user_id)
  where target_user_id is not null;

create unique index document_shares_group_unique
  on document_shares(document_id, group_id)
  where group_id is not null;

create policy "Owners can manage document shares."
  on document_shares for all
  using (
    exists (
      select 1 from documents
      where documents.id = document_shares.document_id
      and documents.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from documents
      where documents.id = document_shares.document_id
      and documents.user_id = auth.uid()
    )
  );

create policy "Shared users can view share records."
  on document_shares for select
  using (
    target_user_id = auth.uid()
    or exists (
      select 1 from document_group_members
      where document_group_members.group_id = document_shares.group_id
      and document_group_members.user_id = auth.uid()
    )
  );

create table document_public_links (
  id uuid default uuid_generate_v4() primary key,
  document_id uuid references documents on delete cascade not null,
  created_by uuid references auth.users not null,
  token text not null unique,
  access_level text not null check (access_level in ('view', 'comment', 'edit')),
  is_active boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(document_id)
);

alter table document_public_links enable row level security;

create policy "Owners can manage public links."
  on document_public_links for all
  using (
    exists (
      select 1 from documents
      where documents.id = document_public_links.document_id
      and documents.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from documents
      where documents.id = document_public_links.document_id
      and documents.user_id = auth.uid()
    )
  );

create policy "Active public links can be read."
  on document_public_links for select
  using ( is_active = true );

create policy "Users can view shared documents."
  on documents for select
  using (
    exists (
      select 1 from document_shares
      where document_shares.document_id = documents.id
      and (
        document_shares.target_user_id = auth.uid()
        or exists (
          select 1 from document_group_members
          where document_group_members.group_id = document_shares.group_id
          and document_group_members.user_id = auth.uid()
        )
      )
    )
  );

create policy "Public link documents are viewable."
  on documents for select
  using (
    exists (
      select 1 from document_public_links
      where document_public_links.document_id = documents.id
      and document_public_links.is_active = true
    )
  );

create policy "Owners and editors can update documents."
  on documents for update
  using (
    auth.uid() = user_id
    or exists (
      select 1 from document_shares
      where document_shares.document_id = documents.id
      and document_shares.access_level = 'edit'
      and (
        document_shares.target_user_id = auth.uid()
        or exists (
          select 1 from document_group_members
          where document_group_members.group_id = document_shares.group_id
          and document_group_members.user_id = auth.uid()
        )
      )
    )
  );

create table document_versions (
  id uuid default uuid_generate_v4() primary key,
  document_id uuid references documents on delete cascade not null,
  user_id uuid references auth.users not null,
  title text not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table document_versions enable row level security;

create policy "Document collaborators can view versions."
  on document_versions for select
  using (
    exists (
      select 1 from documents
      where documents.id = document_versions.document_id
      and (
        documents.user_id = auth.uid()
        or exists (
          select 1 from document_shares
          where document_shares.document_id = documents.id
          and (
            document_shares.target_user_id = auth.uid()
            or exists (
              select 1 from document_group_members
              where document_group_members.group_id = document_shares.group_id
              and document_group_members.user_id = auth.uid()
            )
          )
        )
      )
    )
  );

create policy "Document editors can create versions."
  on document_versions for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from documents
      where documents.id = document_versions.document_id
      and (
        documents.user_id = auth.uid()
        or exists (
          select 1 from document_shares
          where document_shares.document_id = documents.id
          and document_shares.access_level = 'edit'
          and (
            document_shares.target_user_id = auth.uid()
            or exists (
              select 1 from document_group_members
              where document_group_members.group_id = document_shares.group_id
              and document_group_members.user_id = auth.uid()
            )
          )
        )
      )
    )
  );

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
  insert into public.profiles (id, email, first_name, last_name, updated_at)
  values (new.id, new.email, new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'last_name', now());
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user signup
-- Drop trigger if exists to prevent errors on re-run (optional but good practice)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
