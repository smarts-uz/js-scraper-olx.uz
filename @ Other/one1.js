import fs from "fs/promises";
import path from "path";
import { spawn, exec } from "child_process";  // ✅ include exec
import puppeteer from "puppeteer-core";


const IXBROWSER_EXE = "C:\\Users\\Administrator\\AppData\\Roaming\\ixBrowser-Resources\\chrome\\134-0001\\chrome.exe";

// const PROFILES = [
//   {
//     name: "profile3",
//     userDataDir: "C:\\Users\\Administrator\\AppData\\Roaming\\ixBrowser\\Browser Data\\41637d85bec2fd01151b72c4b84fbdeb",
//     debuggingPort: 9224,
//     extendedParameters:
//       "594NuFN9WIOkBqP-z2cSGa4SNR20vWzEPtuDBtPQB1ujByjk7Up8uF8OeJNxVIitva7SVIixzqrkGUpsGF-kLy4bVac8GUp2OUfqVFl9eXNgvbDsvRmkBx79lIm-z388uU7XGa42OFdgGXN9uUNgGX3kBkzSzkjk7RNFVIc2tIN0eX4izqrkByz-z3vsuUc2mJ4sGFN6uSNQVaOkBx79lIm-z3cDuX7sem2qeFQkBk41B2puafpNuFN9uDpuafpTvRDYeU26lJ48lRd9afpuabfjub78lRfuafpumUd8eI2gvDpuafpY5b49eXl6va4uafpuOx4slXc2ukTbGa78afpua1OpcqPXv1oDGUNqPUv3P1bpctfkc64qcRzQcRvkvRNkafpuaRvUGFPiBWiYGFKkLy4avI4JtbD8uU-kBqGSP6O-z3f-eRdXmFc8e2Tsux76zqrkPyz-z3l2eFpsGFfSVIdgmFNSlR2gv9zEzU4-eFc_zkjktRfgvXPkBk4D5kDPGa7gLNNVLJNEzkjkOIcqvaTStRfgv9zEzxNELmp8lRQ0NNr-larkLy4OeRfSvUd9eWzEz2lYeqP9zkjkOFfglUf6tIf9V9zEB1m9PkjkOaN3VIdRuyzELt3XP1O-z3c-VINglf42GX7RuyzELtmXP6O-z37YuFfkeRNavI4WNbPkBx79lIm-z2cSGa7YGScseUvYv9zEz3PEafpuafN6va46afpuabf3eI2gVacSuUfSeX4uafpuOaTj7RfSGNpuafpWeFf0VIixafpuaR2QOx4slXc2u2puafpyuUdXuFN9zb78lRfuafpuc1bFP6l3B1NkvIP9vUOjPtbDPIzXPUPSGqoSvU43vI4ua12UctbXBIm9cth9GUc2P13ScqNqPUODctPXBIbjGIvUzkjk7J2gGIDYGScseUvYv9zEz3PEafpuafN6va46afpuabf3eI2gVacSuUfSeX4uafpuOaTj7RfSGNpuafpWeFf0VIixafpuaR2QOx4slXc2u2puafpyuUdXuFN9zb78lRfuafpuc1bFP6l3B1NkvIP9vUOjPtbDPIzXPUPSGqoSvU43vI4uafpuv1GiPIf2Ptc3Pqb6vIz9c6oDvIGXvRb9G6ODBRN8P6ukLy4avI4JtbvOzqrkO6YuafpuNac2uxcuafpuOI70VIiYuX79Ga7su2puafpTuJTbGa78afpuaf4sGIDYeUluafpuVa8yuUdXuFN9afpuab49eXl6vazo7RfSGNpuafjSPtG6cFOQcI42G64Uv1hpPtmpGqu9G67kB17UGU72G2puafp2vq2UP1b9cUm9vIPpGUbjG63SvqoSPF4UGIv8BI7UcWz-z3cseF0YvacRVIp2zqrkO6YuafpuNac2uxcuafpuOI70VIiYuX79Ga7su2puafpTuJTbGa78afpuaf4sGIDYeUluafpuVa8yuUdXuFN9afpuab49eXl6vazo7RfSGNpuafjSPtG6cFOQcI42G64Uv1hpPtmpGqu9G67kB17UGU72G2puafjXGU7kP1zpcUm6PU7kGUbXPtl2B13XvqTkc1v2GIf3cyz-zUD8uU-kBk4_eFDseyh6zxS=",
//     userAgent:
//       "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.6998.189 Safari/537.36",
//   },
//   {
//     name: "profile2",
//     userDataDir: "C:\\Users\\Administrator\\AppData\\Roaming\\ixBrowser\\Browser Data\\16cb8e5cff52bc5b58f14e39738420ec",
//     debuggingPort: 9223,
//     extendedParameters:
//       "594NuFN9WIOkBqb-z2cSGa4SNR20vWzEPtuDBtPQPqz9cyjk7Up8uF8OeJNxVIitva7SVIixzqrkGUpsGF-kLy4bVac8GUp2OUfqVFl9eXNgvbDsvRmkBx79lIm-z388uU7XGa42OFdgGXN9uUNgGX3kBkzSzkjk7RNFVIc2tIN0eX4izqrkByz-z3vsuUc2mJ4sGFN6uSNQVaOkBx79lIm-z3cDuX7sem2qeFQkBk41B2puafpNuFN9uDpuafpTvRDYeU26lJ48lRd9afpuabfjub78lRfuafpumUd8eI2gvDpuafpY5b49eXl6va4uafpuOx4slXc2ukTbGa78afpuaRc3cqu6vq3QGU7kB1uScF7kP1N2cqbFBRf2GUv8Gq42afpuaRPXPtmQcWiYGFKkLy4avI4JtbD8uU-kBqOjc6b-z3f-eRdXmFc8e2Tsux76zqrkPyz-z3l2eFpsGFfSVIdgmFNSlR2gv9zEzUf6V9z-z3p8eUl6zqrklar0tRfSekDNIkpD5kz-z3fqGFNjlbp8eUukBk4D5kDPGa7gLNNVLJNEzkjkmRp8lRvsuUSkBk4aVIQ6Pkz-z3c8exv8uSD8uU-kBqbSPtO-z3fDvR2s7xhkBqGpc6G-z3c-VINglf42GX7RuyzEcqGjLy4bVac8GUp2NFNkm271zqYSuxN2Ly4tlRfSVIc1eFiUVIukBk41B2puafpNuFN9uDpuafpTvRDYeU26lJ48lRd9afpuabfjub78lRfuafpumUd8eI2gvDpuafpY5b49eXl6va4uafpuOx4slXc2ukTbGa78afpuaRc3cqu6vq3QGU7kB1uScF7kP1N2cqbFBRf2GUv8Gq42afjXPRfkGUbDGthXBRcUPUb9vq73cFO6ctN8Btmjc6lUckz-z37ieUf0VIc1eFiUVIukBk41B2puafpNuFN9uDpuafpTvRDYeU26lJ48lRd9afpuabfjub78lRfuafpumUd8eI2gvDpuafpY5b49eXl6va4uafpuOx4slXc2ukTbGa78afpuaRc3cqu6vq3QGU7kB1uScF7kP1N2cqbFBRf2GUv8Gq42afpua13pctT8c1zXB1OpB1ziPUvUBIz6c6bjP6h9vImFv1f8zkjkNFNk7SpRmyzEz3PEafpuafN6va46afpuabf3eI2gVacSuUfSeX4uafpuOaTj7RfSGNpuafpWeFf0VIixafpuaR2QOx4slXc2u2puafpyuUdXuFN9zb78lRfuafpuGFOFc6cUBt8kvRzQc6OXvRzjcImFPtGQGINkvUfkPUNuafpucINqvt82cqTUvIGXv1lqc6PjPFGFvUvUBIPFvqbFPtGkLy41eFd_VIN67U2-vWzEz3PEafpuafN6va46afpuabf3eI2gVacSuUfSeX4uafpuOaTj7RfSGNpuafpWeFf0VIixafpuaR2QOx4slXc2u2puafpyuUdXuFN9zb78lRfuafpuGFOFc6cUBt8kvRzQc6OXvRzjcImFPtGQGINkvUfkPUNuafpuc6hSvquXBIcqGIzDGIz6GFODP6b9PFmXPRbDcRcUcFGkLy40Ga4_zqrkWFd0eFjkZO==",
//     userAgent:
//       "Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.6834.73 Safari/537.36",
//   },
// ];

const PROFILES = 
    {"profile1" : "C:\\Users\\Administrator\\AppData\\Roaming\\ixBrowser-Resources\\chrome\134-0001\chrome.exe --force-color-profile=srgb --metrics-recording-only --no-first-run --password-store=basic --use-mock-keychain "--user-data-dir=C:\\Users\\Administrator\\AppData\\Roaming\\ixBrowser\\Browser Data\\41637d85bec2fd01151b72c4b84fbdeb" --no-default-browser-check --disable-background-mode --disable-extension-welcome-page --autoplay-policy=no-user-gesture-required --protected-enablechromeversion=1 --protected-gems=2147483649 --js-flags=--ignore_debugger --protected-webgpu=nvidia,ampere --disable-features=HttpsUpgrades,HttpsFirstModeV2ForEngagedSites,HttpsFirstBalancedMode,HttpsFirstBalancedModeAutoEnable,EnableFingerprintingProtectionFilter,FlashDeprecationWarning,EnablePasswordsAccountStorage,RendererCodeIntegrity --disable-popup-blocking --hide-crash-restore-bubble "--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.6998.189 Safari/537.36" --lang=en-US --extended-parameters=594NuFN9WIOkBqP-z2cSGa4SNR20vWzEPtuDBtPQB1ujByjk7Up8uF8OeJNxVIitva7SVIixzqrkGUpsGF-kLy4bVac8GUp2OUfqVFl9eXNgvbDsvRmkBx79lIm-z388uU7XGa42OFdgGXN9uUNgGX3kBkzSzkjk7RNFVIc2tIN0eX4izqrkByz-z3vsuUc2mJ4sGFN6uSNQVaOkBx79lIm-z3cDuX7sem2qeFQkBk41B2puafpNuFN9uDpuafpTvRDYeU26lJ48lRd9afpuabfjub78lRfuafpumUd8eI2gvDpuafpY5b49eXl6va4uafpuOx4slXc2ukTbGa78afpua1OpcqPXv1oDGUNqPUv3P1bpctfkc64qcRzQcRvkvRNkafpuaRvUGFPiBWiYGFKkLy4avI4JtbD8uU-kBqGSP6O-z3f-eRdXmFc8e2Tsux76zqrkPyz-z3l2eFpsGFfSVIdgmFNSlR2gv9zEzU4-eFc_zkjktRfgvXPkBk4D5kDPGa7gLNNVLJNEzkjkOIcqvaTStRfgv9zEzxNELmp8lRQ0NNr-larkLy4OeRfSvUd9eWzEz2lYeqP9zkjkOFfglUf6tIf9V9zEB1m9PkjkOaN3VIdRuyzELt3XP1O-z3c-VINglf42GX7RuyzELtmXP6O-z37YuFfkeRNavI4WNbPkBx79lIm-z2cSGa7YGScseUvYv9zEz3PEafpuafN6va46afpuabf3eI2gVacSuUfSeX4uafpuOaTj7RfSGNpuafpWeFf0VIixafpuaR2QOx4slXc2u2puafpyuUdXuFN9zb78lRfuafpuc1bFP6l3B1NkvIP9vUOjPtbDPIzXPUPSGqoSvU43vI4ua12UctbXBIm9cth9GUc2P13ScqNqPUODctPXBIbjGIvUzkjk7J2gGIDYGScseUvYv9zEz3PEafpuafN6va46afpuabf3eI2gVacSuUfSeX4uafpuOaTj7RfSGNpuafpWeFf0VIixafpuaR2QOx4slXc2u2puafpyuUdXuFN9zb78lRfuafpuc1bFP6l3B1NkvIP9vUOjPtbDPIzXPUPSGqoSvU43vI4uafpuv1GiPIf2Ptc3Pqb6vIz9c6oDvIGXvRb9G6ODBRN8P6ukLy4avI4JtbvOzqrkO6YuafpuNac2uxcuafpuOI70VIiYuX79Ga7su2puafpTuJTbGa78afpuaf4sGIDYeUluafpuVa8yuUdXuFN9afpuab49eXl6vazo7RfSGNpuafjSPtG6cFOQcI42G64Uv1hpPtmpGqu9G67kB17UGU72G2puafp2vq2UP1b9cUm9vIPpGUbjG63SvqoSPF4UGIv8BI7UcWz-z3cseF0YvacRVIp2zqrkO6YuafpuNac2uxcuafpuOI70VIiYuX79Ga7su2puafpTuJTbGa78afpuaf4sGIDYeUluafpuVa8yuUdXuFN9afpuab49eXl6vazo7RfSGNpuafjSPtG6cFOQcI42G64Uv1hpPtmpGqu9G67kB17UGU72G2puafjXGU7kP1zpcUm6PU7kGUbXPtl2B13XvqTkc1v2GIf3cyz-zUD8uU-kBk4_eFDseyh6zxS= --no-sandbox --disable-setuid-sandbox --window-position=0,0 http://127.0.0.1:11335/?id=3&time=1759388708&timezone=&name=komol%203&username=&tfa_secret=&note=&group_name=Default%20Group&tag_name= https://outlook.com"}
  

function buildArgsForProfile(profile) {
  return [
    `--user-data-dir=${profile.userDataDir}`,
    `--remote-debugging-port=${profile.debuggingPort}`,
    `--user-agent=${profile.userAgent}`,
    `--extended-parameters=${profile.extendedParameters}`,
    "--force-color-profile=srgb",
    "--metrics-recording-only",
    "--no-first-run",
    "--password-store=basic",
    "--use-mock-keychain",
    "--no-default-browser-check",
    "--disable-background-mode",
    "--disable-extension-welcome-page",
    "--autoplay-policy=no-user-gesture-required",
    "--protected-enablechromeversion=1",
    "--protected-gems=2147483649",
    "--protected-webgpu=nvidia,ampere",
    "--js-flags=--ignore_debugger",
    "--disable-features=HttpsUpgrades,HttpsFirstModeV2ForEngagedSites,HttpsFirstBalancedMode,HttpsFirstBalancedModeAutoEnable,EnableFingerprintingProtectionFilter,FlashDeprecationWarning,EnablePasswordsAccountStorage,RendererCodeIntegrity",
    "--hide-crash-restore-bubble",
    "--lang=en-US",
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--window-position=0,0",
    "--disable-popup-blocking",
  ];
}

async function launchIxBrowser(profile, startUrl = "https://gmail.com") {
  const args = buildArgsForProfile(profile);
  const browser = await puppeteer.launch({
    executablePath: profile.executablePath, // ✅ use profile value
    args,
    headless: false,
  });

  const page = await browser.newPage();
  await page.goto(startUrl, { waitUntil: "networkidle2" });
  return browser;
}

function sanitizeFileName(name) {
  return name.replace(/[<>:"/\\|?*]+/g, " ").trim().substring(0, 120) || `ad_${Date.now()}`;
}

// Save page as MHTML, retry if Protocol error (Page.captureSnapshot): Failed to generate MHTML
async function savePageAsMHTML(page, savePath, maxRetries = 2) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const cdp = await page.target().createCDPSession();
      await cdp.send("Page.enable");
      const snapshot = await cdp.send("Page.captureSnapshot", { format: "mhtml" });
      await fs.writeFile(savePath, snapshot.data);
      return;
    } catch (err) {
      lastError = err;
      const isMhtmlError =
        err &&
        err.message &&
        err.message.includes("Protocol error (Page.captureSnapshot): Failed to generate MHTML");
      if (isMhtmlError) {
        if (attempt < maxRetries) {
          console.warn(
            `⚠️ Failed to generate MHTML (attempt ${attempt}/${maxRetries}), retrying...`
          );
          await new Promise((res) => setTimeout(res, 1000));
          continue;
        } else {
          throw new Error(
            `Protocol error (Page.captureSnapshot): Failed to generate MHTML after ${maxRetries} attempts`
          );
        }
      } else {
        throw err;
      }
    }
  }
  if (lastError) throw lastError;
}

// ✅ Force close ixBrowser process via taskkill
function closeIxBrowser(profile) {
  if (!profile.pid) return;
  exec(`taskkill /PID ${profile.pid} /T /F`, (err) => {
    if (err) {
      console.warn(`⚠️ Could not kill ixBrowser for ${profile.name}: ${err.message}`);
    } else {
      console.log(`🛑 Force-closed ixBrowser for ${profile.name}`);
    }
  });
}

async function scrapeWithProfile(profile, url, baseSaveDir) {
  const browser = await launchIxBrowser(profile);

  // const browser = await waitForPuppeteerConnect(profile);
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log(`➡️ [${profile.name}] Opening: ${url}`);
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

  let phoneRevealed = false;
  try {
    await page.waitForSelector('button[data-testid="show-phone"]', { timeout: 5000 });
    await page.click('button[data-testid="show-phone"]');
    await page.waitForSelector('[data-testid="contact-phone"]', { timeout: 10000 });
    console.log(`📞 [${profile.name}] Phone number revealed!`);
    phoneRevealed = true;
  } catch (err) {
    console.warn(`⚠️ [${profile.name}] Could not reveal phone: ${err.message}`);
  }

  // Save MHTML anyway
  let title = await page.title().catch(() => "");
  const safeName = sanitizeFileName(title);
  const filePath = path.join(baseSaveDir, `${safeName}.mhtml`);

  try {
    await savePageAsMHTML(page, filePath, 2);
    console.log(`💾 [${profile.name}] Saved: ${filePath}`);
  } catch (err) {
    if (
      err &&
      err.message &&
      err.message.includes("Protocol error (Page.captureSnapshot): Failed to generate MHTML")
    ) {
      // Already retried in savePageAsMHTML, so just throw
      throw err;
    } else {
      throw err;
    }
  }

  await page.close();
  // await browser.disconnect();
  closeIxBrowser(profile);

  if (!phoneRevealed) {
    throw new Error("Phone not revealed");
  }

  return filePath;
}

async function main() {
  if (process.argv.length < 4) {
    console.error("Usage: node one1.js <url> <saveDir>");
    process.exit(1);
  }

  const url = process.argv[2];
  const saveDir = process.argv[3];
  await fs.mkdir(saveDir, { recursive: true });

  for (const profile of PROFILES) {
    try {
      const filePath = await scrapeWithProfile(profile, url, saveDir);
      console.log(`✅ Success with ${profile.name}, stopping.`);
      process.exit(0);
      return;
    } catch (err) {
      console.error(`❌ [${profile.name}] Failed: ${err.message}`);
      // try next profile automatically
    }
  }

  console.error("❌ All profiles failed.");
  process.exit(1);
}

main().catch(e => {
  console.error("Fatal:", e);
  process.exit(1);
});