import { execSync } from 'child_process';
import TelegramBot from 'node-telegram-bot-api';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import bunyan from "bunyan";
import RotatingFileStream from 'bunyan-rotating-file-stream';



const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const envpath = path.join(__dirname, '..', '.env');

dotenv.config({ path: envpath });

const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: true });
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID;


export class Utils {
    constructor() {
        // Agar oldin yaratilgan bo‘lsa, o‘shani qaytar
        if (global.__utils_instance__) {
            return global.__utils_instance__;
        }

         // ✅ Logs papkasi parent folderda bo‘ladi
        const logsDir = path.join(__dirname, '..', 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
            console.log("✅ Logs directory created at:", logsDir);
        }

        // ✅ To‘liq absolute path ishlatyapmiz
        const logFilePattern = path.join(logsDir, '%Y-%m-%d.log');

        // Loger instansiyasini yaratamiz
        this.log = bunyan.createLogger({
            name: "next-bunyan-test",
            streams: [
                {
                    type: 'raw',
                    stream: new RotatingFileStream({
                        path: logFilePattern,
                        period: '1d',
                        totalFiles: 7,
                        rotateExisting: true,
                        threshold: '10m',
                        gzip: true
                    }),
                    level: 'info'
                },
                {
                    stream: {
                        write: (record) => {
                            try {
                                const obj = JSON.parse(record);
                                console.log(`${obj.msg}`);
                            } catch {
                                console.error(record);
                            }
                        }
                    },
                    level: "debug"
                }
            ]
        });
        // Instansiyani globalda saqlab qo‘y
        global.__utils_instance__ = this;
    }

    async showMessageBox(message, title = 'Error') {
        try {
            const safeMsg = message.replace(/"/g, "'");
            execSync(`msg * "${title}: ${safeMsg}"`);
        } catch (err) {
            this.log.error('⚠️ Failed to show message box:', err.message);
        }
    }

    async sendTelegramMessage(message) {
        await bot.sendMessage(ADMIN_CHAT_ID, message);
    }

    findRawPathInTxtFiles(rawPath) {
        const folderPath = path.join(__dirname, "../CmdLine");
        this.log.info("folderPath:", folderPath);

        if (!fs.existsSync(folderPath)) {
            this.log.info("❌ Folder mavjud emas!");
            return null;
        }

        const files = fs.readdirSync(folderPath);
        const txtFiles = files.filter(file => file.endsWith(".txt"));

        const normalizePath = (p) =>
            p.replace(/\\/g, "\\")
                .replace(/\\\\+/g, "\\")
                .toLowerCase();

        const normalizedRaw = normalizePath(rawPath);

        for (const file of txtFiles) {
            const filePath = path.join(folderPath, file);
            this.log.info(`Tekshirilmoqda: ${filePath}`);

            const content = fs.readFileSync(filePath, "utf8");
            const normalizedContent = normalizePath(content);

            if (normalizedContent.includes(normalizedRaw)) {
                this.log.info(`✅ ${filePath} fayl ichida topildi!`);
                return filePath;
            }
        }

        this.log.error(`❌ ${rawPath} hech bir faylda topilmadi.`);
        return null;
    }

    cleanPath(p) {
        return p.replace(/\\\\+/g, "\\").replace(/\\/g, "/");
    }
}
