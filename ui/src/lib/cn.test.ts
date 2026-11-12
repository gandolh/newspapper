import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("keeps a named size and a named colour together", () => {
    expect(cn("text-label", "text-graphite")).toBe("text-label text-graphite");
  });

  it("keeps a named tracking and a named leading beside a size", () => {
    expect(cn("leading-label", "text-mark", "tracking-field")).toBe("leading-label text-mark tracking-field");
  });

  it("lets a later size, colour, shadow, spacing or z win over an earlier one of the same kind", () => {
    expect(cn("text-label", "text-mark")).toBe("text-mark");
    expect(cn("text-graphite", "text-rubylith-ink")).toBe("text-rubylith-ink");
    expect(cn("shadow-waxed", "shadow-hinged")).toBe("shadow-hinged");
    expect(cn("p-hair", "p-unit")).toBe("p-unit");
    expect(cn("z-popup", "z-toast")).toBe("z-toast");
    expect(cn("wdth-title", "wdth-narrow")).toBe("wdth-narrow");
  });

  it("drops falsy values", () => {
    expect(cn("px-hair", false, null, undefined, "py-hair")).toBe("px-hair py-hair");
  });
});
