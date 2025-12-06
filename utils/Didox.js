// add functikon infoByTinPinfl

import banks from "../data/banks.json" with { type: "json" };
import districts from "../data/districts.json" with { type: "json" };
import regions from "../data/regions.json" with { type: "json" };

import fs from "fs";
import path from "path";
import { Files } from './Files.js';
import { Dialogs } from "./Dialogs.js";
export class Didox {

    static bankByCode(code) {
        if (!code) return null;
        try {
            const bank = banks.find(b => String(b.bankId) === String(code));
            console.log(bank, 'bank');
            return bank || null;
        } catch (err) {
            console.error("Failed to read banks.json:", err);
            return null;
        }
    }

    static regionsByCode(code) {
        if (!code) return null;
        try {
            const region = regions.find(r => String(r.regionId) === String(code));
            console.log(region, 'region');
            return region || null;
        } catch (err) {
            console.error("Failed to read regions.json:", err);
            return null;
        }
    }

    static districtsByCode(regionId, districtCode) {
        if (!regionId) return null;
        if (!districtCode) return null;

        try {
            const district = districts.find(d => String(d.districtCode) === String(districtCode) && String(d.regionId) === String(regionId));
            console.log(district, 'district');
            return district || null;
        } catch (err) {
            console.error("Failed to read districts.json:", err);
            return null;
        }
    }

    static async infoByTinPinfl(tin) {

        if (!tin) return null;

        let prefix;

        // if string len of tin more than 9
        if (tin.length > 9) {
            prefix = 'PINFL Didox ';
        } else {
            prefix = 'INN Didox ';
        }

        const file = path.join(globalThis.folderRestAPI, prefix + tin + '.json');
        const { BaseURL } = process.env;
        let returns;

        if (fs.existsSync(file)) {
            console.log(`infoByTinPinfl already exists in ${file}`);
            returns = JSON.parse(fs.readFileSync(file, 'utf8'));
        } else {
            console.log(`infoByTinPinfl not exists in ${file}`);

            const myHeaders = new Headers();

            const requestOptions = {
                method: "GET",
                headers: myHeaders,
                redirect: "follow"
            };

            try {
                console.warn(`Fetching infoByTinPinfl for ${tin}`);

                const response = await fetch(`https://${BaseURL}/v1/utils/info/${tin}`, requestOptions);

                if (response.ok) {
                    const result = await response.json();

                    fs.writeFileSync(file, JSON.stringify(result, null, 2));
                    console.log(`infoByTinPinfl saved to ${file}`);
                    returns = result;
                } else {
                    returns = null
                    console.error(`Error infoByTinPinfl for ${tin}: ${response.status}, ${response.statusText}`);
                    Dialogs.messageBoxAx(`Error infoByTinPinfl for ${tin}`, 'Error', 16);
                }


            } catch (error) {
                console.error(`Error infoByTinPinfl for ${tin}`, error);
                Dialogs.messageBoxAx(`Error infoByTinPinfl for ${tin}`, 'Error', 16);
                returns = null
            }

        }

        console.info(returns, 'returns infoByTinPinfl');
        if (!returns) return null;

        let person
        if (returns.personalNum) {
            person = path.join(globalThis.folderDirector, returns.name);

            Files.mkdirIfNotExists(person);
            Files.saveInfoToFile(person, returns.address);
            Files.saveInfoToFile(person, returns.personalNum);
            Files.saveInfoToFile(person, returns.tin);

            await this.carInfoByPinfl(tin)

        } else {

            Files.saveInfoToFile(globalThis.folderCompan, returns.address);

            if (returns.address.includes('Anorzor')) {
                Files.saveInfoToFile(globalThis.folderALL, '#Anor');
                returns.IsAnorzor = 'Да';
            }
            else
                returns.IsAnorzor = 'Нет';
        }

        return returns;

    }


    static async carInfoByPinfl(tin) {

        if (!tin) return null;

        let prefix;

        // if string len of tin more than 9
        prefix = 'CAR Didox ';

        const file = path.join(globalThis.folderRestAPI, prefix + tin + '.json');

        let returns;

        if (fs.existsSync(file)) {
            console.log(`infoByTinPinfl already exists in ${file}`);
            returns = JSON.parse(fs.readFileSync(file, 'utf8'));
        } else {
            console.log(`infoByTinPinfl not exists in ${file}`);

            const myHeaders = new Headers();

            const { PARTNER_AUTHORIZATION, USER_KEY, BaseURL } = process.env;

            myHeaders.append("user-key", USER_KEY);
            myHeaders.append("Partner-Authorization", PARTNER_AUTHORIZATION);

            const requestOptions = {
                method: "GET",
                headers: myHeaders,
                redirect: "follow"
            };

            try {
                console.warn(`Fetching carInfoByPinfl for ${tin}`);

                const response = await fetch(`https://${BaseURL}/v1/utils/waybills/transport?tinOrPinfl=${tin}`, requestOptions);

                if (response.ok) {
                    const result = await response.json();

                    // if result json is not empty
                    fs.writeFileSync(file, JSON.stringify(result, null, 2));
                    console.log(`infoByTinPinfl saved to ${file}`);

                    returns = result;
                } else {
                    returns = null
                    console.error(`Error carInfoByPinfl for ${tin}: ${response.status}, ${response.statusText}`);
                    Dialogs.messageBoxAx(`Error carInfoByPinfl for ${tin}`, 'Error', 16);

                }


            } catch (error) {
                console.error(`Error carInfoByPinfl for ${tin}`, error);
                returns = null
                Dialogs.messageBoxAx(`Error carInfoByPinfl for ${tin}`, 'Error', 16);
            }

        }

        return returns;

    }




}
