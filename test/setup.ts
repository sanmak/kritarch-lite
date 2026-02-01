import "@testing-library/jest-dom/vitest";

if (!process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = "test-key";
}
