import { FormEvent, useEffect, useState } from 'react';

import { api } from '../api/client';
import { TagInput } from '../components/UI';
import { useToast } from '../components/Toast';
import type { SearchProfileSummary } from '../types/jobs';

interface Category {
  id: string;
  name: string;
  slug: string;
}
interface ProfileDetail extends SearchProfileSummary {
  minimumSalary?: number | null;
  salaryCurrency?: string | null;
  _count?: { subscriptions: number; applications: number };
}
interface Prefs {
  notifyNew: boolean;
  notifyFailures: boolean;
  notifyApplications: boolean;
  density: 'compact' | 'default' | 'relaxed';
}
const PREF_KEY = 'jobintel-ui-preferences';

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(7,11,20,.86)',
        zIndex: 400,
        display: 'grid',
        placeItems: 'center',
        padding: 20,
      }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          width: 'min(780px,96vw)',
          maxHeight: '92vh',
          overflowY: 'auto',
          background: '#0d1425',
          border: '1px solid #1a2540',
          borderRadius: 7,
        }}
      >
        {children}
      </div>
    </div>
  );
}
function Toggle({ value, onChange }: { value: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{
        width: 38,
        height: 21,
        padding: 0,
        border: 0,
        borderRadius: 11,
        background: value ? '#3b82f6' : '#1a2540',
        position: 'relative',
        cursor: 'pointer',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: value ? 20 : 3,
          width: 15,
          height: 15,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left .15s',
        }}
      />
    </button>
  );
}

export default function Settings({
  profiles,
  activeProfileId,
  onProfilesChanged,
}: {
  profiles: SearchProfileSummary[];
  activeProfileId: string;
  onProfilesChanged: () => Promise<void>;
}) {
  const toast = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<ProfileDetail | null>(null);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [prefs, setPrefs] = useState<Prefs>(() => {
    try {
      return JSON.parse(localStorage.getItem(PREF_KEY) ?? '') as Prefs;
    } catch {
      return {
        notifyNew: true,
        notifyFailures: true,
        notifyApplications: true,
        density: 'default',
      };
    }
  });
  useEffect(() => {
    void api<{ categories: Category[] }>('/api/profiles/categories')
      .then((r) => setCategories(r.categories))
      .catch(() => setCategories([]));
  }, []);
  useEffect(() => {
    localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
    document.documentElement.dataset.density = prefs.density;
  }, [prefs]);
  async function openProfile(id: string) {
    try {
      const r = await api<{ profile: ProfileDetail }>(`/api/profiles/${id}`);
      setEditing(r.profile);
    } catch (c) {
      toast.error(c instanceof Error ? c.message : 'Could not load profile.');
    }
  }
  async function toggleProfile(profile: SearchProfileSummary) {
    try {
      await api(`/api/profiles/${profile.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ enabled: !profile.enabled }),
      });
      toast.success(`${profile.name} ${profile.enabled ? 'disabled' : 'enabled'}.`);
      await onProfilesChanged();
    } catch (c) {
      toast.error(c instanceof Error ? c.message : 'Could not update profile.');
    }
  }
  async function remove(id: string, name: string) {
    if (
      !window.confirm(
        `Delete “${name}”? Applications remain, but profile subscriptions will be removed.`,
      )
    )
      return;
    try {
      await api(`/api/profiles/${id}`, { method: 'DELETE' });
      toast.success('Search profile deleted.');
      await onProfilesChanged();
    } catch (c) {
      toast.error(c instanceof Error ? c.message : 'Could not delete profile.');
    }
  }
  return (
    <div style={{ padding: '26px 30px', maxWidth: 1050 }}>
      {(creating || editing) && (
        <ProfileModal
          categories={categories}
          initial={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          busy={busy}
          setBusy={setBusy}
          onSaved={async () => {
            setCreating(false);
            setEditing(null);
            await onProfilesChanged();
            toast.success(editing ? 'Search profile updated.' : 'Search profile created.');
          }}
        />
      )}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 20, color: '#e2e8f0', fontWeight: 600 }}>Settings</h1>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#475569' }}>
            Define what you are looking for and how the workspace should behave.
          </p>
        </div>
        <button
          onClick={() => setCreating(true)}
          style={{
            padding: '7px 12px',
            background: '#3b82f6',
            border: 0,
            borderRadius: 4,
            color: '#fff',
            fontWeight: 600,
          }}
        >
          + Search profile
        </button>
      </div>

      <section style={{ marginBottom: 22 }}>
        <div
          className="mono"
          style={{ fontSize: 9, color: '#475569', letterSpacing: '.09em', marginBottom: 9 }}
        >
          SEARCH PROFILES
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {profiles.length === 0 ? (
            <div
              className="data-card"
              style={{ padding: 18, borderRadius: 6, color: '#64748b', fontSize: 11 }}
            >
              Create a profile such as UAE Teaching or Remote Software Engineering. Profiles control
              keywords, locations, freshness and source subscriptions.
            </div>
          ) : (
            profiles.map((profile) => (
              <div
                key={profile.id}
                className="data-card"
                style={{
                  borderRadius: 6,
                  padding: '13px 15px',
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0,1fr) auto',
                  gap: 16,
                  alignItems: 'center',
                  borderColor: profile.id === activeProfileId ? 'rgba(59,130,246,.35)' : '#1a2540',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <strong style={{ fontSize: 12, color: '#e2e8f0' }}>{profile.name}</strong>
                    <span
                      className="mono"
                      style={{ fontSize: 8, color: profile.enabled ? '#06d6a0' : '#64748b' }}
                    >
                      {profile.enabled ? 'ACTIVE' : 'PAUSED'}
                    </span>
                    {profile.id === activeProfileId && (
                      <span className="mono" style={{ fontSize: 8, color: '#3b82f6' }}>
                        CURRENT
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 4, lineHeight: 1.5 }}>
                    {profile.description ||
                      [...profile.keywords, ...profile.locations].slice(0, 8).join(' · ') ||
                      'No targeting rules yet.'}
                  </div>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 7 }}>
                    {profile.keywords.slice(0, 6).map((k) => (
                      <span
                        key={k}
                        style={{
                          fontSize: 8,
                          color: '#94a3b8',
                          background: '#111c35',
                          border: '1px solid #1a2540',
                          padding: '2px 5px',
                          borderRadius: 3,
                        }}
                      >
                        {k}
                      </span>
                    ))}
                    {profile.countries.map((k) => (
                      <span
                        key={k}
                        className="mono"
                        style={{ fontSize: 8, color: '#60a5fa', padding: '2px 4px' }}
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 5 }}>
                  <button
                    onClick={() => void toggleProfile(profile)}
                    style={{
                      padding: '5px 8px',
                      background: 'none',
                      border: '1px solid #1a2540',
                      color: '#64748b',
                      borderRadius: 4,
                    }}
                  >
                    {profile.enabled ? 'Pause' : 'Enable'}
                  </button>
                  <button
                    onClick={() => void openProfile(profile.id)}
                    style={{
                      padding: '5px 8px',
                      background: '#111c35',
                      border: '1px solid #243050',
                      color: '#94a3b8',
                      borderRadius: 4,
                    }}
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => void remove(profile.id, profile.name)}
                    style={{
                      padding: '5px 8px',
                      background: 'none',
                      border: '1px solid rgba(239,68,68,.18)',
                      color: '#ef4444',
                      borderRadius: 4,
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section style={{ marginBottom: 22 }}>
        <div
          className="mono"
          style={{ fontSize: 9, color: '#475569', letterSpacing: '.09em', marginBottom: 9 }}
        >
          WORKSPACE PREFERENCES
        </div>
        <div className="data-card" style={{ borderRadius: 6, overflow: 'hidden' }}>
          {[
            [
              'New job notifications',
              'Highlight new opportunities when monitored sources find them',
              'notifyNew',
            ],
            [
              'Source failure notifications',
              'Surface challenged, rate-limited or broken sources',
              'notifyFailures',
            ],
            [
              'Application reminders',
              'Keep interview and follow-up activity visible',
              'notifyApplications',
            ],
          ].map(([label, desc, key]) => (
            <div
              key={key}
              style={{
                padding: '12px 15px',
                borderBottom: '1px solid #1a2540',
                display: 'flex',
                justifyContent: 'space-between',
                gap: 16,
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: '#cbd5e1' }}>{label}</div>
                <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>{desc}</div>
              </div>
              <Toggle
                value={Boolean(prefs[key as keyof Prefs])}
                onChange={(value) => setPrefs((p) => ({ ...p, [key]: value }))}
              />
            </div>
          ))}
          <div
            style={{
              padding: '12px 15px',
              display: 'flex',
              justifyContent: 'space-between',
              gap: 16,
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: 11, color: '#cbd5e1' }}>Information density</div>
              <div style={{ fontSize: 10, color: '#475569', marginTop: 2 }}>
                Controls how tightly operational tables are displayed.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 5 }}>
              {(['compact', 'default', 'relaxed'] as const).map((value) => (
                <button
                  key={value}
                  onClick={() => setPrefs((p) => ({ ...p, density: value }))}
                  style={{
                    padding: '5px 8px',
                    background: prefs.density === value ? 'rgba(59,130,246,.12)' : 'none',
                    border: `1px solid ${prefs.density === value ? '#3b82f6' : '#1a2540'}`,
                    color: prefs.density === value ? '#60a5fa' : '#64748b',
                    borderRadius: 4,
                    textTransform: 'capitalize',
                  }}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div
          className="mono"
          style={{ fontSize: 9, color: '#475569', letterSpacing: '.09em', marginBottom: 9 }}
        >
          SYSTEM BEHAVIOUR
        </div>
        <div className="data-card" style={{ borderRadius: 6, padding: 15 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {[
              [
                'Deduplication',
                'Always on',
                'All acquisition paths resolve into canonical jobs instead of creating isolated copies.',
              ],
              [
                'Freshness',
                'Profile controlled',
                'Posting age and “added to my system” remain separate signals.',
              ],
              [
                'Browser credentials',
                'Separate tokens',
                'Browser Companion uses revocable tokens instead of your login password.',
              ],
            ].map(([title, state, desc]) => (
              <div
                key={title}
                style={{
                  padding: 11,
                  background: '#111c35',
                  border: '1px solid #1a2540',
                  borderRadius: 5,
                }}
              >
                <div className="mono" style={{ fontSize: 8, color: '#475569' }}>
                  {title.toUpperCase()}
                </div>
                <strong
                  style={{ display: 'block', fontSize: 11, color: '#06d6a0', margin: '4px 0' }}
                >
                  {state}
                </strong>
                <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.45 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ProfileModal({
  categories,
  initial,
  onClose,
  busy,
  setBusy,
  onSaved,
}: {
  categories: Category[];
  initial: ProfileDetail | null;
  onClose: () => void;
  busy: boolean;
  setBusy: (v: boolean) => void;
  onSaved: () => Promise<void>;
}) {
  const toast = useToast();
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [keywords, setKeywords] = useState(initial?.keywords ?? []);
  const [excluded, setExcluded] = useState(initial?.excludedKeywords ?? []);
  const [countries, setCountries] = useState(initial?.countries ?? []);
  const [locations, setLocations] = useState(initial?.locations ?? []);
  const [remoteOnly, setRemoteOnly] = useState(initial?.remoteOnly ?? false);
  const [freshness, setFreshness] = useState(initial?.defaultFreshnessDays ?? 7);
  const [expiry, setExpiry] = useState(initial?.defaultExpiryDays ?? 30);
  const [categoryIds, setCategoryIds] = useState<string[]>(
    initial?.categories?.map((c) => c.id) ?? [],
  );
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    try {
      const body = {
        name,
        description: description || null,
        keywords,
        excludedKeywords: excluded,
        countries,
        locations,
        remoteOnly,
        defaultFreshnessDays: Number(freshness),
        defaultExpiryDays: Number(expiry),
        enabled: initial?.enabled ?? true,
        categoryIds,
      };
      await api(initial ? `/api/profiles/${initial.id}` : '/api/profiles', {
        method: initial ? 'PATCH' : 'POST',
        body: JSON.stringify(body),
      });
      await onSaved();
    } catch (c) {
      toast.error(c instanceof Error ? c.message : 'Could not save profile.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal onClose={onClose}>
      <form onSubmit={submit}>
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #1a2540',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div className="mono" style={{ fontSize: 9, color: '#475569' }}>
              SEARCH PROFILE
            </div>
            <h2 style={{ margin: '4px 0 0', fontSize: 15, color: '#e2e8f0' }}>
              {initial ? 'Edit profile' : 'Create profile'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 0, color: '#64748b' }}
          >
            ✕
          </button>
        </div>
        <div style={{ padding: 20, display: 'grid', gap: 13 }}>
          <label>
            <span
              className="mono"
              style={{ display: 'block', fontSize: 9, color: '#475569', marginBottom: 5 }}
            >
              NAME
            </span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 9px',
                background: '#111c35',
                border: '1px solid #1a2540',
                borderRadius: 4,
                color: '#e2e8f0',
              }}
            />
          </label>
          <label>
            <span
              className="mono"
              style={{ display: 'block', fontSize: 9, color: '#475569', marginBottom: 5 }}
            >
              DESCRIPTION
            </span>
            <textarea
              value={description ?? ''}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              style={{
                width: '100%',
                padding: 9,
                background: '#111c35',
                border: '1px solid #1a2540',
                borderRadius: 4,
                color: '#e2e8f0',
              }}
            />
          </label>
          <div>
            <span
              className="mono"
              style={{ display: 'block', fontSize: 9, color: '#475569', marginBottom: 5 }}
            >
              INCLUDE KEYWORDS
            </span>
            <TagInput
              tags={keywords}
              onChange={setKeywords}
              placeholder="Mathematics, Chemistry…"
            />
          </div>
          <div>
            <span
              className="mono"
              style={{ display: 'block', fontSize: 9, color: '#475569', marginBottom: 5 }}
            >
              EXCLUDE KEYWORDS
            </span>
            <TagInput tags={excluded} onChange={setExcluded} placeholder="Internship…" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <span
                className="mono"
                style={{ display: 'block', fontSize: 9, color: '#475569', marginBottom: 5 }}
              >
                COUNTRIES
              </span>
              <TagInput tags={countries} onChange={setCountries} placeholder="UAE…" />
            </div>
            <div>
              <span
                className="mono"
                style={{ display: 'block', fontSize: 9, color: '#475569', marginBottom: 5 }}
              >
                LOCATIONS
              </span>
              <TagInput tags={locations} onChange={setLocations} placeholder="Dubai…" />
            </div>
          </div>
          {categories.length > 0 && (
            <div>
              <span
                className="mono"
                style={{ display: 'block', fontSize: 9, color: '#475569', marginBottom: 5 }}
              >
                CATEGORIES
              </span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {categories.map((c) => (
                  <button
                    type="button"
                    key={c.id}
                    onClick={() =>
                      setCategoryIds((ids) =>
                        ids.includes(c.id) ? ids.filter((id) => id !== c.id) : [...ids, c.id],
                      )
                    }
                    style={{
                      padding: '4px 7px',
                      background: categoryIds.includes(c.id) ? 'rgba(59,130,246,.12)' : 'none',
                      border: `1px solid ${categoryIds.includes(c.id) ? '#3b82f6' : '#1a2540'}`,
                      color: categoryIds.includes(c.id) ? '#60a5fa' : '#64748b',
                      borderRadius: 4,
                      fontSize: 9,
                    }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <label style={{ fontSize: 10, color: '#94a3b8' }}>
              Freshness days
              <input
                type="number"
                min={1}
                max={365}
                value={freshness}
                onChange={(e) => setFreshness(Number(e.target.value))}
                style={{
                  display: 'block',
                  width: '100%',
                  marginTop: 5,
                  padding: 7,
                  background: '#111c35',
                  border: '1px solid #1a2540',
                  color: '#e2e8f0',
                  borderRadius: 4,
                }}
              />
            </label>
            <label style={{ fontSize: 10, color: '#94a3b8' }}>
              Expiry days
              <input
                type="number"
                min={1}
                max={730}
                value={expiry}
                onChange={(e) => setExpiry(Number(e.target.value))}
                style={{
                  display: 'block',
                  width: '100%',
                  marginTop: 5,
                  padding: 7,
                  background: '#111c35',
                  border: '1px solid #1a2540',
                  color: '#e2e8f0',
                  borderRadius: 4,
                }}
              />
            </label>
            <label
              style={{
                fontSize: 10,
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                paddingTop: 20,
              }}
            >
              <input
                type="checkbox"
                checked={remoteOnly}
                onChange={(e) => setRemoteOnly(e.target.checked)}
              />{' '}
              Remote only
            </label>
          </div>
        </div>
        <div
          style={{
            padding: '11px 20px',
            borderTop: '1px solid #1a2540',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 7,
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 10px',
              background: 'none',
              border: '1px solid #1a2540',
              color: '#64748b',
              borderRadius: 4,
            }}
          >
            Cancel
          </button>
          <button
            disabled={busy}
            style={{
              padding: '6px 10px',
              background: '#3b82f6',
              border: 0,
              color: '#fff',
              borderRadius: 4,
            }}
          >
            {busy ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
