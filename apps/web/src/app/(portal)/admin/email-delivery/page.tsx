'use client';

import React, { useEffect, useState } from 'react';
import { Mail, RefreshCw } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

const TEMPLATE_LABEL: Record<string, string> = {
  SUPERVISION_REQUEST: 'Supervision request to supervisor',
  SUPERVISION_ACCEPTED: 'Supervision accepted, to scholar',
  SUPERVISION_REJECTED: 'Supervision declined, to scholar',
};

function formatDateTime(value?: string) {
  const d = value ? new Date(value) : null;
  return d && !isNaN(d.getTime()) ? d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '';
}

/** Email outcomes the platform records, plus in-app and push reach. */
export default function EmailDeliveryPage() {
  const fetchAdminEmailStats = useStore((s) => s.fetchAdminEmailStats);
  const [data, setData] = useState<any>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = async () => {
    setState('loading');
    const res = await fetchAdminEmailStats();
    if (res) {
      setData(res);
      setState('ready');
    } else setState('error');
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const figures = data
    ? [
        { label: 'Emails sent', value: data.stats?.emailsSent ?? 0 },
        { label: 'Emails failed', value: data.stats?.emailsFailed ?? 0, warn: (data.stats?.emailsFailed ?? 0) > 0 },
        { label: 'In-app notifications', value: data.stats?.inAppNotifications ?? 0 },
        { label: 'Browsers with push on', value: data.stats?.activePushDevices ?? 0 },
      ]
    : [];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        meta="Communication"
        title="Email delivery"
        description={
          data?.trackedEmails
            ? `Outcomes the platform records for: ${data.trackedEmails.toLowerCase()}. Delivery and bounce data from the email provider isn’t shown here.`
            : 'Outcomes the platform records for the emails it sends.'
        }
        actions={
          <Button variant="secondary" onClick={load} disabled={state === 'loading'}>
            <RefreshCw className={cn(state === 'loading' && 'animate-spin')} aria-hidden />
            Refresh
          </Button>
        }
      />

      {state === 'loading' && !data ? (
        <div className="space-y-6" aria-busy="true" aria-label="Loading email delivery">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : state === 'error' || !data ? (
        <Card>
          <EmptyState
            icon={Mail}
            title="Email delivery could not be loaded"
            action={
              <Button variant="secondary" onClick={load}>
                Try again
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-6">
          {!data.configured && (
            <p className="rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-sm text-warning-800">
              No email API key is configured, so emails aren’t being sent. Attempts are recorded as failed.
            </p>
          )}

          <Card>
            <dl className="grid grid-cols-2 divide-line md:grid-cols-4 md:divide-x">
              {figures.map((f) => (
                <div key={f.label} className="px-5 py-4">
                  <dt className="text-sm text-ink-muted">{f.label}</dt>
                  <dd className={cn('mt-1 text-2xl font-semibold tabular-nums', f.warn ? 'text-danger-700' : 'text-ink')}>{f.value}</dd>
                </div>
              ))}
            </dl>
            <p className="border-t border-line px-5 py-3 text-sm text-ink-muted">
              Sender: {data.senderEmail || 'not set'} · Provider: {data.provider}
            </p>
          </Card>

          <Card className="overflow-hidden">
            <CardHeader title="Recent emails" description="The latest 25 recorded outcomes." />
            {(data.recentLogs || []).length === 0 ? (
              <EmptyState icon={Mail} title="No emails recorded yet" description="Outcomes appear here after supervision emails are sent." />
            ) : (
              <div className="relative overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">Recent email outcomes</caption>
                  <thead>
                    <tr className="border-b border-line bg-surface-muted text-xs text-ink-secondary">
                      <th scope="col" className="px-4 py-2.5 font-medium">Email</th>
                      <th scope="col" className="hidden px-4 py-2.5 font-medium sm:table-cell">Recipient</th>
                      <th scope="col" className="px-4 py-2.5 font-medium">Result</th>
                      <th scope="col" className="hidden px-4 py-2.5 font-medium md:table-cell">When</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {data.recentLogs.map((log: any) => (
                      <tr key={log.id}>
                        <td className="max-w-[18rem] px-4 py-3">
                          <p className="truncate text-ink">{TEMPLATE_LABEL[log.template] || log.template}</p>
                          <p className="truncate text-xs text-ink-muted sm:hidden">{log.recipient}</p>
                          {log.error && <p className="mt-0.5 truncate text-xs text-danger-700" title={log.error}>{log.error}</p>}
                        </td>
                        <td className="hidden max-w-[16rem] truncate px-4 py-3 text-ink-secondary sm:table-cell">{log.recipient || '—'}</td>
                        <td className="px-4 py-3">
                          <Badge tone={log.status === 'SENT' ? 'success' : 'danger'}>{log.status === 'SENT' ? 'Sent' : 'Failed'}</Badge>
                        </td>
                        <td className="hidden whitespace-nowrap px-4 py-3 text-ink-muted md:table-cell">{formatDateTime(log.timestamp)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
