// (c) 2026 Briefy contributors — AGPL-3.0
export interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at?: string;
}

export interface AuthOrganization {
    id: number;
    name: string;
    slug: string;
    logo?: string;
    has_anthropic_key: boolean;
    anthropic_api_key_mask: string | null;
}

export type PageProps<
    T extends Record<string, unknown> = Record<string, unknown>,
> = T & {
    auth: {
        user: User;
        organization: AuthOrganization | null;
    };
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
