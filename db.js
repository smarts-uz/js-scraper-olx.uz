// db.js
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { categories } from "./parseCat.js";

async function initializeCategories() {
  const db = await open({
    filename: "./categories.db", // файл базы данных
    driver: sqlite3.Database,
  });

  // 1) Создать таблицу, если её нет
  await db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      link TEXT NOT NULL UNIQUE
    )
  `);

  // 2) Вставляем категории (дубликаты по link игнорируются)
  const insertQuery = `
    INSERT OR IGNORE INTO categories (name, link)
    VALUES (?, ?)
  `;

  for (const c of categories) {
    if (!c.link || c.link.trim() === "") continue;
    try {
      await db.run(insertQuery, [c.name, c.link]);
    } catch (err) {
      console.error("Ошибка вставки категории:", c, err);
    }
  }

  console.log(
    "Инициализация категорий завершена. Всего категорий для вставки:",
    categories.length
  );

  await db.close();
}

try {
  await initializeCategories();
} catch (err) {
  console.error("Ошибка initializeCategories:", err);
}
