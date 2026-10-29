'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from '../lib/api';
import { clearSession, user } from '../lib/auth';
import type { Organization, User } from '../lib/types';
import BrandMark from './BrandMark';

export default function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter(); const pathname = usePathname(); const [currentUser, setCurrentUser] = useState<User | null>(null); const [organization, setOrganization] = useState<Organization | null>(null);
  useEffect(() => { const current = user(); if (!current) router.replace('/login'); else { queueMicrotask(() => setCurrentUser(current)); api<Organization>('/organization').then(setOrganization).catch(() => undefined); } }, [router]);
  if (!currentUser) return <div className="loading">Cargando espacio operativo…</div>;
  const logout = () => { clearSession(); router.replace('/login'); };
  return <div className="admin-layout"><aside className="sidebar"><div className="brand-lockup"><BrandMark /><span>Raffle Platform</span></div><p className="sidebar-label">Operación</p><nav><Link className={pathname === '/dashboard' ? 'active' : ''} href="/dashboard">Dashboard</Link><Link className={pathname.startsWith('/raffles') ? 'active' : ''} href="/raffles">Sorteos</Link><Link className={pathname === '/participants' ? 'active' : ''} href="/participants">Participantes</Link></nav><p className="sidebar-label muted">Próximamente</p><div className="disabled-nav">Auditoría</div><div className="disabled-nav">Configuración</div><div className="sidebar-footer"><span className="avatar">{currentUser.email[0].toUpperCase()}</span><div><strong>{currentUser.email}</strong><small>{currentUser.role}</small></div><button className="icon-button" onClick={logout} title="Cerrar sesión">↪</button></div></aside><main className="main-content"><header className="topbar"><span className="mobile-title">Raffle Platform</span><span className="tenant-pill">{organization?.name ?? 'Organización actual'}</span></header>{children}</main></div>;
}
