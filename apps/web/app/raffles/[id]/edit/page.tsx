'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import AdminShell from '../../../../components/AdminShell';
import RaffleForm from '../../../../components/RaffleForm';
import { api } from '../../../../lib/api';
import type { Raffle } from '../../../../lib/types';

export default function EditRafflePage() {
  const { id } = useParams<{ id: string }>();
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { api<Raffle>(`/raffles/${id}`).then(setRaffle).catch(() => setError('No se pudo cargar el sorteo.')); }, [id]);
  return <AdminShell><div className="page-heading"><div><p className="eyebrow">Edición</p><h1>Editar sorteo</h1></div></div>{error ? <div className="alert error">{error}</div> : raffle ? <RaffleForm raffle={raffle} /> : <div className="loading">Cargando sorteo...</div>}</AdminShell>;
}
