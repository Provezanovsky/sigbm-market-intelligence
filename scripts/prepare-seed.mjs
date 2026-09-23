import fs from "node:fs";
import path from "node:path";
import {parseCSV,validDate} from "../lib/sigbm.ts";

const source=process.argv[2];
const referenceDate=process.argv[3];
if(!source)throw new Error("Informe o caminho da exportação CSV.");
if(!referenceDate||!validDate(referenceDate))throw new Error("Informe a data de referência no formato AAAA-MM-DD.");

const parsed=parseCSV(fs.readFileSync(source,"utf8"));
const data={
  schemaVersion:1,
  referenceDate,
  fileName:path.basename(source),
  revision:`initial-${referenceDate.replaceAll("-","")}`,
  ...parsed,
};

fs.mkdirSync("data",{recursive:true});
fs.writeFileSync("data/initial.json",JSON.stringify(data));
console.log(JSON.stringify({rows:data.rows.length,columns:data.headers.length,referenceDate}));
