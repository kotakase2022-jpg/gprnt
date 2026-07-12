import type { MetricDefinition } from "./types";

export function parseMetricInputValue(
  valueType: MetricDefinition["valueType"],
  input: string,
): number | string | boolean {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("invalid_metric_value");
  if (valueType === "text") return trimmed;
  if (valueType === "number") {
    const ungrouped = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
    const grouped = /^[+-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?(?:[eE][+-]?\d+)?$/;
    if (!ungrouped.test(trimmed) && !grouped.test(trimmed))
      throw new Error("invalid_metric_value");
    const normalized = trimmed.replaceAll(",", "");
    const value = Number(normalized);
    if (!Number.isFinite(value)) throw new Error("invalid_metric_value");
    return value;
  }
  if (["true", "1", "はい", "yes"].includes(trimmed.toLowerCase())) return true;
  if (["false", "0", "いいえ", "no"].includes(trimmed.toLowerCase()))
    return false;
  throw new Error("invalid_metric_value");
}
