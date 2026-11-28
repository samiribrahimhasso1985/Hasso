'use client';

import { useEffect, useMemo, useState } from 'react';
import { ApiError, type Api, type Category, type Gender, type PersonSummary, type RelationshipTypeInfo, type Visibility } from '../lib/api';
import { useI18n } from '../lib/i18n';
import PersonPicker from './PersonPicker';

/** Words users pick from; each maps to a canonical type on the server (FATHER → PARENT …). */
const WORDS: { key: string; category: Category; type: string; gender?: 'male' | 'female'; inverse?: boolean }[] = [
  { key: 'FATHER', category: 'FAMILY', type: 'PARENT', gender: 'male' },
  { key: 'MOTHER', category: 'FAMILY', type: 'PARENT', gender: 'female' },
  { key: 'SON', category: 'FAMILY', type: 'PARENT', gender: 'male', inverse: true },
  { key: 'DAUGHTER', category: 'FAMILY', type: 'PARENT', gender: 'female', inverse: true },
  { key: 'BROTHER', category: 'FAMILY', type: 'SIBLING', gender: 'male' },
  { key: 'SISTER', category: 'FAMILY', type: 'SIBLING', gender: 'female' },
  { key: 'GRANDFATHER', category: 'FAMILY', type: 'GRANDPARENT', gender: 'male' },
  { key: 'GRANDMOTHER', category: 'FAMILY', type: 'GRANDPARENT', gender: 'female' },
  { key: 'GRANDSON', category: 'FAMILY', type: 'GRANDPARENT', gender: 'male', inverse: true },
  { key: 'GRANDDAUGHTER', category: 'FAMILY', type: 'GRANDPARENT', gender: 'female', inverse: true },
  { key: 'UNCLE', category: 'FAMILY', type: 'UNCLE_AUNT', gender: 'male' },
  { key: 'AUNT', category: 'FAMILY', type: 'UNCLE_AUNT', gender: 'female' },
  { key: 'NEPHEW', category: 'FAMILY', type: 'UNCLE_AUNT', gender: 'male', inverse: true },
  { key: 'NIECE', category: 'FAMILY', type: 'UNCLE_AUNT', gender: 'female', inverse: true },
  { key: 'COUSIN', category: 'FAMILY', type: 'COUSIN' },
  { key: 'HUSBAND', category: 'UNION', type: 'SPOUSE', gender: 'male' },
  { key: 'WIFE', category: 'UNION', type: 'SPOUSE', gender: 'female' },
  { key: 'FORMER_SPOUSE', category: 'UNION', type: 'SPOUSE' },
  { key: 'PARTNER', category: 'UNION', type: 'PARTNER' },
  { key: 'FIANCE', category: 'UNION', type: 'FIANCE' },
  ...['FRIEND', 'CLOSE_FRIEND', 'CHILDHOOD_FRIEND', 'SCHOOL_FRIEND', 'TRAVEL_FRIEND'].map((k) => ({ key: k, category: 'FRIENDSHIP' as const, type: k })),
  ...['NEIGHBOR', 'ACQUAINTANCE'].map((k) => ({ key: k, category: 'SOCIAL' as const, type: k })),
  ...['COLLEAGUE', 'FORMER_COLLEAGUE', 'BUSINESS_PARTNER', 'PROFESSIONAL_CONTACT'].map((k) => ({ key: k, category: 'PROFESSIONAL' as const, type: k })),
  { key: 'MANAGER', category: 'PROFESSIONAL', type: 'MANAGES' },
  { key: 'EMPLOYEE', category: 'PROFESSIONAL', type: 'MANAGES', inverse: true },
  { key: 'CUSTOM', category: 'CUSTOM', type: 'CUSTOM' },
];

export default function AddRelationshipDialog({
  api,
  me,
  known,
  initialPerson,
  onClose,
  onCreated,
}: {
  api: Api;
  me: PersonSummary;
  known: PersonSummary[];
  initialPerson: PersonSummary | null;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useI18n();
  const [types, setTypes] = useState<RelationshipTypeInfo[]>([]);
  const [managed, setManaged] = useState<PersonSummary[]>([me]);
  const [subject, setSubject] = useState<PersonSummary>(me);
  const [related, setRelated] = useState<PersonSummary | null>(initialPerson && initialPerson.id !== me.id ? initialPerson : null);
  const [word, setWord] = useState('FRIEND');
  const [visibility, setVisibility] = useState<Visibility | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newGender, setNewGender] = useState<Gender>('UNSPECIFIED');
  const [newBirth, setNewBirth] = useState('');
  const [newMinor, setNewMinor] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    api.types().then(setTypes).catch(() => undefined);
    api.managed().then((m) => setManaged(m.length ? m : [me])).catch(() => undefined);
  }, [api, me]);

  const label = (w: (typeof WORDS)[number]) => {
    const tp = types.find((x) => x.key === w.type);
    const l = w.inverse ? tp?.inverseLabel : tp?.label;
    if (w.key === 'FORMER_SPOUSE') return `${tp?.label?.neutral ?? w.key} (${t.endDate})`;
    if (w.key === 'CUSTOM') return t.CUSTOM;
    return (w.gender ? l?.[w.gender] : l?.neutral) ?? w.key;
  };
  const selected = WORDS.find((w) => w.key === word)!;
  const groups = useMemo(() => (['FAMILY', 'UNION', 'FRIENDSHIP', 'SOCIAL', 'PROFESSIONAL', 'CUSTOM'] as Category[]).map((c) => ({ c, words: WORDS.filter((w) => w.category === c) })), []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    try {
      let rel = related;
      if (creating) {
        const p = await api.createProfile({ displayName: newName, gender: newGender, birthDate: newBirth || undefined, isMinor: newMinor });
        rel = p;
      }
      if (!rel) return;
      const attributes: Record<string, string> = {};
      if (selected.category === 'UNION') {
        if (startDate) attributes.startDate = startDate;
        if (endDate) attributes.endDate = endDate;
        if (word === 'FORMER_SPOUSE' || endDate) attributes.endReason = 'DIVORCE';
      }
      if (word === 'CUSTOM') {
        attributes.customLabel = customLabel;
        attributes.customCategory = 'SOCIAL';
      }
      const r = await api.createRelationship({
        personId: subject.id,
        relatedPersonId: rel.id,
        type: word,
        visibility: visibility || undefined,
        attributes,
      });
      setResult(`${t[r.status]} — ${r.from.displayName} ${t.isThe} ${r.label} ${t.of} ${r.to.displayName}`);
      onCreated();
    } catch (ex) {
      if (ex instanceof ApiError) {
        const v = (ex.body as { violations?: { message: string }[] })?.violations;
        setErr(v?.length ? v.map((x) => x.message).join(' · ') : ex.message);
      } else setErr(t.error);
    }
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={t.addRelationship} onClick={onClose}>
      <form className="modal card" onClick={(e) => e.stopPropagation()} onSubmit={submit} data-testid="add-dialog">
        <h3>{t.addRelationship}</h3>
        <div className="sentence-builder">
          {creating ? (
            <fieldset className="new-person">
              <legend>{t.createProfile}</legend>
              <input placeholder={t.displayName} value={newName} onChange={(e) => setNewName(e.target.value)} required maxLength={80} />
              <select value={newGender} onChange={(e) => setNewGender(e.target.value as Gender)} aria-label={t.gender}>
                {(['UNSPECIFIED', 'MALE', 'FEMALE'] as const).map((g) => (
                  <option key={g} value={g}>
                    {t[g]}
                  </option>
                ))}
              </select>
              <label className="inline">
                {t.birthDate}
                <input type="date" value={newBirth} onChange={(e) => setNewBirth(e.target.value)} />
              </label>
              <label className="check">
                <input type="checkbox" checked={newMinor} onChange={(e) => setNewMinor(e.target.checked)} /> {t.minor}
              </label>
              <button type="button" className="link" onClick={() => setCreating(false)}>
                {t.cancel}
              </button>
            </fieldset>
          ) : (
            <>
              <label>{t.relatedPerson}</label>
              <PersonPicker api={api} value={related} onChange={setRelated} known={known} testId="pick-related" />
              <button type="button" className="link small" onClick={() => setCreating(true)}>
                + {t.createProfile}
              </button>
            </>
          )}
          <label>
            {t.isThe} — {t.type}
            <select value={word} onChange={(e) => setWord(e.target.value)} data-testid="type-select">
              {groups.map((g) => (
                <optgroup key={g.c} label={t[g.c]}>
                  {g.words.map((w) => (
                    <option key={w.key} value={w.key}>
                      {label(w)}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label>
            {t.of} — {t.person}
            <select value={subject.id} onChange={(e) => setSubject(managed.find((m) => m.id === e.target.value) ?? me)}>
              {managed.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id === me.id ? `${m.displayName} (${t.you})` : m.displayName}
                </option>
              ))}
            </select>
          </label>
          {selected.category === 'UNION' && (
            <div className="row">
              <label className="inline">
                {t.startDate}
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </label>
              <label className="inline">
                {t.endDate}
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </label>
            </div>
          )}
          {word === 'CUSTOM' && (
            <label>
              {t.customLabel}
              <input value={customLabel} onChange={(e) => setCustomLabel(e.target.value)} required maxLength={60} />
            </label>
          )}
          <label>
            {t.visibility}
            <select value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)}>
              <option value="">—</option>
              {(['PUBLIC', 'NETWORK', 'FAMILY', 'PRIVATE'] as const).map((v) => (
                <option key={v} value={v}>
                  {v === 'FAMILY' ? t.FAMILY_VIS : t[v]}
                </option>
              ))}
            </select>
          </label>
        </div>
        {(selected.category === 'FAMILY' || selected.category === 'UNION') && <p className="small note">{t.sensitiveNote}</p>}
        {err && <p className="error" role="alert">{err}</p>}
        {result && <p className="success" data-testid="add-result">{result}</p>}
        <div className="actions end">
          <button type="button" className="btn" onClick={onClose}>
            {t.close}
          </button>
          <button type="submit" className="btn gold" disabled={!creating && !related} data-testid="btn-add-submit">
            {t.save}
          </button>
        </div>
      </form>
    </div>
  );
}
