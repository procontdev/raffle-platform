const labels: Record<string, string> = {
  DRAFT: 'Borrador', OPEN: 'Inscripciones abiertas', READY: 'Listo para sorteo', COMPLETED: 'Completado', CANCELLED: 'Cancelado', CLOSED: 'Cerrado', DRAWING: 'En sorteo',
  PENDING: 'Pendiente', VALIDATED: 'Validado', REJECTED: 'Rechazado',
};

export default function StatusBadge({ status }: { status: string }) {
  return <span className="status-badge" data-status={status}>{labels[status] ?? status}</span>;
}
