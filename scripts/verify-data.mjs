import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  SOURCE_HEADERS,
  csvCell,
  filterRows,
  groupOwners,
  parseCSV,
  prepareRows,
  statistics,
  structureExport,
  validDate,
} from "../lib/sigbm.ts";

const projectData = JSON.parse(await readFile(new URL("../data/initial.json", import.meta.url), "utf8"));
const rows = prepareRows(projectData);
const exportedSnapshot = structureExport(rows,projectData,"Validação automatizada");
const parsed = parseCSV(exportedSnapshot);
const stats = statistics(rows);

assert.equal(projectData.referenceDate, "2026-09-09");
assert.deepEqual(parsed.headers.slice(0,SOURCE_HEADERS.length), [...SOURCE_HEADERS]);
assert.equal(parsed.rows.length, 908);
assert.equal(projectData.rows.length, 908);
assert.equal(new Set(rows.map((row) => row.id)).size, 908);
assert.equal(stats.cnpjs, 235);
assert.equal(stats.unidentified, 100);
assert.equal(stats.states, 21);
assert.equal(stats.municipalities, 183);
assert.equal(stats.mapped, 902);
assert.equal(groupOwners(rows).length, 302);
assert.equal(rows.filter((row) => row.issues.includes("coordinates")).length, 6);
assert.equal(rows.filter((row) => row.status === "Em Construção").length, 36);
assert.equal(rows.filter((row) => row.status === "Em Construção" && row.height === 0 && row.volume === 0).length, 36);

const statusCounts = Object.fromEntries(
  ["Ativa", "Inativa", "Em Construção", "Em descaracterização (projeto/obras/monitoramento)"].map((status) => [
    status,
    rows.filter((row) => row.status === status).length,
  ]),
);
assert.deepEqual(statusCounts, {
  Ativa: 584,
  Inativa: 146,
  "Em Construção": 36,
  "Em descaracterização (projeto/obras/monitoramento)": 142,
});

const constructionWithRange = filterRows(rows, {
  query: "",
  categories: { SituacaoOperacionalFormatado: ["Em Construção"] },
  heightMin: "10",
  heightMax: "",
  volumeMin: "",
  volumeMax: "",
  includeUnknownDimensions: true,
});
assert.equal(constructionWithRange.length, 36, "Dimensões zeradas devem permanecer quando o usuário assim escolher.");

assert.equal(csvCell("=DANGER").includes("'=DANGER"), true);
assert.equal(validDate("2024-02-29"), true);
assert.equal(validDate("2025-02-29"), false);

const lines = exportedSnapshot.replace(/^\uFEFF/, "").split(/\r?\n/);
assert.throws(() => parseCSV([...lines, lines[1]].join("\n")), /repetido/);

console.log("Validação concluída: 908 registros, 24 colunas, 902 pontos mapeáveis e 6 coordenadas sinalizadas.");
