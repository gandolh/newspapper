import { useState } from 'react';
import {
  Button,
  Card,
  Input,
  Textarea,
  Select,
  Toggle,
  Badge,
  Spinner,
  EmptyState,
  Modal,
  ToastProvider,
  useToast,
  Stepper,
  ProgressBar,
  ConfirmDialog,
} from './ui';

const STEPS = [
  { label: 'Sources', description: 'Pick feeds' },
  { label: 'Compose', description: 'AI writing' },
  { label: 'Render', description: 'Make PNGs' },
  { label: 'Export', description: 'Download' },
];

const SELECT_OPTIONS = [
  { value: 'llama3.2:1b', label: 'llama3.2:1b' },
  { value: 'llama3.2:3b', label: 'llama3.2:3b' },
  { value: 'mistral', label: 'mistral' },
];

function ToastDemo() {
  const { addToast } = useToast();
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      <Button size="sm" variant="secondary" onClick={() => addToast('Post created!', 'success')}>
        Toast success
      </Button>
      <Button size="sm" variant="secondary" onClick={() => addToast('Render failed.', 'error')}>
        Toast error
      </Button>
      <Button size="sm" variant="ghost" onClick={() => addToast('Scraping articles…', 'info')}>
        Toast info
      </Button>
    </div>
  );
}

export default function KitchenSinkIsland() {
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [progress, setProgress] = useState(40);
  const [toggleOn, setToggleOn] = useState(false);

  return (
    <ToastProvider>
      <div style={{ maxWidth: 800, display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 4 }}>
            Kitchen Sink
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>
            Every component in the UI kit — for visual QA.
          </p>
        </div>

        {/* ---- Buttons ---- */}
        <Card>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Buttons</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
          </div>
        </Card>

        {/* ---- Form inputs ---- */}
        <Card>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Form Controls</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Input label="Article title" placeholder="Enter title…" hint="Used as the slide heading" />
            <Input label="URL" placeholder="https://…" error="Invalid URL" />
            <Textarea label="Prompt" defaultValue="Write a compelling post about today's top stories." rows={3} />
            <Select
              label="Model"
              options={SELECT_OPTIONS}
              defaultValue="llama3.2:1b"
              hint="Ollama model to use"
            />
            <Toggle
              label="Enable source"
              checked={toggleOn}
              onCheckedChange={(c) => setToggleOn(c)}
              hint="Toggle this RSS feed on or off"
            />
          </div>
        </Card>

        {/* ---- Badges ---- */}
        <Card>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Badges</h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Badge variant="default">default</Badge>
            <Badge variant="primary">primary</Badge>
            <Badge variant="success">success</Badge>
            <Badge variant="warning">warning</Badge>
            <Badge variant="error">error</Badge>
            <Badge variant="muted">muted</Badge>
          </div>
        </Card>

        {/* ---- Spinner ---- */}
        <Card>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Spinner</h2>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <Spinner size={16} color="var(--primary)" />
            <Spinner size={24} color="var(--muted)" />
            <Spinner size={36} color="var(--secondary)" />
          </div>
        </Card>

        {/* ---- Progress bar ---- */}
        <Card>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>ProgressBar</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <ProgressBar value={progress} label="Rendering slides" showPercent />
            <ProgressBar value={75} variant="success" label="Success" showPercent />
            <ProgressBar value={30} variant="error" label="Error" showPercent />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <Button size="sm" variant="secondary" onClick={() => setProgress((p) => Math.max(0, p - 10))}>–10</Button>
              <Button size="sm" variant="secondary" onClick={() => setProgress((p) => Math.min(100, p + 10))}>+10</Button>
            </div>
          </div>
        </Card>

        {/* ---- Stepper ---- */}
        <Card>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Stepper</h2>
          <Stepper steps={STEPS} current={currentStep} />
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <Button size="sm" variant="secondary" onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}>Back</Button>
            <Button size="sm" onClick={() => setCurrentStep((s) => Math.min(STEPS.length - 1, s + 1))}>Next</Button>
          </div>
        </Card>

        {/* ---- Toast ---- */}
        <Card>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Toasts</h2>
          <ToastDemo />
        </Card>

        {/* ---- Modal ---- */}
        <Card>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Modal</h2>
          <Button variant="secondary" onClick={() => setModalOpen(true)}>Open modal</Button>
          <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Example modal">
            <p style={{ color: 'var(--muted)', marginBottom: 16, lineHeight: 1.6 }}>
              This is a focus-trapped modal. Press Esc or click outside to close.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
              <Button onClick={() => setModalOpen(false)}>Confirm</Button>
            </div>
          </Modal>
        </Card>

        {/* ---- ConfirmDialog ---- */}
        <Card>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>ConfirmDialog</h2>
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>Delete post</Button>
          <ConfirmDialog
            open={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={() => setConfirmOpen(false)}
            title="Delete post?"
            message="This will permanently remove the post and all rendered slides. This action cannot be undone."
            confirmLabel="Delete"
            cancelLabel="Keep it"
          />
        </Card>

        {/* ---- EmptyState ---- */}
        <Card padding="none">
          <h2 style={{ fontSize: 14, fontWeight: 700, margin: '16px 16px 0', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>EmptyState</h2>
          <EmptyState
            icon="◷"
            title="No posts yet"
            hint="Run the pipeline to generate your first slide post."
            action={<Button>Create post</Button>}
          />
        </Card>
      </div>
    </ToastProvider>
  );
}
