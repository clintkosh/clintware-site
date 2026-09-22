-- Extensions
create extension if not exists vector;
create extension if not exists pg_trgm;

-- Profiles
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  custom_system_prompt text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Conversations
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New chat',
  model text not null default 'google/gemini-3-flash-preview',
  system_prompt_override text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index conversations_user_idx on public.conversations(user_id, updated_at desc);
alter table public.conversations enable row level security;
create policy "conv_select_own" on public.conversations for select using (auth.uid() = user_id);
create policy "conv_insert_own" on public.conversations for insert with check (auth.uid() = user_id);
create policy "conv_update_own" on public.conversations for update using (auth.uid() = user_id);
create policy "conv_delete_own" on public.conversations for delete using (auth.uid() = user_id);

-- Messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant','system')),
  content text not null default '',
  image_urls text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index messages_conv_idx on public.messages(conversation_id, created_at);
alter table public.messages enable row level security;
create policy "msg_select_own" on public.messages for select using (auth.uid() = user_id);
create policy "msg_insert_own" on public.messages for insert with check (auth.uid() = user_id);
create policy "msg_delete_own" on public.messages for delete using (auth.uid() = user_id);

-- Memories
create table public.memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'fact' check (category in ('profile','fact','goal','summary','custom')),
  content text not null,
  tags text[] not null default '{}',
  importance smallint not null default 3 check (importance between 1 and 5),
  source text not null default 'auto' check (source in ('auto','manual','summary')),
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index memories_user_idx on public.memories(user_id, updated_at desc);
create index memories_embedding_idx on public.memories using hnsw (embedding vector_cosine_ops);
alter table public.memories enable row level security;
create policy "mem_select_own" on public.memories for select using (auth.uid() = user_id);
create policy "mem_insert_own" on public.memories for insert with check (auth.uid() = user_id);
create policy "mem_update_own" on public.memories for update using (auth.uid() = user_id);
create policy "mem_delete_own" on public.memories for delete using (auth.uid() = user_id);

-- Bot links (Telegram / Discord -> Lovable user)
create table public.bot_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('telegram','discord')),
  external_id text not null, -- telegram chat_id or discord user/channel id
  link_code text,             -- one-time code used to link
  linked_at timestamptz,
  created_at timestamptz not null default now(),
  unique(platform, external_id)
);
create index bot_links_user_idx on public.bot_links(user_id);
create index bot_links_code_idx on public.bot_links(link_code) where link_code is not null;
alter table public.bot_links enable row level security;
create policy "botlinks_select_own" on public.bot_links for select using (auth.uid() = user_id);
create policy "botlinks_insert_own" on public.bot_links for insert with check (auth.uid() = user_id);
create policy "botlinks_update_own" on public.bot_links for update using (auth.uid() = user_id);
create policy "botlinks_delete_own" on public.bot_links for delete using (auth.uid() = user_id);

-- Bot messages (raw, for idempotency + audit)
create table public.bot_messages (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('telegram','discord')),
  external_message_id text not null,
  external_chat_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  unique(platform, external_message_id)
);
alter table public.bot_messages enable row level security;
create policy "botmsg_select_own" on public.bot_messages for select using (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email,'@',1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- updated_at trigger helper
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger touch_profiles before update on public.profiles
for each row execute function public.touch_updated_at();
create trigger touch_conversations before update on public.conversations
for each row execute function public.touch_updated_at();
create trigger touch_memories before update on public.memories
for each row execute function public.touch_updated_at();

-- Semantic memory search RPC
create or replace function public.match_memories(
  p_user_id uuid,
  p_query_embedding vector(1536),
  p_match_count int default 6,
  p_min_similarity float default 0.5
)
returns table (
  id uuid,
  content text,
  category text,
  importance smallint,
  similarity float
)
language sql stable
as $$
  select m.id, m.content, m.category, m.importance,
         1 - (m.embedding <=> p_query_embedding) as similarity
  from public.memories m
  where m.user_id = p_user_id
    and m.embedding is not null
    and 1 - (m.embedding <=> p_query_embedding) > p_min_similarity
  order by m.embedding <=> p_query_embedding
  limit p_match_count;
$$;

-- Storage bucket for generated/uploaded images
insert into storage.buckets (id, name, public)
values ('chat-images', 'chat-images', true)
on conflict (id) do nothing;

create policy "chat_images_public_read"
on storage.objects for select
using (bucket_id = 'chat-images');

create policy "chat_images_user_upload"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'chat-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "chat_images_user_delete"
on storage.objects for delete to authenticated
using (
  bucket_id = 'chat-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);