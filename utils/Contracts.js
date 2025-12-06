import pkg from 'number-to-words-ru';
import path from "path";
import winax from "winax";
const { convert } = pkg;
import { Files } from "./Files.js";
import { Yamls } from "./Yamls.js";
import { existsSync } from 'fs';
import { Dialogs } from './Dialogs.js';

export class Contracts {

  static getNumberWordOnly(num) {

    if (!num) return "";
    if (num == undefined || num == null) return "";

    // replace in num: , to ""
    num = num.replace(/,/g, "");
    num = num.replace(/\./g, "");
    num = num.replace(/ /g, "");
    num = num.replace(/:/g, "");

    num = parseFloat(num);

    const full = convert(num, { currency: 'number' });
    const idx = full.indexOf('целых');
    if (idx !== -1) {
      return full.slice(0, idx).trim();
    }
    return full;
  }



  static getRussianMonthName(monthNumber) {

    if (!monthNumber) return "";

    monthNumber = parseInt(monthNumber);
    const date = new Date(2025, monthNumber - 1, 1); // oyni 0-index bilan ko'rsatish

    const monthName = new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(date);
    console.info(monthName, "monthName");

    return monthName;
  }

  /* ============================
     Helper: Get Company Initials
     ============================ */
  static getComNameInitials(name) {
    if (!name || typeof name !== "string") return "";
    let cleaned = Contracts.cleanCompanyName(name)
    return cleaned
      .split(/\s+/)
      .map(word => word[0] ? word[0].toUpperCase() : "")
      .join("");
  }

  static cleanCompanyName(name) {
    if (!name || typeof name !== "string") return "";
    let cleaned = name.replace(/[«»"']/g, "").trim();

    cleaned = cleaned.replace(/MCHJ|AK|YaTT/g, "").trim();
    console.info(cleaned, "cleanCompanyName")
    return cleaned;

  }



  /* ============================
     Function: Generate Contract Number
     ============================ */
  static contractNumFromFormat(data) {
    const prefix = process.env.ContractPrefix;
    const format = process.env.ContractFormat;

    const values = {
      ContractPrefix: prefix,
      Prefix: prefix,
      ComName: this.getComNameInitials(data.ComName),
      Day: data.Day,
      Month: data.Month,
      Year: data.Year
    };

    const replaceAll = format.replace(
      /\{(ContractPrefix|Prefix|ComName|Day|Month|Year)\}/g,
      (_, key) => values[key] || ""
    );
    console.log("Generated Contract Number:", replaceAll);

    return replaceAll;
  }



  /* ============================
     Function: Generate Contract Files (DOCX and PDF)
     ============================ */
  static makeContract(ymlFile) {
    
    const { TemplateWord } = process.env;

    const templatePath = path.resolve(TemplateWord);

    console.log("Using template", templatePath);

    if (!existsSync(templatePath)) {
      Dialogs.warningBox(`Template file not found: ${templatePath}`, "Error");
      return;
    }

    
    let data = Yamls.loadYamlWithDeps(ymlFile);


    data = Contracts.extractDate(data);
    
    const resolvedTemplate = path.resolve(templatePath);
    console.log("Resolved template:", resolvedTemplate);

    // Prepare paths
    const docBaseName = Files.getBaseName(resolvedTemplate, ".docx");

    const ymlFolder = Files.getDirName(ymlFile);
    const contractFolder = path.join(ymlFolder, "Contract");
    console.log("Contract folder:", contractFolder);

    Files.mkdirIfNotExists(contractFolder);
    if (!data.ContractNum) Dialogs.warningBox(`Contract number not found in YAML: ${ymlFile}`, "Error");

    const contractNumFolder = path.join(contractFolder, data.ContractNum);
    Files.mkdirIfNotExists(contractNumFolder);
    console.log("Contract number:", contractNumFolder);

    const area = data.Area;
    const outputCore = `${data.ContractNum}, ${area}-kv, ${data.MyCompany}, ${docBaseName}`;
    console.log("outputCore:", outputCore);
    // Output files
    const outputDocxPath = path.join(contractNumFolder, `${outputCore}.docx`);
    const outputPdfPath = path.join(contractNumFolder, `${outputCore}.pdf`);

    // Start Word application
    this.wordReplace(data, templatePath, outputDocxPath, outputPdfPath);

    return { outputDocxPath, outputPdfPath };
  }


  static extractDate(data) {
    const comDate = data.ComDate;

    if (!comDate) {
      console.warn("ComDate is not defined in YAML.");
      return;
    }

    // extract year, month and day from comDate from format 24.10.2025
    const [day, month, year] = comDate.split(".");

    data.Year = year;
    data.Month = month;
    data.Day = day;

    console.log("Year:", year);
    console.log("Month:", month);
    console.log("Day:", day);

    return data;
  }

  static wordReplace(data, templatePath, outputDocxPath, outputPdfPath) {
    const word = new winax.Object("Word.Application");
    word.Visible = false;

    // Open template
    const doc = word.Documents.Open(path.resolve(templatePath));

    // Prepare replacement
    const find = doc.Content.Find;
    find.ClearFormatting();

    // Collect placeholders
    const docContent = doc.Content.Text;
    const regex = /\[([A-Za-z0-9_]+)\]/g;
    let match;
    const placeholders = new Set();
    while ((match = regex.exec(docContent)) !== null) {
      placeholders.add(match[1]);
    }

    // Replace placeholders
    for (const placeholder of placeholders) {



      let replacementText = "";

      switch (true) {

        case (placeholder.endsWith("Text")): {

          const key = placeholder.replace(/Text$/, "");
          const value = data[key];

          if (key === "Month") {
            replacementText = this.getRussianMonthName(value);
          }
          else {
            replacementText = this.getNumberWordOnly(value);
          }

          break;
        }

        case (placeholder.endsWith("Phone")): {
          const keyPhone = placeholder.replace(/Phone$/, "");
          const valuePhone = data[keyPhone + "Phone"];
          replacementText = valuePhone
            ? String(valuePhone).replace(/^998/, "+998")
            : "";
          break;
        }
        default:
          replacementText = !Files.isEmpty(data[placeholder])
            ? data[placeholder]
            : "";
      }


      console.info(`Replace: ${placeholder} → ${replacementText}`);

      // Execute Word find/replace
      find.Text = `[${placeholder}]`;
      find.Replacement.ClearFormatting();
      find.Replacement.Text = replacementText;

      find.Execute(
        find.Text,
        false, false, false, false, false,
        true, 1, false,
        find.Replacement.Text,
        2 // wdReplaceAll
      );
    }

    const PDF_FORMAT_CODE = process.env.PDF_FORMAT_CODE;
    console.log("PDF_FORMAT_CODE:", PDF_FORMAT_CODE);

    // Save as DOCX and PDF
    doc.SaveAs(outputDocxPath);
    doc.SaveAs(outputPdfPath, Number(PDF_FORMAT_CODE));

    if (existsSync(outputDocxPath)) console.log('✅ Word yaratildi:', outputDocxPath);
    if (existsSync(outputPdfPath)) console.log('✅ PDF yaratildi:', outputPdfPath);

    // Close Word
    doc.Close(false);
    word.Quit();
  }
}



