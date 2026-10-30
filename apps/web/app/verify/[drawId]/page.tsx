'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';

type VerificationResponse = {
  verificationStatus: 'VALID' | 'INVALID';
  algorithmVersion: string;
  winnerIndex: number;
  winnerTicketNumber: string;
  resultHash: string;
};

export default function VerifyPage() {
  const { drawId } = useParams<{ drawId: string }>();
  const [data, setData] = useState<VerificationResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api<VerificationResponse>(`/public/draws/${drawId}/verify`).then(setData).catch((reason: Error) => setError(reason.message));
  }, [drawId]);

  const isValid = data?.verificationStatus === 'VALID';

  return <main className="verify-page"><section className="verify-card"><p className="eyebrow">Raffle Platform - verificacion publica</p>{error ? <><h1>Resultado invalido</h1><p>{error}</p></> : !data ? <h1>Verificando...</h1> : <><div className={`verification-mark ${isValid ? 'valid' : 'invalid'}`}>{isValid ? 'OK' : '!'}</div><h1>{isValid ? 'Resultado valido' : 'Resultado invalido'}</h1><p className="muted-text">La prueba se recalculo con la informacion publica revelada.</p><dl className="proof-list"><dt>Estado</dt><dd>{data.verificationStatus}</dd><dt>Algorithm version</dt><dd>{data.algorithmVersion}</dd><dt>Winner index</dt><dd>{data.winnerIndex}</dd><dt>Winner ticket</dt><dd>{data.winnerTicketNumber}</dd><dt>Result hash</dt><dd><code>{data.resultHash}</code></dd></dl></>}</section></main>;
}
