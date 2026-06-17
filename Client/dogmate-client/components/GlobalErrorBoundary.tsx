import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { registerErrorBoundaryReset } from '../utils/errorBoundaryControl';
import { handleBoundarySystemError } from '../utils/systemErrorReporting';
import { shouldIgnoreErrorForReporting } from '../utils/expoInternalWarningFilter';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export default class GlobalErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  componentDidMount(): void {
    this.unregisterReset = registerErrorBoundaryReset(() => {
      this.setState({ hasError: false });
    });
  }

  componentWillUnmount(): void {
    this.unregisterReset?.();
  }

  private unregisterReset?: () => void;

  static getDerivedStateFromError(error: Error): State | null {
    if (shouldIgnoreErrorForReporting(error)) return null;
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (shouldIgnoreErrorForReporting(error)) return;
    handleBoundarySystemError(error, info.componentStack);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.fallback}>
          <Text style={styles.title}>משהו השתבש במערכת...</Text>
          <Text style={styles.body}>אפשר לנסות לטעון מחדש את המסך.</Text>
          <TouchableOpacity style={styles.button} onPress={this.handleRetry} activeOpacity={0.85}>
            <Text style={styles.buttonText}>נסה שוב</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    backgroundColor: '#FAEFDD',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5C4033',
    marginBottom: 10,
    textAlign: 'center',
    writingDirection: 'rtl',
  },
  body: {
    fontSize: 15,
    color: '#5C4033',
    textAlign: 'center',
    writingDirection: 'rtl',
    marginBottom: 18,
  },
  button: {
    backgroundColor: '#7FB069',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    writingDirection: 'rtl',
  },
});
