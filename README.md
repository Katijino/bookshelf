# Bookshelf

A Goodreads-like book community app built with React, TypeScript, and Supabase.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + TypeScript (Vite) |
| Backend | Supabase (Postgres, Auth, Storage) |
| Hosting | Netlify |
| State | Zustand + TanStack Query |
| Forms | React Hook Form + Zod |

---

## Getting Started

```bash
npm install
cp .env.example .env        # fill in your Supabase credentials
npm run dev
```

Get your credentials from your Supabase project dashboard under Project Settings → API.

---

## Architecture

```
Browser (React SPA on Netlify)
         |
         | Supabase JS Client
         v
Supabase:
  - Auth (JWT / OAuth)
  - Postgres + RLS
  - Storage (covers, avatars)
  - Edge Functions (import jobs, notifications)
         |
         |-- OpenLibrary API (bulk book data)
         |-- Google Books API (cover fallback)
         |-- Goodreads CSV (user import)
```

---

## Project Structure

```
src/
├── main.tsx                 # App entry — providers setup
├── App.tsx                  # Routes + auth listener
│
├── components/
│   ├── BookCard.tsx         # Cover thumbnail + title
│   ├── BookShelf.tsx        # Horizontal scroll shelf UI
│   ├── StarRating.tsx       # Half-star capable rating
│   ├── ReviewCard.tsx
│   ├── Avatar.tsx
│   ├── Navbar.tsx
│   └── ShelfSelector.tsx
│
├── pages/
│   ├── Home.tsx             # Discovery / trending
│   ├── BookPage.tsx
│   ├── AuthorPage.tsx
│   ├── Library.tsx          # User shelves
│   ├── Profile.tsx
│   ├── Search.tsx
│   ├── Challenges.tsx
│   ├── Groups.tsx
│   ├── Settings.tsx
│   └── Login.tsx
│
├── hooks/                   # TanStack Query data hooks
│   ├── useBook.ts
│   ├── useLibrary.ts
│   ├── useProfile.ts
│   ├── useFollows.ts
│   ├── useFeed.ts
│   └── useSearch.ts
│
├── stores/
│   ├── authStore.ts         # current user/session (Zustand)
│   └── uiStore.ts           # toasts, modals
│
├── lib/
│   ├── supabase.ts          # Supabase client init
│   └── utils.ts
│
└── types/
    └── database.ts          # Supabase type definitions

scripts/
├── import-openlibrary.ts    # Seed books from OpenLibrary API
└── import-goodreads-csv.ts  # Import user Goodreads export
```

---

## Database Schema

Run all SQL in the Supabase SQL Editor in this order.

### Step 0 — Enable extensions

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;
```

### Step 1 — Enums

```sql
CREATE TYPE shelf_type AS ENUM ('want_to_read', 'reading', 'completed', 'dropped');
```

### Step 2 — Tables

```sql
CREATE TABLE books (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  subtitle      TEXT,
  description   TEXT,
  isbn_10       TEXT UNIQUE,
  isbn_13       TEXT UNIQUE,
  publish_date  DATE,
  publisher     TEXT,
  page_count    INT,
  language      TEXT DEFAULT 'en',
  cover_url     TEXT,
  ol_key        TEXT UNIQUE,
  google_id     TEXT UNIQUE,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE authors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  bio         TEXT,
  photo_url   TEXT,
  ol_key      TEXT UNIQUE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE book_authors (
  book_id    UUID REFERENCES books(id) ON DELETE CASCADE,
  author_id  UUID REFERENCES authors(id) ON DELETE CASCADE,
  role       TEXT DEFAULT 'author',
  PRIMARY KEY (book_id, author_id)
);

CREATE TABLE genres (
  id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name  TEXT NOT NULL UNIQUE,
  slug  TEXT NOT NULL UNIQUE
);

CREATE TABLE book_genres (
  book_id   UUID REFERENCES books(id) ON DELETE CASCADE,
  genre_id  UUID REFERENCES genres(id) ON DELETE CASCADE,
  PRIMARY KEY (book_id, genre_id)
);

CREATE TABLE editions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id      UUID REFERENCES books(id) ON DELETE CASCADE,
  isbn_10      TEXT UNIQUE,
  isbn_13      TEXT UNIQUE,
  format       TEXT,
  publish_date DATE,
  publisher    TEXT,
  page_count   INT,
  language     TEXT,
  cover_url    TEXT
);

CREATE TABLE profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username         TEXT UNIQUE NOT NULL,
  display_name     TEXT,
  avatar_url       TEXT,
  bio              TEXT,
  favorite_book_id UUID REFERENCES books(id),
  location         TEXT,
  website          TEXT,
  goodreads_id     TEXT,
  streak_count     INT DEFAULT 0,
  last_read_date   DATE,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE user_books (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES profiles(id) ON DELETE CASCADE,
  book_id         UUID REFERENCES books(id) ON DELETE CASCADE,
  shelf           shelf_type NOT NULL,
  current_page    INT DEFAULT 0,
  date_started    DATE,
  date_finished   DATE,
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, book_id)
);

CREATE TABLE custom_shelves (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id  UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name     TEXT NOT NULL,
  UNIQUE (user_id, name)
);

CREATE TABLE custom_shelf_books (
  shelf_id  UUID REFERENCES custom_shelves(id) ON DELETE CASCADE,
  book_id   UUID REFERENCES books(id) ON DELETE CASCADE,
  PRIMARY KEY (shelf_id, book_id)
);

CREATE TABLE reviews (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  book_id     UUID REFERENCES books(id) ON DELETE CASCADE,
  rating      NUMERIC(2,1) CHECK (rating >= 1 AND rating <= 5),
  body        TEXT,
  spoiler     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, book_id)
);

CREATE MATERIALIZED VIEW book_ratings AS
  SELECT
    book_id,
    COUNT(*) AS rating_count,
    ROUND(AVG(rating)::NUMERIC, 2) AS avg_rating
  FROM reviews
  WHERE rating IS NOT NULL
  GROUP BY book_id;

CREATE TABLE follows (
  follower_id  UUID REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE TABLE challenges (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  year        INT NOT NULL,
  goal        INT NOT NULL,
  is_public   BOOLEAN DEFAULT true,
  creator_id  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE challenge_members (
  challenge_id  UUID REFERENCES challenges(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES profiles(id) ON DELETE CASCADE,
  progress      INT DEFAULT 0,
  joined_at     TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (challenge_id, user_id)
);

CREATE TABLE groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  description TEXT,
  cover_url   TEXT,
  creator_id  UUID REFERENCES profiles(id),
  is_private  BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE group_members (
  group_id   UUID REFERENCES groups(id) ON DELETE CASCADE,
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  role       TEXT DEFAULT 'member',
  joined_at  TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE TABLE notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  payload     JSONB,
  read        BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  body        TEXT NOT NULL,
  read        BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

### Step 3 — Auto-create profile on signup

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

### Step 4 — Indexes

```sql
CREATE INDEX idx_books_isbn13          ON books(isbn_13);
CREATE INDEX idx_books_title_trgm      ON books  USING gin(title gin_trgm_ops);
CREATE INDEX idx_books_publish_date    ON books(publish_date DESC);
CREATE INDEX idx_authors_name_trgm     ON authors USING gin(name gin_trgm_ops);
CREATE INDEX idx_user_books_user_shelf ON user_books(user_id, shelf);
CREATE INDEX idx_user_books_book       ON user_books(book_id);
CREATE INDEX idx_reviews_book          ON reviews(book_id);
CREATE INDEX idx_reviews_user          ON reviews(user_id);
CREATE INDEX idx_follows_follower      ON follows(follower_id);
CREATE INDEX idx_follows_following     ON follows(following_id);
CREATE INDEX idx_notifications_unread  ON notifications(user_id, read) WHERE read = false;
```

---

## Row Level Security (RLS)

```sql
-- Books / Authors / Genres: public read only
ALTER TABLE books        ENABLE ROW LEVEL SECURITY;
ALTER TABLE authors      ENABLE ROW LEVEL SECURITY;
ALTER TABLE editions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE genres       ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_genres  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read" ON books        FOR SELECT USING (true);
CREATE POLICY "Public read" ON authors      FOR SELECT USING (true);
CREATE POLICY "Public read" ON editions     FOR SELECT USING (true);
CREATE POLICY "Public read" ON genres       FOR SELECT USING (true);
CREATE POLICY "Public read" ON book_authors FOR SELECT USING (true);
CREATE POLICY "Public read" ON book_genres  FOR SELECT USING (true);

-- Profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON profiles FOR SELECT USING (true);
CREATE POLICY "Owner write" ON profiles FOR UPDATE USING (auth.uid() = id);

-- User books
ALTER TABLE user_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read"  ON user_books FOR SELECT USING (true);
CREATE POLICY "Owner insert" ON user_books FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner update" ON user_books FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owner delete" ON user_books FOR DELETE USING (auth.uid() = user_id);

-- Custom shelves
ALTER TABLE custom_shelves     ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_shelf_books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner only" ON custom_shelves FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Owner only" ON custom_shelf_books FOR ALL
  USING (EXISTS (SELECT 1 FROM custom_shelves WHERE id = shelf_id AND user_id = auth.uid()));

-- Reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read"  ON reviews FOR SELECT USING (true);
CREATE POLICY "Owner insert" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner update" ON reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Owner delete" ON reviews FOR DELETE USING (auth.uid() = user_id);

-- Follows
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read"    ON follows FOR SELECT USING (true);
CREATE POLICY "Owner follow"   ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Owner unfollow" ON follows FOR DELETE USING (auth.uid() = follower_id);

-- Challenges
ALTER TABLE challenges        ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenge_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read"    ON challenges FOR SELECT USING (true);
CREATE POLICY "Auth create"    ON challenges FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creator manage" ON challenges FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Creator delete" ON challenges FOR DELETE USING (auth.uid() = creator_id);
CREATE POLICY "Public read"    ON challenge_members FOR SELECT USING (true);
CREATE POLICY "Owner join"     ON challenge_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner leave"    ON challenge_members FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Owner progress" ON challenge_members FOR UPDATE USING (auth.uid() = user_id);

-- Groups
ALTER TABLE groups        ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON groups FOR SELECT
  USING (is_private = false OR EXISTS (
    SELECT 1 FROM group_members WHERE group_id = id AND user_id = auth.uid()
  ));
CREATE POLICY "Auth create"  ON groups FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Admin manage" ON groups FOR UPDATE
  USING (EXISTS (SELECT 1 FROM group_members WHERE group_id = id AND user_id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin delete" ON groups FOR DELETE USING (auth.uid() = creator_id);
CREATE POLICY "Member read"  ON group_members FOR SELECT USING (true);
CREATE POLICY "Owner join"   ON group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner leave"  ON group_members FOR DELETE USING (auth.uid() = user_id);

-- Notifications (private)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner only" ON notifications FOR ALL USING (auth.uid() = user_id);

-- Messages (private)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participant read" ON messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Sender insert" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Sender delete" ON messages FOR DELETE USING (auth.uid() = sender_id);
```

RLS Summary:

| Table | Read | Write |
|-------|------|-------|
| books / authors / genres | Anyone | Nobody (seed via service role) |
| profiles | Anyone | Owner only |
| user_books / reviews | Anyone | Owner only |
| notifications / messages | Owner only | Owner only |
| groups | Public if not private | Admin/creator |
| follows | Anyone | Follower only |

---

## Example Supabase Queries

```typescript
// Book detail page
const { data: book } = await supabase
  .from('books')
  .select(`
    *,
    book_authors ( role, authors ( id, name, photo_url ) ),
    book_genres  ( genres ( id, name, slug ) ),
    book_ratings ( avg_rating, rating_count )
  `)
  .eq('id', bookId)
  .single()

// User reading shelf
const { data: shelf } = await supabase
  .from('user_books')
  .select('*, books ( id, title, cover_url )')
  .eq('user_id', userId)
  .eq('shelf', 'reading')
  .order('updated_at', { ascending: false })

// Most currently-read books (discovery)
const { data: popular } = await supabase
  .from('user_books')
  .select('book_id, books ( id, title, cover_url ), count:book_id.count()')
  .eq('shelf', 'reading')
  .order('count', { ascending: false })
  .limit(20)

// Social feed
const { data: feed } = await supabase
  .from('reviews')
  .select('*, profiles ( id, username, avatar_url ), books ( id, title, cover_url )')
  .in('user_id',
    supabase.from('follows').select('following_id').eq('follower_id', currentUserId)
  )
  .order('created_at', { ascending: false })
  .limit(30)

// Update reading progress
await supabase
  .from('user_books')
  .upsert({
    user_id:      userId,
    book_id:      bookId,
    shelf:        'reading',
    current_page: 142,
    updated_at:   new Date().toISOString()
  }, { onConflict: 'user_id,book_id' })
```

---

## Book Data Sources

| Source | Best For | Notes |
|--------|----------|-------|
| OpenLibrary | Bulk import, ISBNs, authors | Free, open. Subject API or full dump (~30GB). |
| Google Books API | Cover images, descriptions | Free: 1000 req/day. Best cover quality. |
| isbndb.com | ISBN lookups | Paid API, extensive data |
| Goodreads CSV | User migration only | No public API since 2020 |

---

## Seeding Book Data

### Option A — OpenLibrary Subject API (quick start)

```bash
SUPABASE_URL=https://xxx.supabase.co \
SUPABASE_SERVICE_KEY=your-service-key \
npx ts-node scripts/import-openlibrary.ts
```

Fetches books by subject (fantasy, sci-fi, mystery, etc.) and upserts into books and authors tables.

### Option B — OpenLibrary Data Dump (millions of books)

1. Download from https://openlibrary.org/developers/dumps:
   - ol_dump_works_latest.txt.gz
   - ol_dump_authors_latest.txt.gz
2. Each line is a tab-separated JSON record. Stream-parse and batch-insert with the service role key.
3. Run as a one-time server job, inserting in batches of 500.

### Option C — Google Books API (per-ISBN enrichment)

Use to fill in missing covers or descriptions after the OpenLibrary import:

```
GET https://www.googleapis.com/books/v1/volumes?q=isbn:9780451524935&key=API_KEY
```

---

## Goodreads Import

1. User exports from Goodreads: My Books > Export Library > goodreads_library_export.csv
2. User uploads CSV in Settings page
3. Import script runs:
   - Looks up each book by ISBN locally
   - If missing, fetches from OpenLibrary by ISBN and inserts
   - Maps shelves: read -> completed, currently-reading -> reading, to-read -> want_to_read
   - Imports ratings into reviews table
4. Store goodreads_id on profile for friend matching

---

## Generate TypeScript Types

After schema is set up, keep types in sync:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/types/database.ts
```

---

## MVP Build Order

### Phase 1 — Foundation
- [ ] Supabase project, schema, RLS
- [ ] React + routing + auth (Supabase Auth)
- [ ] Seed books from OpenLibrary

### Phase 2 — Core Book Features
- [ ] Book detail page
- [ ] Search by title / author
- [ ] Add to shelf, rate, review
- [ ] Average rating display

### Phase 3 — Library and Profiles
- [ ] User library with shelf views
- [ ] Reading progress (current page)
- [ ] Public profile page
- [ ] Follow / unfollow
- [ ] Activity feed

### Phase 4 — Discovery
- [ ] Home: most read, recent popular, genre filter
- [ ] Bookshelf-style scroll UI
- [ ] Author pages

### Phase 5 — Social and Import
- [ ] Goodreads CSV import
- [ ] Reading challenges
- [ ] Reading groups
- [ ] Notifications

### Phase 6 — Polish
- [ ] Reading streaks
- [ ] Custom shelves
- [ ] Profile personalization
- [ ] New release notifications (Edge Function cron)
