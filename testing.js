

import { Files } from './utils/Files.js';
import { Yamls } from './utils/Yamls.js';
import fs from 'fs';

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { MySoliq } from './utils/MySoliq.js';
import { Dialogs } from './utils/Dialogs.js';
import { Dates } from './utils/Dates.js';



// Main async function (runs sequentially)
async function main() {
    console.log('1️⃣ Start');


    const argv = yargs(hideBin(process.argv))
        .command('$0', 'the default command', () => { }, (argv) => {
            console.log('Usage: node one.js --yaml <data.yml> ')
        })
        .parse();


      const a =  Dates.futureDateByMonth(1, true)
      const b =  Dates.futureDateByMonth(1, false)

      const aa =  Dates.futureDateByMonth(2, true)
      const bb =  Dates.futureDateByMonth(2, false)

 //   Files.backupFolder('d:\\FSystem\\ALL\\Humans\\Rentalls\\AnvarIkr\\ZOKIROV CONSTRUCTION\\RestAPI\\')    
   //    Dialogs.messageBox('Hello World!', 'Message');


   console.info('')
/* 
    Files.dotenv()

    let ymlFile = argv.yaml;

    if (!fs.existsSync(ymlFile))
        Dialogs.warningBox(`YAML file not found: ${ymlFile}`, 'YAML File not found');
    else
        console.log(`YAML file found: ${ymlFile}`);

    Files.initFolders(ymlFile)




    let vatInfo = await MySoliq.getVatInfo(311682697);
    console.log(vatInfo);

    let info = await MySoliq.getCompanyInfo(311682697);
    console.log(info); */




}


main()

