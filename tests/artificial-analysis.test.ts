import test from "node:test";
import assert from "node:assert/strict";
import { parseArtificialAnalysisApi, parseArtificialAnalysisPage } from "../src/lib/artificial-analysis";

const headers = ["Model", "Context Window", "Creator", "Artificial Analysis Intelligence Index", "Cost per Task USD", "Median Tokens/s", "Latency First Chunk (s)", "Total Response (s)", "Further Analysis"];
const model = ["Model A &amp; variant", "1.05M", "Lab", "58", "$0.00", "--", "0.25", "12.34", '<a href="/models/a">Model</a><a href="/models/a/providers">Providers</a>'];
function table(rows: string[][], labels = headers) {
  return `<table><thead><tr><th>Group header</th></tr><tr>${labels.map(value => `<th><button>${value}</button></th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(value => `<td>${value}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

test("public benchmark preserves zero, missing values, units and estimated-score annotations", () => {
  const second = [...model];
  second[0] = "Model B"; second[1] = "872k"; second[3] = "36<!-- -->*"; second[4] = "$0.0045"; second[8] = '<a href="https://artificialanalysis.ai/models/b">Model</a>';
  const board = parseArtificialAnalysisPage(table([model, second]));
  assert.equal(board.models.length, 2);
  assert.equal(board.models[0].name, "Model A & variant");
  assert.equal(board.models[0].scores.context, 1_050_000);
  assert.equal(board.models[1].scores.context, 872_000);
  assert.equal(board.models[0].scores.costPerTask, 0);
  assert.equal(board.models[1].scores.costPerTask, 0.0045);
  assert.equal(board.metrics.find(metric => metric.key === "costPerTask")?.precision, 4);
  assert.equal(board.models[0].scores.latency, 0.25);
  assert.equal(board.models[0].scores.responseTime, 12.34);
  assert.equal(board.models[0].scores.speed, null);
  assert.equal(board.models[1].scores.overall, 36);
  assert.equal(board.models[1].scoreNotes?.overall, "Estimativa da Artificial Analysis");
  assert.equal(board.metrics.find(metric => metric.key === "speed"), undefined);
  assert.equal(board.metrics.find(metric => metric.key === "costPerTask")?.lowerIsBetter, true);
  assert.equal(board.metrics.find(metric => metric.key === "overall")?.precision, 0);
});

test("public benchmark maps by header names when columns move, and ignores unrelated tables/scripts", () => {
  const indices = [3, 8, 0, 4, 2, 1, 7, 5, 6];
  const reordered = parseArtificialAnalysisPage(`<script>throw new Error('must never execute')</script><table><tr><td>Other data</td></tr></table>${table([indices.map(i => model[i])], indices.map(i => headers[i]))}`);
  assert.equal(reordered.models[0].name, "Model A & variant");
  assert.equal(reordered.models[0].scores.overall, 58);
  assert.equal(reordered.models[0].scores.costPerTask, 0);
});

test("public benchmark rejects changed schemas, malformed numbers and untrusted model links", () => {
  assert.throws(() => parseArtificialAnalysisPage("<html>Service unavailable</html>"));
  assert.throws(() => parseArtificialAnalysisPage(table([model.slice(1)])));
  assert.throws(() => parseArtificialAnalysisPage(table([model, model])));
  for (const value of ["not a score", "-4", "-- * unexpected"]) {
    const row = [...model]; row[3] = value;
    assert.throws(() => parseArtificialAnalysisPage(table([row])));
  }
  for (const href of ["javascript:alert(1)", "https://artificialanalysis.ai.attacker.test/models/a", "https://user:secret@artificialanalysis.ai/models/a", "/models/a/providers"]) {
    const row = [...model]; row[8] = `<a href="${href}">Model</a>`;
    assert.throws(() => parseArtificialAnalysisPage(table([row])));
  }
});

test("API maps its own metrics without relabeling token pricing as cost per task", () => {
  const board = parseArtificialAnalysisApi({ intelligence_index_version: "4.0", data: [
    { id: "stable-id", slug: "model-high", name: "Model (high)", model_creator: { name: "Lab" }, evaluations: { artificial_analysis_intelligence_index: 58.123, artificial_analysis_coding_index: 0, artificial_analysis_math_index: null }, pricing: { price_1m_input_tokens: 1.25, price_1m_output_tokens: 10 }, median_output_tokens_per_second: 90, median_time_to_first_token_seconds: 0.42 },
    { id: "no-evaluation", slug: "speed-only", name: "Speed only", model_creator: { name: "Lab" }, evaluations: null, pricing: null, median_output_tokens_per_second: 80 },
  ] });
  assert.equal(board.release, "v4.0");
  assert.equal(board.models[0].id, "stable-id");
  assert.equal(board.models[0].scores.overall, 58.123);
  assert.equal(board.models[0].scores.coding, 0);
  assert.equal(board.models[1].scores.overall, null);
  assert.equal(board.models[0].scores.input, 1.25);
  assert.equal(board.models[0].scores.costPerTask, undefined);
  assert.ok(board.metrics.some(metric => metric.key === "coding"));
  assert.ok(!board.metrics.some(metric => metric.key === "math"));
  assert.throws(() => parseArtificialAnalysisApi({ data: [] }));
});
