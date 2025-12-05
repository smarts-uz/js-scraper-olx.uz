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


node "D:\FSystem\DEV\Git\js-scraper-olx.uz\runChrome.js"  "c:\\Users\\Administrator\\AppData\\Roaming\\ixBrowser\\Browser Data\\4f927d157bea46185cfac529ff7e553f_downgrade_140_2025-10-02T15-38"





C:\\Users\\Administrator\\AppData\\Roaming\\ixBrowser-Resources\\chrome\138-0004\chrome.exe --force-color-profile=srgb --metrics-recording-only --no-first-run --password-store=basic --use-mock-keychain "--user-data-dir=C:\\Users\\Administrator\\AppData\\Roaming\\ixBrowser\\Browser Data\\4f927d157bea46185cfac529ff7e553f" --no-default-browser-check --disable-background-mode --disable-extension-welcome-page --autoplay-policy=no-user-gesture-required --protected-enablechromeversion=1 --enable-unsafe-swiftshader --protected-gems=2147483649 --js-flags=--ignore_debugger --protected-webgpu=intel,gen-9 --disable-features=HttpsUpgrades,HttpsFirstModeV2ForEngagedSites,HttpsFirstBalancedMode,HttpsFirstBalancedModeAutoEnable,EnableFingerprintingProtectionFilter,FlashDeprecationWarning,EnablePasswordsAccountStorage,RendererCodeIntegrity,CanvasNoise --disable-popup-blocking --hide-crash-restore-bubble "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.7204.174 Safari/537.36" --lang=en-US --extended-parameters=594NuFN9WIOkBqP-z2cSGa4SNR20vWzEPtuDBtopcqzDP9jk7Up8uF8OeJNxVIitva7SVIixzqrkGUpsGF-kLy4bVac8GUp2OUfqVFl9eXNgvbDsvRmkBx79lIm-z388uU7XGa42OFdgGXN9uUNgGX3kBkzSzkjk7RNFVIc2tIN0eX4izqrkByz-z3vsuUc2mJ4sGFN6uSNQVaOkBx79lIm-z3cDuX7sem2qeFQkBk41B2puafpNuFN9uDpuafpTvRDYeU26lJ48lRd9afpuabfjub78lRfuafpumUd8eI2gvDpuafpY5b49eXl6va4uafpuOx4slXc2ukTbGa78afpua17UBtzXv1bDcF42GtOFPtoDGFv8G6m9BIvUcFmDctcUafpuaRvUP1h6P9iYGFKkLy4avI4JtbD8uU-kBqoDc6G-z3f-eRdXmFc8e2Tsux76zqrkPyz-z3l2eFpsGFfSVIdgmFNSlR2gv9zEzUf6V9z-z3p8eUl6zqrklar0tRfSekDNIkpD5kz-z3fqGFNjlbp8eUukBk4D5kDPGa7gLNNVLJNEzkjkmRp8lRvsuUSkBk4aVIQ6Pkz-z3c8exv8uSD8uU-kBqo9c6u-z3fDvR2s7xhkBqoDP1z-z3c-VINglf42GX7RuyzEBtPDPWjkmX78lR2qOFdgvU2xzqrkO6YuafpuNac2uxcuafpuOI70VIiYuX79Ga7su2puafpTuJTbGa78afpuaf4sGIDYeUluafpuVa8yuUdXuFN9afpuab49eXl6vazo7RfSGNpuafjSvq39cFOpctlkvIbScqbQcIcUGIPDPq2Uvql2ctm6v2puBtOFG6z9PqmScIOFP1NUP6OFB1uXGtGXcFmDPRO6vtbkLy4b5Ii8eI2qOFdgvU2xzqrkO6YuafpuNac2uxcuafpuOI70VIiYuX79Ga7su2puafpTuJTbGa78afpuaf4sGIDYeUluafpuVa8yuUdXuFN9afpuab49eXl6vazo7RfSGNpuafjSvq39cFOpctlkvIbScqbQcIcUGIPDPq2Uvql2ctm6v2puafj6cINUPRbpPU78PtuDPtmiGIbQGtG6v1zDvtu9P12kPkz-z2l2G3lP72hkBk41B2puafpNuFN9uDpuafpTvRDYeU26lJ48lRd9afpuabfjub78lRfuafpumUd8eI2gvDpuafpY5b49eXl6va4uafpuOx4slXc2ukTbGa78afpua17UBtzXv1bDcF42GtOFPtoDGFv8G6m9BIvUcFmDctcUafpuaRO9B1h6cRPFcqhpGqPDGqGjvI48c6oDGI42vtOSGthizkjkOFdsVF22uSvYeRmkBk41B2puafpNuFN9uDpuafpTvRDYeU26lJ48lRd9afpuabfjub78lRfuafpumUd8eI2gvDpuafpY5b49eXl6va4uafpuOx4slXc2ukTbGa78afpua17UBtzXv1bDcF42GtOFPtoDGFv8G6m9BIvUcFmDctcUafpuaRN2GtbQc1z6cq36B1PXPFmFcIGFBImSPUNkc6c2PqoDzkjkeIf9V9zEzqPkLy4_vINjLI4xlF2gLavYuF2keRmkBqb-zUpsGF-0va8SLI4DGU4-vWzEPaS= --no-sandbox --disable-setuid-sandbox --window-position=0,0 "--load-extension=C:\\Users\\Administrator\\AppData\\Roaming\\ixBrowser\\Browser Data\\extension\\omghfjlpggmjjaagoclmmobgdodcjboh,C:\\Users\\Administrator\\AppData\\Roaming\\ixBrowser\\Browser Data\\extension\\hhdobjgopfphlmjbmnpglhfcgppchgje" http://127.0.0.1:7373/?id=3&time=1759816253&timezone=&name=3&username=3&tfa_secret=&note=&group_name=Default%20Group&tag_name= chrome://newtab






Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.7204.174 Safari/537.36
Mozilla/5.0 (Win64; x64) AppleWebKit/1044.36 (KHTML, like Gecko) Chrome/62.0.3163.100 Safari/1044.36