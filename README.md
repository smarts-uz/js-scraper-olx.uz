# Parse MHTML Documentation

## Environment Variables

This script uses environment variables for configuration. You can set them in a `.env` file in the project root directory.

### Required Environment Variables

- `EXTENSION_PATH`: Path to the browser extension directory
- `PROFILE_FILE_PATH`: Path to the file containing browser profile directories

### Example .env file

```
EXTENSION_PATH=C:\\Users\\Administrator\\AppData\\Roaming\\ixBrowser\\Browser Data\\extension\\omghfjlpggmjjaagoclmmobgdodcjboh
PROFILE_FILE_PATH=D:\\FSystem\\DEV\\Git\\js-scraper-olx.uz\\parseMHTMLs\\1.txt
```

If these environment variables are not set, the script will use default values.



# Usage
node D:\FSystem\DEV\Git\js-scraper-olx.uz\saveURLs\saveURL.js "d:\FSystem\ALL\- Theory\BMW - Транспорт - OLX.uz.mhtml" 

node D:\FSystem\DEV\Git\js-scraper-olx.uz\parseMHTMLs\saveMHTML.js "d:\FSystem\ALL\- Theory\app"