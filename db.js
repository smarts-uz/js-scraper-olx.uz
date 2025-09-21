// db.js
import { Client } from 'pg';
import { categories } from './getCategories.js';

// Настройки подключения — можно переопределить через env vars
const client = new Client({
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT ? Number(process.env.PGPORT) : 5432,
  database: process.env.PGDATABASE || 'olx-parser',
});

await client.connect();

async function initializeCategories() {
  // 1) Создать таблицу, если её нет (минимальная схема)
  await client.query(`
    CREATE TABLE IF NOT EXISTS categories (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL
    );
  `);

  // 2) Добавить колонку link, если её нет
  await client.query(`
    ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS link VARCHAR(500);
  `);

  // 3) Удаляем дубликаты по link (оставляем по одному id для каждого link),
  //    только для непустых ссылок (чтобы можно было создать уникальный индекс).
  await client.query(`
    DELETE FROM categories
    WHERE id NOT IN (
      SELECT MIN(id) FROM categories WHERE link IS NOT NULL AND link <> '' GROUP BY link
    ) AND link IS NOT NULL AND link <> '';
  `);

  // 4) Создаём уникальный индекс по link (чтобы ON CONFLICT работал).
  //    Индекс создаётся только для непустых значений link.
//   await client.query(`
//     CREATE UNIQUE INDEX IF NOT EXISTS categories_link_idx ON categories (link) WHERE link <> '';
//   `);

  // 5) Вставляем / обновляем категории
  const insertQuery = `
    INSERT INTO categories (name, link)
    VALUES ($1, $2)
    RETURNING id;
  `;

  for (const c of categories) {
    // Пропускаем записи без ссылки (чтобы не ломать уникальность пустых строк)
    if (!c.link || c.link.trim() === '') {
      // Если хочется, можно вставлять и такие записи, но лучше пропустить или нормализовать.
      continue;
    }

    try {
      const res = await client.query(insertQuery, [c.name, c.link]);
      // console.log('upserted:', res.rows[0]?.id);
    } catch (err) {
      console.error('Ошибка вставки категории', c, err);
    }
  }

  console.log('Инициализация категорий завершена. Всего категорий для вставки:', categories.length);
}

try {
  await initializeCategories();
} catch (err) {
  console.error('Ошибка initializeCategories:', err);
} finally {
  await client.end();
  console.log('Подключение к БД закрыто.');
}
