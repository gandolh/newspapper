/**
 * The tissue: the `<head>` block, and the selected component's props, on a sheet at 90% over the board.
 *
 * It hinges. Selecting a node swings the sheet down about its top edge and it
 * comes to rest with the notes already on it — the one authored moment this
 * surface has (`lib/motion.ts`). Under `prefers-reduced-motion` it is simply
 * at rest.
 *
 * Every control is generated from the catalogue — `propsFor` for the list,
 * `allowedValues` for an enum's options, `resolveProps` for what the compiler
 * will actually use. There is no raw-CSS field and no "advanced" section, by
 * design: a prop that carried a style value would be the one line that lets a
 * post drift off-brand.
 *
 * A prop whose values come from a named scale — `size`, `align`, `emphasis`,
 * and those are the only three — picks itself in a `ChipRow`, because the
 * whole scale should be on screen at once (DESIGN.md §5, Fields). The longest
 * of them is `size` at five steps, which a row in the 282px tissue holds; a
 * scale that grew past about six would have to go back to a `Select`. Content
 * props keep their field.
 */

import { useEffect, useRef, useState } from "react";
import {
  allowedValues,
  getComponentSpec,
  propsFor,
  resolveProps,
  WZD_HEAD_FIELDS,
  type WzdDocument,
} from "@newspapper/core/wizard";
import { Button, ChipRow, Icon, Input, Textarea } from "../ui";
import { ancestorPaths, elementAtPath, type WzdPath } from "./paths.js";
import { inheritedAlign, textOf } from "./props.js";
import { hinge } from "@/lib/motion";

const HEAD_LABELS: Record<string, string> = {
  title: "Title",
  description: "Description",
  keywords: "Keywords",
  date: "Date",
  caption: "Caption",
  hashtags: "Hashtags",
};

/**
 * An input that keeps a local draft and commits on blur. Committing on every
 * keystroke would run the text through the sanitizer mid-word and eat the
 * space you just typed.
 */
function DraftField({
  label,
  value,
  hint,
  multiline,
  singleLine,
  className,
  disabled,
  onCommit,
}: {
  label: string;
  value: string;
  hint?: string;
  multiline?: boolean;
  /** A field that is one line of text but shown on two, so none of it is cut: Enter commits instead of breaking. */
  singleLine?: boolean;
  className?: string;
  disabled?: boolean;
  onCommit: (next: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  // The draft has to follow `value` when the markup changes underneath it — a
  // source-pane edit, or a commit the sanitizer rewrote on the way through.
  // Adjusted during render (React's "storing information from previous
  // renders") rather than in an effect, so the corrected text lands in the same
  // commit instead of one paint later. Typing does not trip it: `value` only
  // moves when the document does.
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setDraft(value);
  }

  const commit = (): void => {
    if (draft !== value) onCommit(draft);
  };

  if (multiline) {
    return (
      <Textarea
        label={label}
        hint={hint}
        value={draft}
        disabled={disabled}
        rows={2}
        className={className}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={
          singleLine
            ? (event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.currentTarget.blur();
                }
              }
            : undefined
        }
      />
    );
  }

  return (
    <Input
      label={label}
      hint={hint}
      value={draft}
      disabled={disabled}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
    />
  );
}

export interface InspectorPaneProps {
  doc: WzdDocument | null;
  selectedPath: WzdPath | null;
  onSelectPath: (path: WzdPath | null) => void;
  onSetProp: (path: WzdPath, name: string, value: string | null) => void;
  onSetText: (path: WzdPath, value: string) => void;
  onSetHead: (field: string, value: string) => void;
  onRemove: (path: WzdPath) => void;
  onDuplicate: (path: WzdPath) => void;
  onNudge: (path: WzdPath, delta: -1 | 1) => void;
  onPickImage: (path: WzdPath) => void;
  /** True while the markup does not parse — no structural edit is safe then. */
  disabled: boolean;
}

export function InspectorPane(props: InspectorPaneProps) {
  const {
    doc,
    selectedPath,
    onSelectPath,
    onSetProp,
    onSetText,
    onSetHead,
    onRemove,
    onDuplicate,
    onNudge,
    onPickImage,
    disabled,
  } = props;

  const sheetRef = useRef<HTMLDivElement>(null);
  const pathKey = selectedPath ? selectedPath.join(".") : "";
  useEffect(() => {
    if (pathKey) hinge(sheetRef.current);
  }, [pathKey]);

  const element = doc && selectedPath ? elementAtPath(doc, selectedPath) : null;
  const spec = element ? getComponentSpec(element.type) : undefined;
  const resolved = element ? resolveProps(element) : {};

  return (
    <section // The tissue: a translucent sheet hinged over the board, carrying the notes that must never print. It reads
      // as a sheet (90% over the board), not as glass. One of the system's two shadows.
      aria-label="Inspector"
      className="flex origin-top flex-col border border-tissue-edge bg-tissue px-card py-snug shadow-hinged"
      ref={sheetRef}
    >
      <h2 className="mb-[4px] font-chrome text-section leading-section font-extrabold text-graphite-deep wdth-head">
        Post
      </h2>
      <p className="mb-[6px] font-chrome text-hint leading-[18px] font-medium text-graphite-soft">
        The <code>&lt;head&gt;</code> block. Title, description and keywords also drive the saved post's index columns.
      </p>
      <div className="flex flex-col gap-[6px]">
        {WZD_HEAD_FIELDS.map((field) => (
          <DraftField
            key={field}
            label={HEAD_LABELS[field] ?? field}
            value={doc?.head[field] ?? ""}
            disabled={disabled}
            multiline={field === "caption" || field === "description" || field === "title"}
            singleLine={field === "title"}
            className={field === "description" ? "min-h-[44px]" : undefined}
            onCommit={(next) => onSetHead(field, next)}
          />
        ))}
      </div>

      <h2 className="mt-card mb-[4px] border-t border-dashed border-tissue-edge pt-[14px] font-chrome text-section leading-section font-extrabold text-graphite-deep wdth-head">
        Selection
      </h2>
      <div className="flex flex-col gap-snug">
        {!element && (
          <>
            <div className="flex items-center gap-tight font-chrome text-body leading-body font-bold text-graphite">
              <Icon name="pointer" />
              Nothing selected
            </div>
            <p className="font-chrome text-hint leading-[18px] font-medium text-graphite-soft">
              Click a node in the preview, or put the cursor inside one in the source.
            </p>
          </>
        )}

        {element && selectedPath && (
          <>
            <nav className="flex flex-wrap items-center gap-0" aria-label="Ancestors">
              {ancestorPaths(selectedPath).map((path) => {
                const node = elementAtPath(doc as WzdDocument, path);
                if (!node) return null;
                return (
                  <Button
                    key={path.join(".")}
                    variant="ghost"
                    size="sm"
                    className="h-[24px] px-[4px] py-0 text-label after:ml-[4px] after:text-graphite-soft after:content-['/'] last:after:content-['']"
                    onClick={() => onSelectPath(path)}
                  >
                    {node.type}
                  </Button>
                );
              })}
            </nav>

            <div className="flex flex-col gap-[2px]">
              <h3 className="font-chrome text-head leading-head font-extrabold text-graphite-deep wdth-head">
                {element.type}
              </h3>
              {spec && (
                <span className="text-hint leading-hint font-medium text-graphite-soft">{spec.description}</span>
              )}
            </div>

            <div className="flex flex-wrap gap-[6px]">
              <Button variant="secondary" size="sm" disabled={disabled} onClick={() => onNudge(selectedPath, -1)}>
                Move up
              </Button>
              <Button variant="secondary" size="sm" disabled={disabled} onClick={() => onNudge(selectedPath, 1)}>
                Move down
              </Button>
              <Button variant="secondary" size="sm" disabled={disabled} onClick={() => onDuplicate(selectedPath)}>
                Duplicate
              </Button>
              <Button variant="danger" size="sm" disabled={disabled} onClick={() => onRemove(selectedPath)}>
                Delete
              </Button>
            </div>

            {spec?.children === "text" && (
              <DraftField
                label="Content"
                value={textOf(element)}
                hint="Text only. {title}, {date} and the other head fields resolve here."
                multiline
                disabled={disabled}
                onCommit={(next) => onSetText(selectedPath, next)}
              />
            )}

            {propsFor(element.type).map((propSpec) => {
              const written = element.props[propSpec.name];
              const isSet = written !== undefined;

              if (propSpec.kind === "enum") {
                const values = allowedValues(element.type, propSpec.name) ?? [];
                // `align` is the one prop the compiler inherits; the rest fall
                // back to the catalogue default when they are not written.
                const inherits = propSpec.name === "align";
                const effective =
                  inherits && !isSet
                    ? inheritedAlign(doc as WzdDocument, selectedPath)
                    : (resolved[propSpec.name] ?? propSpec.default ?? "");
                return (
                  <div className="flex items-end gap-[6px] *:first:min-w-0 *:first:flex-1" key={propSpec.name}>
                    <ChipRow
                      kind="picker"
                      label={propSpec.name}
                      hint={
                        isSet
                          ? propSpec.description
                          : `${propSpec.description} ${inherits ? "Inherited" : "Default"}: ${effective}.`
                      }
                      options={values.map((value) => ({ value }))}
                      value={effective}
                      equal
                      disabled={disabled}
                      onValueChange={(value) => onSetProp(selectedPath, propSpec.name, value)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0"
                      disabled={disabled || !isSet}
                      aria-label={`Reset ${propSpec.name} to the default`}
                      onClick={() => onSetProp(selectedPath, propSpec.name, null)}
                    >
                      Reset
                    </Button>
                  </div>
                );
              }

              if (element.type === "Image" && propSpec.name === "src") {
                return (
                  <div className="flex items-end gap-[6px] *:first:min-w-0 *:first:flex-1" key={propSpec.name}>
                    <Input
                      label="src"
                      value={written ?? ""}
                      readOnly
                      hint={written ? "The upload this references." : "No image chosen yet."}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      className="shrink-0"
                      disabled={disabled}
                      onClick={() => onPickImage(selectedPath)}
                    >
                      Choose
                    </Button>
                  </div>
                );
              }

              return (
                <DraftField
                  key={propSpec.name}
                  label={propSpec.name + (propSpec.required ? " (required)" : "")}
                  value={written ?? ""}
                  hint={propSpec.description}
                  disabled={disabled}
                  onCommit={(next) => onSetProp(selectedPath, propSpec.name, next)}
                />
              );
            })}
          </>
        )}
      </div>
    </section>
  );
}
