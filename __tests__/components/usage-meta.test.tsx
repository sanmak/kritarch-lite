// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { UsageMeta } from "@/components/usage-meta";

describe("UsageMeta", () => {
  it("renders model, cost, and token breakdown", () => {
    render(
      <UsageMeta
        model="gpt-5.2"
        costUsd={0.0123}
        inputTokens={1200}
        outputTokens={800}
        totalTokens={2000}
      />
    );

    expect(screen.getByText(/Model: gpt-5.2/)).toBeInTheDocument();
    expect(screen.getByText(/Est. cost/)).toBeInTheDocument();
    expect(screen.getByText(/Tokens:/)).toBeInTheDocument();
  });
});
