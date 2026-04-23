@component('mail::message')
# Você foi convidado

Você foi convidado para ingressar na organização **{{ $orgName }}** no Briefy como **{{ $role }}**.

@component('mail::button', ['url' => $acceptUrl])
Aceitar convite
@endcomponent

Este convite expira em **{{ $expiresAt }}**.

Se você não esperava este convite, pode ignorar este e-mail com segurança.

Atenciosamente,
{{ config('app.name') }}
@endcomponent
