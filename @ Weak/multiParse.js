import { scrapeMultipleSearches } from "./parseFromUrl.js";

const tasks = [
  {
    url: "https://www.olx.uz/elektronika/tehnika-dlya-doma/prochaya-tehnika-dlya-doma/tashkent/q-%D0%A1%D1%82%D0%B0%D0%B1%D0%B8%D0%BB%D0%B8%D0%B7%D0%B0%D1%82%D0%BE%D1%80/?currency=UYE&search%5Bfilter_enum_state%5D%5B0%5D=new",
    saveDir: "./mhtmls/stab",
  },
  {
    url: "https://www.olx.uz/list/q-dekor-plast/",
    saveDir: "./mhtmls/dekoplast",
  },
];

(async () => {
  await scrapeMultipleSearches(tasks);
})();
