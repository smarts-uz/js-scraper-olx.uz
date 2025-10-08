import { execSync } from 'child_process';
import TelegramBot from 'node-telegram-bot-api';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envpath = path.join(__dirname, '.env');

dotenv.config({ path: envpath });

console.log(process.cwd(), 'cwd');
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;

export class Utils {
    async showMessageBox(message, title = 'Error') {
        try {
            // Escape quotes
            const safeMsg = message.replace(/"/g, "'");
            execSync(`msg * "${title}: ${safeMsg}"`);
        } catch (err) {
            console.error('⚠️ Failed to show message box:', err.message);
        }
    }

    async sendTelegramMessage(message) {
        await bot.sendMessage(ADMIN_CHAT_ID, message);
    }
}
