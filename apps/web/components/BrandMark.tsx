import type { CSSProperties } from 'react';
import type { Brand } from '../lib/types';

export default function BrandMark({ brand, size = 'small' }: { brand?: Brand | null; size?: 'small' | 'large' }) {
  const theme = brand?.themeConfig ?? {};
  const style = { '--brand-accent': theme.accent ?? theme.primaryColor ?? theme.primary ?? '#64e6b5' } as CSSProperties;
  return <span className={`brand-mark brand-mark-${size}`} style={style}>{brand?.logoUrl ? <span className="brand-image" role="img" aria-label={brand.name} style={{ backgroundImage: `url(${brand.logoUrl})` }} /> : brand?.name?.slice(0, 1).toUpperCase() ?? 'R'}</span>;
}
