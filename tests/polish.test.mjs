import assert from "node:assert/strict";import {test} from "node:test";import {runCommand as convert} from "../index.mjs";

test("UTC and offset dates round-trip at both JS date limits", () => {
  for (const [ms, offset] of [[-8640000000000000, "-271821-04-19T12:00:00-12:00"], [8640000000000000, "+275760-09-13T12:00:00+12:00"]]) {
    const result = convert("decode", { timestamp: ms, unit: "milliseconds" });
    const encoded = /^UTC: (.+)$/m.exec(result.text)[1];
    for (const datetime of [encoded, offset]) assert.equal(convert("encode", { datetime }).text, result.text);
  }
  assert.equal(convert("encode", { datetime: "-000000-01-01T00:00Z" }).error, true);
});
