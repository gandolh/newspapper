import { Component, type ErrorInfo, type ReactNode } from 'react';
import { EmptyState } from './ui';
import { withBase } from '@/lib/base';

interface Props {
  children: ReactNode;
  /** Where "go back" leads. The editor sends people to the post list. */
  backHref?: string;
  backLabel?: string;
}

interface State {
  error: Error | null;
}

/**
 * Catches a render error in its subtree and shows what happened instead of a
 * white page.
 *
 * There was no boundary anywhere in the app, so one exception unmounted the
 * whole tree. The case that found it (brief 98): a document the parser could
 * not handle threw on every keystroke and on every reload of `?post=<id>`, so
 * the post could never be opened again through the UI. The editor now sits
 * inside one of these, and the person can get back to their posts.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Editor crashed', error, info.componentStack);
  }

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <EmptyState
        title="This page hit an error"
        hint={`Something in it could not be shown: ${error.message}. Your saved posts are untouched.`}
        action={
          <a href={withBase(this.props.backHref ?? '/posts')}>
            {this.props.backLabel ?? 'Back to your posts'}
          </a>
        }
      />
    );
  }
}
