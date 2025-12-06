import { execSync } from 'child_process';
import TelegramBot from 'node-telegram-bot-api';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';
import fs from 'fs';
import bunyan from "bunyan";
import RotatingFileStream from 'bunyan-rotating-file-stream';


export class Logs {
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



    cleanPath(p) {
        return p.replace(/\\\\+/g, "\\").replace(/\\/g, "/");
    }
}
