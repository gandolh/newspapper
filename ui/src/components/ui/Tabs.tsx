import type { ReactNode } from "react";
import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { Button } from "./Button";

export interface TabOption<Value extends string> {
  value: Value;
  label: string;
}

export interface TabsProps<Value extends string> {
  value: Value;
  onValueChange: (value: Value) => void;
  tabs: readonly TabOption<Value>[];
  /** Names the row of tabs for a screen reader. */
  label: string;
  /** The active tab's content. Only the active panel is mounted. */
  children: (value: Value) => ReactNode;
  /** Layout hooks for the three parts, for the caller's own placement. */
  className?: string;
  listClassName?: string;
  panelClassName?: string;
}

/**
 * Tabs — Base UI `Tabs`, each tab drawn as a `Button` (solid when it is
 * the one on screen, outlined otherwise); the row is the phone's pane switch.
 *
 * For a row that switches which panel is on screen (the base-ui skill's rule
 * 16): Tab enters the row, and the arrow keys move and choose
 * (`activateOnFocus`). An inactive panel is not mounted, so a caller that
 * keeps state in a pane loses it on a switch, exactly as it did before.
 */
export function Tabs<Value extends string>({
  value,
  onValueChange,
  tabs,
  label,
  children,
  className,
  listClassName,
  panelClassName,
}: TabsProps<Value>) {
  return (
    <BaseTabs.Root
      className={className}
      value={value}
      onValueChange={(next) => {
        const chosen = tabs.find((tab) => tab.value === next);
        if (chosen) onValueChange(chosen.value);
      }}
    >
      <BaseTabs.List className={listClassName} aria-label={label} activateOnFocus>
        {tabs.map((tab) => (
          <BaseTabs.Tab
            key={tab.value}
            value={tab.value}
            render={(props, state) => (
              <Button variant={state.active ? "primary" : "secondary"} className="flex-1" {...props}>
                {tab.label}
              </Button>
            )}
          />
        ))}
      </BaseTabs.List>
      {tabs.map((tab) => (
        <BaseTabs.Panel key={tab.value} value={tab.value} className={panelClassName}>
          {children(tab.value)}
        </BaseTabs.Panel>
      ))}
    </BaseTabs.Root>
  );
}
