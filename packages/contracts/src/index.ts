export type AuditStatus =
  | 'CREATED'
  | 'QUEUED'
  | 'CRAWLING'
  | 'ANALYZING'
  | 'FINDINGS_READY'
  | 'AI_PROCESSING'
  | 'PROPOSAL_GENERATING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type JobType =
  | 'crawl.audit'
  | 'screenshot.audit'
  | 'analysis.audit'
  | 'ai.recommendations'
  | 'ai.strategy'
  | 'proposal.generate'
  | 'proposal.export';

export interface CreateAuditCommand {
  userId: string;
  url: string;
}

export interface JobEnvelope<TPayload> {
  jobId: string;
  jobType: JobType;
  auditId: string;
  attempt: number;
  correlationId: string;
  payload: TPayload;
  createdAt: string;
}

export interface ProgressEvent {
  auditId: string;
  jobId: string;
  status: AuditStatus;
  stage: string;
  progress: number;
  timestamp: string;
}
