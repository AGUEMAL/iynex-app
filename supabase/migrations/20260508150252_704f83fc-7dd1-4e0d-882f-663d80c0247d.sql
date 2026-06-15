
-- profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  age int,
  language text not null default 'en',
  theme text not null default 'dark',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "own profile select" on public.profiles for select using (auth.uid() = id);
create policy "own profile insert" on public.profiles for insert with check (auth.uid() = id);
create policy "own profile update" on public.profiles for update using (auth.uid() = id);

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end; $$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- daily plans (sleep cycle)
create table public.daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  wake_time time not null,
  sleep_time time not null,
  created_at timestamptz not null default now(),
  unique(user_id, date)
);
alter table public.daily_plans enable row level security;
create policy "own plans all" on public.daily_plans for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- tasks
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  name text not null,
  type text not null check (type in ('fixed','flexible')),
  start_time time,
  duration_minutes int not null,
  scheduled_start time,
  completed boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.tasks enable row level security;
create policy "own tasks all" on public.tasks for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index tasks_user_date_idx on public.tasks(user_id, date);

-- notes
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.notes enable row level security;
create policy "own notes all" on public.notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
