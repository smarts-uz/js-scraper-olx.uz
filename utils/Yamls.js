import { exec } from "child_process";
import fs from "fs";
import { existsSync } from "fs";
import dayjs from "dayjs";

import yaml from "js-yaml";
import path from "path";
import { Files } from "./Files.js";
import { Contracts } from "./Contracts.js";
import { Didox } from "./didox.js";
import { MySoliq } from "./MySoliq.js";
import { Dates } from "./Dates.js";
import { Dialogs } from "./Dialogs.js";


export class Yamls {

    // Read text file and find text line which contains the given text
    static findTextLine(filePath, text) {
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const lines = fileContent.split('\n');

        for (const line of lines) {
            if (line.includes(text)) {
                return line;
            }
        }

        return null;
    }

    // Replace found line with new text
    static replaceTextLine(filePath, key, value) {

        if (Files.isEmpty(value)) {
            console.log('null value', key, value);
            value = ''
        }

        const fileContent = fs.readFileSync(filePath, 'utf8');
        const lines = fileContent.split('\n');
        let foundLine = null;

        for (let i = 0; i < lines.length; i++) {

            // find line using regex from search from start of string
            const regex = new RegExp(`^${key}:.*`);

            if (regex.test(lines[i])) {
                console.info('Found line:', lines[i], 'Index:', i);

                if (typeof value === "string" && (value.includes('{') || value.includes('}'))) {
                    lines[i] = key + ': "' + value + '"';
                } else {
                    lines[i] = key + ': ' + value;
                }

                foundLine = lines[i];
            }
        }

        if (!foundLine) {
            console.warn(`Line with key "${key}" not found in file ${filePath}.`);
            return;
        }

        fs.writeFileSync(filePath, lines.join('\n'));

        console.log(`File ${filePath} has been updated.`, value);
    }

    static loadYamlWithDeps(ymlFile) {

        console.log("Using ymlFile", ymlFile);
        let data = Yamls.loadAndParseYaml(ymlFile);
        console.log(data, 'data Yaml');


        const whoAmIYaml = path.join(Files.currentDir(), 'bank', data.WhoAmI + ".yaml")
        console.info("Using whoAmIYaml", whoAmIYaml);

        if (!existsSync(whoAmIYaml)) Dialogs.warningBox(whoAmIYaml, "whoAmIYaml file not found. .");

        let whoAmIYamlData = Yamls.loadAndParseYaml(whoAmIYaml);
        console.log(whoAmIYamlData, 'whoAmIYaml Yaml data');

        // merge arrays whoAmIYamlData and data
        data = { ...whoAmIYamlData, ...data };


        const priceYaml = path.join(Files.currentDir(), 'cost', data.Tariff + ".yaml")
        console.info("Using priceYaml", priceYaml);

        if (!existsSync(priceYaml)) Dialogs.warningBox(priceYaml, "priceYaml file not found. .");

        let priceYamlData = Yamls.loadAndParseYaml(priceYaml);
        console.log(priceYamlData, 'priceYamlData Yaml data');

        // merge arrays priceYamlData and data
        data = { ...priceYamlData, ...data };
        console.info("Merged data with priceYamlData:", data);


        return data;
    }


    // Load and parse YAML file with custom preprocessing
    static loadAndParseYaml(ymlFile) {
        const yamlOptions = {
            schema: yaml.JSON_SCHEMA,
            onWarning: (e) => { console.warn('YAML ogohlantirishi:', e); }
        };

        const ymlRaw = fs.readFileSync(ymlFile, 'utf8');

        const ymlPatched = ymlRaw.split('\n').map(line => {
            if (!line.includes(':') || line.trim().startsWith('#')) return line;

            const idx = line.indexOf(':');
            const key = line.slice(0, idx);
            let value = line.slice(idx + 1).trim();

            if (
                (value.startsWith('"') && value.endsWith('"')) ||
                (value.startsWith("'") && value.endsWith("'")) ||
                value === 'null' || value === 'true' || value === 'false'
            ) {
                return line;
            }

            if (value === '' || value.startsWith('#')) {
                return line;
            }

            if (/^\d{1,}$/.test(value)) {
                return `${key}: "${value}"`;
            }

            if (/[",]/.test(value)) {
                // Escape internal double quotes
                const safeValue = value.replace(/"/g, '\\"');
                return `${key}: "${safeValue}"`;
            }

            return line;
        }).join('\n');

        const data = yaml.load(ymlPatched, yamlOptions);
        // console.log(data);

        // iterate data and trim all values into new array
        const trimmedData = Object.entries(data).reduce((acc, [key, value]) => {
            acc[key] = typeof value === 'string' ? value.trim() : value;
            return acc;
        }, {});

        return trimmedData;
    }


    static extractFirstNumber(str) {
        const match = str.match(/^(\d+)/);
        return match ? match[1] : null;
    }



    static async update(ymlFile) {
        const { TemplateYaml } = process.env;

        const template = path.resolve(TemplateYaml);

        console.log("Using template", template);

        if (!Files.exists(template)) {
            Dialogs.warningBox(`Template file not found: ${template}`, "Error");
            return;
        }

        Files.initFolders(ymlFile)

        let oldYaml = Files.backupFile(ymlFile, true);
        if (!oldYaml) return;

        let oldRest = Files.backupFolder(globalThis.folderRestAPI, true);
        if (!oldRest) return;

        let yamlData = Yamls.loadYamlWithDeps(oldYaml);
        console.log(yamlData, 'yamlData');

        // copy template file intop ymlFile only file
        await fs.promises.copyFile(template, ymlFile);

        if (existsSync(ymlFile))
            await this.fillYamlWithInfo(ymlFile, yamlData, false);
        else
            Dialogs.warningBox(`ymlFile file not found: ${ymlFile}`, "Error");

    }

    static async fillYamlWithInfo(ymlFile, yamlData = null, backup = true) {

        Files.initFolders(ymlFile)

        if (backup) Files.backupFile(ymlFile);

        if (!yamlData) yamlData = Yamls.loadYamlWithDeps(ymlFile);
        console.log(yamlData, 'yamlData');


        let ComTIN = Files.getTINFromTXT(globalThis.folderCompan);
        console.info("ComTIN:", ComTIN);

        let companyInfo = await Didox.infoByTinPinfl(ComTIN);
        console.log(companyInfo, 'companyInfo');


        let ceo = await Didox.infoByTinPinfl(companyInfo.directorPinfl);
        console.log(ceo, 'ceo');

        const person = path.join(globalThis.folderDirector, ceo.name);
        Files.saveInfoToFile(person, '#Director');

        companyInfo.ceo = ceo

        if (Files.isEmpty(yamlData.SurPINFL) || yamlData.SurPINFL === companyInfo.directorPinfl) {
            console.log("SurPINFL is empty, using companyInfo.directorPinfl", companyInfo.directorPinfl);
            yamlData.SurPINFL = companyInfo.directorPinfl
            companyInfo.surety = ceo
        } else {
            console.log("SurPINFL is not empty, using yamlData.SurPINFL", yamlData.SurPINFL);
            let surety = await Didox.infoByTinPinfl(yamlData.SurPINFL)
            console.log(surety, 'surety');
            companyInfo.surety = surety
        }

        if (!Files.isEmpty(yamlData.RepPINFL)) {
            let reps = await Didox.infoByTinPinfl(yamlData.RepPINFL)
            console.log(reps, 'surety');
            companyInfo.reps = reps
        }

        let vatInfo = await MySoliq.getVatInfo(ComTIN);
        console.log(vatInfo, 'vatInfo');
        companyInfo.vat = vatInfo

        let infoSoliq = await MySoliq.getCompanyInfo(ComTIN);
        console.log(infoSoliq, 'infoSoliq');
        companyInfo.soliq = infoSoliq


        Files.saveInfoToFile(globalThis.folderALL, `#${yamlData.MyCompany}`)
        Files.saveInfoToFile(globalThis.folderALL, `#${yamlData.Area}-kv`)

        fs.writeFileSync(path.join(globalThis.folderRestAPI, `ALL.json`), JSON.stringify(companyInfo, null, 2));
        // fs.writeFileSync(path.join(globalThis.folderRestAPI, `/ALL.json`), JSON.stringify(yamlData, null, 2));

        Yamls.replaceYaml(globalThis.ymlFile, yamlData, companyInfo);
    }


    static getPrepayMonth(yamlData) {
        let prepay

        if (Files.isEmpty(yamlData.PrepayMonth)) {
            const { PrepayMonth } = process.env
            prepay = PrepayMonth
            console.log(`PrepayMonth from Yaml: ${prepay}`);
        }
        else {
            prepay = yamlData.PrepayMonth
            console.log(`PrepayMonth from ENV: ${prepay}`);
        }

        return prepay;

    }

    static replaceYaml(ymlFile, yamlData, companyInfo) {
        console.log(ymlFile, 'ymlFile');

        if (!yamlData || !companyInfo)
            return Dialogs.warningBox('yamlData or companyInfo is not defined!');

        console.log(yamlData, 'yamlData');
        console.log(companyInfo, 'companyInfo');

        if (Files.isEmpty(yamlData.ComDate)) {
            let comDateFromTxt = Files.getDateFromTXT(globalThis.folderCompan)
            if (comDateFromTxt) {
                yamlData.ComDate = comDateFromTxt
            } else {
                yamlData.ComDate = companyInfo.regDate
            }
        } else {
            Files.saveInfoToFile(globalThis.folderCompan, yamlData.ComDate)
        }

        // if ymlFileparh contains @ Weak folder - yamldata.ComCategory = Weak
        switch (true) {
            case ymlFile.includes("@ Weak"):
                yamlData.ComCategory = "Weak";
                break;

            case ymlFile.includes("@ Other"):
                yamlData.ComCategory = "Other";
                break;

            case ymlFile.includes("@ Bads"):
                yamlData.ComCategory = "Other";
                break;

            case ymlFile.includes("@ Dead"):
                yamlData.ComCategory = "Dead";
                break;

            default:
                yamlData.ComCategory = "ALL";
                break;
        }

        yamlData.ComINN = companyInfo.tin
        Files.saveInfoToFile(globalThis.folderCompan, `${yamlData.ComINN}`)

        yamlData.ComName = Contracts.cleanCompanyName(companyInfo.shortName)

        yamlData.ComNameLong = companyInfo.name
        yamlData.ComNameShort = companyInfo.shortName

        yamlData = Contracts.extractDate(yamlData);

        yamlData.ComDateExcel = Dates.didoxToExcel(yamlData.ComDate);
        yamlData.ComDateEndExcel = Dates.didoxToExcel(yamlData.ComDateEnd);

        const PrepayMonth = Yamls.getPrepayMonth(yamlData);

        yamlData.FutureDateExcel = Dates.futureDateByMonth(PrepayMonth, false)
        console.log(yamlData.FutureDateExcel, 'yamlData.FutureDateExcel');

        yamlData.FutureDateAppExcel = Dates.getMinusOneDay(yamlData.FutureDateExcel)
        console.log(yamlData.FutureDateAppExcel, 'yamlData.FutureDateAppExcel');

        if (!yamlData.ContractNumber)
            yamlData.ContractNum = Contracts.contractNumFromFormat(yamlData);
        else
            yamlData.ContractNum = yamlData.ContractNumber;

        Files.saveInfoToFile(globalThis.folderCompan, yamlData.ContractNum)



        yamlData.ComAddress = companyInfo.address
        yamlData.IsAnorzor = companyInfo.IsAnorzor;

        yamlData.ComOKED = companyInfo.oked
        yamlData.ComOKEDName = companyInfo?.soliq?.company?.okedDetail.name_uz_latn ?? ''
        yamlData.ComMFO = companyInfo.bankCode
        yamlData.ComRS = companyInfo.account

        yamlData.ComBankCode = companyInfo.bankCode
        const bank = Didox.bankByCode(companyInfo.bankCode);
        yamlData.ComBank = bank.name

        yamlData.ComNs10Code = companyInfo.ns10Code
        const region = Didox.regionsByCode(companyInfo.ns10Code)
        yamlData.ComNs10Name = region.name;

        yamlData.ComNs11Code = companyInfo.ns11Code
        const district = Didox.districtsByCode(companyInfo.ns10Code, companyInfo.ns11Code);
        yamlData.ComNs11Name = district.name;

        yamlData.DirName = companyInfo.director

        if (!Files.isEmpty(yamlData.DirPINFL) && yamlData.DirPINFL !== companyInfo.directorPinfl) {
            Files.saveInfoToFile(globalThis.folderALL, `#CEO`)
            console.warn(`DirPINFL changed to: ${yamlData.DirPINFL}`)
            Dialogs.messageBoxAx(`DirPINFL changed to: ${yamlData.DirPINFL}`, yamlData.ComNameShort, 64)
        }

        yamlData.DirPINFL = companyInfo.directorPinfl
        yamlData.DirTIN = companyInfo.directorTin

        yamlData.AccName = companyInfo.accountant

        yamlData.SurName = companyInfo.surety?.fullName ?? ''
        yamlData.SurTIN = companyInfo.surety?.tin ?? ''
        yamlData.SurAddress = companyInfo.surety?.address ?? ''
        yamlData.SurNs10Code = companyInfo.surety?.ns10Code ?? ''
        yamlData.SurNs11Code = companyInfo.surety?.ns11Code ?? ''

        if (!Files.isEmpty(yamlData.RepPINFL)) {
            yamlData.RepName = companyInfo.reps?.fullName ?? ''
            yamlData.RepTIN = companyInfo.reps?.tin ?? ''
            yamlData.RepAddress = companyInfo.reps?.address ?? ''
            yamlData.RepNs10Code = companyInfo.reps?.ns10Code ?? ''
            yamlData.RepNs11Code = companyInfo.reps?.ns11Code ?? ''
        }

        yamlData.ComNa1Code = companyInfo.na1Code
        yamlData.ComNa1Name = companyInfo.soliq?.company.businessStructureDetail.name_uz_latn ?? ''

        if (!Files.isEmpty(yamlData.ComNa1Name)) {
            yamlData.ComNa1NameShort = yamlData.ComNa1Name.split(' ').map(word => word.charAt(0)).join('')
                .toUpperCase()
        }

        yamlData.ComStatusCode = companyInfo.statusCode
        yamlData.ComStatusName = companyInfo.soliq?.company.statusDetail.name_uz_latn ?? ''
        yamlData.ComStatusGroup = companyInfo.soliq?.company.statusDetail.group ?? ''

        yamlData.ComStatusType = companyInfo.soliq?.company.statusType ?? ''
        yamlData.ComIsScammer = companyInfo.soliq.IsScammer ?? ''

        yamlData.ComOpf = companyInfo.soliq?.company.opf ?? ''
        yamlData.ComKfs = companyInfo.soliq?.company.kfs ?? ''
        yamlData.ComSoato = companyInfo.soliq?.company.soato ?? ''
        yamlData.ComSoogu = companyInfo.soliq?.company.soogu ?? ''
        yamlData.ComSooguRegistrator = companyInfo.soliq?.company.sooguRegistrator ?? ''

        yamlData.ComRegDate = companyInfo.soliq?.company.registrationDate ?? ''
        yamlData.ComRegNumber = companyInfo.soliq?.company.registrationNumber ?? ''

        yamlData.ComReRegDate = companyInfo.soliq?.company.reregistrationDate ?? ''

        yamlData.ComLiquidationDate = companyInfo.soliq?.company.liquidationDate ?? ''
        yamlData.ComLiquidationReason = companyInfo.soliq?.company.liquidationReason ?? ''

        yamlData.ComTaxMode = companyInfo.soliq?.company.taxMode ?? ''
        yamlData.ComTaxpayerType = companyInfo.soliq?.company.taxpayerType ?? ''
        yamlData.ComBusinessType = companyInfo.soliq?.company.businessType ?? ''

        // replace number with comma
        let fund = Number(companyInfo.soliq?.company.businessFund ?? 0)
        yamlData.ComBusinessFund = fund.toLocaleString("en-US")

        yamlData.ComSectorCode = companyInfo.soliq?.companyBillingAddress.sectorCode ?? ''
        yamlData.ComVillageCode = companyInfo.soliq?.company.villageCode ?? ''
        yamlData.ComVillageName = companyInfo.soliq?.company.villageName ?? ''

        // ###########################

        yamlData.ComVATRegCode = companyInfo.VATRegCode
        yamlData.ComVATRegStatus = companyInfo.VATRegStatus

        yamlData.ComVATCompanyName = companyInfo.vat?.companyName ?? ''



        yamlData.ComVATCompanyName = companyInfo.vat?.companyName ?? ''
        yamlData.ComVATDirectorName = companyInfo.vat?.directorFioLatn ?? ''

        yamlData.ComVATAddress = companyInfo.vat?.address ?? ''
        yamlData.ComVATDateReg = companyInfo.vat?.dateReg ?? ''
        yamlData.ComVATDateFrom = companyInfo.vat?.dateFrom ?? ''

        yamlData.ComVATStateId = companyInfo.vat?.stateId ?? ''
        yamlData.ComVATStateNameLat = companyInfo?.vat?.stateNameLat ?? '';


        yamlData.ComVATPkey = companyInfo?.vat?.pkey ?? '';
        yamlData.ComVATDateSys = companyInfo?.vat?.dateSys ?? '';

        yamlData.ComVATUpdatedAt = companyInfo?.vat?.updatedAt ?? '';
        yamlData.ComVATStatementId = companyInfo?.vat?.statementId ?? '';


        const ComDate = Dates.parseDMY(yamlData.ComDate);
        const ComVATDateReg = Dates.parseDMY(yamlData.ComVATDateReg);

        // if ComDate is greater than ComVATDateReg 
        if (companyInfo.VATRegCode) {
            if (ComDate < ComVATDateReg) {
                yamlData.ComVATFromUs = 'Да'
                Files.saveInfoToFile(globalThis.folderALL, '#VAT')
            } else {
                yamlData.ComVATFromUs = 'Нет'
            }
        } else {
            yamlData.ComVATFromUs = ''
        }

        // iterate yamldata and write via reoplacetextline func
        for (const [key, value] of Object.entries(yamlData)) {
            this.replaceTextLine(ymlFile, key, value);
        }


    }



}
