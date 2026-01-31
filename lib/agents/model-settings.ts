type ModelSettings = {
  temperature?: number;
};

const supportsSamplingParams = (model: string) => {
  if (model.startsWith("gpt-5.2")) return true;
  if (model.startsWith("gpt-5")) return false;
  return true;
};

export const modelSettingsFor = (model: string, temperature?: number): ModelSettings => {
  if (temperature === undefined) return {};
  return supportsSamplingParams(model) ? { temperature } : {};
};
