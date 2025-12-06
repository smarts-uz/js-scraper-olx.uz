

import { Files } from './utils/Files.js';
import fs from 'fs';

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

import { Puppe } from './utils/Puppe.js';
import { Chromes } from './utils/Chromes.js';


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

    Chromes.initFolders(mhtmlFile)

    //  const paginationUrls = await Puppe.getPaginationUrls(globalThis.mhtmlUrl);

    let browser = await Puppe.runChrome(process.env.Headless === 'true');

    //  await Puppe.saveAllPages(mhtmlFile, browser);

    /*     let adUrl = 'https://www.olx.uz/tashkent/q-hisense/?currency=UYE&page=2&search%5Bfilter_enum_state%5D%5B0%5D=new&search%5Border%5D=filter_float_price%3Adesc'
    
        await Puppe.scrapeCatalogMhtml(adUrl, browser);
     */

    let adUrl = 'https://www.olx.uz/d/obyavlenie/holodilnik-hisense-side-by-side-no-frost-ot-ofitsialnogo-dilera-ID29X2h.html'
    

    await Puppe.scrapeOlxMhtml(adUrl, browser);

}


main()

