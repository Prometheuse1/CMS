import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

const API_URL = (process.env.REACT_APP_API_URL || window.location.origin).replace(/\/+$/, '');
const SESSION_KEY = 'cms_session';

const loadSession = () => {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || null; } catch { return null; }
};
const saveSession = (session) => {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch { /* ignore */ }
};

const emptyForm = { nom: '', email: '', age: '' };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SORTS = {
  nomAsc: { label: 'Nom (A → Z)', fn: (a, b) => a.nom.localeCompare(b.nom, 'fr') },
  nomDesc: { label: 'Nom (Z → A)', fn: (a, b) => b.nom.localeCompare(a.nom, 'fr') },
  ageAsc: { label: 'Âge (croissant)', fn: (a, b) => a.age - b.age },
  ageDesc: { label: 'Âge (décroissant)', fn: (a, b) => b.age - a.age },
  recent: { label: 'Plus récents', fn: (a, b) => createdAt(b) - createdAt(a) },
};

// Date de création : champ createdAt, sinon horodatage embarqué dans l'ObjectId Mongo.
function createdAt(e) {
  if (e.createdAt) return new Date(e.createdAt).getTime();
  return parseInt(String(e._id).substring(0, 8), 16) * 1000 || 0;
}
// ISO 8601 (YYYY-MM-DD)
const isoDate = (e) => {
  const t = createdAt(e);
  return t ? new Date(t).toISOString().slice(0, 10) : '—';
};

const initials = (nom) =>
  nom.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') || '?';

const hue = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);

function Dashboard({ token, user, onLogout, theme, setTheme }) {
  const [etudiants, setEtudiants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('nomAsc');
  const [confirmId, setConfirmId] = useState(null);
  const [toast, setToast] = useState(null);
  const nomRef = useRef(null);
  const toastTimer = useRef(null);

  const api = useCallback(async (path, options = {}) => {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...options.headers },
    });
    if (response.status === 401) {
      onLogout('Session expirée, veuillez vous reconnecter.');
      throw new Error('Session expirée');
    }
    return response;
  }, [token, onLogout]);

  const notify = useCallback((message, type = 'success') => {
    clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  }, []);

  const fetchEtudiants = useCallback(async () => {
    try {
      const response = await api('/api/etudiants');
      if (!response.ok) throw new Error('Impossible de charger les étudiants');
      const data = await response.json();
      setEtudiants(Array.isArray(data) ? data : []);
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }, [api, notify]);

  useEffect(() => { fetchEtudiants(); }, [fetchEtudiants]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((p) => ({ ...p, [name]: value }));
    setFieldErrors((p) => ({ ...p, [name]: undefined }));
  };

  const validate = () => {
    const errs = {};
    const nom = formData.nom.trim();
    const email = formData.email.trim().toLowerCase();
    const age = Number(formData.age);
    if (!nom) errs.nom = 'Le nom est obligatoire.';
    if (!EMAIL_RE.test(email)) errs.email = 'Adresse e-mail invalide.';
    else if (etudiants.some((e) => e._id !== editingId && e.email.toLowerCase() === email))
      errs.email = 'Cet e-mail existe déjà.';
    if (!Number.isInteger(age) || age < 1 || age > 120) errs.age = 'Âge entre 1 et 120.';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const resetForm = () => {
    setFormData(emptyForm);
    setFieldErrors({});
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    const payload = {
      nom: formData.nom.trim(),
      email: formData.email.trim(),
      age: Number(formData.age),
    };

    try {
      setIsSubmitting(true);
      const response = await api(`/api/etudiants${editingId ? `/${editingId}` : ''}`, {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'Opération impossible');

      notify(editingId ? 'Étudiant modifié' : 'Étudiant ajouté');
      resetForm();
      await fetchEtudiants();
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (e) => {
    setEditingId(e._id);
    setFormData({ nom: e.nom, email: e.email, age: String(e.age) });
    setFieldErrors({});
    nomRef.current?.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    try {
      const response = await api(`/api/etudiants/${id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'Impossible de supprimer l’étudiant');
      setEtudiants((s) => s.filter((x) => x._id !== id));
      if (editingId === id) resetForm();
      notify('Étudiant supprimé');
    } catch (error) {
      notify(error.message, 'error');
    } finally {
      setConfirmId(null);
    }
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return etudiants
      .filter((e) => !q || e.nom.toLowerCase().includes(q) || e.email.toLowerCase().includes(q))
      .sort(SORTS[sort].fn);
  }, [etudiants, query, sort]);

  const stats = useMemo(() => {
    if (!etudiants.length) return { total: 0, avg: '—', min: '—', max: '—' };
    const ages = etudiants.map((e) => e.age);
    return {
      total: etudiants.length,
      avg: (ages.reduce((a, b) => a + b, 0) / ages.length).toFixed(1),
      min: Math.min(...ages),
      max: Math.max(...ages),
    };
  }, [etudiants]);

  const exportCsv = () => {
    const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
    const rows = [['nom', 'email', 'age', 'date_creation'],
      ...visible.map((e) => [e.nom, e.email, e.age, isoDate(e)])];
    const csv = '\uFEFF' + rows.map((r) => r.map(esc).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `etudiants-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify(`${visible.length} ligne(s) exportée(s)`);
  };

  const field = (name, label, props) => (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        value={formData[name]}
        onChange={handleChange}
        aria-invalid={!!fieldErrors[name]}
        aria-describedby={fieldErrors[name] ? `${name}-err` : undefined}
        ref={name === 'nom' ? nomRef : undefined}
        {...props}
      />
      {fieldErrors[name] && <small id={`${name}-err`} className="field-error">{fieldErrors[name]}</small>}
    </div>
  );

  return (
    <>
      <a className="skip" href="#liste">Aller à la liste</a>
      <main className="App">
        <header className="topbar">
          <div>
            <h1>Gestion des étudiants</h1>
            <p className="subtitle">Connecté : {user.nom}</p>
          </div>
          <div className="topbar-actions">
          <button type="button" className="btn ghost" onClick={() => onLogout()}>Déconnexion</button>
          <button
            type="button"
            className="btn ghost icon"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
            title="Thème"
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
          </div>
        </header>

        <section className="stats" aria-label="Statistiques">
          <div className="stat"><span>Étudiants</span><strong>{stats.total}</strong></div>
          <div className="stat"><span>Âge moyen</span><strong>{stats.avg}</strong></div>
          <div className="stat"><span>Plus jeune</span><strong>{stats.min}</strong></div>
          <div className="stat"><span>Plus âgé</span><strong>{stats.max}</strong></div>
        </section>

        <form className="card etudiant-form" onSubmit={handleSubmit} noValidate>
          <h2>{editingId ? 'Modifier l’étudiant' : 'Nouvel étudiant'}</h2>
          <div className="form-grid">
            {field('nom', 'Nom', { type: 'text', placeholder: 'Nom complet', autoComplete: 'off', spellCheck: false })}
            {field('email', 'Email', { type: 'email', placeholder: 'email@exemple.com', autoComplete: 'off', spellCheck: false, inputMode: 'email' })}
            {field('age', 'Âge', { type: 'number', min: 1, max: 120, placeholder: '25', inputMode: 'numeric' })}
          </div>
          <div className="actions">
            <button type="submit" className="btn primary" disabled={isSubmitting}>
              {isSubmitting ? 'Enregistrement…' : editingId ? 'Enregistrer' : 'Ajouter l’étudiant'}
            </button>
            {editingId && (
              <button type="button" className="btn ghost" onClick={resetForm}>Annuler</button>
            )}
          </div>
        </form>

        <section className="toolbar" aria-label="Recherche et tri">
          <input
            type="search"
            className="search"
            placeholder="Rechercher un nom ou un e-mail…"
            aria-label="Rechercher"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Trier par">
            {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button type="button" className="btn ghost" onClick={exportCsv} disabled={!visible.length}>
            Export CSV
          </button>
        </section>

        <section id="liste" aria-live="polite">
          {isLoading ? (
            <ul className="student-list" aria-busy="true">
              {[0, 1, 2].map((i) => <li key={i} className="student-item skeleton" />)}
            </ul>
          ) : visible.length === 0 ? (
            <p className="empty">
              {etudiants.length === 0 ? 'Aucun étudiant pour le moment.' : 'Aucun résultat pour cette recherche.'}
            </p>
          ) : (
            <ul className="student-list">
              {visible.map((e) => (
                <li key={e._id} className={`student-item ${editingId === e._id ? 'editing' : ''}`}>
                  <span className="avatar" style={{ '--h': hue(e.nom) }} aria-hidden="true">{initials(e.nom)}</span>
                  <div className="info">
                    <strong>{e.nom}</strong>
                    <a href={`mailto:${e.email}`}>{e.email}</a>
                    <span className="meta">
                      {e.age} ans · ajouté le <time dateTime={isoDate(e)}>{isoDate(e)}</time>
                    </span>
                  </div>
                  <div className="row-actions">
                    {confirmId === e._id ? (
                      <>
                        <button type="button" className="btn danger" onClick={() => handleDelete(e._id)}>Confirmer</button>
                        <button type="button" className="btn ghost" onClick={() => setConfirmId(null)}>Non</button>
                      </>
                    ) : (
                      <>
                        <button type="button" className="btn ghost" onClick={() => startEdit(e)}>Modifier</button>
                        <button type="button" className="btn ghost danger-text" onClick={() => setConfirmId(e._id)}>Supprimer</button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <div className="toast-region" role="status" aria-live="polite">
        {toast && <div className={`toast ${toast.type}`}>{toast.message}</div>}
      </div>
    </>
  );
}

function Login({ onAuth, notice, theme, setTheme }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ nom: '', email: '', password: '' });
  const [error, setError] = useState(notice || '');
  const [busy, setBusy] = useState(false);

  const change = (e) => { setForm((p) => ({ ...p, [e.target.name]: e.target.value })); setError(''); };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = mode === 'login'
        ? { email: form.email, password: form.password }
        : { nom: form.nom, email: form.email, password: form.password };
      const response = await fetch(`${API_URL}/api/auth/${mode === 'login' ? 'login' : 'register'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'Échec de l’authentification');
      onAuth({ token: data.token, user: data.utilisateur });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="App auth">
      <form className="card auth-card" onSubmit={submit}>
        <div className="auth-head">
          <h1>{mode === 'login' ? 'Connexion' : 'Créer le compte'}</h1>
          <button type="button" className="btn ghost icon" aria-label="Changer de thème"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}>
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>
        {mode === 'register' && (
          <div className="field">
            <label htmlFor="a-nom">Nom</label>
            <input id="a-nom" name="nom" value={form.nom} onChange={change} autoComplete="name" required />
          </div>
        )}
        <div className="field">
          <label htmlFor="a-email">Email</label>
          <input id="a-email" name="email" type="email" value={form.email} onChange={change}
            autoComplete="username" inputMode="email" required />
        </div>
        <div className="field">
          <label htmlFor="a-pwd">Mot de passe</label>
          <input id="a-pwd" name="password" type="password" value={form.password} onChange={change}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={mode === 'register' ? 8 : undefined} maxLength={72} required />
        </div>
        {error && <p role="alert" className="field-error auth-error">{error}</p>}
        <button type="submit" className="btn primary" disabled={busy}>
          {busy ? 'Patientez…' : mode === 'login' ? 'Se connecter' : 'Créer le compte'}
        </button>
        <button type="button" className="btn ghost"
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
          {mode === 'login' ? 'Premier lancement ? Créer le compte' : 'J’ai déjà un compte'}
        </button>
      </form>
    </main>
  );
}

function App() {
  const [session, setSession] = useState(loadSession);
  const [notice, setNotice] = useState('');
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('theme') ||
        (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    } catch { return 'light'; }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('theme', theme); } catch { /* ignore */ }
  }, [theme]);

  const handleAuth = useCallback((next) => { saveSession(next); setNotice(''); setSession(next); }, []);
  const handleLogout = useCallback((message = '') => { saveSession(null); setNotice(message); setSession(null); }, []);

  return session ? (
    <Dashboard token={session.token} user={session.user} onLogout={handleLogout} theme={theme} setTheme={setTheme} />
  ) : (
    <Login onAuth={handleAuth} notice={notice} theme={theme} setTheme={setTheme} />
  );
}

export default App;
