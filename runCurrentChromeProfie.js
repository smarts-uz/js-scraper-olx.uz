import { ChromeRunner } from './ALL/ChromeRunner.js';
import path from 'path';
import {readFileSync } from 'fs';

const win = path.win32;

const projectDir = process.cwd();
const profileIndexFile = path.join(projectDir, 'profile.json');
const profileData = JSON.parse(readFileSync(profileIndexFile, 'utf8'));
const rawPath = profileData.profilePath;

const runner = new ChromeRunner();
runner.run(rawPath)
  .then(() => console.log(""))
  .catch(err => console.error("❌ Xatolik:", err.message));
