import type { FormEvent } from 'react';

import { EmptyState } from '../../components/UI';
import type { DiscoveryData } from './interface';
import { human } from './helpers';

interface BatchesTabProps extends Pick<DiscoveryData, 'batches' | 'sources'> {
  batchName: string;
  setBatchName: (value: string) => void;
  batchDescription: string;
  setBatchDescription: (value: string) => void;
  selectedSourceIds: string[];
  setSelectedSourceIds: (value: string[]) => void;
  onCreateBatch: (event: FormEvent) => Promise<void>;
  onRunBatch: (id: string) => Promise<void>;
  onDeleteBatch: (id: string) => Promise<void>;
}

/** Creates manual source groups and lets the user queue or remove saved batches. */
export function BatchesTab({ batches, sources, batchName, setBatchName, batchDescription,
  setBatchDescription, selectedSourceIds, setSelectedSourceIds, onCreateBatch, onRunBatch,
  onDeleteBatch }: BatchesTabProps) {
  return (
<div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 360px) minmax(0, 1fr)',
          gap: 18,
          alignItems: 'start',
        }}
      >
        <form
          onSubmit={(event) => void onCreateBatch(event)}
          className="data-card"
          style={{ borderRadius: 6, padding: 18 }}
        >
          <div className="mono" style={{ fontSize: 10, color: '#64748b', marginBottom: 14 }}>
            CREATE MANUAL SOURCE BATCH
          </div>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span
              className="mono"
              style={{ display: 'block', fontSize: 9, color: '#475569', marginBottom: 5 }}
            >
              NAME
            </span>
            <input
              value={batchName}
              onChange={(event) => setBatchName(event.target.value)}
              style={{
                width: '100%',
                padding: 8,
                background: '#111c35',
                border: '1px solid #1a2540',
                borderRadius: 4,
                color: '#e2e8f0',
              }}
            />
          </label>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span
              className="mono"
              style={{ display: 'block', fontSize: 9, color: '#475569', marginBottom: 5 }}
            >
              DESCRIPTION
            </span>
            <textarea
              value={batchDescription}
              onChange={(event) => setBatchDescription(event.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: 8,
                background: '#111c35',
                border: '1px solid #1a2540',
                borderRadius: 4,
                color: '#e2e8f0',
                resize: 'vertical',
              }}
            />
          </label>
          <label style={{ display: 'block', marginBottom: 12 }}>
            <span
              className="mono"
              style={{ display: 'block', fontSize: 9, color: '#475569', marginBottom: 5 }}
            >
              SOURCES
            </span>
            <select
              multiple
              value={selectedSourceIds}
              onChange={(event) =>
                setSelectedSourceIds(
                  Array.from(event.target.selectedOptions, (option) => option.value),
                )
              }
              style={{
                width: '100%',
                minHeight: 190,
                padding: 8,
                background: '#111c35',
                border: '1px solid #1a2540',
                borderRadius: 4,
                color: '#94a3b8',
              }}
            >
              {sources
                .filter(
                  (source) =>
                    !['EMAIL_ONLY', 'RESTRICTED', 'DISABLED'].includes(
                      source.collectionCapability ?? '',
                    ),
                )
                .map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name} · {human(source.collectionCapability ?? 'UNKNOWN')}
                  </option>
                ))}
            </select>
          </label>
          <button
            type="submit"
            style={{
              width: '100%',
              padding: 9,
              background: '#3b82f6',
              border: 0,
              borderRadius: 4,
              color: '#fff',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Create batch
          </button>
        </form>
        <div className="data-card" style={{ borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #1a2540' }}>
            <strong style={{ fontSize: 12, color: '#cbd5e1' }}>Saved manual batches</strong>
            <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>
              Use these for sites you intentionally do not run on a continuous automatic schedule.
            </div>
          </div>
          {batches.length === 0 ? (
            <EmptyState
              icon="⟳"
              title="No source batches yet"
              desc="Create a batch from manual or search-only sources, then run the group through the normal queue."
            />
          ) : (
            batches.map((batch) => (
              <div
                key={batch.id}
                style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid #1a2540',
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,1fr) auto',
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <div>
                  <strong style={{ fontSize: 12, color: '#e2e8f0' }}>{batch.name}</strong>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 3 }}>
                    {batch.description ||
                      `${batch.items.length} source${batch.items.length === 1 ? '' : 's'}`}
                  </div>
                  <div style={{ marginTop: 6, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {batch.items.slice(0, 8).map((item) => (
                      <span
                        key={item.id}
                        className="mono"
                        style={{
                          fontSize: 8,
                          color: '#64748b',
                          border: '1px solid #1a2540',
                          padding: '2px 5px',
                          borderRadius: 3,
                        }}
                      >
                        {item.source.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    onClick={() => void onRunBatch(batch.id)}
                    style={{
                      padding: '6px 9px',
                      background: 'rgba(6,214,160,.1)',
                      border: '1px solid rgba(6,214,160,.25)',
                      color: '#06d6a0',
                      borderRadius: 4,
                      cursor: 'pointer',
                    }}
                  >
                    Run batch
                  </button>
                  <button
                    onClick={() => void onDeleteBatch(batch.id)}
                    style={{
                      padding: '6px 9px',
                      background: 'none',
                      border: '1px solid #1a2540',
                      color: '#64748b',
                      borderRadius: 4,
                      cursor: 'pointer',
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
  );
}
