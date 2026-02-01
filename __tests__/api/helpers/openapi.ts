import { readFileSync } from "node:fs";
import path from "node:path";
import Ajv from "ajv/dist/2020";
import YAML from "yaml";

type OpenApiSpec = {
  components?: {
    schemas?: Record<string, unknown>;
  };
};

export const loadOpenApiSpec = (): OpenApiSpec => {
  const specPath = path.resolve(process.cwd(), "openapi.yaml");
  const raw = readFileSync(specPath, "utf8");
  return YAML.parse(raw) as OpenApiSpec;
};

export const buildDebateEventValidator = () => {
  const spec = loadOpenApiSpec();
  const schema = {
    $id: "openapi",
    components: spec.components ?? {},
    $ref: "#/components/schemas/DebateEvent",
  };
  const ajv = new Ajv({
    strict: false,
    allErrors: true,
  });
  return ajv.compile(schema);
};
