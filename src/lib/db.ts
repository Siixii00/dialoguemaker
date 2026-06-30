import { createClient, Client, InStatement } from '@libsql/client';

let dbInstance: Client | null = null;

export function getDb(): Client {
  if (!dbInstance) {
    const tursoUrl = process.env.TURSO_DATABASE_URL;
    const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

    if (!tursoUrl || !tursoAuthToken) {
      throw new Error('Missing Turso environment variables. Please set TURSO_DATABASE_URL and TURSO_AUTH_TOKEN');
    }

    dbInstance = createClient({
      url: tursoUrl,
      authToken: tursoAuthToken,
    });
  }
  return dbInstance;
}

export async function initDatabase() {
  const database = getDb();
  
  await database.execute(`
    CREATE TABLE IF NOT EXISTS dialogues (
      id TEXT PRIMARY KEY,
      character_name TEXT NOT NULL,
      dialogue_text TEXT NOT NULL,
      character_image TEXT,
      background_image TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      page_title TEXT NOT NULL,
      page_subtitle TEXT,
      background_image TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS chapter_items (
      id TEXT PRIMARY KEY,
      chapter_id TEXT NOT NULL,
      chapter_num TEXT,
      chapter_title TEXT NOT NULL,
      chapter_desc TEXT,
      order_index INTEGER DEFAULT 0,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS admin_config (
      id TEXT PRIMARY KEY DEFAULT 'default',
      admin_email TEXT NOT NULL,
      google_client_id TEXT NOT NULL,
      require_2fa INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);
}

export const db = {
  execute: async (query: InStatement) => {
    return getDb().execute(query);
  }
};