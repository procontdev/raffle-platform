'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { Component, useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties, ErrorInfo, ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { api, ApiError, post, WS_URL } from '../../../lib/api';
import { token } from '../../../lib/auth';
import { normalizeRehearsalCandidates } from '../../../lib/live-rehearsal.mjs';
import { resolveLiveTemplate } from '../../../lib/live-template.mjs';
import type { PublicRaffle, RehearsalCandidates, RehearsalResult } from '../../../lib/types';

type LiveState = 'WAITING' | 'READY' | 'COUNTDOWN' | 'DRAWING' | 'WINNER' | 'DEMO_EMPTY' | 'ERROR';
type LiveTemplate = 'classic' | 'spotlight';
type LiveSnapshot = { liveState: LiveState; winner: PublicRaffle['draw']; participantCount: number; ticketCount: number; validatedTicketCount: number; validatedCandidates: RehearsalCandidates['candidates'] };
type OfficialDrawResponse = { winnerTicketNumber: string; algorithmVersion: string; resultHash: string };

export default function LivePage() {
  return <LivePageErrorBoundary><LivePageContent /></LivePageErrorBoundary>;
}

class LivePageErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() { return { hasError: true }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV === 'development') console.error('[live-display] render error', error, info);
  }

  render() {
    if (this.state.hasError) return <main className="live-page"><div className="live-card"><h1>No se pudo cargar el sorteo.</h1><p className="muted-text">Revisa la conexion e intenta nuevamente.</p></div></main>;
    return this.props.children;
  }
}

function DemoBanner() {
  return <div className="demo-banner"><strong>MODO ENSAYO</strong><span>RESULTADO NO VALIDO</span></div>;
}

function OfficialDrawButton({ canOperate, starting, error, onStart, className = 'primary-button' }: { canOperate: boolean; starting: boolean; error: string; onStart: () => void; className?: string }) {
  if (!canOperate) return null;
  return <div className="official-draw-action"><button className={className} onClick={onStart} disabled={starting}>{starting ? 'Iniciando sorteo...' : 'Iniciar sorteo oficial'}</button>{error && <p className="alert error">{error}</p>}</div>;
}

function Marquee({ candidates, speedSeconds = 24 }: { candidates: RehearsalCandidates['candidates']; speedSeconds?: number }) {
  return candidates.length > 0
    ? <div className="demo-marquee" aria-label="Participantes elegibles para el ensayo"><div className="demo-marquee-track" style={{ animationDuration: `${speedSeconds}s` }}>{[...candidates, ...candidates].map((candidate, index) => <span className="demo-candidate" key={`${candidate.ticketNumber}-${index}`}><strong>{candidate.displayName}</strong><code>{candidate.ticketNumber}</code></span>)}</div></div>
    : <p className="live-state">No hay tickets disponibles para el ensayo.</p>;
}

function CountdownOverlay({ value }: { value: number }) {
  return <div className="countdown-overlay" aria-live="assertive" aria-label={`Cuenta regresiva: ${value}`}><strong className="countdown-number" key={value}>{value}</strong></div>;
}

function ConfettiBurst() {
  return <div className="confetti-layer" aria-hidden="true">{Array.from({ length: 72 }, (_, index) => <span className="confetti-piece" key={index} style={{ '--left': `${(index * 37) % 101}%`, '--delay': `${(index % 12) * 0.07}s`, '--duration': `${2.4 + (index % 7) * 0.18}s`, '--hue': `${(index * 47) % 360}` } as CSSProperties} />)}</div>;
}

function playLiveSound(audioContext: AudioContext, frequencies: number[]) {
  const now = audioContext.currentTime;
  frequencies.forEach((frequency, index) => {
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const start = now + index * 0.11;
    oscillator.type = index === 0 ? 'sine' : 'triangle';
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(0.12, start + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
    oscillator.connect(gain); gain.connect(audioContext.destination);
    oscillator.start(start); oscillator.stop(start + 0.2);
  });
}

type DisplayProps = {
  raffle: PublicRaffle | null;
  demo: boolean;
  state: LiveState;
  candidates: RehearsalCandidates['candidates'];
  demoStarted: boolean;
  startDemo: () => void;
  connection: string;
  shownWinner: { displayName: string; winnerTicketNumber: string; prizeName: string } | null;
  winner: PublicRaffle['draw'];
  validatedTicketCount: number;
  marqueeSpeedSeconds?: number;
  canOperate: boolean;
  officialDrawStarting: boolean;
  officialDrawError: string;
  startOfficialDraw: () => void;
};

function SpotlightTemplate({ raffle, demo, state, candidates, demoStarted, startDemo, connection, shownWinner, winner, validatedTicketCount, canOperate, officialDrawStarting, officialDrawError, startOfficialDraw }: DisplayProps) {
  const stageLabels: Partial<Record<LiveState, string>> = { WAITING: 'EN ESPERA', READY: 'LISTO PARA EMPEZAR', COUNTDOWN: 'CUENTA REGRESIVA', DRAWING: 'SELECCIONANDO', WINNER: 'RESULTADO' };
  const stage = stageLabels[state] ?? state;
  return <div className="spotlight-template">
    <header className="spotlight-header">
      {raffle?.brand?.logoUrl ? <div className="spotlight-logo spotlight-logo-image" role="img" aria-label={raffle.brand.name} style={{ backgroundImage: `url(${raffle.brand.logoUrl})` }} /> : <div className="spotlight-logo-fallback">{raffle?.brand?.name?.slice(0, 1) ?? 'R'}</div>}
      <div><p className="spotlight-brand">{raffle?.brand?.name ?? 'Raffle Platform'}</p><span className="spotlight-live-dot">EN VIVO</span></div>
      <span className="spotlight-stage">{demo ? 'ENSAYO' : stage}</span>
    </header>
    {demo && <DemoBanner />}
    <section className="spotlight-hero">
      <p className="eyebrow">SORTEO EN VIVO</p>
      <h1>{raffle?.name ?? 'Cargando sorteo...'}</h1>
      <div className="spotlight-prize"><span>PREMIO</span><strong>{raffle?.prizeName}</strong></div>
    </section>
    <section className="spotlight-stats" aria-label="Resumen del sorteo">
      <div><span>Participantes</span><strong>{raffle?.participants ?? 0}</strong></div>
      <div><span>Tickets totales</span><strong>{raffle?.tickets ?? 0}</strong></div>
      <div><span>Tickets validados</span><strong>{demo ? candidates.length : validatedTicketCount}</strong></div>
    </section>
    {connection && <div className="connection-state">{connection}</div>}
    {demo && state === 'WAITING' && <section className="spotlight-rehearsal"><div><p className="eyebrow">CANDIDATOS VISIBLES</p><h2>Todos tienen una oportunidad</h2></div><Marquee candidates={candidates} speedSeconds={raffle?.marqueeSpeedSeconds} /><button className="primary-button spotlight-start" onClick={startDemo} disabled={demoStarted || candidates.length === 0}>Iniciar ensayo</button></section>}
    {!demo && state === 'WAITING' && <div className="spotlight-state">Preparando la transmisión</div>}
    {!demo && (state === 'WAITING' || state === 'READY') && <section className="spotlight-rehearsal official-standby"><div><p className="eyebrow">CANDIDATOS VISIBLES</p><h2>{state === 'READY' ? 'Todos tienen una oportunidad' : 'Preparando la transmision'}</h2></div><Marquee candidates={candidates} speedSeconds={raffle?.marqueeSpeedSeconds} /></section>}
    {!demo && state === 'READY' && <><div className="spotlight-state">Todo listo para comenzar</div><OfficialDrawButton canOperate={canOperate} starting={officialDrawStarting} error={officialDrawError} onStart={startOfficialDraw} /></>}
    {state === 'DRAWING' && <div className="spotlight-state spotlight-drawing">{demo ? 'Seleccionando ticket de ensayo...' : 'Seleccionando ganador...'}</div>}
    {state === 'WINNER' && shownWinner && <div className="spotlight-winner"><span>{demo ? 'GANADOR DE ENSAYO' : 'GANADOR'}</span><strong>{shownWinner.displayName}</strong><code>{shownWinner.winnerTicketNumber}</code><small>{shownWinner.prizeName}</small>{!demo && winner?.drawId && <a href={`/verify/${winner.drawId}`}>Verificar resultado</a>}</div>}
    <footer className="spotlight-footer">{demo && 'MODO ENSAYO · RESULTADO NO VALIDO'}{!demo && `${raffle?.tickets ?? 0} oportunidades registradas`}</footer>
  </div>;
}

function ClassicTemplate({ raffle, demo, state, candidates, demoStarted, startDemo, connection, shownWinner, winner, validatedTicketCount, canOperate, officialDrawStarting, officialDrawError, startOfficialDraw }: DisplayProps) {
  return <>{demo && <DemoBanner />}<p className="eyebrow">{raffle?.brand?.name ?? 'Raffle Platform'} - transmision en vivo</p><h1>{raffle?.name ?? 'Cargando sorteo...'}</h1><p className="live-prize">{raffle?.prizeName}</p>{connection && <div className="connection-state">{connection}</div>}{demo && state === 'WAITING' && <><Marquee candidates={candidates} speedSeconds={raffle?.marqueeSpeedSeconds} /><button className="primary-button demo-start" onClick={startDemo} disabled={demoStarted || candidates.length === 0}>Iniciar ensayo</button></>}{!demo && state === 'WAITING' && <div className="live-state">Preparando la transmision</div>}{!demo && state === 'READY' && <><div className="live-state">Todo listo - {raffle?.tickets ?? 0} tickets</div><OfficialDrawButton canOperate={canOperate} starting={officialDrawStarting} error={officialDrawError} onStart={startOfficialDraw} /></>}{state === 'COUNTDOWN' && <div className="live-state countdown">3... 2... 1...</div>}{state === 'DRAWING' && <div className="live-state drawing">{demo ? 'Seleccionando ticket de ensayo...' : 'Seleccionando ganador...'}</div>}{state === 'WINNER' && shownWinner && <div className="winner-card"><span>{demo ? 'Ganador de ensayo' : 'Ganador'}</span><strong>{shownWinner.displayName}</strong><code>{shownWinner.winnerTicketNumber}</code><small>{shownWinner.prizeName}</small>{!demo && winner?.drawId && <a href={`/verify/${winner.drawId}`}>Verificar resultado</a>}</div>}<footer>{raffle?.participants ?? 0} participantes - {raffle?.tickets ?? 0} oportunidades {demo && '- MODO ENSAYO - RESULTADO NO VALIDO'}</footer></>;
}

function LivePageContent() {
  const { slug } = useParams<{ slug: string }>();
  const params = useSearchParams();
  const demo = params.get('demo') === '1';
  const obs = params.get('obs') === '1';
  const [raffle, setRaffle] = useState<PublicRaffle | null>(null);
  const [state, setState] = useState<LiveState>('WAITING');
  const [countdownValue, setCountdownValue] = useState(3);
  const [winner, setWinner] = useState<PublicRaffle['draw']>(null);
  const [validatedTicketCount, setValidatedTicketCount] = useState(0);
  const [demoWinner, setDemoWinner] = useState<RehearsalResult['winner'] | null>(null);
  const [candidates, setCandidates] = useState<RehearsalCandidates['candidates']>([]);
  const [demoStarted, setDemoStarted] = useState(false);
  const [connection, setConnection] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [operatorToken, setOperatorToken] = useState<string | null>(null);
  const [officialDrawStarting, setOfficialDrawStarting] = useState(false);
  const [officialDrawError, setOfficialDrawError] = useState('');
  const demoTimers = useRef<number[]>([]);
  const audioContext = useRef<AudioContext | null>(null);

  useEffect(() => { queueMicrotask(() => setOperatorToken(token())); }, []);

  const hydrateReal = useCallback(async () => {
    const snapshot = await api<LiveSnapshot>(`/public/raffles/${slug}/live-state`);
    setState(snapshot.liveState);
    setWinner(snapshot.winner);
    setCandidates(snapshot.validatedCandidates ?? []);
    setValidatedTicketCount(snapshot.validatedTicketCount ?? 0);
    const publicRaffle = await api<PublicRaffle>(`/public/raffles/${slug}`);
    setRaffle(publicRaffle);
  }, [slug]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true); setLoadError(false); setCandidates([]); setDemoWinner(null);
      try {
        const publicRaffle = await api<PublicRaffle>(`/public/raffles/${slug}`);
        if (cancelled) return;
        setRaffle(publicRaffle);
        if (demo) {
          const rehearsal = await api<RehearsalCandidates>(`/public/raffles/${slug}/rehearsal`);
          if (cancelled) return;
          const nextCandidates = normalizeRehearsalCandidates(rehearsal);
          setCandidates(nextCandidates); setState(nextCandidates.length > 0 ? 'WAITING' : 'DEMO_EMPTY');
        } else {
          const snapshot = await api<LiveSnapshot>(`/public/raffles/${slug}/live-state`);
          if (cancelled) return;
          setState(snapshot.liveState); setWinner(snapshot.winner); setCandidates(snapshot.validatedCandidates ?? []); setValidatedTicketCount(snapshot.validatedTicketCount ?? 0);
        }
        setLoading(false);
      } catch (error) {
        if (cancelled) return;
        setLoading(false);
        if (demo && error instanceof ApiError && error.status === 404) setState('DEMO_EMPTY');
        else { setLoadError(true); setState('ERROR'); }
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [demo, slug]);

  const raffleId = raffle?.id;

  useEffect(() => {
    if (!raffleId || demo || loading || loadError) return;
    const socket: Socket = io(`${WS_URL}/live`, { transports: ['websocket', 'polling'], reconnection: true, reconnectionAttempts: Infinity });
    const rehydrate = () => { setConnection('Reconectando...'); void hydrateReal().then(() => setConnection('')).catch(() => setConnection('Sin conexion')); };
    socket.on('connect', () => { setConnection(''); socket.emit('joinRaffle', { raffleId }); void hydrateReal(); });
    socket.on('disconnect', () => setConnection('Sin conexion')); socket.on('connect_error', () => setConnection('Reintentando conexion...'));
    socket.on('LIVE_RESET', rehydrate); socket.on('LIVE_READY', rehydrate); socket.on('LIVE_COUNTDOWN', () => { setCountdownValue(3); setState('COUNTDOWN'); }); socket.on('LIVE_DRAWING', () => setState('DRAWING')); socket.on('LIVE_WINNER', (payload: PublicRaffle['draw']) => { setWinner(payload); setState('WINNER'); });
    return () => { socket.disconnect(); };
  }, [demo, hydrateReal, loadError, loading, raffleId]);

  useEffect(() => () => demoTimers.current.forEach((timer) => window.clearTimeout(timer)), []);

  useEffect(() => {
    if (state !== 'COUNTDOWN' && state !== 'WINNER') return;
    try {
      const AudioContextClass = window.AudioContext;
      if (!AudioContextClass) return;
      audioContext.current ??= new AudioContextClass();
      const frequencies = state === 'WINNER' ? [523, 659, 784] : [countdownValue === 1 ? 880 : 660];
      void audioContext.current.resume().then(() => playLiveSound(audioContext.current!, frequencies)).catch(() => undefined);
    } catch {
      // Audio is an enhancement and can be blocked by browser autoplay policy.
    }
  }, [countdownValue, state]);

  async function startDemo() {
    if (candidates.length === 0) { setState('DEMO_EMPTY'); return; }
    demoTimers.current.forEach((timer) => window.clearTimeout(timer)); setDemoStarted(true);
    try {
      const result = await api<RehearsalResult>(`/public/raffles/${slug}/rehearsal/start`, { method: 'POST' });
      setDemoWinner(result.winner); setState('READY');
      demoTimers.current = [window.setTimeout(() => { setCountdownValue(3); setState('COUNTDOWN'); }, 700), window.setTimeout(() => setCountdownValue(2), 1700), window.setTimeout(() => setCountdownValue(1), 2700), window.setTimeout(() => setState('DRAWING'), 3700), window.setTimeout(() => setState('WINNER'), 7000)];
    } catch { setDemoStarted(false); setLoadError(true); setState('ERROR'); }
  }

  async function startOfficialDraw() {
    if (!raffleId || !operatorToken || state !== 'READY' || officialDrawStarting) return;
    if (!window.confirm('Confirmas iniciar el sorteo oficial? Esta accion seleccionara y persistira el ganador.')) return;
    setOfficialDrawStarting(true); setOfficialDrawError('');
    demoTimers.current.forEach((timer) => window.clearTimeout(timer));
    try {
      await post<OfficialDrawResponse>(`/raffles/${raffleId}/draw`);
      const publicRaffle = await api<PublicRaffle>(`/public/raffles/${slug}`);
      setRaffle(publicRaffle); setWinner(publicRaffle.draw); setCountdownValue(3); setState('COUNTDOWN');
      demoTimers.current = [window.setTimeout(() => { setCountdownValue(2); }, 1000), window.setTimeout(() => { setCountdownValue(1); }, 2000), window.setTimeout(() => { setState('DRAWING'); }, 3000), window.setTimeout(() => { setState('WINNER'); setOfficialDrawStarting(false); }, 5600)];
    } catch (error) {
      setOfficialDrawStarting(false);
      if (error instanceof ApiError && error.status === 409) {
        try { await hydrateReal(); setOfficialDrawError('El sorteo ya fue iniciado o completado. La pantalla se actualizo.'); } catch { setOfficialDrawError('El sorteo ya fue iniciado o completado. Recarga la pantalla.'); }
      } else setOfficialDrawError(error instanceof ApiError ? error.message : 'No se pudo iniciar el sorteo.');
    }
  }

  const theme = raffle?.brand?.themeConfig ?? {};
  const accent = theme.accent ?? theme.primaryColor ?? theme.primary ?? '#64e6b5';
  const template = resolveLiveTemplate(params.get('template'), theme.liveTemplate);
  const shownWinner = demo ? (demoWinner ? { displayName: demoWinner.displayName, winnerTicketNumber: demoWinner.ticketNumber, prizeName: demoWinner.prizeName } : null) : winner ? { displayName: winner.displayName, winnerTicketNumber: winner.winnerTicketNumber, prizeName: raffle?.prizeName ?? '' } : null;
  const standbyMarquee = !demo && template === 'classic' && (state === 'WAITING' || state === 'READY') ? <Marquee candidates={candidates} speedSeconds={raffle?.marqueeSpeedSeconds} /> : null;
  const frame = (content: ReactNode) => <main className={`live-page live-template-${template}`} data-obs={obs ? 'true' : undefined} style={{ '--accent': accent } as CSSProperties}><div className="live-card">{standbyMarquee}{content}</div>{state === 'COUNTDOWN' && <CountdownOverlay value={countdownValue} />}{state === 'WINNER' && shownWinner && <ConfettiBurst />}</main>;
  if (loading) return frame(<><p className="eyebrow">{demo ? 'MODO ENSAYO' : 'Raffle Platform'}</p><h1>Cargando sorteo...</h1></>);
  if (loadError || state === 'ERROR') return frame(<><div className="demo-banner">{demo && <><strong>MODO ENSAYO</strong><span>RESULTADO NO VALIDO</span></>}</div><h1>No se pudo cargar el sorteo.</h1><p className="muted-text">Revisa la conexion e intenta nuevamente.</p></>);
  if (state === 'DEMO_EMPTY') return frame(<><DemoBanner /><h1>No hay tickets disponibles para el ensayo.</h1><p className="muted-text">Agrega al menos un ticket al raffle actual para probar la pantalla LIVE.</p></>);
  const props = { raffle, demo, state, candidates, demoStarted, startDemo, connection, shownWinner, winner, validatedTicketCount: demo ? candidates.length : validatedTicketCount, marqueeSpeedSeconds: raffle?.marqueeSpeedSeconds, canOperate: Boolean(operatorToken), officialDrawStarting, officialDrawError, startOfficialDraw };
  return frame(template === 'spotlight' ? <SpotlightTemplate {...props} /> : <ClassicTemplate {...props} />);
}
