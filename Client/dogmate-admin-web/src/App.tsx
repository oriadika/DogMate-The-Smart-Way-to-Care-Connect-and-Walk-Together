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
          <p className="muted">Desktop admin access for existing mobile operations.</p>
          <form onSubmit={onLogin} className="auth-form">
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            <button type="submit" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in as admin'}
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
            <p className="muted">Logged in as {activeEmail}</p>
          </div>
          <button onClick={onLogout}>Logout</button>
        </header>

        <div className="tabs">
          <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>
            Users
          </button>
          <button className={tab === 'dogs' ? 'active' : ''} onClick={() => setTab('dogs')}>
            Dogs
          </button>
          <button onClick={() => (tab === 'users' ? void loadUsers() : void loadDogs())}>Refresh</button>
        </div>

        <input
          className="search"
          placeholder={tab === 'users' ? 'Search user by name/email' : 'Search dog by name/breed'}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {error ? <p className="error">{error}</p> : null}
        {loading ? <p className="muted">Loading...</p> : null}

        {tab === 'users' ? (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Type</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((u) => {
                const fullName = `${u.firstName || ''} ${u.lastName || ''}`.trim() || '-';
                return (
                  <tr key={u.id}>
                    <td>{fullName}</td>
                    <td>{u.email}</td>
                    <td>{u.type || '-'}</td>
                    <td>{u.suspended ? 'Suspended' : 'Active'}</td>
                    <td className="actions">
                      <button disabled={!!u.suspended} onClick={() => void onSuspend(u)}>
                        Suspend
                      </button>
                      <button className="danger" onClick={() => void onDeleteUser(u)}>
                        Delete
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
                <th>Name</th>
                <th>Breed</th>
                <th>Gender</th>
                <th>Birthdate</th>
                <th>Users Related</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDogs.map((d) => (
                <tr key={d.id}>
                  <td>{d.name}</td>
                  <td>{d.breed}</td>
                  <td>{d.gender === 'M' ? 'Male' : d.gender === 'F' ? 'Female' : '-'}</td>
                  <td>{d.birthdate || '-'}</td>
                  <td>{Array.isArray(d.users_related) ? d.users_related.join(', ') : '-'}</td>
                  <td className="actions">
                    <button className="danger" onClick={() => void onDeleteDog(d)}>
                      Delete
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
