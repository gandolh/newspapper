/**
 * The proof sheet.
 *
 * Every primitive and every mark, set once on one board, so a lapse — a
 * rounded corner, a coloured pill, a second treatment for a state that
 * already has a mark — is visible at a glance. Unlinked on purpose: it is
 * QA, not a page of the product.
 */

import { useState } from 'react';
import {
  Button,
  Card,
  ConfirmDialog,
  CropMarks,
  EmptyState,
  Finding,
  HeldOut,
  Input,
  Mark,
  Modal,
  PageHeader,
  ProgressBar,
  RegisterTargets,
  Select,
  Skeleton,
  Stamp,
  Textarea,
  TissueCorner,
  Toggle,
  ToastProvider,
  useToast,
  WAX,
} from './ui';
import styles from './KitchenSinkIsland.module.css';

const SELECT_OPTIONS = [
  { value: 'warm-industrial-1', label: 'warm-industrial-1' },
  { value: 'warm-industrial-2', label: 'warm-industrial-2' },
  { value: 'warm-industrial-3', label: 'warm-industrial-3' },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className={styles.sectionTitle}>{title}</h2>
      {children}
    </Card>
  );
}

function ToastDemo() {
  const { addToast } = useToast();
  return (
    <div className={styles.row}>
      <Button size="sm" variant="secondary" onClick={() => addToast('Post saved.', 'success')}>
        Toast done
      </Button>
      <Button size="sm" variant="secondary" onClick={() => addToast('Render failed.', 'error')}>
        Toast failed
      </Button>
      <Button size="sm" variant="ghost" onClick={() => addToast('Scraping articles…', 'info')}>
        Toast note
      </Button>
    </div>
  );
}

export default function KitchenSinkIsland() {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [progress, setProgress] = useState(40);
  const [toggleOn, setToggleOn] = useState(false);
  const [theme, setTheme] = useState('warm-industrial-1');

  return (
    <ToastProvider>
      <div className={styles.sheet}>
        <PageHeader
          title="Proof sheet"
          subtitle="Every primitive and every mark, set once. If something here has a rounded corner or a coloured pill, the world has slipped."
        />

        <Section title="Marks">
          <p className={styles.note}>
            One mark per idea. Rubylith is the only way this app says “held out”.
          </p>
          <div className={styles.row}>
            <Mark>Draft</Mark>
            <Mark tone="ink">3 slides</Mark>
            <Mark tone="rubylith">2 errors</Mark>
            <Mark tone="blue">warm-industrial-1</Mark>
            <Mark bare>1 : 2</Mark>
            <Stamp>Published</Stamp>
          </div>
          <div className={styles.row}>
            <span className={styles.swatch}>
              Selected in the galley takes the <span className={WAX}>wax</span>.
            </span>
          </div>
          <div className={styles.row}>
            <HeldOut className={styles.heldOutDemo}>
              <span>Held out — the rubylith wash</span>
            </HeldOut>
            <HeldOut hatch className={styles.heldOutDemo}>
              <span>Held out — the 45° hatch, at tray scale</span>
            </HeldOut>
          </div>
          <div className={styles.row}>
            <span className={styles.cornerDemo}>
              Draft: the tissue corner
              <TissueCorner />
            </span>
            <span className={styles.frameDemo}>
              <CropMarks />
              <RegisterTargets />
            </span>
          </div>
          <Finding where="WZD201 · line 14, col 6">
            Heading runs 3 characters past the measure at xl.
          </Finding>
        </Section>

        <Section title="Buttons">
          <div className={styles.row}>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </div>
          <div className={styles.row}>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
          <div className={styles.row}>
            <Button loading>Rendering</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Section>

        <Section title="Fields">
          <div className={styles.fields}>
            <Input label="Title" placeholder="Today’s lead" hint="Sets the post’s index columns." />
            <Input label="Feed" defaultValue="not a url" error="That is not a URL." />
            <Textarea label="Caption" placeholder="What goes with the post…" />
            <Select label="Theme" options={SELECT_OPTIONS} value={theme} onValueChange={setTheme} />
            <Toggle
              label="Enabled"
              checked={toggleOn}
              onCheckedChange={setToggleOn}
              hint="Disabled feeds are skipped."
            />
            <Toggle label="Unavailable" disabled hint="Held out, at switch scale." />
          </div>
        </Section>

        <Section title="Progress and placeholders">
          <div className={styles.fields}>
            <ProgressBar value={progress} label="Rendering slides" showPercent />
            <ProgressBar value={30} variant="error" label="Failed at slide 2" showPercent />
            <div className={styles.row}>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setProgress((p) => Math.max(0, p - 10))}
              >
                −10
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setProgress((p) => Math.min(100, p + 10))}
              >
                +10
              </Button>
            </div>
            <Skeleton height={78} />
          </div>
        </Section>

        <Section title="Overlays">
          <div className={styles.row}>
            <Button variant="secondary" onClick={() => setModalOpen(true)}>
              Open modal
            </Button>
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
              Open confirm
            </Button>
          </div>
          <ToastDemo />
          <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Example modal">
            <p className={styles.note}>
              A modal has to pick one of the two shadows. It is a slip waxed over the board, so it
              takes the hard short one.
            </p>
            <Button onClick={() => setModalOpen(false)}>Close</Button>
          </Modal>
          <ConfirmDialog
            open={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={() => setConfirmOpen(false)}
            title="Delete this post?"
            message="The markup is not recoverable."
            confirmLabel="Delete"
          />
        </Section>

        <Section title="Empty">
          <EmptyState
            icon="—"
            title="Nothing set yet"
            hint="The frame is drawn; the copy has not been pasted down."
            action={<Button size="sm">Start one</Button>}
          />
        </Section>
      </div>
    </ToastProvider>
  );
}
