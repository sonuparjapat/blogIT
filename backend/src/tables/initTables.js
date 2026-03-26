const pool = require("../config/db");

const initTables = async () => {

  /* ================= USERS ================= */

  await pool.query(`
  CREATE TABLE IF NOT EXISTS users(
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    display_name VARCHAR(150),
    avatar TEXT,
    bio TEXT,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user','editor','admin')),
    verified BOOLEAN DEFAULT false,
    is_banned BOOLEAN DEFAULT false,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`);


  /* ================= PASSWORD RESETS ================= */

  await pool.query(`
  CREATE TABLE IF NOT EXISTS password_resets(
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`);


  /* ================= POSTS ================= */


  /* ================= REVISIONS ================= */

  await pool.query(`
  CREATE TABLE IF NOT EXISTS revisions(
    id SERIAL PRIMARY KEY,
    post_id INT REFERENCES posts(id) ON DELETE CASCADE,
    content JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`);



    /* ── posts ──────────────────────────────────────────────────────── */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id               SERIAL PRIMARY KEY,
        title            TEXT         NOT NULL,
        slug             TEXT         UNIQUE NOT NULL,
        excerpt          TEXT,
        content          JSONB        NOT NULL,
        featured_image   TEXT,
        seo_title        TEXT,
        seo_description  TEXT,
        reading_time     INT          DEFAULT 1,
        status          VARCHAR(20)  DEFAULT 'draft'
                   CHECK (status IN ('draft', 'pending', 'published', 'rejected')),
        is_premium       BOOLEAN      DEFAULT false,
        scheduled_at     TIMESTAMP,
        views            INT          DEFAULT 0,
        deleted          BOOLEAN      DEFAULT false,
        author_id        INT          REFERENCES users(id) ON DELETE CASCADE,
        created_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        updated_at       TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
      )
    `);
 
    /* ── post_gallery (multiple images per post) ─────────────────────── */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS post_gallery (
        id         SERIAL PRIMARY KEY,
        post_id    INT  NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        url        TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
 
    /* ── views (unique IP tracking) ──────────────────────────────────── */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS views (
        id         SERIAL PRIMARY KEY,
        post_id    INT  NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        ip         VARCHAR(50) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (post_id, ip)
      )
    `);
 
    /* ── categories ──────────────────────────────────────────────────── */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id         SERIAL PRIMARY KEY,
        name       TEXT UNIQUE NOT NULL,
        slug       TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
 
    /* ── tags ────────────────────────────────────────────────────────── */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tags (
        id         SERIAL PRIMARY KEY,
        name       TEXT UNIQUE NOT NULL,
        slug       TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
 
    /* ── post_categories (many-to-many) ──────────────────────────────── */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS post_categories (
        post_id     INT REFERENCES posts(id)      ON DELETE CASCADE,
        category_id INT REFERENCES categories(id) ON DELETE CASCADE,
        PRIMARY KEY (post_id, category_id)
      )
    `);
 
    /* ── post_tags (many-to-many) ─────────────────────────────────────── */
    await pool.query(`
      CREATE TABLE IF NOT EXISTS post_tags (
        post_id INT REFERENCES posts(id) ON DELETE CASCADE,
        tag_id  INT REFERENCES tags(id)  ON DELETE CASCADE,
        PRIMARY KEY (post_id, tag_id)
      )
    `);
 
    /* ── useful indexes ──────────────────────────────────────────────── */
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_posts_status_deleted
        ON posts (status, deleted);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_posts_author
        ON posts (author_id);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_posts_slug
        ON posts (slug);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_posts_views
        ON posts (views DESC);
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_post_gallery_post
        ON post_gallery (post_id);
    `);
 
    /* ── auto-update updated_at trigger ─────────────────────────────── */
    await pool.query(`
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `);
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_trigger
          WHERE tgname = 'posts_updated_at'
        ) THEN
          CREATE TRIGGER posts_updated_at
          BEFORE UPDATE ON posts
          FOR EACH ROW EXECUTE FUNCTION update_updated_at();
        END IF;
      END;
      $$;
    `);


  /* ================= COMMENTS ================= */

  await pool.query(`
  CREATE TABLE IF NOT EXISTS comments(
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    approved BOOLEAN DEFAULT false,
    parent_id INT REFERENCES comments(id) ON DELETE CASCADE,
    post_id INT REFERENCES posts(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`);


  /* ================= ENGAGEMENT ================= */

  await pool.query(`
  CREATE TABLE IF NOT EXISTS likes(
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    post_id INT REFERENCES posts(id) ON DELETE CASCADE,
    PRIMARY KEY(user_id, post_id)
  );`);

  await pool.query(`
  CREATE TABLE IF NOT EXISTS bookmarks(
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    post_id INT REFERENCES posts(id) ON DELETE CASCADE,
    PRIMARY KEY(user_id, post_id)
  );`);

  await pool.query(`
  CREATE TABLE IF NOT EXISTS followers(
    follower_id INT REFERENCES users(id) ON DELETE CASCADE,
    following_id INT REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY(follower_id, following_id)
  );`);


  /* ================= UNIQUE VIEWS ================= */

  await pool.query(`
  CREATE TABLE IF NOT EXISTS views(
    post_id INT REFERENCES posts(id) ON DELETE CASCADE,
    ip VARCHAR(100),
    PRIMARY KEY(post_id, ip)
  );`);


  /* ================= SUBSCRIPTIONS ================= */

  await pool.query(`
  CREATE TABLE IF NOT EXISTS subscriptions(
    user_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    plan VARCHAR(20),
    started_at TIMESTAMP,
    expires_at TIMESTAMP,
    CONSTRAINT unique_user_subscription UNIQUE (user_id)
  );`);


  /* ================= PAYMENTS ================= */

  await pool.query(`
  CREATE TABLE IF NOT EXISTS payments(
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    razorpay_order_id TEXT UNIQUE,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    amount INT NOT NULL,
    status VARCHAR(20) DEFAULT 'created'
      CHECK (status IN ('created','paid','failed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`);


  /* ================= WEBHOOK EVENTS ================= */

  await pool.query(`
  CREATE TABLE IF NOT EXISTS webhook_events(
    id SERIAL PRIMARY KEY,
    event_id TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`);
await pool.query(`CREATE TABLE IF NOT EXISTS creator_earnings(
  id SERIAL PRIMARY KEY,
  creator_id INT REFERENCES users(id) ON DELETE CASCADE,
  post_id INT REFERENCES posts(id) ON DELETE CASCADE,
  amount NUMERIC(10,2),
  source VARCHAR(20), -- subscription
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`)
await pool.query(`
CREATE TABLE IF NOT EXISTS platform_revenue(
  id SERIAL PRIMARY KEY,
  payment_id INT REFERENCES payments(id) ON DELETE CASCADE,
  total_amount INT,
  platform_cut NUMERIC(10,2),
  creator_pool NUMERIC(10,2),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`)

await pool.query(`CREATE TABLE IF NOT EXISTS payout_requests(
  id SERIAL PRIMARY KEY,
  creator_id INT REFERENCES users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','paid')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP
)`)
 await pool.query(`CREATE TABLE IF NOT EXISTS creator_wallets(
  creator_id INT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_earned NUMERIC(12,2) DEFAULT 0,
  total_withdrawn NUMERIC(12,2) DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`)
await pool.query(`CREATE TABLE IF NOT EXISTS seo_keywords(
  id SERIAL PRIMARY KEY,
  post_id INT REFERENCES posts(id) ON DELETE CASCADE,
  keyword TEXT,
  search_volume INT,
  CONSTRAINT unique_post_keyword UNIQUE(post_id, keyword)
)`)

await pool.query(`CREATE TABLE IF NOT EXISTS post_analytics(
  id SERIAL PRIMARY KEY,
  post_id INT REFERENCES posts(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  views INT DEFAULT 0,
  unique_views INT DEFAULT 0,
  CONSTRAINT unique_post_date UNIQUE(post_id, date)
)`)

await pool.query(`CREATE TABLE IF NOT EXISTS newsletter_subscribers(
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) `)
 await pool.query(`CREATE TABLE IF NOT EXISTS ads(
  id SERIAL PRIMARY KEY,
  name TEXT,
  type VARCHAR(20),
  code TEXT
) `)
  /* ================= INDEXES ================= */

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_views_post ON views(post_id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);`);

  console.log("🔥 Production DB Ready (Income Platform Mode)");
};

module.exports = initTables;