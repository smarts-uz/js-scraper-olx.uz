import TelegramBot from 'node-telegram-bot-api';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Get current directory in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Append .env to current path
const envpath = path.join(__dirname, ".env");

// === Load environment variables ===
dotenv.config({ path: envpath });

console.log(process.cwd(), "cwd");
// === Telegram botni sozlash ===
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID; // faqat sizga xabar yuboradi


export const sendTelegramMessage = async (message) => {
    await bot.sendMessage(ADMIN_CHAT_ID, message);
}