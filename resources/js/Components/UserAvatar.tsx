// (c) 2026 Briefy contributors — AGPL-3.0

interface Props {
  name: string;
  avatar?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-16 w-16 text-xl' };

function nameToGradient(name: string): { from: string; to: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  }
  const hue1 = hash % 360;
  const hue2 = (hue1 + 130) % 360;
  return {
    from: `hsl(${hue1}, 65%, 52%)`,
    to: `hsl(${hue2}, 65%, 42%)`,
  };
}

export function UserAvatar({ name, avatar, size = 'md' }: Props) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();

  if (avatar) {
    return (
      <img
        src={`/storage/${avatar}`}
        alt={name}
        className={`${sizes[size]} rounded-full object-cover shrink-0`}
      />
    );
  }

  const { from, to } = nameToGradient(name);
  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-semibold text-white shrink-0`}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      role="img"
      aria-label={name}
    >
      {initials}
    </div>
  );
}
