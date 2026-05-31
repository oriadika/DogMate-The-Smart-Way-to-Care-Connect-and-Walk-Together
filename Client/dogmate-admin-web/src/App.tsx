import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  deleteDog,
  deleteUser,
  getAllDogs,
  getAllUsers,
  login,
  logout,
  suspendUser,
} from './api';
import type { DogRow, UserRow } from './types';

type Tab = 'users' | 'dogs';

export default function App() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [userId, setUserId] = useState('');
  const [activeEmail, setActiveEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const [tab, setTab] = useState<Tab>('users');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [dogs, setDogs] = useState<DogRow[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isAuthenticated = Boolean(userId && activeEmail && isAdmin);

  async function loadUsers() {
    setLoading(true);
    setError('');
    try {
      setUsers(await getAllUsers());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function loadDogs() {
    setLoading(true);
    setError('');
    try {
      setDogs(await getAllDogs());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isAuthenticated) return;
    if (tab === 'users') {
      void loadUsers();
    } else {
      void loadDogs();
    }
  }, [tab, isAuthenticated]);

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => {
      const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim().toLowerCase();
      return u.email.toLowerCase().includes(q) || fullName.includes(q);
    });
  }, [users, query]);

  const filteredDogs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return dogs;
    return dogs.filter((d) => d.name.toLowerCase().includes(q) || d.breed.toLowerCase().includes(q));
  }, [dogs, query]);

  async function onLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await login(email, password);
      if (response.userRole !== 'admin') {
        throw new Error('Only admin users can access this interface.');
      }
      setUserId(response.userId);
      setActiveEmail(response.email);
      setIsAdmin(true);
      setTab('users');
      setQuery('');
      setPassword('');
      setUsers(await getAllUsers());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function onLogout() {
    await logout(userId, activeEmail);
    setUserId('');
    setActiveEmail('');
    setIsAdmin(false);
    setUsers([]);
    setDogs([]);
  }

  async function onSuspend(user: UserRow) {
    if (user.suspended) return;
    if (!window.confirm(`Suspend user ${user.email}?`)) return;
    try {
      await suspendUser(user.id);
      await loadUsers();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function onDeleteUser(user: UserRow) {
    if (!window.confirm(`Delete user ${user.email}? This cannot be undone.`)) return;
    try {
      await deleteUser(user.id);
      await loadUsers();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function onDeleteDog(dog: DogRow) {
    if (!window.confirm(`Delete dog ${dog.name}? This cannot be undone.`)) return;
    try {
      await deleteDog(dog.id);
      await loadDogs();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  if (!isAuthenticated) {
    return (
      <main className="page">
        <section className="card auth-card">
          <h1>DogMate Admin</h1>
          <p className="muted">גישת מנהל שולחן עבודה עבור פעולות ניידות קיימות</p>
          <form onSubmit={onLogin} className="auth-form">
            <label>
              דואר אלקטרוני
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              סיסמה
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <button type="submit" disabled={loading}>
              {loading ? '...נכנס' : 'התחבר למערכת כמנהל'}
            </button>
          </form>
          {error ? <p className="error">{error}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="card">
        <header className="toolbar">
          <div>
            <h1>DogMate Admin</h1>
            <p className="muted admin-email">
                :נכנסת למערכת מנהל עם דואר אלקטרוני
                <div>
                  <span className="email">{activeEmail}</span>
                </div>
            </p>          
          </div>
          <button onClick={onLogout}>יציאה</button>
        </header>

        <div className="tabs">
          <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>
            משתמשים
          </button>
          <button className={tab === 'dogs' ? 'active' : ''} onClick={() => setTab('dogs')}>
            כלבים
          </button>
          <button onClick={() => (tab === 'users' ? void loadUsers() : void loadDogs())}>רענון</button>
        </div>

        <input
          className="search"
          placeholder={tab === 'users' ? 'חפש משתמש לפי שם/דואר אלקטרוני' : 'חפש כלב לפי שם/גזע'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {error ? <p className="error">{error}</p> : null}
        {loading ? <p className="muted">...טעינת נתונים</p> : null}

        {tab === 'users' ? (
          <table>
            <thead>
              <tr>
                <th>שם</th>
                <th>דואר אלקטרוני</th>
                <th>סוג משתמש</th>
                <th>סטטוס</th>
                <th className="actions-header">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || '-';
                let type = "-";
                switch (u.type) {
                  case 'AdminUser':
                    type = 'אדמין';
                    break;
                  case 'RegularUser':
                    type = 'משתמש רגיל';
                    break;
                  case 'DogWalkerUser':
                    type = 'משתמש דוגווקר';
                    break;
                  default:
                    break;
                }
                return (
                  <tr key={u.id}>
                    <td>{fullName}</td>
                    <td>{u.email}</td>
                    <td>{type}</td>
                    <td>{u.suspended ? 'מושהה' : 'פעיל'}</td>
                    <td className="actions">
                      <button disabled={!!u.suspended} onClick={() => void onSuspend(u)}>
                        חסום משתמש
                      </button>
                      <button className="danger" onClick={() => void onDeleteUser(u)}>
                        מחק משתמש
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <table>
            <thead>
              <tr>
                <th>שם</th>
                <th>גזע</th>
                <th>מגדר</th>
                <th>תאריך לידה</th>
                <th>משתמשים מקושרים</th>
                <th style={{paddingLeft : '20px'}}>פעולות</th>
              </tr>
            </thead>
            <tbody>
              {filteredDogs.map((d) => (
                <tr key={d.id}>
                  <td>{d.name}</td>
                  <td>{d.breed}</td>
                  <td>{d.gender === 'M' ? 'זכר' : d.gender === 'F' ? 'נקבה' : '-'}</td>
                  <td>{d.birthdate || '-'}</td>
                  <td>{Array.isArray(d.users_related) ? d.users_related.join(', ') : '-'}</td>
                  <td className="actions">
                    <button className="danger" onClick={() => void onDeleteDog(d)}>
                      מחק כלב
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
