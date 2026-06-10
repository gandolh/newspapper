import styles from './Stepper.module.css';

export interface Step {
  label: string;
  description?: string;
}

export type StepState = 'done' | 'current' | 'upcoming';

export interface StepperProps {
  steps: Step[];
  /** 0-based index of current step */
  current: number;
}

function getState(index: number, current: number): StepState {
  if (index < current) return 'done';
  if (index === current) return 'current';
  return 'upcoming';
}

export default function Stepper({ steps, current }: StepperProps) {
  return (
    <nav className={styles.stepper} aria-label="Progress">
      <ol className={styles.list} role="list">
        {steps.map((step, i) => {
          const state = getState(i, current);
          return (
            <li key={i} className={[styles.step, styles[`step--${state}`]].join(' ')}>
              <div className={styles.indicator} aria-hidden="true">
                <span className={styles.dot}>
                  {state === 'done' ? '✓' : i + 1}
                </span>
                {i < steps.length - 1 && <span className={styles.line} />}
              </div>
              <div className={styles.content}>
                <span
                  className={styles.label}
                  aria-current={state === 'current' ? 'step' : undefined}
                >
                  {step.label}
                </span>
                {step.description && (
                  <span className={styles.description}>{step.description}</span>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
