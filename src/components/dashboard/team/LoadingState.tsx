"use client";

interface LoadingStateProps {
  loadingText: string;
}

export function LoadingState({ loadingText }: LoadingStateProps) {
  return (
    <div className="h-[200px] flex items-center justify-center">
      <p className="text-muted-foreground">{loadingText}</p>
    </div>
  );
}
