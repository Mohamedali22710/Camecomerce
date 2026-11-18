/** Database topology classification tests (no connection is opened). */
import { describe, expect, it } from "@jest/globals";

import { describeTransactionTopology } from "./connection.js";

describe("describeTransactionTopology", () => {
  it("accepts a replica set", () => {
    expect(describeTransactionTopology({ setName: "atlas-abc-shard-0" })).toBe('replica set "atlas-abc-shard-0"');
  });

  it("accepts a sharded cluster router", () => {
    expect(describeTransactionTopology({ msg: "isdbgrid" })).toBe("sharded cluster (mongos)");
  });

  it("rejects a standalone server", () => {
    expect(() => describeTransactionTopology({})).toThrow(/does not support multi-document transactions/);
    expect(() => describeTransactionTopology({ setName: "  " })).toThrow(/replica set or a sharded cluster/);
  });
});
