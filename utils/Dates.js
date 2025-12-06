import fs, { existsSync } from 'fs';
import path from 'path';
import { exec, execSync } from "child_process";
import dotenv from 'dotenv';

export class Dates {

  static parseDMY(dateStr) {
    const [day, month, year] = dateStr.split('.').map(Number);
    return new Date(year, month - 1, day);
  }

  static parseDMYExcel(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  static getMinusOneDay(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const prevMonth = new Date(year, month - 1, 0);
    let date = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), prevMonth.getDate());

    // convert to 2023-08-10 format
    // return date.toISOString().slice(0, 10); // convert to 2023-08-10 format
    //
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");

    return `${y}-${m}-${d}`;

  }

  static didoxToExcel(date) {
    if (!date) return "";
    // convert 10.08.2023 format to 2023-08-10 format
    return date.replace(/(\d{2})\.(\d{2})\.(\d{4})/, '$3-$2-$1');
  }

  static excelToDidox(date) {
    if (!date) return "";
    // convert 2023-08-10 format to 10.08.2023 format
    return date.replace(/(\d{4})-(\d{2})-(\d{2})/, '$3.$2.$1');
  }


  // static func get date of last day of future moths
  static futureDateByMonth(months, prevMonthLastDate = false) {

    console.log("futureDateByMonth", months);
    months = parseInt(months);
    const today = new Date();
    let futureDate
    if (prevMonthLastDate) {
      futureDate = new Date(today.getFullYear(), today.getMonth() + months, 0);
    } else {
      futureDate = new Date(today.getFullYear(), today.getMonth() + months, 1);
    }
    // return in format 2025-11-06
    //  return futureDate.toISOString().slice(0, 10); // return in format 2025-11-06
    const dateString = `${new Intl.DateTimeFormat('en-CA').format(futureDate)}`;
    return dateString;
  }


  static sleep(ms) {

    console.log(`Sleeping for ${ms} milliseconds...`);
    setTimeout(() => {
      process.exit(0);
    }, ms);


    //  return new Promise(resolve => setTimeout(resolve, ms));
  }

  static compareDatesDMY(a, b) {
    const da = this.parseDMY(a);
    const db = this.parseDMY(b);
    return da.getTime() - db.getTime(); // <0 = before, 0 = equal, >0 = after
  }

  static run() {

    const d1 = Dates.parseDMY("03.11.2011");
    const d2 = Dates.parseDMY("28.12.2018");

    if (d1 < d2) console.log("d1 is before d2");
    else if (d1 > d2) console.log("d1 is after d2");
    else console.log("same date");

    console.log(compareDatesDMY("03.11.2011", "28.12.2018")); // → negative (a < b)



  }

}
