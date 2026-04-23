@php $icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>'; @endphp
@include('errors.layout', [
  'code'    => '403',
  'title'   => 'Acesso negado',
  'message' => ($exception->getMessage() ?: 'Você não tem permissão para acessar este recurso. Fale com o administrador da organização se precisar de acesso.'),
  'icon'    => $icon,
])
