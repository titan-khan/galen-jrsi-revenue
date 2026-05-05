import { describe, it, expect } from "vitest";
import { jrsiMetricsData } from "../jrsiMetricsData";

// Phrases that read as data-engineering caveats and don't belong in a
// user-facing insight summary. The metric `description` field is the place
// for source-availability notes; `insight.text` should be analytical.
const META_CAVEAT_PHRASES = [
  "tidak tersedia di source",
  "tidak tersedia di sumber",
  "breakdown tidak tersedia",
  "data source tidak",
  "di source irsms",
];

describe("jrsiMetricsData insights", () => {
  for (const metric of jrsiMetricsData) {
    describe(`${metric.id} — ${metric.name}`, () => {
      const { text, boldParts } = metric.displayData.insight;

      it("does not put data-source caveats in the insight summary", () => {
        const lower = text.toLowerCase();
        for (const phrase of META_CAVEAT_PHRASES) {
          expect(
            lower,
            `Insight on ${metric.id} contains "${phrase}" — that belongs in the metric \`description\` field, not \`insight.text\`. Replace with an analytical observation about the trend or distribution.`,
          ).not.toContain(phrase);
        }
      });

      it("every boldPart appears verbatim in the insight text", () => {
        for (const part of boldParts) {
          expect(
            text,
            `boldPart "${part}" on ${metric.id} is not a substring of insight.text — the <strong> highlight will silently no-op on the card. Either fix the boldPart to match a real phrase or update the text.`,
          ).toContain(part);
        }
      });

      if (metric.isFollowing) {
        it("followed metrics have a non-empty insight (visible on Home/Metrics)", () => {
          expect(text.trim().length, `Followed metric ${metric.id} has empty insight text — it will render the generic type label instead.`).toBeGreaterThan(0);
        });
      }
    });
  }
});
