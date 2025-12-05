import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

import { Files } from './utils/Files.js';
import { Dates } from './utils/Dates.js';

import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';



// Main async function (runs sequentially)
async function main() {
    console.log('1️⃣ Start');

    const argv = yargs(hideBin(process.argv))
        .command('$0', 'the default command', () => { }, (argv) => {
            console.log('Usage: node one.js --yaml <data.yml> ')
        })
        .parse();


    Files.dotenv()

    let ymlFile = argv.yaml;
    console.log('ymlFile:', ymlFile)

    let allFile = argv.all;
    console.log('allFile:', allFile)

    const { TryCatch } = process.env;
    console.info('TryCatch:', TryCatch);


    switch (true) {

        case !Files.isEmpty(allFile):
            console.warn('Processing all YAML files in the current directory...', 'allFile:', allFile);

            if (!fs.existsSync(allFile))
                Dialogs.warningBox(`ALL Index file not found: ${allFile}`, 'ALL Index File not found');
            else
                console.log(`ALL Index file found: ${allFile}`);

            const ymlFiles = Files.findAllContractFiles(allFile);

            console.log(`Found ${ymlFiles.length} contracts`);

            if (TryCatch === 'true') {
                try {

                    for (const ymlFile of ymlFiles) {
                        console.warn(`\n Processing Contract file: ${ymlFile} \n`);
                        await Yamls.fillYamlWithInfo(ymlFile);
                    }
                    Dates.sleep(Number(process.env.ExitTimeout));
                } catch (error) {
                    console.error('Error:', error);
                    Dates.sleep(Number(process.env.ExitTimeoutError));
                }
            }
            else {


                for (const ymlFile of ymlFiles) {
                    console.warn(`\n Processing Contract file: ${ymlFile} \n`);
                    await Yamls.fillYamlWithInfo(ymlFile);
                }
                Dates.sleep(Number(process.env.ExitTimeout));
            }


            break;


        case !Files.isEmpty(ymlFile):
            console.warn(`Processing YAML file: ${ymlFile}`);

            if (!fs.existsSync(ymlFile))
                Dialogs.warningBox(`YAML file not found: ${ymlFile}`, 'YAML File not found');
            else
                console.log(`YAML file found: ${ymlFile}`);

            if (TryCatch === 'true') {
                try {
                    await Yamls.fillYamlWithInfo(ymlFile);
                    Dates.sleep(Number(process.env.ExitTimeout));
                } catch (error) {
                    console.error('Error:', error);
                    Dates.sleep(Number(process.env.ExitTimeoutError));
                }
            }
            else {

                await Yamls.fillYamlWithInfo(ymlFile);
                Dates.sleep(Number(process.env.ExitTimeout));
            }
            break;
        default:
            console.warn('Where are CMD Args?');

            break;
    }


    console.log('3️⃣ Done');

}


main()

