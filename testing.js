

import { Files } from './utils/Files.js';
import fs from 'fs';

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { Puppe } from './utils/Puppe.js';


// Main async function (runs sequentially)
async function main() {
    console.log('1️⃣ Start');


    const argv = yargs(hideBin(process.argv))
        .command('$0', 'the default command', () => { }, (argv) => {
            console.log('Usage: node one.js --mhtml <data.mhtml> ')
        })
        .parse();


    Files.dotenv()

    let mhtmlFile = argv.mhtml;
    console.log('mhtmlFile:', mhtmlFile)

    let url = Puppe.getUrlFromMht(mhtmlFile);
    
    let saveDir = Files.saveDirByMhtml(mhtmlFile);

   const browser = await Puppe.runChrome(process.env.HeadlessURL === 'true');

    const paginationUrls = await Puppe.getPaginationUrls(browser, url, saveDir);
  

        



}


main()

