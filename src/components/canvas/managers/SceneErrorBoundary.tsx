'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface SceneErrorBoundaryProps {
  resetKey: string;
  onSceneError: (error: Error, info?: ErrorInfo) => void;
  children: ReactNode;
}

interface SceneErrorBoundaryState {
  hasError: boolean;
  prevResetKey: string;
}

/**
 * R3F-safe ErrorBoundary rendered inside <Canvas>.
 * Returns `null` on error (delegating recovery UI to TransitionOverlay) and resets
 * cleanly whenever `resetKey` (`${requestedSceneId}-${retryNonce}`) changes.
 */
export class SceneErrorBoundary extends Component<
  SceneErrorBoundaryProps,
  SceneErrorBoundaryState
> {
  state: SceneErrorBoundaryState = {
    hasError: false,
    prevResetKey: this.props.resetKey,
  };

  static getDerivedStateFromError(): Partial<SceneErrorBoundaryState> {
    return { hasError: true };
  }

  static getDerivedStateFromProps(
    nextProps: SceneErrorBoundaryProps,
    prevState: SceneErrorBoundaryState
  ): Partial<SceneErrorBoundaryState> | null {
    if (nextProps.resetKey !== prevState.prevResetKey) {
      return {
        hasError: false,
        prevResetKey: nextProps.resetKey,
      };
    }
    return null;
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.props.onSceneError(error, errorInfo);
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

