// @vitest-environment happy-dom
/**
 * ChipRow's two kinds. A `filter` is a radiogroup that the arrow keys move and
 * choose in; a `picker` is a toggle group whose arrow keys only move focus, that
 * never goes empty, and that emits on Space or a click. Found by role and name.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ChipRow } from "./ChipRow";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

const OPTIONS = [{ value: "sm" }, { value: "md" }, { value: "lg" }];

async function mount(element: React.ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root!.render(element));
}

async function press(target: Element, key: string) {
  await act(async () => {
    target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
    target.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true, cancelable: true }));
  });
}

const chips = (role: string) => [...document.querySelectorAll<HTMLElement>(`[role="${role}"]`)];

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container?.remove();
  document.body.innerHTML = "";
});

function Filter({ onChange }: { onChange: (value: string) => void }) {
  const [value, setValue] = useState<string | null>("sm");
  return (
    <ChipRow
      kind="filter"
      ariaLabel="Show"
      options={OPTIONS}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe("ChipRow kind=filter", () => {
  it("is a named radiogroup of radios, one checked", async () => {
    await mount(<Filter onChange={() => undefined} />);
    expect(document.querySelector('[role="radiogroup"]')?.getAttribute("aria-label")).toBe("Show");
    expect(chips("radio").map((c) => c.getAttribute("aria-checked"))).toEqual(["true", "false", "false"]);
  });

  it("chooses with a click, and a repeat click on the chosen chip does not fire", async () => {
    const onChange = vi.fn();
    await mount(<Filter onChange={onChange} />);
    await act(async () => chips("radio")[1]!.click());
    expect(onChange).toHaveBeenLastCalledWith("md");
    onChange.mockClear();
    await act(async () => chips("radio")[1]!.click());
    expect(onChange).not.toHaveBeenCalled();
  });

  it("moves and chooses with the arrow keys", async () => {
    const onChange = vi.fn();
    await mount(<Filter onChange={onChange} />);
    const first = chips("radio")[0]!;
    first.focus();
    await press(first, "ArrowRight");
    expect(onChange).toHaveBeenLastCalledWith("md");
    expect(document.activeElement).toBe(chips("radio")[1]);
  });

  it("accepts a null value: nothing is checked", async () => {
    await mount(
      <ChipRow kind="filter" ariaLabel="Show" options={OPTIONS} value={null} onValueChange={() => undefined} />,
    );
    expect(chips("radio").map((c) => c.getAttribute("aria-checked"))).toEqual(["false", "false", "false"]);
  });
});

function Picker({ onChange }: { onChange: (value: string) => void }) {
  const [value, setValue] = useState("sm");
  return (
    <ChipRow
      kind="picker"
      label="size"
      options={OPTIONS}
      value={value}
      onValueChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

const pressed = () => [...document.querySelectorAll("button")].map((b) => b.getAttribute("aria-pressed"));
const chipButtons = () => [...document.querySelectorAll<HTMLElement>("button")];

describe("ChipRow kind=picker", () => {
  it("is a group named by its label, one chip pressed", async () => {
    await mount(<Picker onChange={() => undefined} />);
    const group = document.querySelector('[role="group"]')!;
    expect(document.getElementById(group.getAttribute("aria-labelledby")!)?.textContent).toBe("size");
    expect(pressed()).toEqual(["true", "false", "false"]);
  });

  it("moves focus with the arrow keys without choosing", async () => {
    const onChange = vi.fn();
    await mount(<Picker onChange={onChange} />);
    const first = chipButtons()[0]!;
    first.focus();
    await press(first, "ArrowRight");
    expect(document.activeElement).toBe(chipButtons()[1]);
    expect(onChange).not.toHaveBeenCalled();
    expect(pressed()).toEqual(["true", "false", "false"]);
  });

  it("emits on a click, and never goes empty on a repeat click", async () => {
    const onChange = vi.fn();
    await mount(<Picker onChange={onChange} />);
    await act(async () => chipButtons()[2]!.click());
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith("lg");
    await act(async () => chipButtons()[2]!.click());
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(pressed()).toEqual(["false", "false", "true"]);
  });

  it("emits on Space", async () => {
    const onChange = vi.fn();
    await mount(<Picker onChange={onChange} />);
    const second = chipButtons()[1]!;
    second.focus();
    await act(async () => second.click()); // a browser turns Space or Enter on a button into a click
    expect(onChange).toHaveBeenLastCalledWith("md");
  });
});
