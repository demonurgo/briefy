@php $icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="11" y1="16" x2="11.01" y2="16"/></svg>'; @endphp
@include('errors.layout', [
  'code'    => '404',
  'title'   => 'Página não encontrada',
  'message' => 'O endereço que você tentou acessar não existe ou foi removido. Verifique o link e tente novamente.',
  'icon'    => $icon,
])
