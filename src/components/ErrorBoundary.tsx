'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary robusto para capturar errores de React
 * Si falla, muestra un fallback simple sin romper toda la app
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Solo log en desarrollo, no en producción
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary capturó un error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      // Si hay un fallback personalizado, usarlo
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Fallback por defecto: renderizar children sin wrappers
      // Esto evita que un error en un componente rompa toda la app
      return this.props.children;
    }

    return this.props.children;
  }
}
