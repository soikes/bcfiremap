import { Component, ErrorInfo, ReactNode } from 'react';
import { logger } from '../utils/logger';

interface Props {
  name: string;
  fallback: ReactNode;
  resetKey?: unknown;
  children: ReactNode;
}

interface State {
  failed: boolean;
}

/** Shows `fallback` instead of its children after they throw while rendering, and tries them again when `resetKey` changes. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  /** Switches to the fallback after a child throws. */
  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  /** Logs the error and where in the component tree it happened. */
  componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error(`[ErrorBoundary] ${this.props.name} failed`, error, info.componentStack);
  }

  /** Tries the children again once `resetKey` changes. */
  componentDidUpdate(previous: Props) {
    if (this.state.failed && previous.resetKey !== this.props.resetKey) this.setState({ failed: false });
  }

  /** Renders the children, or the fallback after they failed. */
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
