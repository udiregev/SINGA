-- Singa backend schema: songs, playlists, gigs, and sharing.
-- Run this once in the Supabase SQL editor (Project > SQL Editor > New query).
-- Safe to re-run (uses IF NOT EXISTS / ON CONFLICT DO NOTHING throughout).

-- ============================================================
-- SONGS
-- ============================================================
create table if not exists public.songs (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  owner_nickname text not null default '',
  title text not null default '',
  sub text not null default '',
  lyrics text not null default '',
  chords jsonb not null default '{}'::jsonb,
  notes jsonb not null default '{}'::jsonb,
  word_timestamps jsonb,
  audio_duration_sec double precision,
  sample_url text,
  synced boolean not null default false,
  is_public boolean not null default false,
  plays integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists songs_owner_idx on public.songs(owner_id);
create index if not exists songs_public_title_idx on public.songs using gin (to_tsvector('simple', title)) ;

alter table public.songs enable row level security;
-- (songs_select is created after the gigs table below — it refers to gigs)
drop policy if exists "songs_insert" on public.songs;
create policy "songs_insert" on public.songs for insert
  with check (owner_id = auth.uid());
drop policy if exists "songs_update" on public.songs;
create policy "songs_update" on public.songs for update
  using (owner_id = auth.uid());
drop policy if exists "songs_delete" on public.songs;
create policy "songs_delete" on public.songs for delete
  using (owner_id = auth.uid());

-- ============================================================
-- PLAYLISTS  (song_ids is an ordered JSON array of song ids)
-- ============================================================
create table if not exists public.playlists (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  owner_nickname text not null default '',
  title text not null default '',
  song_ids jsonb not null default '[]'::jsonb,
  is_public boolean not null default false,
  plays integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists playlists_owner_idx on public.playlists(owner_id);

alter table public.playlists enable row level security;
drop policy if exists "playlists_select" on public.playlists;
create policy "playlists_select" on public.playlists for select
  using (is_public or owner_id = auth.uid());
drop policy if exists "playlists_insert" on public.playlists;
create policy "playlists_insert" on public.playlists for insert
  with check (owner_id = auth.uid());
drop policy if exists "playlists_update" on public.playlists;
create policy "playlists_update" on public.playlists for update
  using (owner_id = auth.uid());
drop policy if exists "playlists_delete" on public.playlists;
create policy "playlists_delete" on public.playlists for delete
  using (owner_id = auth.uid());

-- ============================================================
-- GIGS  (setlist is an ordered JSON array of song ids)
-- ============================================================
create table if not exists public.gigs (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  owner_nickname text not null default '',
  title text not null default '',
  date_label text not null default '',
  setlist jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  -- Gigs are shareable from the moment they're created — unlike songs/
  -- playlists, there's no separate "make shared" step, so this defaults
  -- to true (the app also always sends it explicitly on insert).
  is_public boolean not null default true,
  plays integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists gigs_owner_idx on public.gigs(owner_id);

alter table public.gigs enable row level security;
drop policy if exists "gigs_select" on public.gigs;
create policy "gigs_select" on public.gigs for select
  using (is_public or owner_id = auth.uid());
drop policy if exists "gigs_insert" on public.gigs;
create policy "gigs_insert" on public.gigs for insert
  with check (owner_id = auth.uid());
drop policy if exists "gigs_update" on public.gigs;
create policy "gigs_update" on public.gigs for update
  using (owner_id = auth.uid());
drop policy if exists "gigs_delete" on public.gigs;
create policy "gigs_delete" on public.gigs for delete
  using (owner_id = auth.uid());

-- Songs are readable when public, yours, or in a public gig's setlist.
-- Created here, after public.gigs exists (it used to come first, which made
-- the whole script fail on a fresh project).
drop policy if exists "songs_select" on public.songs;
-- A song is readable if it's public, you own it, OR it's in the setlist of
-- any gig that's been made public (the Audience Guest Site reads a gig's
-- songs this way, with no login, so a shared gig doesn't also require
-- separately marking every one of its songs public).
create policy "songs_select" on public.songs for select
  using (
    is_public
    or owner_id = auth.uid()
    or exists (
      select 1 from public.gigs g
      where g.is_public and g.setlist @> to_jsonb(songs.id)
    )
  );

-- ============================================================
-- STORAGE: 5-second song-preview audio clips (same pattern as the
-- existing "avatars" bucket). Public bucket so playback URLs work
-- without a signed-URL round trip; each file lives under the owning
-- user's id so paths don't collide.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('song-samples', 'song-samples', true)
on conflict (id) do nothing;

drop policy if exists "song_samples_read" on storage.objects;
create policy "song_samples_read" on storage.objects for select
  using (bucket_id = 'song-samples');
drop policy if exists "song_samples_write" on storage.objects;
create policy "song_samples_write" on storage.objects for insert
  with check (bucket_id = 'song-samples' and auth.uid() is not null);
drop policy if exists "song_samples_update" on storage.objects;
create policy "song_samples_update" on storage.objects for update
  using (bucket_id = 'song-samples' and auth.uid() is not null);
drop policy if exists "song_samples_delete" on storage.objects;
create policy "song_samples_delete" on storage.objects for delete
  using (bucket_id = 'song-samples' and auth.uid() is not null);

-- ============================================================
-- GIG CHAT  (Audience Guest Site chat + DMs to the band)
-- Guests never log in, so "who sent this" is just a random,
-- browser-local guest_id (crypto.randomUUID(), kept in
-- localStorage) plus whatever name they type once when they first
-- open Chat. There's no server-side identity to check a DM's
-- recipient against, so the guest-vs-band privacy split on is_dm
-- rows is enforced client-side (audience.html only ever shows a
-- guest their own DMs) rather than by RLS — anyone with the
-- Supabase anon key could in principle query every row directly.
-- That's the same open-by-design trust model the rest of this
-- no-login audience experience already uses (e.g. the live
-- broadcast channel). Rows disappear automatically when their gig
-- is deleted (on delete cascade).
-- ============================================================
create table if not exists public.gig_chat_messages (
  id text primary key,
  gig_id text not null references public.gigs(id) on delete cascade,
  guest_id text not null default '',
  author_name text not null default '',
  is_owner boolean not null default false,
  is_dm boolean not null default false,
  text text not null,
  created_at timestamptz not null default now()
);
create index if not exists gig_chat_gig_idx on public.gig_chat_messages(gig_id, created_at);

alter table public.gig_chat_messages enable row level security;
drop policy if exists "gig_chat_select" on public.gig_chat_messages;
create policy "gig_chat_select" on public.gig_chat_messages for select using (true);
drop policy if exists "gig_chat_insert" on public.gig_chat_messages;
create policy "gig_chat_insert" on public.gig_chat_messages for insert
  with check (exists (select 1 from public.gigs g where g.id = gig_id and g.is_public));

-- ============================================================
-- GIG PHOTOS  (Audience Guest Site photo wall)
-- ============================================================
create table if not exists public.gig_photos (
  id text primary key,
  gig_id text not null references public.gigs(id) on delete cascade,
  guest_id text not null default '',
  author_name text not null default '',
  storage_path text not null,
  created_at timestamptz not null default now()
);
create index if not exists gig_photos_gig_idx on public.gig_photos(gig_id, created_at);

alter table public.gig_photos enable row level security;
drop policy if exists "gig_photos_select" on public.gig_photos;
create policy "gig_photos_select" on public.gig_photos for select using (true);
drop policy if exists "gig_photos_insert" on public.gig_photos;
create policy "gig_photos_insert" on public.gig_photos for insert
  with check (exists (select 1 from public.gigs g where g.id = gig_id and g.is_public));

insert into storage.buckets (id, name, public)
values ('gig-photos', 'gig-photos', true)
on conflict (id) do nothing;

drop policy if exists "gig_photos_storage_read" on storage.objects;
create policy "gig_photos_storage_read" on storage.objects for select
  using (bucket_id = 'gig-photos');
drop policy if exists "gig_photos_storage_write" on storage.objects;
-- Guests upload with no login, same open-by-design trust model as
-- above: anyone holding the gig's audience link (from its QR code)
-- can post a photo.
create policy "gig_photos_storage_write" on storage.objects for insert
  with check (bucket_id = 'gig-photos');

-- ============================================================
-- GIG SONG REQUESTS  ("song voting" tab — guests suggest or vote
-- for what plays next. votes is a simple counter; voter_ids is the
-- de-dupe list of guest_ids who've voted, since guests aren't
-- authenticated so there's no auth.uid() to key a unique-vote
-- constraint off of.)
-- ============================================================
create table if not exists public.gig_requests (
  id text primary key,
  gig_id text not null references public.gigs(id) on delete cascade,
  title text not null default '',
  sub text not null default '',
  votes integer not null default 0,
  voter_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists gig_requests_gig_idx on public.gig_requests(gig_id);

alter table public.gig_requests enable row level security;
drop policy if exists "gig_requests_select" on public.gig_requests;
create policy "gig_requests_select" on public.gig_requests for select using (true);
drop policy if exists "gig_requests_insert" on public.gig_requests;
create policy "gig_requests_insert" on public.gig_requests for insert
  with check (exists (select 1 from public.gigs g where g.id = gig_id and g.is_public));
drop policy if exists "gig_requests_update" on public.gig_requests;
-- Needed so any guest can toggle their own vote (read-modify-write
-- the shared votes/voter_ids columns) — same no-guest-auth trade-off
-- as the rest of this table.
create policy "gig_requests_update" on public.gig_requests for update using (true);

-- ============================================================
-- REALTIME: add the three audience tables above to the Realtime
-- publication so audience.html's postgres_changes subscriptions
-- (new chat messages, new photos, vote updates) actually fire.
-- Wrapped in existence checks so this file stays safe to re-run.
-- ============================================================
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='gig_chat_messages') then
    alter publication supabase_realtime add table public.gig_chat_messages;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='gig_photos') then
    alter publication supabase_realtime add table public.gig_photos;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='gig_requests') then
    alter publication supabase_realtime add table public.gig_requests;
  end if;
end $$;
