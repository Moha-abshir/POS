import React from 'react';

interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
  const sizeClasses = {
    xs: 'w-4 h-4 border-2',
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-[3px]',
    lg: 'w-12 h-12 border-4',
  };

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Outer pulsing brand indicator */}
      <div className={`absolute rounded-full border-[var(--color-accent-subtle)] opacity-30 animate-ping ${sizeClasses[size]}`} />
      
      {/* Inner high-fidelity gradient spin ring */}
      <div 
        className={`rounded-full animate-spin border-transparent ${sizeClasses[size]}`}
        style={{
          borderTopColor: 'var(--color-accent)',
          borderLeftColor: 'var(--color-accent)',
          borderBottomColor: 'transparent',
          borderRightColor: 'transparent',
        }}
      />
    </div>
  );
}

interface TableSkeletonProps {
  rows?: number;
  cols?: number;
  className?: string;
}

export function TableSkeleton({ rows = 5, cols = 5, className = '' }: TableSkeletonProps) {
  return (
    <div className={`w-full space-y-4.5 p-4 animate-pulse ${className}`}>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <div key={rIdx} className="flex items-center justify-between py-3.5 border-b border-[var(--color-border)] last:border-b-0">
          <div className="flex items-center space-x-4 flex-1">
            {/* Lead columns simulation */}
            <div className="h-4 bg-gray-200 rounded-[var(--radius-sm)] w-1/3" />
            <div className="h-4 bg-gray-200 rounded-[var(--radius-sm)] w-1/6" />
          </div>
          {/* Secondary and tail columns simulation */}
          <div className="flex items-center space-x-6">
            <div className="h-4 bg-gray-200 rounded-[var(--radius-sm)] w-16" />
            <div className="h-4 bg-gray-200 rounded-[var(--radius-sm)] w-24" />
            <div className="h-8 bg-gray-100 rounded-[var(--radius-md)] w-16 ml-4" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface CardSkeletonProps {
  count?: number;
  className?: string;
}

export function CardSkeleton({ count = 8, className = '' }: CardSkeletonProps) {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 p-4 animate-pulse ${className}`}>
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="p-3 bg-white border border-[var(--color-border)] rounded-[var(--radius-md)] flex flex-col space-y-3.5 shadow-sm">
          {/* Mock Product Image */}
          <div className="w-full h-24 bg-gray-200/70 rounded-[var(--radius-sm)]" />
          {/* Mock Product Name */}
          <div className="h-3.5 bg-gray-200/70 rounded-[var(--radius-sm)] w-3/4" />
          {/* Mock Variant Stock Level */}
          <div className="h-2.5 bg-gray-100 rounded-[var(--radius-sm)] w-1/2" />
          {/* Mock Selling Price Tag */}
          <div className="h-5 bg-gray-200/70 rounded-[var(--radius-sm)] w-20 mt-auto" />
        </div>
      ))}
    </div>
  );
}

interface LoadingOverlayProps {
  message?: string;
  className?: string;
}

export function LoadingOverlay({ message, className = '' }: LoadingOverlayProps) {
  return (
    <div className={`absolute inset-0 bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center z-50 ${className}`}>
      <LoadingSpinner size="lg" />
      {message && <p className="mt-3.5 text-xs font-bold uppercase tracking-wider text-[var(--color-text-secondary)]">{message}</p>}
    </div>
  );
}
