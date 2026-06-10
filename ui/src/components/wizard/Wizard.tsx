import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import type { PostRow } from '../../lib/types';
import { Stepper, ToastProvider } from '../ui';
import { ScrapeStep } from './ScrapeStep';
import { ComposeStep } from './ComposeStep';
// TEMP STUB imports — replaced by agents 3B/3C when they land
import { EditorStep } from '../editor/EditorStep';
import { ExportStep } from '../export/ExportStep';
import styles from './Wizard.module.css';

// ---------------------------------------------------------------------------
// Wizard steps definition
// ---------------------------------------------------------------------------
const STEPS = [
  { label: 'Scrape', description: 'Fetch & curate' },
  { label: 'Compose', description: 'AI drafts post' },
  { label: 'Edit', description: 'Review slides' },
  { label: 'Export', description: 'Download PNGs' },
];

type WizardStep = 1 | 2 | 3 | 4;

// ---------------------------------------------------------------------------
// Wizard container
// ---------------------------------------------------------------------------
export default function Wizard() {
  const [step, setStep] = useState<WizardStep>(1);
  const [selectedArticleIds, setSelectedArticleIds] = useState<number[]>([]);
  const [post, setPost] = useState<PostRow | null>(null);
  const [initializing, setInitializing] = useState(true);

  // Deep link: ?post=<id>[&step=4]
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const postId = params.get('post');
    const stepParam = params.get('step');

    if (postId) {
      (async () => {
        try {
          const fetched = await api<PostRow>(`/api/posts/${postId}`);
          setPost(fetched);
          const targetStep = stepParam === '4' ? 4 : 3;
          setStep(targetStep as WizardStep);
        } catch {
          // Post not found — stay on step 1
        } finally {
          setInitializing(false);
        }
      })();
    } else {
      setInitializing(false);
    }
  }, []);

  // Allow clicking a completed step to go back
  function handleStepClick(idx: number) {
    const clickedStep = (idx + 1) as WizardStep;
    if (clickedStep < step) {
      setStep(clickedStep);
    }
  }

  function handleScrapeNext(ids: number[]) {
    setSelectedArticleIds(ids);
    setStep(2);
  }

  function handleComposeDone(p: PostRow) {
    setPost(p);
    setStep(3);
  }

  function handlePostUpdated(p: PostRow) {
    setPost(p);
  }

  if (initializing) {
    return null; // brief flash avoided by ToastProvider already in DOM
  }

  return (
    <ToastProvider>
      <div className={styles.wizard}>
        {/* Stepper */}
        <div className={styles.stepperWrap}>
          <ClickableStepper
            steps={STEPS}
            current={step - 1}
            onStepClick={handleStepClick}
          />
        </div>

        {/* Step content */}
        <div className={styles.stepContent}>
          {step === 1 && (
            <ScrapeStep onNext={handleScrapeNext} />
          )}
          {step === 2 && (
            <ComposeStep
              articleIds={selectedArticleIds}
              onDone={handleComposeDone}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && post && (
            <EditorStep
              post={post}
              onPostUpdated={handlePostUpdated}
              onNext={() => setStep(4)}
              onBack={() => setStep(2)}
            />
          )}
          {step === 4 && post && (
            <ExportStep
              post={post}
              onPostUpdated={handlePostUpdated}
              onBack={() => setStep(3)}
            />
          )}
        </div>
      </div>
    </ToastProvider>
  );
}

// ---------------------------------------------------------------------------
// ClickableStepper — wraps the Kit Stepper and makes completed steps clickable
// ---------------------------------------------------------------------------
function ClickableStepper({
  steps,
  current,
  onStepClick,
}: {
  steps: typeof STEPS;
  current: number;
  onStepClick: (idx: number) => void;
}) {
  return (
    <div className={styles.clickableStepper}>
      {/* Render the kit Stepper for visual output */}
      <Stepper steps={steps} current={current} />
      {/* Invisible click targets over each completed step */}
      <div className={styles.stepClickLayer} aria-hidden="true">
        {steps.map((_, i) => (
          <button
            key={i}
            className={[
              styles.stepClickTarget,
              i < current ? styles.stepClickTargetActive : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onStepClick(i)}
            tabIndex={i < current ? 0 : -1}
            aria-label={i < current ? `Go back to ${steps[i].label}` : undefined}
          />
        ))}
      </div>
    </div>
  );
}
