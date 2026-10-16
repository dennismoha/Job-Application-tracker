import { useCallback, useEffect, useState } from 'react';

import { api } from '../../api/client';
import { useToast } from '../../components/Toast';
import type { Batch, DiscoveryData, EmailItem } from './interface';
import type { SourceSummary } from '../../types/jobs';

/** Loads email alerts, saved batches, and selectable sources when a discovery tab is active. */
export function useDiscoveryData(enabled: boolean): DiscoveryData {
  const toast = useToast();
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [sources, setSources] = useState<SourceSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [emailResponse, batchResponse, sourceResponse] = await Promise.all([
        api<{ emails: EmailItem[] }>('/api/email-ingestions'),
        api<{ batches: Batch[] }>('/api/source-batches'),
        api<{ sources: SourceSummary[] }>('/api/sources'),
      ]);
      setEmails(emailResponse.emails);
      setBatches(batchResponse.batches);
      setSources(sourceResponse.sources);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'Discovery tools could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (enabled) void refresh();
  }, [enabled, refresh]);

  return { emails, batches, sources, loading, refresh };
}
