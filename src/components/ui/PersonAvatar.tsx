import { useApp } from '../../app/appContext';
import type { Person } from '../../lib/types';
import { cn } from './cn';

export interface PersonAvatarProps {
  person?: Pick<Person, 'name' | 'photos'>;
  name?: string;
  src?: string;
  size: 'list' | 'detail' | 'card';
  className?: string;
}

const SIZE: Record<PersonAvatarProps['size'], string> = {
  list: 'h-16 w-16 shrink-0 rounded-full',
  detail: 'h-24 w-24 shrink-0 rounded-full',
  card: 'aspect-square w-full max-w-xs rounded-card',
};

export function PersonAvatar({ person, name, src, size, className }: PersonAvatarProps) {
  const { t } = useApp();
  const shownName = person?.name ?? name ?? '';
  const url = person ? person.photos[0]?.dataUrl : src;
  const alt = t('common.photoOf', { name: shownName });
  if (url) {
    return <img src={url} alt={alt} className={cn(SIZE[size], 'object-cover', className)} />;
  }
  const initial = Array.from(shownName.trim())[0]?.toUpperCase() ?? '';
  return (
    <div
      role="img"
      aria-label={alt}
      className={cn(
        SIZE[size],
        'flex items-center justify-center bg-river-tint font-display text-river',
        size === 'card' ? 'text-hero' : size === 'detail' ? 'text-display' : 'text-title',
        className,
      )}
    >
      <span aria-hidden="true">{initial}</span>
    </div>
  );
}
