import assert from "node:assert/strict";
import { test } from "node:test";
import type { ServerStatus } from "../types";
import { computeOverallStatus } from "./server-status";

const servers = (...statuses: ServerStatus[]) => statuses.map((status) => ({ status }));

test("no servers has no known status", () => {
  assert.equal(computeOverallStatus([]), "unknown");
});

test("all online is operational", () => {
  assert.equal(computeOverallStatus(servers("online", "online")), "operational");
});

test("under half offline is a partial outage", () => {
  assert.equal(computeOverallStatus(servers("online", "online", "online", "offline")), "partial_outage");
});

test("exactly half offline is a major outage", () => {
  assert.equal(computeOverallStatus(servers("online", "offline")), "major_outage");
});

test("all offline is a major outage", () => {
  assert.equal(computeOverallStatus(servers("offline", "offline")), "major_outage");
});

test("maintenance with nothing offline is under maintenance", () => {
  assert.equal(computeOverallStatus(servers("online", "maintenance")), "under_maintenance");
});

test("an outage takes priority over maintenance", () => {
  assert.equal(
    computeOverallStatus(servers("online", "online", "maintenance", "offline")),
    "partial_outage",
  );
});
