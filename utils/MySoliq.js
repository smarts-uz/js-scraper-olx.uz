// add functikon infoByTinPinfl

import fs from "fs";
import path from "path";
import { Files } from './Files.js';
import { Contracts } from './Contracts.js';
import { Dialogs } from "./Dialogs.js";

export class MySoliq {

    static async getVatInfo(tin) {

        const file = path.join(globalThis.folderRestAPI, 'INN VAT ' + tin + '.json');

        let returns;

        if (fs.existsSync(file)) {
            console.log(`getVatInfo already exists in ${file}`);
            returns = JSON.parse(fs.readFileSync(file, 'utf8'));
        } else {

            const myHeaders = new Headers();

            const { My3Bearer } = process.env;

            myHeaders.append("referer", "https://my3.soliq.uz/vat-payer-registration/vat-payers");
            myHeaders.append("user-agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36");

            myHeaders.append("Authorization", `Bearer ${My3Bearer}`);

            const requestOptions = {
                method: "GET",
                headers: myHeaders,
                redirect: "follow"
            };

            try {

                console.warn(`Fetching getVatInfo for ${tin}`);

                const response = await fetch(`https://my3.soliq.uz/api/nds-api/api/certificate/grid?search=${tin}&page=1`, requestOptions);

                if (response.ok) {
                    const result = await response.json();

                    returns = result.data;
                    fs.writeFileSync(file, JSON.stringify(returns, null, 2));
                    console.log(`Info saved to ${file}`);

                } else {
                    returns = null;
                    console.error(`Error getVatInfo for ${tin}: ${response.status}, ${response.statusText}`);
                    Dialogs.messageBoxAx(`Error getVatInfo for ${tin}: ${response.status}, ${response.statusText}`, 'Error');
                }


            } catch (error) {
                console.error(`Error getVatInfo for ${tin}`, error);
                Dialogs.messageBoxAx(`Error getVatInfo for ${tin}`, 'Error');
                returns = null
            }


        }

        console.log(returns, 'returns getVatInfo');

        if (returns) {

            returns = returns[0] ?? null
            console.log(returns, 'returns IN getVatInfo');
            if (returns) {

                Files.saveInfoToFile(globalThis.folderForNDS, Contracts.cleanCompanyName(returns.companyName));
                Files.saveInfoToFile(globalThis.folderForNDS, returns.address);
                Files.saveInfoToFile(globalThis.folderForNDS, String(returns.id));
                Files.saveInfoToFile(globalThis.folderForNDS, returns.stateNameLat);
                Files.saveInfoToFile(globalThis.folderForNDS, returns.directorFioUz);
                Files.saveInfoToFile(globalThis.folderForNDS, returns.dateReg);

            }
        }

        return returns;


    }


    static async getCompanyInfo(tin) {


        const file = path.join(globalThis.folderRestAPI, 'INN Soliq ' + tin + '.json');

        let returns;

        if (fs.existsSync(file)) {
            console.log(`getVatInfo already exists in ${file}`);
            returns = JSON.parse(fs.readFileSync(file, 'utf8'));
        } else {

            const myHeaders = new Headers();

            const { My3XApiKey } = process.env;

            myHeaders.append("X-API-KEY", My3XApiKey);

            const requestOptions = {
                method: "GET",
                headers: myHeaders,
                redirect: "follow"
            };

            try {

                console.warn(`Fetching getCompanyInfo for ${tin}`);

                const response = await fetch(`https://my3.soliq.uz/api/remote-access-api/company/info/${tin}?type=full`, requestOptions);

                if (response.ok) {
                    const result = await response.json();

                    fs.writeFileSync(file, JSON.stringify(result, null, 2));
                    console.log(`Info saved to ${file}`);

                    returns = result;

                } else {
                    returns = null;
                    console.warn(`Warning getCompanyInfo for ${tin}: ${response.status}, ${response.statusText}`);
                    Dialogs.messageBoxAx(`Warning getCompanyInfo for ${tin}: ${response.status}, ${response.statusText}`, 'Warning');
                }


            } catch (error) {
                console.error(`Error getCompanyInfo for ${tin}`, error);
                returns = null
                Dialogs.messageBoxAx(`Error getCompanyInfo for ${tin}`, 'Error');
            }


        }


        console.log(returns, 'returns getCompanyInfo');
        if (!returns) return null;

        Files.saveInfoToFile(globalThis.folderCompan, returns.company.statusType);

        if (returns.company.statusType === 'CASHED_OUT') {
            returns.IsScammer = 'Да'
            Files.saveInfoToFile(globalThis.folderALL, '#Scam');
            Dialogs.messageBox(`${returns.company.name} is a scammer!`);
        } else
            returns.IsScammer = 'Нет'

        Files.saveInfoToFile(globalThis.folderCompan, 'Reg ' + returns.company.registrationDate);
        Files.saveInfoToFile(globalThis.folderCompan, 'ReReg ' + returns.company.reregistrationDate);

        return returns;


    }



    static async run() {

        // get current runned script name
        const scriptName = path.basename(__filename);

        Dialogs.messageBox(`Runned script: ${scriptName}`);
    }

}


