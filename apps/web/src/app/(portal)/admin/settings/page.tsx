'use client';

import React, { useEffect, useState } from 'react';
import { RefreshCw, Settings } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DetailItem } from '@/components/ui/field';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * The configuration CuriousBees is running with. It comes from the server's
 * environment, so changes are made in deployment configuration, not here.
 */
export default function AdminSettingsPage() {
  const fetchAdminSettings = useStore((s) => s.fetchAdminSettings);
  const [config, setConfig] = useState<any>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');

  const load = async () => {
    setState('loading');
    const data = await fetchAdminSettings();
    if (data) {
      setConfig(data);
      setState('ready');
    } else setState('error');
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const Configured = ({ on }: { on: boolean }) => <Badge tone={on ? 'success' : 'warning'}>{on ? 'Configured' : 'Not configured'}</Badge>;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        meta="Insight & audit"
        title="System configuration"
        description="How this deployment is set up. These values come from the server’s environment, so they change through deployment configuration rather than here."
        actions={
          <Button variant="secondary" onClick={load} disabled={state === 'loading'}>
            <RefreshCw aria-hidden />
            Refresh
          </Button>
        }
      />

      {state === 'loading' && !config ? (
        <div className="space-y-6" aria-busy="true" aria-label="Loading configuration">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : state === 'error' || !config ? (
        <Card>
          <EmptyState
            icon={Settings}
            title="Configuration could not be loaded"
            action={
              <Button variant="secondary" onClick={load}>
                Try again
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader title="Sign-in" description={config.authentication?.method} />
            <CardBody>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailItem label="Allowed email domains">
                  {(config.authentication?.allowedDomains || []).length > 0 ? (
                    <span className="flex flex-wrap gap-1.5">
                      {config.authentication.allowedDomains.map((d: string) => (
                        <Badge key={d}>{d}</Badge>
                      ))}
                    </span>
                  ) : (
                    'None set'
                  )}
                </DetailItem>
                <DetailItem label="Set by">
                  <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs">{config.authentication?.source}</code>
                </DetailItem>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Email" description="Transactional email for account invitations and supervision updates." actions={<Configured on={!!config.email?.configured} />} />
            <CardBody>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <DetailItem label="Provider">{config.email?.provider}</DetailItem>
                <DetailItem label="Sender name">{config.email?.senderName}</DetailItem>
                <DetailItem label="Sender address">{config.email?.senderEmail || 'Not set'}</DetailItem>
              </dl>
              {!config.email?.configured && (
                <p className="mt-4 rounded-lg border border-warning-200 bg-warning-50 px-3 py-2 text-sm text-warning-800">
                  No email API key is configured, so no emails are sent. In-app notifications still work.
                </p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Meeting and chat integrations" description="Members connect their own accounts in Settings → Connected apps." />
            <ul className="divide-y divide-line">
              {[
                { name: 'Google Workspace', detail: 'Google Meet and Chat spaces', on: !!config.integrations?.googleWorkspace },
                { name: 'Zoom Workplace', detail: 'Zoom meetings', on: !!config.integrations?.zoomWorkplace },
              ].map((i) => (
                <li key={i.name} className="flex items-center justify-between gap-4 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink">{i.name}</p>
                    <p className="text-sm text-ink-muted">{i.detail}</p>
                  </div>
                  <Configured on={i.on} />
                </li>
              ))}
            </ul>
          </Card>

          {Array.isArray(config.stored) && config.stored.length > 0 && (
            <Card>
              <CardHeader title="Saved governance settings" description="Values saved by administrators. They are recorded for reference and aren’t applied automatically." />
              <ul className="divide-y divide-line">
                {config.stored.map((s: any) => (
                  <li key={s.key} className="grid grid-cols-1 gap-1 px-5 py-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)] sm:gap-4">
                    <p className="font-mono text-xs text-ink-muted">{s.key}</p>
                    <pre className="min-w-0 overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs text-ink-secondary">{JSON.stringify(s.value, null, 2)}</pre>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
