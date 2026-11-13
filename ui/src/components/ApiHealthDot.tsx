import { useEffect, useState } from "react";
import { Icon } from "./ui";
import { withBase } from "../lib/base";
import { cn } from "../lib/cn";

type Status = "up" | "down";

/**
 * Whether the API answers. Said as a pulse icon and a word, never as a coloured dot: a hue on its own is not a
 * state in this system. Up is graphite with a blue pulse; down is grease with the same pulse, and the word changes.
 *
 * Two states, not three (DESIGN.md §5). A check in flight renders as *up*: a state that resolves in milliseconds
 * and cannot be acted on does not earn a form here.
 */
export function ApiHealthDot() {
  const [status, setStatus] = useState<Status>("up");

  async function check() {
    try {
      // A raw fetch rather than `api()`, because a failed probe is the normal
      // outcome here and must not trigger the 401 redirect. That also means the
      // base is not applied for us — this is the one API URL in the app that
      // has to say so itself.
      const res = await fetch(withBase("/api/health"), {
        signal: AbortSignal.timeout(5000),
      });
      setStatus(res.ok ? "up" : "down");
    } catch {
      setStatus("down");
    }
  }

  useEffect(() => {
    // Kept as an effect. This is the case the rule's own message sanctions:
    // subscribing to an external system — /api/health, polled — where the
    // status is not knowable at render time. The first paint says *up* and
    // the mark changes only if a check fails, so nothing here is a
    // placeholder being corrected on the way to a real value.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void check();
    const id = setInterval(() => void check(), 30_000);
    return () => clearInterval(id);
  }, []);

  const down = status === "down";
  const label = down ? "API offline" : "API online";
  const word = down ? "API down" : "API up";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-[6px] font-chrome text-body leading-body font-semibold phone:text-hint",
        down ? "text-grease" : "text-graphite",
      )}
      title={label}
    >
      <Icon name="pulse" className={down ? "text-grease" : "text-process-blue"} />
      {word}
    </span>
  );
}
