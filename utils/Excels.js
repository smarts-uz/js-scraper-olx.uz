// utils.js
import fs, { existsSync } from 'fs';
import path from 'path';
import winax from 'winax';
import { execSync } from 'child_process';
import { Files } from './Files.js';
import { Yamls } from './Yamls.js';
import { Dialogs } from './Dialogs.js';
import { Dates } from './Dates.js';


export class Excels {
  constructor(parameters) {
    // Constructor left empty as all methods are static
  }

  // === START EXCEL ===
  static openExcel(filePath) {
    try {
      const excel = new winax.Object('Excel.Application');
      excel.Visible = false;
      const workbook = excel.Workbooks.Open(filePath);
      return { excel, workbook };
    } catch (error) {
      throw new Error(`Failed to open Excel file: ${error.message}`);
    }
  }



  // === SCAN SUBFOLDERS OR TXT FILES ===
  static scanSubFolder(folderPath) {


    // Check if folder exists and is a directory
    if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
      return []; // return empty array silently
    }

    return fs.readdirSync(folderPath)
      .map(f => path.join(folderPath, f))
      .filter(f => fs.statSync(f).isDirectory());
  }

  // === SCAN SUBFOLDERS OR TXT FILES ===
  static scanSubFilesTxt(folderPath) {


    // Check if folder exists and is a directory
    if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
      return []; // return empty array silently
    }

    return fs.readdirSync(folderPath)
      .filter(f => f.endsWith('.txt'))
      .map(f => path.join(folderPath, f));
  }

  static processPricing(yamlData) {
    const found = this.findColumn('Pricings');
    let row = found.Row;

    let dateApp, amountApp

    if (existsSync(globalThis.folderPricings)) {

      const items = this.scanSubFilesTxt(globalThis.folderPricings);

      // Sort dateFiles
      items.sort((a, b) =>
        path.basename(a).localeCompare(path.basename(b), undefined, { numeric: true, sensitivity: 'base' })
      );

      // Process date files
      items.forEach(filePath => {
        const fileName = path.basename(filePath, '.txt');
        const match = fileName.match(/^(\d{4}-\d{2}-\d{2})\s+([\d,]+)$/);
        if (!match) return;

        const date = match[1];
        dateApp = date
        let amount = match[2];
        // amount replace , and space
        amount = amount.replace(/,/g, '').replace(/\s/g, '');

        globalThis.excelSheet.Cells(row, found.Column).Value = date;
        globalThis.excelSheet.Cells(row, found.Column + 1).Value = amount;

        row++;
      });

      // Process date files
      items.forEach(filePath => {
        const fileName = path.basename(filePath, '.txt');
        const match = fileName.match(/^ALL\s+([\d,]+)$/);
        if (!match) return;

        amountApp = match[1];
        // amount replace , and space
        amountApp = amountApp.replace(/,/g, '').replace(/\s/g, '');
      })

    }

    // consoler log amountApp, dateapp
    console.info(`amountApp: ${amountApp}`);
    console.info(`dateApp: ${dateApp}`);

    let future

    if (yamlData.ComDateEndExcel) {
      future = yamlData.ComDateEndExcel
      console.info(`Future date from ComDateEndExcel: ${future}`);
    }
    else {
      future = yamlData.FutureDateExcel
      console.info(`Future date from ComDateEndExcel: ${future}`);
    }

    if (!amountApp)
      amountApp = yamlData.Price;

    console.info(`amountApp Last: ${amountApp}`);


    // Check if dateApp is defined

    if (dateApp) {
      console.info(`dateApp: ${dateApp}`);

      const lastDate = Dates.parseDMYExcel(dateApp);
      const futureDate = Dates.parseDMYExcel(future);

      if (lastDate < futureDate) {
        console.log(`lastDate < futureDate`);
        globalThis.excelSheet.Cells(row, found.Column).Value = future;
        globalThis.excelSheet.Cells(row, found.Column + 1).Value = amountApp;

      }

    } else {
      console.log(`dateApp not defined`);

      globalThis.excelSheet.Cells(row, found.Column).Value = future;
      globalThis.excelSheet.Cells(row, found.Column + 1).Value = amountApp;

    }

  }

  // === PROCESS FOLDERS AND WRITE DATA ===
  static processFolders(folder, found) {
    let row = found.Row;

    const folderPath = path.join(globalThis.folderALL, folder);
    const dateFiles = this.scanSubFolder(folderPath);

    // Sort dateFiles
    dateFiles.sort((a, b) =>
      path.basename(a).localeCompare(path.basename(b), undefined, { numeric: true, sensitivity: 'base' })
    );

    // Process date files
    dateFiles.forEach(filePath => {
      const fileName = path.basename(filePath);
      const match = fileName.match(/^(\d{4}-\d{2}-\d{2})\s+([\d,]+)$/);
      if (!match) return;

      const date = match[1];
      let amount = match[2];
      // amount replace , and space
      amount = amount.replace(/,/g, '').replace(/\s/g, '');

      globalThis.excelSheet.Cells(row, found.Column).Value = date;
      globalThis.excelSheet.Cells(row, found.Column + 1).Value = amount;

      row++;
    });




  }


  static replaceInSheet(search, replace) {
    let found = globalThis.excelSheet.Cells.Replace(
      search,          // What to find
      replace,                   // Replacement text
      2,                    // LookAt: 1=part, 2=whole
      2,                    // SearchOrder: 1=byRows, 2=byColumns
      false,                // MatchCase
      false,                // MatchByte
      false                 // SearchFormat
    );

    if (found) {
      console.log(`✅ Replaced  "${search}" with "${replace}" in Excel sheet "App"`);
    } else {
      console.warn(`⚠️ "${search}" not found in Excel sheet "App"`);
    }

    return found;
  }


  static findColumn(search) {
    console.log(`🔍 Searching for "${search}" in Excel...`);

    const found = globalThis.excelSheet.Cells.Find(search);

    if (found) {
      console.log(`✅ Found "${search}". Row: ${found.Row}, Column: ${found.Column}`);
      console.log(`🔍 Columns: Column: ${found.Column}, Row: ${found.Row}`);
    } else {
      console.warn(`⚠️ "${search}" not found in Excel sheet "App"`);

    }

    return found;

  }





  static fileOpen(fileName) {

    if (!fs.existsSync(fileName)) {
      Dialogs.warningBox(`File "${fileName}" not found.`, 'File Error');
    }

    // 3. Open Excel
    globalThis.excelApp = new winax.Object('Excel.Application');
    globalThis.excelApp.Visible = false;
    globalThis.excelApp.DisplayAlerts = false;

    globalThis.excelPid = globalThis.excelApp.ExecuteExcel4Macro('CALL("kernel32","GetCurrentProcessId","J")');
    console.log('Excel PID:', globalThis.excelPid);

    try {
      globalThis.excelWorkbook = globalThis.excelApp.Workbooks.Open(fileName);
      globalThis.excelSheet = globalThis.excelWorkbook.Sheets('App');
    } catch (err) {

      if (globalThis.excelWorkbook) globalThis.excelWorkbook.Close(false);
      globalThis.excelApp.Quit();
      Dialogs.warningBox('Excel open failed for column detection.', 'Excel Error', 16);
    }

  }

  static fileSave() {

    globalThis.excelApp.CalculateFull();

    // Save and close
    try {
      globalThis.excelWorkbook.Save();
    } catch (err) {
      console.error('❌ Failed to save workbook:', err.message);
      Dialogs.warningBox(err.message, 'Excel Error', 16);
    }
  }


  static fileClose() {

    this.fileSave();

    // ✅ Close workbook (without saving)
    globalThis.excelWorkbook.Close(true);

    // ✅ Quit Excel
    globalThis.excelApp.Quit();

    // ✅ Release COM objects to prevent Excel.exe from staying in memory
    if (globalThis.excelWorkbook && globalThis.excelWorkbook.ReleaseComObject) globalThis.excelWorkbook.ReleaseComObject();
    if (globalThis.excelSheet && globalThis.excelSheet.ReleaseComObject) globalThis.excelSheet.ReleaseComObject();
    if (globalThis.excelApp && globalThis.excelApp.ReleaseComObject) globalThis.excelApp.ReleaseComObject();

    // ✅ Or just use `winax.release()` (if you have a lot of COM refs)
    winax.release(globalThis.excelApp);

    // kill excel process by pid
    try {
      process.kill(globalThis.excelPid);
      console.log(`Excel process with PID ${globalThis.excelPid} killed.`);
    } catch (err) {
      console.warn(`Failed to kill Excel PID ${globalThis.excelPid}:`, err.message);
    }
  }

  static generate(ymlFile) {

    Files.initFolders(ymlFile)

    Files.mkdirIfNotExists(globalThis.folderActReco);

    // Load YAML data
    let yamlData = Yamls.loadYamlWithDeps(ymlFile);
    console.log(yamlData, 'yamlData');

    const { TemplateExcel } = process.env;

    const PrepayMonth = Yamls.getPrepayMonth(yamlData);

    const templateFileName = Files.getBaseName(TemplateExcel, '.xlsx');
    const dateString = `${new Intl.DateTimeFormat('en-CA').format(new Date())}`;

    const actRecoFile = `ActReco, ${yamlData.ComName}, ${templateFileName}, ${dateString}, PrePay-${PrepayMonth}.xlsx`;
    console.log(`New file name: ${actRecoFile}`);

    const newFilePath = path.join(globalThis.folderActReco, actRecoFile);
    console.log(`New file path: ${newFilePath}`);

    // Attempt to copy the file
    Files.copyFileWithRetry(TemplateExcel, newFilePath);

    // 1. Read the list from Excel.txt
    const cellsFilePath = path.join(Files.currentDir(), 'Excel.txt');
    if (!fs.existsSync(cellsFilePath))
      Dialogs.warningBox('Excel.txt not found', 'Error');


    // Example usage:
    const cellNames = Files.readLines(cellsFilePath);
    console.log('Cell names:', cellNames.join(', '), 'cellNames');

    this.fileOpen(newFilePath);

    this.processPricing(yamlData);

    for (const folderName of cellNames) {
      const found = this.findColumn(folderName);

      const folderPath = path.join(globalThis.folderALL, folderName)
      if (fs.existsSync(folderPath)) {
        this.processFolders(folderName, found);

      } else {
        console.warn(`🚫 Folder "${folderPath}" not found`);
        this.replaceInSheet(`{${folderName}}`, '');
      }

    }



    // Replace {KEY} placeholders
    for (const key of Object.keys(yamlData)) {

      const value = yamlData[key];

      const placeholder = `{${key}}`;

      this.replaceInSheet(placeholder, value);
    }

    this.fileClose();

  }
}