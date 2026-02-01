import { describe, expect, it } from "vitest";
import { debateEvents, errorEvent } from "@/__tests__/api/fixtures/debate-events";
import { buildDebateEventValidator, loadOpenApiSpec } from "@/__tests__/api/helpers/openapi";

describe("OpenAPI debate event contract", () => {
  it("defines DebateEvent schema in openapi.yaml", () => {
    const spec = loadOpenApiSpec();
    expect(spec.components?.schemas?.DebateEvent).toBeDefined();
  });

  it("validates debate SSE events against the OpenAPI schema", () => {
    const validate = buildDebateEventValidator();
    for (const event of debateEvents) {
      const ok = validate(event);
      if (!ok) {
        const message = JSON.stringify(validate.errors, null, 2);
        throw new Error(message);
      }
    }
  });

  it("validates error SSE event against the OpenAPI schema", () => {
    const validate = buildDebateEventValidator();
    const ok = validate(errorEvent);
    if (!ok) {
      const message = JSON.stringify(validate.errors, null, 2);
      throw new Error(message);
    }
  });
});
