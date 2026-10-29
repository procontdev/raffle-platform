'use client';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '../../lib/api';
import { saveSession } from '../../lib/auth';
import type { User } from '../../lib/types';

export default function LoginPage() {
  const router = useRouter(); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); setError(''); setLoading(true); try { const result = await api<{ accessToken: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }); saveSession(result.accessToken, result.user); router.push('/dashboard'); } catch (e) { setError(e instanceof ApiError && e.status === 401 ? 'Email o contraseña incorrectos.' : e instanceof Error ? e.message : 'No se pudo iniciar sesión.'); } finally { setLoading(false); } }
  return <main className="auth-page"><section className="auth-card"><div className="brand-lockup"><span className="brand-mark">R</span><span>Raffle Platform</span></div><p className="eyebrow">Control room · v0.0.5</p><h1>Todo listo para el próximo sorteo.</h1><p className="muted-text">Entra al espacio operativo para preparar participantes, cerrar la lista y emitir un resultado verificable.</p><form onSubmit={submit}><label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@fam.local" /></label><label>Contraseña<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /></label>{error && <div className="alert error">{error}</div>}<button className="primary-button full" disabled={loading}>{loading ? 'Validando…' : 'Entrar al control room'}</button></form></section></main>;
}
