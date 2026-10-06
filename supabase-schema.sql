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
drop policy if exists "songs_select" on public.songs;
create policy "songs_select" on public.songs for select
  using (is_public or owner_id = auth.uid());
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
  is_public boolean not null default false,
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
