import assert from 'node:assert/strict';import { test } from 'node:test';import { spawnSync } from 'node:child_process';import { join } from 'node:path';import { pathToFileURL } from 'node:url';const root=process.cwd();
import {runCommand as timestamp} from "../index.mjs";

test("timestamps handle epoch, negative seconds, explicit milliseconds and offsets", () => {
  assert.match(
    timestamp("decode", { timestamp: "1.001", unit: "seconds" }).text,
    /Unix milliseconds: 1001\n/,
  );
  assert.match(
    timestamp("decode", { timestamp: "8640000000000", unit: "seconds" }).text,
    /\+275760-09-13/,
  );
  assert.match(
    timestamp("decode", { timestamp: "-8640000000000", unit: "seconds" }).text,
    /-271821-04-20/,
  );
  assert.match(
    timestamp("decode", { timestamp: "0", unit: "seconds", zone: "utc" }).text,
    /1970-01-01T00:00:00.000Z/,
  );
  assert.match(
    timestamp("decode", { timestamp: "-0.001", unit: "seconds", zone: "utc" }).text,
    /1969-12-31T23:59:59.999Z/,
  );
  assert.match(
    timestamp("decode", { timestamp: "1000", unit: "milliseconds" }).text,
    /1970-01-01T00:00:01.000Z/,
  );
  assert.match(
    timestamp("encode", { datetime: "1970-01-01T08:00:00+08:00", zone: "local" }).text,
    /Unix milliseconds: 0\n/,
  );
  assert.match(
    timestamp("encode", { datetime: "1970-01-01T00:00:00", zone: "utc" }).text,
    /Unix seconds: 0\n/,
  );
  assert.match(
    timestamp("encode", { datetime: "2000-02-29T12:34:56.123Z" }).text,
    /2000-02-29T12:34:56.123Z/,
  );
  assert.equal(timestamp("now").error, undefined);
});


test("timestamps reject invalid calendar dates, unsafe numbers and malformed input", () => {
  for (const datetime of [
    "2026-02-29T00:00:00",
    "2026-04-31T00:00:00",
    "2026-12-01T24:00:00",
    "2026-12-01T10:60:00",
    "2026-12-01T10:00:60",
    "2026-12-01T10:00:00+14:01",
    "01/02/2026",
    "",
  ]) {
    assert.equal(timestamp("encode", { datetime, zone: "utc" }).error, true, datetime);
  }
  for (const value of ["", "NaN", "Infinity", "0x100", "1e10", "9007199254740992", "1.001"]) {
    assert.equal(
      timestamp("decode", { timestamp: value, unit: "milliseconds" }).error,
      true,
      value,
    );
  }
});


test("local dates use process local zone and reject daylight-saving gaps", () => {
  const script = `import {runCommand} from ${JSON.stringify(pathToFileURL(join(root, "index.mjs")).href)}; process.stdout.write(JSON.stringify([runCommand("encode",{datetime:"2026-03-08T02:30:00",zone:"local"}),runCommand("encode",{datetime:"1970-01-01T00:00:00",zone:"local"})]));`;
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", script], {
    env: { ...process.env, TZ: "America/New_York" },
    encoding: "utf8",
    timeout: 5000,
  });
  assert.equal(child.status, 0, child.stderr);
  const results = JSON.parse(child.stdout);
  assert.equal(results[0].error, true);
  assert.match(results[1].text, /Unix seconds: 18000\n/);
});
