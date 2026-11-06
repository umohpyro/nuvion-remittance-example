import assert from "node:assert/strict";
import { test } from "node:test";
import { isSettled, timeline } from "./timeline.ts";

const states = (s: Parameters<typeof timeline>[0]) => timeline(s).map((x) => x.state);

test("each status maps to the steps a person sees", () => {
  assert.deepEqual(states("new"), ["done", "done", "current", "todo"]);
  assert.deepEqual(states("pending"), ["done", "done", "done", "current"]);
  assert.deepEqual(states("successful"), ["done", "done", "done", "done"]);
  assert.deepEqual(states("failed"), ["done", "done", "todo", "failed"]);
});

test("only successful and failed are settled", () => {
  assert.deepEqual((["new", "pending", "successful", "failed"] as const).map(isSettled), [false, false, true, true]);
});
