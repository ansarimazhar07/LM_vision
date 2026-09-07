import React from 'react';
import type { ReactNode } from 'react';
import type { CreateInspectionDraftInput, LocalInspectionDraft } from './draft';
import { InspectionWorkflowProvider, useInspectionWorkflow } from './InspectionWorkflowProvider';

export interface InspectionDraftContextValue {
  draft: LocalInspectionDraft | null;
  startDraft: (input: CreateInspectionDraftInput) => LocalInspectionDraft;
  clearDraft: () => void;
}

export function InspectionDraftProvider({ children }: { children: ReactNode }): React.JSX.Element {
  return <InspectionWorkflowProvider>{children}</InspectionWorkflowProvider>;
}

export function useInspectionDraft(): InspectionDraftContextValue {
  const workflow = useInspectionWorkflow();
  return {
    draft: workflow.activeDraft,
    startDraft: workflow.startInspection,
    clearDraft: workflow.clearActiveDraft,
  };
}
