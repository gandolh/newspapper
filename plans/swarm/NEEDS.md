## For Wave 5 (integration)
- core/src/compose/slide-ai.ts: `remap` accepts any valid slide; tighten to enforce `result.variant === targetVariant` (retry once on mismatch, then throw). Reported by Wave 1C.
