import { ChromeRunner } from './ALL/ChromeRunner.js';
import path from 'path';
import {readFileSync } from 'fs';
import { Utils } from './ALL/Utils.js';

const logger = new Utils().log;

const win = path.win32;

const projectDir = process.cwd();
const profileIndexFile = path.join(projectDir, 'profile.json');
const profileData = JSON.parse(readFileSync(profileIndexFile, 'utf8'));
const rawPath = profileData.profilePath;

const runner = new ChromeRunner();
runner.run(rawPath,profileData.lang,profileData.agent)
  .then(() => logger.info(""))
  .catch(err => logger.error("❌ Xatolik:", err.message));
