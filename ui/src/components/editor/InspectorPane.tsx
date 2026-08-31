/**
 * The tissue: the `<head>` block, and the selected component's props.
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
 */

import { useEffect, useRef, useState } from 'react';
import {
  allowedValues,
  getComponentSpec,
  propsFor,
  resolveProps,
  WZD_HEAD_FIELDS,
  type WzdDocument,
} from '@newspapper/core/wizard';
import { Button, EmptyState, Input, Select, Textarea } from '../ui';
import { ancestorPaths, elementAtPath, type WzdPath } from './paths.js';
import { inheritedAlign, textOf } from './props.js';
import { hinge } from '@/lib/motion';
import styles from './InspectorPane.module.css';

const HEAD_LABELS: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  keywords: 'Keywords',
  date: 'Date',
  caption: 'Caption',
  hashtags: 'Hashtags',
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
  disabled,
  onCommit,
}: {
  label: string;
  value: string;
  hint?: string;
  multiline?: boolean;
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
        rows={3}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
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
        if (event.key === 'Enter') {
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

export default function InspectorPane(props: InspectorPaneProps) {
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
  const pathKey = selectedPath ? selectedPath.join('.') : '';
  useEffect(() => {
    if (pathKey) hinge(sheetRef.current);
  }, [pathKey]);

  const element = doc && selectedPath ? elementAtPath(doc, selectedPath) : null;
  const spec = element ? getComponentSpec(element.type) : undefined;
  const resolved = element ? resolveProps(element) : {};

  return (
    <div className={styles.inspector} ref={sheetRef}>
      <span className={styles.hinge} aria-hidden="true" />

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Post</h3>
        <p className={styles.sectionHint}>
          The <code>&lt;head&gt;</code> block. Title, description and keywords also drive the saved
          post's index columns.
        </p>
        {WZD_HEAD_FIELDS.map((field) => (
          <DraftField
            key={field}
            label={HEAD_LABELS[field] ?? field}
            value={doc?.head[field] ?? ''}
            disabled={disabled}
            multiline={field === 'caption' || field === 'description'}
            onCommit={(next) => onSetHead(field, next)}
          />
        ))}
      </section>

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>Selection</h3>

        {!element && (
          <EmptyState
            title="Nothing selected"
            hint="Click a node in the preview, or put the cursor inside one in the source."
          />
        )}

        {element && selectedPath && (
          <>
            <nav className={styles.breadcrumb} aria-label="Ancestors">
              {ancestorPaths(selectedPath).map((path) => {
                const node = elementAtPath(doc as WzdDocument, path);
                if (!node) return null;
                return (
                  <Button
                    key={path.join('.')}
                    variant="ghost"
                    size="sm"
                    className={styles.crumb}
                    onClick={() => onSelectPath(path)}
                  >
                    {node.type}
                  </Button>
                );
              })}
            </nav>

            <div className={styles.headline}>
              <h4 className={styles.nodeName}>{element.type}</h4>
              {spec && <span className={styles.description}>{spec.description}</span>}
            </div>

            <div className={styles.actions}>
              <Button
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => onNudge(selectedPath, -1)}
              >
                Move up
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => onNudge(selectedPath, 1)}
              >
                Move down
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={disabled}
                onClick={() => onDuplicate(selectedPath)}
              >
                Duplicate
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={disabled}
                onClick={() => onRemove(selectedPath)}
              >
                Delete
              </Button>
            </div>

            {spec?.children === 'text' && (
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

              if (propSpec.kind === 'enum') {
                const values = allowedValues(element.type, propSpec.name) ?? [];
                // `align` is the one prop the compiler inherits; the rest fall
                // back to the catalogue default when they are not written.
                const inherits = propSpec.name === 'align';
                const effective =
                  inherits && !isSet
                    ? inheritedAlign(doc as WzdDocument, selectedPath)
                    : (resolved[propSpec.name] ?? propSpec.default ?? '');
                return (
                  <div className={styles.prop} key={propSpec.name}>
                    <Select
                      label={propSpec.name}
                      hint={
                        isSet
                          ? propSpec.description
                          : `${propSpec.description} ${inherits ? 'Inherited' : 'Default'}: ${effective}.`
                      }
                      options={values.map((value) => ({ value, label: value }))}
                      value={effective}
                      disabled={disabled}
                      onValueChange={(value) => onSetProp(selectedPath, propSpec.name, value)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className={styles.reset}
                      disabled={disabled || !isSet}
                      aria-label={`Reset ${propSpec.name} to the default`}
                      onClick={() => onSetProp(selectedPath, propSpec.name, null)}
                    >
                      Reset
                    </Button>
                  </div>
                );
              }

              if (element.type === 'Image' && propSpec.name === 'src') {
                return (
                  <div className={styles.prop} key={propSpec.name}>
                    <Input
                      label="src"
                      value={written ?? ''}
                      readOnly
                      hint={written ? 'The upload this references.' : 'No image chosen yet.'}
                    />
                    <Button
                      variant="secondary"
                      size="sm"
                      className={styles.reset}
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
                  label={propSpec.name + (propSpec.required ? ' (required)' : '')}
                  value={written ?? ''}
                  hint={propSpec.description}
                  disabled={disabled}
                  onCommit={(next) => onSetProp(selectedPath, propSpec.name, next)}
                />
              );
            })}
          </>
        )}
      </section>
    </div>
  );
}
