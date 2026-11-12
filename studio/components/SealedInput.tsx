import { useState } from 'react';
import { set, unset, type StringInputProps } from 'sanity';

// "Sealed" field: the editor types a link or passcode normally; before it is
// saved, it is encrypted (RSA-OAEP, SHA-256) with TECHMED's public key. Only
// the website's secure server (quiz-access) holds the private key, so the
// public Sanity dataset only ever contains scrambled text. Works on the free
// Sanity plan, where datasets cannot be made private.

const KEY_ENDPOINT = 'https://unbgborbhxzsotaieiun.supabase.co/functions/v1/quiz-access?action=public-key';
const PREFIX = 'sealed:v1:';
const MAX_BYTES = 190; // RSA-OAEP 2048 / SHA-256 limit

let keyPromise: Promise<CryptoKey> | null = null;
function publicKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    keyPromise = fetch(KEY_ENDPOINT)
      .then((r) => {
        if (!r.ok) throw new Error(`key ${r.status}`);
        return r.json();
      })
      .then(({ key }) =>
        crypto.subtle.importKey(
          'spki',
          Uint8Array.from(atob(key), (c) => c.charCodeAt(0)),
          { name: 'RSA-OAEP', hash: 'SHA-256' },
          false,
          ['encrypt'],
        ),
      )
      .catch((err) => {
        keyPromise = null;
        throw err;
      });
  }
  return keyPromise;
}

async function seal(text: string): Promise<string> {
  const key = await publicKey();
  const cipher = await crypto.subtle.encrypt({ name: 'RSA-OAEP' }, key, new TextEncoder().encode(text));
  return PREFIX + btoa(String.fromCharCode(...new Uint8Array(cipher)));
}

const box = (tone: 'ok' | 'warn' | 'error') => ({
  padding: '10px 12px',
  borderRadius: 6,
  fontSize: 13,
  lineHeight: 1.4,
  background: tone === 'ok' ? 'rgba(16,185,129,0.12)' : tone === 'warn' ? 'rgba(245,158,11,0.14)' : 'rgba(239,68,68,0.12)',
  border: `1px solid ${tone === 'ok' ? 'rgba(16,185,129,0.4)' : tone === 'warn' ? 'rgba(245,158,11,0.45)' : 'rgba(239,68,68,0.4)'}`,
});

const inputStyle = {
  flex: 1,
  minWidth: 0,
  padding: '9px 10px',
  borderRadius: 6,
  border: '1px solid rgba(128,128,128,0.45)',
  background: 'transparent',
  color: 'inherit',
  font: 'inherit',
  fontSize: 14,
};

const buttonStyle = (primary: boolean, disabled = false) => ({
  padding: '9px 14px',
  borderRadius: 6,
  border: primary ? 'none' : '1px solid rgba(239,68,68,0.5)',
  background: primary ? '#2276fc' : 'transparent',
  color: primary ? '#fff' : 'rgb(220,38,38)',
  fontWeight: 600,
  fontSize: 13,
  cursor: disabled ? 'default' : 'pointer',
  opacity: disabled ? 0.55 : 1,
  whiteSpace: 'nowrap' as const,
});

function makeSealedInput(kind: 'url' | 'text') {
  return function SealedInput(props: StringInputProps) {
    const { value, onChange, elementProps, readOnly } = props;
    const [draft, setDraft] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const isSealed = typeof value === 'string' && value.startsWith(PREFIX);

    const save = async () => {
      const text = draft.trim();
      setError('');
      if (!text) return;
      if (kind === 'url' && !/^https:\/\/\S+$/i.test(text)) {
        setError('Enter a full link starting with https://');
        return;
      }
      if (new TextEncoder().encode(text).length > MAX_BYTES) {
        setError('This is too long to lock (190 characters max). Use a shorter link.');
        return;
      }
      setBusy(true);
      try {
        onChange(set(await seal(text)));
        setDraft('');
      } catch {
        setError('Could not lock it. Check your internet connection and try again.');
      } finally {
        setBusy(false);
      }
    };

    return (
      <div style={{ display: 'grid', gap: 8 }}>
        {value ? (
          <div style={box(isSealed ? 'ok' : 'warn')}>
            {isSealed
              ? '🔒 Saved and locked. Only students who can open it will ever see it.'
              : '⚠ This was saved without a lock. Type it again below and press "Lock & save".'}
          </div>
        ) : null}
        {!readOnly && (
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              {...elementProps}
              value={draft}
              onChange={(e) => setDraft(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void save();
                }
              }}
              placeholder={value ? 'Type a new value to replace it' : kind === 'url' ? 'https://…' : 'Type it here'}
              type="text"
              autoComplete="off"
              spellCheck={false}
              style={inputStyle}
            />
            <button type="button" onClick={() => void save()} disabled={busy || !draft.trim()} style={buttonStyle(true, busy || !draft.trim())}>
              {busy ? 'Locking…' : 'Lock & save'}
            </button>
          </div>
        )}
        {value && !readOnly ? (
          <div>
            <button type="button" onClick={() => onChange(unset())} style={buttonStyle(false)}>
              Remove
            </button>
          </div>
        ) : null}
        {error ? <div style={box('error')}>{error}</div> : null}
      </div>
    );
  };
}

export const SealedUrlInput = makeSealedInput('url');
export const SealedTextInput = makeSealedInput('text');
export const SEALED_PREFIX = PREFIX;
