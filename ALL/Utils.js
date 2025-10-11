import { execSync } from 'child_process';
import TelegramBot from 'node-telegram-bot-api';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import bunyan from "bunyan";



const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envpath = path.join(__dirname, '..', '.env');

dotenv.config({ path: envpath });

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
    findRawPathInTxtFiles(rawPath) {
        const folderPath = path.join(__dirname, "../CmdLine");
        console.log("folderPath:", folderPath);

        if (!fs.existsSync(folderPath)) {
            console.log("❌ Folder mavjud emas!");
            return null;
        }

        const files = fs.readdirSync(folderPath);

        const txtFiles = files.filter(file => file.endsWith(".txt"));
        // console.log("txt fayllar:", txtFiles);

        // 🔧 normalizePath yordamchi funksiyasi
        const normalizePath = (p) =>
            p.replace(/\\/g, "\\")    // barcha / → \ 
                .replace(/\\\\+/g, "\\") // ketma-ket \\ → \
                .toLowerCase();

        // Foydalanuvchidan kelgan pathni normalize qilamiz
        const normalizedRaw = normalizePath(rawPath);

        for (const file of txtFiles) {
            const filePath = path.join(folderPath, file);
            console.log(`Tekshirilmoqda: ${filePath}`);

            const content = fs.readFileSync(filePath, "utf8");

            // Fayl ichidagi matnni normalize qilamiz
            const normalizedContent = normalizePath(content);

            if (normalizedContent.includes(normalizedRaw)) {
                console.log(`✅ ${filePath} fayl ichida topildi!`);
                return filePath;
            }
        }

        console.error(`❌ ${rawPath} hech bir faylda topilmadi.`);
        return null;
    }

    cleanPath(p) {
        return p.replace(/\\\\+/g, "\\").replace(/\\/g, "/");
    }
    log() {
        // A custom stream that prints only the message to console
        const simpleConsoleStream = {
            write: (record) => {
                try {
                    const obj = JSON.parse(record);
                    console.log(`[${obj.level}] ${obj.msg}`);
                } catch {
                    console.log(record);
                }
            },
        };
        return bunyan.createLogger({
            name: "next-bunyan-test",
            streams: [
                // 1️⃣ Rotating file stream (saves to file)
                {
                    type: "rotating-file",
                    path: "./logs/app.log",
                    period: "1d", // rotate daily
                    count: 7,     // keep 7 backups
                    level: "info"
                },
                // 2️⃣ Console output (prints everything to terminal)
                {
                    stream: simpleConsoleStream,
                    level: "debug" // logs all levels to console
                }
            ],
        });
    }


}
