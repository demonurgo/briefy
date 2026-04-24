# Testing Guide

## Prerequisites

1. **PostgreSQL running locally**
2. **Test database created:**
   ```bash
   createdb briefy_test
   ```
3. **Migrations run against test DB:**
   ```bash
   php artisan migrate --env=testing
   ```

## Running Tests

### Full suite
```bash
php artisan test
```

### Single class
```bash
php artisan test --filter=DemandLifecycleTest
php artisan test --filter=AuthenticationTest
php artisan test --filter=NotificationDeliveryTest
```

### Auth suite only
```bash
php artisan test tests/Feature/Auth/
```

## Environment Configuration

Tests use a separate PostgreSQL database configured in `phpunit.xml`:

| Variable | Value |
|----------|-------|
| DB_CONNECTION | pgsql |
| DB_DATABASE | briefy_test |
| BROADCAST_CONNECTION | null |
| QUEUE_CONNECTION | sync |
| SESSION_DRIVER | array |
| CACHE_STORE | array |

`RefreshDatabase` wraps each test in a transaction and rolls back after — no manual cleanup needed between runs.

## Test Coverage Map

| Requirement | Test Class | Cases |
|-------------|-----------|-------|
| TEST-01: Auth flow | AuthenticationTest, RegistrationTest | 11 |
| TEST-02: Org management | OrganizationCreationTest, InvitationControllerTest, InvitationAcceptTest, TeamRoleTest, TeamRosterTest, EnsureRoleTest | 22 |
| TEST-03: Demand lifecycle | DemandLifecycleTest | 9 |
| TEST-04: AI chat | AiChatControllerTest | 6 |
| TEST-05: Notifications | NotificationDeliveryTest | 12 |

## CI/CD

GitHub Actions with PostgreSQL service is **deferred** until the branch is published. See `.planning/phases/10-automated-test-coverage/10-CONTEXT.md` D-11 for context.
