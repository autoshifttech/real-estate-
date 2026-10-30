-- Tenkasi Land Promoters — run this once in Supabase: SQL Editor → New query → paste → Run.
-- Safe to run again.

-- Site content: two rows, "config" (business details) and "data" (properties, regions, FAQs…).
-- The website reads them through /api/site; the admin panel writes them through /api/admin.
create table if not exists public.site_content (
  key        text primary key check (key in ('config', 'data')),
  value      jsonb not null,
  version    integer not null default 1,
  updated_at timestamptz not null default now()
);

-- Enquiries from the website forms.
create table if not exists public.enquiries (
  id         text primary key,
  created_at timestamptz not null default now(),
  status     text not null default 'new' check (status in ('new', 'contacted', 'closed')),
  note       text,
  data       jsonb not null default '{}'::jsonb
);
create index if not exists enquiries_created_at on public.enquiries (created_at desc);

-- Row-level security on, with no policies: the public (anon) key can read or write nothing.
-- Only the server, using the secret key, can reach these tables.
alter table public.site_content enable row level security;
alter table public.enquiries enable row level security;
revoke all on public.site_content, public.enquiries from anon, authenticated;

-- Photos and videos: a public bucket (anyone can view files, which the website needs).
-- Uploads only happen through one-time links the admin server creates, never with the public key.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 52428800,
        array['image/webp', 'image/jpeg', 'image/png', 'video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
