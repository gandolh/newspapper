## For Wave 5 (integration)
- core/src/compose/slide-ai.ts: `remap` accepts any valid slide; tighten to enforce `result.variant === targetVariant` (retry once on mismatch, then throw). Reported by Wave 1C.
- data/newspapper.db on this machine is an old v1-CLI DB with user_version=2 (missing source_name/created_at, has scraped_at) — migration passes it through silently. Wave 5: back it up (data/newspapper.db.bak) and let a fresh DB be created, OR add a rescue migration keyed on actual columns. Reported by Wave 2.
