export type ShortVideoWorkflowHistoryEntry = {
    step?: string;
    action?: string;
    success?: boolean;
    elapsed_ms?: number;
    message?: string;
    at?: string;
};

export type ShortVideoWorkflowProgressStep = {
    id: string;
    label: string;
    status: 'pending' | 'running' | 'done' | 'skipped' | 'failed';
};

export type ShortVideoWorkflowProgress = {
    steps: ShortVideoWorkflowProgressStep[];
    current_step_id?: string;
    current_step_index?: number;
    total_steps?: number;
    completed_steps?: number;
    remaining_steps?: number;
    percent?: number;
    sub_progress?: { type: string; done: number; total: number };
    workflow_history?: ShortVideoWorkflowHistoryEntry[];
};
