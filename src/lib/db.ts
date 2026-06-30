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
    CREATE TABLE IF NOT EXISTS dialogue_sequences (
      id TEXT PRIMARY KEY,
      chapter_item_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (chapter_item_id) REFERENCES chapter_items(id) ON DELETE CASCADE
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS sequence_items (
      id TEXT PRIMARY KEY,
      sequence_id TEXT NOT NULL,
      item_type TEXT NOT NULL,
      content TEXT NOT NULL,
      duration INTEGER DEFAULT 3000,
      display_order INTEGER DEFAULT 0,
      character_name TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (sequence_id) REFERENCES dialogue_sequences(id) ON DELETE CASCADE
    )
  `);

  await database.execute(`
    CREATE TABLE IF NOT EXISTS admin_config (
      id TEXT PRIMARY KEY DEFAULT 'default',
      admin_email TEXT NOT NULL,
      google_client_id TEXT NOT NULL,
      two_factor_secret TEXT,
      two_factor_enabled INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  const existingConfig = await database.execute({
    sql: "SELECT * FROM admin_config WHERE id = 'default'",
  });

  if (existingConfig.rows.length === 0) {
    await database.execute({
      sql: `INSERT INTO admin_config (id, admin_email, google_client_id) VALUES ('default', ?, ?)`,
      args: ["yaninlin@gmail.com", "807013160344-ircr1f9gmb9gv7617ilc7asfecv737d5.apps.googleusercontent.com"],
    });
  }
}

export const db = {
  execute: async (query: InStatement) => {
    return getDb().execute(query);
  }
};