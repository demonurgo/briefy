<?php
// (c) 2026 Briefy contributors — AGPL-3.0

namespace App\Mail;

use App\Models\Invitation;
use App\Models\Organization;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class InvitationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public readonly Invitation $invitation,
        public readonly Organization $organization,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Convite para {$this->organization->name} no Briefy",
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.invitation',
            with: [
                'acceptUrl' => route('invitations.show', $this->invitation->token),
                'orgName'   => $this->organization->name,
                'role'      => $this->invitation->role,
                'expiresAt' => $this->invitation->expires_at->format('d/m/Y'),
            ],
        );
    }
}
