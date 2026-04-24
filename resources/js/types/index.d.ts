// (c) 2026 Briefy contributors — AGPL-3.0

export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
    avatar: string | null;
    role: string | null;
    preferences: Record<string, unknown> | null;
    current_organization_id: number | null;
    organization: {
        id: number;
        name: string;
        slug: string;
        logo: string | null;
    } | null;
    organizations: Array<{
        id: number;
        name: string;
        slug: string;
        logo: string | null;
        role: string;
    }>;
}

export interface AuthOrganization {
    id: number;
    name: string;
    slug: string;
    logo?: string | null;
    has_anthropic_key: boolean;
    anthropic_api_key_mask: string | null;
    key_valid: boolean;
    managed_agents_enabled: boolean;
    last_key_check_at: string | null;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
        organization: AuthOrganization | null;
    };
    archive_count: number;
    trash_count: number;
    locale: string;
    flash?: { success?: string; error?: string };
    unread_notifications: number;
};

export interface ChatMessage {
    id: number;
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at: string;
}

export interface AiConversation {
    id: number;
    title?: string;
    compacted_at?: string | null;
    messages: ChatMessage[];
    created_at: string;
}
