@php $icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>'; @endphp
@include('errors.layout', [
  'code'    => '429',
  'title'   => 'Muitas tentativas',
  'message' => 'Você fez muitas requisições em pouco tempo. Aguarde alguns minutos e tente novamente.',
  'icon'    => $icon,
])
