// @vitest-environment happy-dom
/**
 * Modal's own logic: the Escape guard, initial focus on `[data-autofocus]`, and
 * `dismissOnBackdrop`. Everything else is Base UI's. Found by role and name.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Modal } from "./Modal";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

async function mount(ui: React.ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root!.render(ui));
  // Base UI moves focus after the popup mounts.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
}

async function press(target: Element, key: string) {
  await act(async () => {
    target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  });
}

async function outsidePress() {
  const target = document.body;
  await act(async () => {
    for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
      target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
    }
  });
}

const dialog = () => document.querySelector<HTMLElement>('[role="dialog"]');

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container?.remove();
  document.body.innerHTML = "";
});

describe("Modal", () => {
  it("closes on an outside press by default (so the test below means something)", async () => {
    const onClose = vi.fn();
    await mount(
      <Modal open onClose={onClose} title="T">
        <input aria-label="Name" />
      </Modal>,
    );
    await outsidePress();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("is named by its title", async () => {
    await mount(
      <Modal open onClose={() => undefined} title="Add source">
        <input aria-label="Name" />
      </Modal>,
    );
    expect(dialog()?.getAttribute("aria-labelledby")).toBeTruthy();
    expect(document.getElementById(dialog()!.getAttribute("aria-labelledby")!)?.textContent).toBe("Add source");
  });

  it("closes on Escape", async () => {
    const onClose = vi.fn();
    await mount(
      <Modal open onClose={onClose} title="T">
        <input aria-label="Name" />
      </Modal>,
    );
    await press(document.activeElement ?? document.body, "Escape");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("stays open when a control inside already used the Escape key", async () => {
    const onClose = vi.fn();
    await mount(
      <Modal open onClose={onClose} title="T">
        <input
          aria-label="Name"
          onKeyDown={(event) => {
            if (event.key === "Escape") event.preventDefault();
          }}
        />
      </Modal>,
    );
    const field = document.querySelector<HTMLInputElement>('input[aria-label="Name"]')!;
    field.focus();
    await press(field, "Escape");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("puts the focus on the data-autofocus field, not the close button", async () => {
    await mount(
      <Modal open onClose={() => undefined} title="T">
        <input aria-label="First" />
        <input aria-label="Second" data-autofocus />
      </Modal>,
    );
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Second");
  });

  it("falls back to the first field when nothing is marked", async () => {
    await mount(
      <Modal open onClose={() => undefined} title="T">
        <button type="button">Go</button>
        <input aria-label="First" />
      </Modal>,
    );
    expect(document.activeElement?.getAttribute("aria-label")).toBe("First");
  });

  it("ignores an outside press with dismissOnBackdrop={false}", async () => {
    const onClose = vi.fn();
    await mount(
      <Modal open onClose={onClose} title="T" dismissOnBackdrop={false}>
        <input aria-label="Name" />
      </Modal>,
    );
    await outsidePress();
    expect(onClose).not.toHaveBeenCalled();
    // The ✕ still closes it.
    await act(async () => {
      document.querySelector<HTMLElement>('button[aria-label="Close dialog"]')!.click();
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
