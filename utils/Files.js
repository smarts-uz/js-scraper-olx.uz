import fs, { existsSync } from 'fs';
import path from 'path';
import { exec, execSync } from "child_process";
import dotenv from 'dotenv';
import { Dialogs } from './Dialogs.js';
import { access, copyFile, constants } from 'node:fs/promises';

export class Files {





  /**
   * Finds all directories that need to be checked for duplicates
   * @param {string} rootDir - The project root directory
   * @returns {string[]} - Array of paths to directories
   */
  static findRelevantDirectories(rootDir) {
    const dirs = [];

    // Check main directory and subdirectories
    const checkDirs = [rootDir, path.join(rootDir, '@ Weak'), path.join(rootDir, '@ Other')];

    for (const dir of checkDirs) {
      if (fs.existsSync(dir)) {
        dirs.push(dir);
      }
    }

    return dirs;
  }



  /**
   * Reads .url files from directory
   */
  static readUrlsFromDirectory(dirPath) {
    const urls = [];
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      if (path.extname(file).toLowerCase() === '.url') {
        const filePath = path.join(dirPath, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        const urlMatch = content.match(/URL=(.*)/i);
        if (urlMatch && urlMatch[1]) {
          urls.push({ url: urlMatch[1].trim(), filePath, fileName: file });
        }
      }
    }
    return urls;
  }

  /**
   * Reads profile directories from text file
   */
  static readProfilesFromFile(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Profile list file not found: ${filePath}`);
    }
    return fs.readFileSync(filePath, "utf-8")
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(l => l.length > 0);
  }


  /**
   * Checks if a URL already exists in any relevant directory
   * @param {string} url - The URL to check
   * @param {string} currentSaveDir - The current save directory to exclude from checking
   * @returns {boolean} - True if URL exists, false otherwise
   */
  static urlExistsInDirectories(url, currentSaveDir) {
    const directories = Files.findRelevantDirectories(currentSaveDir);
    // Check each directory
    for (const dir of directories) {
      // Skip the current save directory
      if (path.resolve(dir) === path.resolve(currentSaveDir)) continue;

      try {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            if (path.extname(file).toLowerCase() === '.url') {
              const filePath = path.join(dir, file);
              try {
                const content = fs.readFileSync(filePath, 'utf8');
                // Check for exact URL match
                if (content.includes(`URL=${url}`)) {
                  return true;
                }
              } catch (err) {
                console.warn(`⚠️  Could not read file: ${filePath}`);
              }
            }
          }
        }
      } catch (err) {
        console.warn(`⚠️  Could not access directory: ${dir}`);
      }
    }

    return false;
  }

  static findAllContractFiles(dir) {

    // if dir is file - get parent folder of file
    if (fs.lstatSync(dir).isFile()) {
      console.info('Given path is file:', dir);
      dir = path.dirname(dir);
    }

    // Folders to ignore
    const ignoredFolders = ["@ Bads", "ALL", "@ Dead", "App"];

    let results = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (ignoredFolders.includes(entry.name)) {
          console.log(`⚠️ Ignoring folder: ${entry.name}`);
          continue;
        }
        results = results.concat(this.findAllContractFiles(fullPath));
      } else if (entry.isFile() && entry.name === "ALL.contract") {
        results.push(fullPath);
      }
    }

    return results;
  }


  static initFolders(ymlFile) {

    globalThis.ymlFile = ymlFile;
    console.info(globalThis.ymlFile, 'ymlFile globalThis');

    // get parent folder of ymlpath
    globalThis.folderALL = path.dirname(globalThis.ymlFile);
    console.log(globalThis.folderALL, 'folderALL');


    // folderCompan
    globalThis.folderCompan = path.join(globalThis.folderALL, 'Compan');

    if (!fs.existsSync(globalThis.folderCompan))
      Dialogs.warningBox(`Compan folder not found: ${globalThis.folderCompan}`, 'Compan Folder not found');
    else
      console.log(`Compan folder found: ${globalThis.folderCompan}`);

    // folderCompan
    globalThis.folderDirector = path.join(globalThis.folderALL, 'Director');
    globalThis.folderActReco = path.join(globalThis.folderALL, 'ActReco');
    globalThis.folderRestAPI = path.join(globalThis.folderALL, 'RestAPI');
    this.mkdirIfNotExists(globalThis.folderRestAPI);
    globalThis.folderContract = path.join(globalThis.folderALL, 'Contract');
    globalThis.folderNotifiers = path.join(globalThis.folderALL, 'Notifiers');
    globalThis.folderPricings = path.join(globalThis.folderALL, 'Pricings');
    globalThis.folderTelegram = path.join(globalThis.folderALL, 'Telegram');
    globalThis.folderForNDS = path.join(globalThis.folderALL, 'ForNDS');

  }

  static isEmpty(value) {
    // Check for null or undefined
    if (value === null || value === undefined) return true;

    // Check for string
    if (typeof value === 'string' && value.trim() === '') return true;

    // Check for array
    if (Array.isArray(value) && value.length === 0) return true;

    // Check for object (excluding arrays, null)
    if (typeof value === 'object' && !Array.isArray(value)) {
      if (Object.keys(value).length === 0) return true;
    }

    // Check for Map, Set
    if (value instanceof Map || value instanceof Set) {
      if (value.size === 0) return true;
    }

    return false;
  }



  static backupFile(filePath, deletes = false) {
    const backupDir = path.join(path.dirname(filePath), '- Theory');
    this.mkdirIfNotExists(backupDir);

    const fileName = path.basename(filePath);
    // extract filename and extension from filepath
    const [fileNameWithoutExt, ext] = fileName.split('.');

    // append date and time to fileName YYYY-MM-DD HH-mm-ss format

    const dateTime = new Date().toISOString().split('.')[0].replace(/[:.]/g, '-').replace('T', ' ');
    const backupFileName = `${fileNameWithoutExt} ${dateTime}.${ext}`;
    console.log(`Backup file name: ${backupFileName}`);

    const backupFilePath = path.join(backupDir, backupFileName);

    fs.copyFileSync(filePath, backupFilePath);

    if (fs.existsSync(backupFilePath)) {
      console.log(`Backup created: ${backupFilePath}`);
      if (deletes) {
        fs.unlinkSync(filePath);
      }
      return backupFilePath;
    } else {
      console.error(`Error creating backup: ${backupFilePath}`);
      return null;
    }

  }

  static backupFolder(folderPath, deletes = false) {
    const backupDir = path.join(path.dirname(folderPath), '- Theory');
    this.mkdirIfNotExists(backupDir);

    const dateTime = new Date().toISOString().split('.')[0].replace(/[:.]/g, '-').replace('T', ' ');
    const backupFolderPath = path.join(backupDir, `${path.basename(folderPath)} ${dateTime}`);

    // Recursively copy folder contents
    this.copyFolderRecursiveSync(folderPath, backupFolderPath);

    if (fs.existsSync(backupFolderPath)) {
      console.log(`Backup created: ${backupFolderPath}`);
      if (deletes) {
        fs.rmSync(folderPath, { recursive: true });
      }
      return backupFolderPath;
    } else {
      console.error(`Error creating backup: ${backupFolderPath}`);
      return null;
    }

  }
  static async exists(path) {
    try {
      await fs.access(path);
      return true;   // file exists and is accessible
    } catch {
      return false;  // file does not exist or no permissions
    }
  }


  /**
   * Reads a text file and returns an array of non-empty trimmed lines.
   * @param {string} filePath - Path to the text file.
   * @returns {string[]} Array of lines.
   */
  static readLines(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    return content
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0);
  }




  // Function to attempt file copy with retries
  static copyFileWithRetry(source, destination, maxRetries = 1, delay = 1000) {

    if (!fs.existsSync(source)) {
      console.error(`Source file does not exist: ${source}`);
      return false;
    }

    console.info(`Copying file from: ${source} to: ${destination}`)

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Remove destination file if it exists and is locked
        if (fs.existsSync(destination)) {
          try {
            fs.unlinkSync(destination);
          } catch (unlinkErr) {
            console.warn(`⚠️ Could not remove existing file (attempt ${attempt}): ${unlinkErr.message}`);
          }
        }

        fs.copyFileSync(source, destination);
        console.log("✅ File duplicated successfully.");
        return true;
      } catch (err) {
        console.warn(`⚠️ Copy attempt ${attempt} failed: ${err.message}`);

        if (attempt === maxRetries) {
          console.error(`❌ Failed to copy file after ${maxRetries} attempts`);
          Dialogs.messageBoxAx(
            `Failed to copy Excel file. The file might be open in Excel or another application.\n\nError: ${err.message}`,
            "File Copy Error",
            16
          );
          process.exit(1);
        }

        // Wait before retry
        console.log(`Waiting ${delay}ms before retry...`);
        const start = Date.now();
        while (Date.now() - start < delay) {
          // Busy wait
        }
      }
    }
    return false;
  }



  static async safeCopy(src, dest) {
    try {
      await access(src, constants.R_OK);
      await copyFile(src, dest);
      console.log(`✅ Copied ${src} → ${dest}`);
    } catch (err) {
      console.error(`❌ Cannot copy: ${err.message}`);
    }
  }


  static copyFolderRecursiveSync(source, target) {
    // Check if source exists
    if (!fs.existsSync(source)) {
      console.warn(`Source does not exist: ${source}`);
      return;
    }

    const sourceStat = fs.lstatSync(source);

    if (sourceStat.isDirectory()) {
      // If source is a directory, create target directory if it doesn't exist
      if (!fs.existsSync(target)) {
        fs.mkdirSync(target, { recursive: true });
      }

      // Copy all contents of the directory
      const files = fs.readdirSync(source);
      files.forEach((file) => {
        const sourcePath = path.join(source, file);
        const targetPath = path.join(target, file);

        if (fs.lstatSync(sourcePath).isDirectory()) {
          this.copyFolderRecursiveSync(sourcePath, targetPath);
        } else {
          fs.copyFileSync(sourcePath, targetPath);
        }
      });
    } else if (sourceStat.isFile()) {
      // If source is a file, copy it directly
      // Ensure target directory exists
      const targetDir = path.dirname(target);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      fs.copyFileSync(source, target);
    }
  }




  static mkdirIfNotExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });

      if (fs.existsSync(dirPath)) {
        console.log(`Directory created: ${dirPath}`);
      }
    }
  }



  static getDateFromTXT(folderCompan) {
    const files = fs.readdirSync(folderCompan);
    let fileName = null;

    for (const file of files) {
      // if txt file name is meet for 29.03.2017 pattern


      if (file.match(/^\d{2}\.\d{2}\.\d{4}\.txt$/)) {
        fileName = file;
        // filename found log
        console.log(`File found INN: ${file}`);
        // remove txt ext
        fileName = fileName.replace('.txt', '');
        console.log(`File removed ext INN: ${fileName}`);

        // remove spaces
        fileName = fileName.replace(/\s/g, '');
        console.log(`File removed spaces INN: ${fileName}`);

        break;
      }
    }

    // if ComTIN is not null, throw error
    if (fileName === null)
      console.log(`TIN file not found: ${fileName}`);
    else {
      console.log(`DATE file found: ${fileName}`);
    }

    return fileName;
  }



  static getTINFromTXT(folderCompan) {
    const files = fs.readdirSync(folderCompan);
    let fileName = null;
    for (const file of files) {
      if ((/^\d{9}\.txt$/.test(file) || /^\d{3}\s\d{3}\s\d{3}\.txt$/.test(file))) {
        fileName = file;
        // filename found log
        console.log(`File found INN: ${file}`);
        // remove txt ext
        fileName = fileName.replace('.txt', '');
        console.log(`File removed ext INN: ${fileName}`);

        // remove spaces
        fileName = fileName.replace(/\s/g, '');
        console.log(`File removed spaces INN: ${fileName}`);

        break;
      }
    }

    // if ComTIN is not null, throw error
    if (fileName === null)
      Dialogs.warningBox(`TIN file not found: ${fileName}`, 'TIN File not found');
    else {
      console.log(`TIN file found: ${fileName}`);
    }

    return fileName;
  }


  static getBaseName(filePath, ext) {
    return path.basename(filePath, ext);
  }

  static getDirName(filePath) {
    return path.dirname(path.resolve(filePath));
  }

  static dotenv() {

    // Get parent path for current file
    let currentFilePath = process.argv[1];
    let currentDir = path.dirname(currentFilePath);
    console.log(currentDir, 'currentDir');

    // Append .env to current path
    dotenv.config({ path: path.join(currentDir, ".env") });

  }

  static currentDir() {
    const currentFilePath = process.argv[1];
    const currentDir = path.dirname(currentFilePath);
    console.log(currentDir, 'currentDir in Function');
    return currentDir;
  }


  static async writeJson(filePath, data) {

    const jsonData = JSON.stringify(data, null, 2);
    console.info("jsonData:", jsonData);

    // save using fs. dont use Files
    await fs.writeFile(filePath, jsonData, (err) => {
      if (err) {
        console.error("❌ Ошибка при записи файла:", err);
        return false
      } else {
        console.info("✅ JSON-файл успешно записан.");
        return true
      }
    });
  }

  static saveInfoToFile(folder, filename) {

    if (Files.isEmpty(filename))
      return null;

    this.mkdirIfNotExists(folder);

    filename = filename.replace(/[:?<>|\/\\]/g, ''); // remove incompatible with file system chars
    console.log(filename, 'filename in Function');

    const filePath = path.join(folder, `${filename}.app`);
    fs.writeFileSync(filePath, 'App', 'utf8');
    console.log(`Info saved to ${filePath}`);
    return filePath;
  }

  static openFile(file) {
    console.info("Opening file:", file);

    if (!existsSync(file)) {
      console.error("File not found:", file);
      return;
    }

    if (process.platform === 'win32') {
      exec(`start "" "${file}"`);
    } else if (process.platform === 'darwin') {
      exec(`open "${file}"`);
    } else {
      console.warn('Platformani qo\'llab-quvvatlanmaydi:', process.platform);
    }
  }

  static openFileQoder(file) {
    console.info("Opening file with openFileQoder:", file);

    if (process.platform === 'win32') {
      // open file using vscode
      exec(`qoder -r "${file}"`);
    } else {
      console.warn('Platformani qo\'llab-quvvatlanmaydi:', process.platform);
    }
  }
}
