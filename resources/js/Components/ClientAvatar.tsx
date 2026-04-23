// (c) 2026 Briefy contributors — AGPL-3.0
interface Props {
  name: string;
  avatar?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = { sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-16 w-16 text-xl' };

export function ClientAvatar({ name, avatar, size = 'md' }: Props) {
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

  return (
    <div className={`${sizes[size]} rounded-full bg-[#7c3aed]/10 text-[#7c3aed] dark:bg-[#7c3aed]/20 dark:text-[#a78bfa] flex items-center justify-center font-semibold shrink-0`}>
      {initials}
    </div>
  );
}
