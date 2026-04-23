@php $icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'; @endphp
@include('errors.layout', [
  'code'    => '419',
  'title'   => 'Sessão expirada',
  'message' => 'Sua sessão expirou por inatividade. Volte à página anterior e tente novamente.',
  'icon'    => $icon,
])
