import { describe, it, expect } from "vitest";
import { DecideApprovalSchema } from "../lib/policy/types";

describe("Human Approval Flow (M8)", () => {
  it("Validates approved decision payload", () => {
    const payload = {
      decision: "approved",
      reason: "Looks good, proceed with purchase.",
    };

    const result = DecideApprovalSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.decision).toBe("approved");
    }
  });

  it("Validates rejected decision payload", () => {
    const payload = {
      decision: "rejected",
      reason: "Too expensive right now.",
    };

    const result = DecideApprovalSchema.safeParse(payload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.decision).toBe("rejected");
    }
  });

  it("Rejects invalid decision types", () => {
    const invalidPayload = {
      decision: "maybe",
    };

    const result = DecideApprovalSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });
});
