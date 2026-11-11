// @vitest-environment happy-dom
/**
 * ConfirmDialog's own logic: while `loading` nothing dismisses it (Esc, an
 * outside press, Cancel), and once `loading` ends they do. Found by role and name.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ConfirmDialog } from "./ConfirmDialog";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function ui(loading: boolean, onClose: () => void, onConfirm: () => void = () => undefined) {
  return (
    <ConfirmDialog
      open
      title="Delete post"
      message="This cannot be undone."
      confirmLabel="Delete"
      loading={loading}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  );
}

async function mount(element: React.ReactElement) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root!.render(element));
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
}

const rerender = (element: React.ReactElement) => act(async () => root!.render(element));

async function escape() {
  await act(async () => {
    (document.activeElement ?? document.body).dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
    );
  });
}

async function outsidePress() {
  await act(async () => {
    for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
      document.body.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
    }
  });
}

const button = (name: string) => [...document.querySelectorAll("button")].find((b) => b.textContent?.includes(name));

afterEach(async () => {
  await act(async () => root?.unmount());
  root = null;
  container?.remove();
  document.body.innerHTML = "";
});

describe("ConfirmDialog", () => {
  it("is an alertdialog named by its title, with no close mark", async () => {
    await mount(ui(false, () => undefined));
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog).not.toBeNull();
    expect(document.getElementById(dialog!.getAttribute("aria-labelledby")!)?.textContent).toBe("Delete post");
    expect(document.querySelector('button[aria-label="Close dialog"]')).toBeNull();
  });

  it("puts the focus on Cancel", async () => {
    await mount(ui(false, () => undefined));
    expect(document.activeElement?.textContent).toBe("Cancel");
  });

  it("closes on Escape and Cancel, and calls onConfirm from the confirm button", async () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    await mount(ui(false, onClose, onConfirm));
    await escape();
    expect(onClose).toHaveBeenCalledTimes(1);
    await act(async () => button("Cancel")!.click());
    expect(onClose).toHaveBeenCalledTimes(2);
    await act(async () => button("Delete")!.click());
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("is not dismissed by an outside press, loading or not", async () => {
    const onClose = vi.fn();
    await mount(ui(false, onClose));
    await outsidePress();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("ignores Escape and Cancel while loading, and closes again after", async () => {
    const onClose = vi.fn();
    await mount(ui(true, onClose));
    expect(button("Cancel")!.disabled).toBe(true);
    await escape();
    await act(async () => button("Cancel")!.click());
    await outsidePress();
    expect(onClose).not.toHaveBeenCalled();
    expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();

    await rerender(ui(false, onClose));
    expect(button("Cancel")!.disabled).toBe(false);
    await escape();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
