// Design Ref: products-sync.design.md §9.3 (Observability) + FR-12 (Slack 실패 알림)
// Plan SC: SC-05 (Cron 실패 <1회/월), R3 (schema drift detection)
//
// Fire-and-forget Slack webhook poster. Never throws (non-critical side effect).

type FailurePayload = {
  pipelineId: string;
  stage: string;
  runId: string;
  errorMessage: string | null;
  rowsAttempted?: number;
  durationMs?: number;
};

type SchemaDriftPayload = {
  pipelineId: string;
  stage: string;
  runId: string;
  sourceTable: string;
  detectedAt: string;
};

const WEBHOOK_ENV = 'SLACK_WEBHOOK_ARC_PLATFORM';

async function postJson(url: string, body: unknown): Promise<void> {
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    // Swallow: Slack failure should never break the pipeline.
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[slack-notifier] post failed:', err instanceof Error ? err.message : err);
    }
  }
}

export async function notifyFailure(payload: FailurePayload): Promise<void> {
  const url = process.env[WEBHOOK_ENV];
  if (!url) return; // env not set → silently skip

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: '🚨 products-sync failure' },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Stage:*\n\`${payload.stage}\`` },
        { type: 'mrkdwn', text: `*Run ID:*\n\`${payload.runId}\`` },
        { type: 'mrkdwn', text: `*Pipeline:*\n\`${payload.pipelineId}\`` },
        { type: 'mrkdwn', text: `*Duration:*\n${payload.durationMs ?? '-'} ms` },
      ],
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*Error:*\n\`\`\`${payload.errorMessage ?? 'Unknown'}\`\`\``,
      },
    },
  ];

  await postJson(url, { blocks });
}

export async function notifySchemaDrift(payload: SchemaDriftPayload): Promise<void> {
  const url = process.env[WEBHOOK_ENV];
  if (!url) return;

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: '⚠️ products-sync schema drift detected' },
    },
    {
      type: 'section',
      fields: [
        { type: 'mrkdwn', text: `*Source:*\n\`${payload.sourceTable}\`` },
        { type: 'mrkdwn', text: `*Stage:*\n\`${payload.stage}\`` },
        { type: 'mrkdwn', text: `*Run ID:*\n\`${payload.runId}\`` },
        { type: 'mrkdwn', text: `*Detected:*\n${payload.detectedAt}` },
      ],
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '_Sync halted to avoid data corruption. Investigate source schema vs adapter expectations._',
      },
    },
  ];

  await postJson(url, { blocks });
}
