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
language sql
stable
security invoker
set search_path = 'public'
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