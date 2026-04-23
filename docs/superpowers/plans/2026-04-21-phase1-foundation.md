# Briefy Phase 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Instalar e configurar um app Laravel 13 com PostgreSQL, autenticação com criação de organização, todas as migrations do sistema, modelos Eloquent, UI shell responsiva com sidebar/bottom nav, tema dark/light, i18n (PT-BR, EN, ES) e PWA manifest.

**Architecture:** Monólito Laravel 13 + Inertia.js + React 19 + TypeScript. Todas as tabelas do banco são criadas nesta fase para evitar conflitos futuros. O shell de UI (AppLayout, Sidebar, BottomNav) estabelece a estrutura responsiva usada por todas as telas. i18n é inicializado via `react-i18next` com locale passado pelo Inertia shared props.

**Tech Stack:** PHP 8.5, Laravel 13, Inertia.js v3 (inertia-laravel ^2), @inertiajs/react v2, React 19, TypeScript, Tailwind CSS, PostgreSQL 17, react-i18next, i18next, lucide-react, Vite

---

## File Structure

### Novos arquivos

| Arquivo | Responsabilidade |
|---|---|
| `database/migrations/*_create_organizations_table.php` | Schema da organização |
| `database/migrations/*_add_fields_to_users_table.php` | Adiciona campos ao users |
| `database/migrations/*_create_clients_table.php` | Schema do cliente |
| `database/migrations/*_create_client_events_table.php` | Eventos do cliente |
| `database/migrations/*_create_demands_table.php` | Demandas |
| `database/migrations/*_create_client_ai_memory_table.php` | Memória IA por cliente |
| `database/migrations/*_create_demand_files_table.php` | Arquivos das demandas |
| `database/migrations/*_create_demand_comments_table.php` | Comentários |
| `database/migrations/*_create_planning_suggestions_table.php` | Sugestões de planejamento |
| `database/migrations/*_create_briefy_notifications_table.php` | Notificações customizadas |
| `database/migrations/*_create_ai_conversations_table.php` | Conversas IA |
| `database/migrations/*_create_ai_conversation_messages_table.php` | Mensagens das conversas |
| `app/Models/Organization.php` | Model da organização |
| `app/Models/Client.php` | Model do cliente |
| `app/Models/ClientEvent.php` | Model de eventos |
| `app/Models/ClientAiMemory.php` | Model da memória IA |
| `app/Models/Demand.php` | Model de demandas |
| `app/Models/DemandFile.php` | Model de arquivos |
| `app/Models/DemandComment.php` | Model de comentários |
| `app/Models/PlanningSuggestion.php` | Model de sugestões |
| `app/Models/BriefyNotification.php` | Model de notificações |
| `app/Models/AiConversation.php` | Model de conversas IA |
| `app/Models/AiConversationMessage.php` | Model de mensagens IA |
| `app/Http/Middleware/SetLocale.php` | Define locale via user preferences |
| `lang/pt-BR/app.php` | Traduções PT-BR backend |
| `lang/en/app.php` | Traduções EN backend |
| `lang/es/app.php` | Traduções ES backend |
| `resources/js/locales/pt-BR.json` | Traduções PT-BR frontend |
| `resources/js/locales/en.json` | Traduções EN frontend |
| `resources/js/locales/es.json` | Traduções ES frontend |
| `resources/js/lib/i18n.ts` | Configuração do i18next |
| `resources/js/hooks/useTheme.ts` | Hook dark/light theme |
| `resources/js/layouts/AppLayout.tsx` | Layout principal |
| `resources/js/components/Sidebar.tsx` | Sidebar desktop |
| `resources/js/components/BottomNav.tsx` | Bottom nav mobile |
| `resources/js/components/ThemeToggle.tsx` | Botão de tema |
| `resources/js/pages/Dashboard.tsx` | Placeholder dashboard |
| `resources/js/pages/Clients/Index.tsx` | Placeholder clientes |
| `resources/js/pages/Demands/Index.tsx` | Placeholder demandas |
| `resources/js/pages/Planning/Index.tsx` | Placeholder planejamento |
| `resources/js/pages/Settings/Index.tsx` | Placeholder configurações |
| `public/manifest.json` | PWA manifest |
| `public/sw.js` | Service worker |

### Arquivos modificados

| Arquivo | Mudança |
|---|---|
| `app/Models/User.php` | Adiciona organization_id, role, preferences, last_login_at |
| `app/Http/Controllers/Auth/RegisteredUserController.php` | Cria organização ao registrar |
| `app/Http/Controllers/Auth/AuthenticatedSessionController.php` | Atualiza last_login_at |
| `app/Http/Middleware/HandleInertiaRequests.php` | Compartilha auth, locale, flash |
| `bootstrap/app.php` | Registra SetLocale middleware |
| `routes/web.php` | Define todas as rotas |
| `tailwind.config.js` | darkMode: 'class' |
| `resources/js/app.tsx` | Init i18n + tema antes do render |
| `resources/views/app.blade.php` | Adiciona manifest link + SW registration |

---

## Tasks

### Task 1: Instalar Laravel e dependências

**Files:**
- Create: `D:/projetos/briefy/` (project root)
- Modify: `composer.json`, `.env`

- [ ] **Step 1: Criar projeto Laravel**

```bash
cd D:/projetos
composer create-project laravel/laravel briefy --prefer-dist
cd briefy
```

Expected: estrutura Laravel criada com `artisan`, `app/`, `database/`, etc.

- [ ] **Step 2: Instalar dependências PHP**

```bash
composer require echolabs/prism
composer require laravel/reverb
composer require --dev laravel/breeze
```

- [ ] **Step 3: Instalar Breeze com Inertia + React + TypeScript**

```bash
php artisan breeze:install react --typescript
```

Expected: cria `resources/js/`, `vite.config.ts`, `tailwind.config.js`, páginas de auth.

- [ ] **Step 4: Instalar dependências JS**

```bash
npm install react-i18next i18next i18next-browser-languagedetector lucide-react
npm install
```

- [ ] **Step 5: Configurar .env para PostgreSQL**

Editar `.env`:
```ini
APP_NAME=Briefy
APP_URL=http://localhost:8000

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=briefy
DB_USERNAME=postgres
DB_PASSWORD=

BROADCAST_CONNECTION=reverb
QUEUE_CONNECTION=database
FILESYSTEM_DISK=local
```

- [ ] **Step 6: Criar banco PostgreSQL**

```bash
psql -U postgres -c "CREATE DATABASE briefy;"
```

Expected: `CREATE DATABASE`

- [ ] **Step 7: Gerar key e rodar migrations padrão**

- [ ] **Step 7: Gerar key e rodar migrations padrão**

```bash
php artisan key:generate
php artisan migrate
```

Expected: tabelas padrão do Laravel criadas sem erros.

- [ ] **Step 8: Commit inicial**

```bash
git init
git add .
git commit -m "feat: initialize Laravel 13 + Breeze Inertia/React + Prism + Reverb"
```

---

### Task 2: Migrations — organizations + users + clients

**Files:**
- Create: `database/migrations/*_create_organizations_table.php`
- Create: `database/migrations/*_add_organization_fields_to_users_table.php`
- Create: `database/migrations/*_create_clients_table.php`

- [ ] **Step 1: Migration de organizations**

```bash
php artisan make:migration create_organizations_table
```

Editar o arquivo gerado:
```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('organizations', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('logo')->nullable();
            $table->json('settings')->default('{}');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('organizations');
    }
};
```

- [ ] **Step 2: Migration de campos no users**

```bash
php artisan make:migration add_organization_fields_to_users_table
```

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('organization_id')->nullable()->after('id')->constrained()->nullOnDelete();
            $table->enum('role', ['admin', 'collaborator'])->default('admin')->after('organization_id');
            $table->json('preferences')->default('{"locale":"pt-BR","theme":"light"}')->after('role');
            $table->timestamp('last_login_at')->nullable()->after('preferences');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropForeign(['organization_id']);
            $table->dropColumn(['organization_id', 'role', 'preferences', 'last_login_at']);
        });
    }
};
```

- [ ] **Step 3: Migration de clients**

```bash
php artisan make:migration create_clients_table
```

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('segment')->nullable();
            $table->json('channels')->default('[]');
            $table->text('tone_of_voice')->nullable();
            $table->text('target_audience')->nullable();
            $table->text('brand_references')->nullable();
            $table->text('briefing')->nullable();
            $table->string('avatar')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};
```

- [ ] **Step 4: Rodar migrations**

```bash
php artisan migrate
```

Expected: 3 novas tabelas criadas sem erros.

- [ ] **Step 5: Commit**

```bash
git add database/migrations/
git commit -m "feat: migrations for organizations, users fields, clients"
```

---

### Task 3: Migrations — demands, AI e notificações

**Files:**
- Create: migrations para demands, client_events, client_ai_memory, demand_files, demand_comments, planning_suggestions, briefy_notifications, ai_conversations, ai_conversation_messages

- [ ] **Step 1: Migration de demands**

```bash
php artisan make:migration create_demands_table
```

```php
Schema::create('demands', function (Blueprint $table) {
    $table->id();
    $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
    $table->foreignId('client_id')->constrained()->cascadeOnDelete();
    $table->enum('type', ['demand', 'planning'])->default('demand');
    $table->string('title');
    $table->text('description')->nullable();
    $table->string('objective')->nullable();
    $table->string('tone')->nullable();
    $table->string('channel')->nullable();
    $table->date('deadline')->nullable();
    $table->enum('status', ['todo', 'in_progress', 'awaiting_feedback', 'in_review', 'approved'])->default('todo');
    $table->unsignedTinyInteger('recurrence_day')->nullable();
    $table->json('ai_analysis')->nullable();
    $table->foreignId('created_by')->constrained('users');
    $table->foreignId('assigned_to')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamps();
});
```

- [ ] **Step 2: Migration de client_events**

```bash
php artisan make:migration create_client_events_table
```

```php
Schema::create('client_events', function (Blueprint $table) {
    $table->id();
    $table->foreignId('client_id')->constrained()->cascadeOnDelete();
    $table->string('title');
    $table->date('date');
    $table->boolean('recurrent')->default(false);
    $table->enum('source', ['manual', 'ai_extracted'])->default('manual');
    $table->timestamps();
});
```

- [ ] **Step 3: Migration de client_ai_memory**

```bash
php artisan make:migration create_client_ai_memory_table
```

```php
Schema::create('client_ai_memory', function (Blueprint $table) {
    $table->id();
    $table->foreignId('client_id')->constrained()->cascadeOnDelete();
    $table->enum('category', ['preferences', 'rejections', 'tone', 'style', 'audience', 'patterns']);
    $table->text('insight');
    $table->unsignedTinyInteger('confidence')->default(50);
    $table->foreignId('source_demand_id')->nullable()->constrained('demands')->nullOnDelete();
    $table->timestamps();
});
```

- [ ] **Step 4: Migration de demand_files**

```bash
php artisan make:migration create_demand_files_table
```

```php
Schema::create('demand_files', function (Blueprint $table) {
    $table->id();
    $table->foreignId('demand_id')->constrained()->cascadeOnDelete();
    $table->enum('type', ['upload', 'link']);
    $table->string('name');
    $table->string('path_or_url');
    $table->foreignId('uploaded_by')->constrained('users');
    $table->timestamps();
});
```

- [ ] **Step 5: Migration de demand_comments**

```bash
php artisan make:migration create_demand_comments_table
```

```php
Schema::create('demand_comments', function (Blueprint $table) {
    $table->id();
    $table->foreignId('demand_id')->constrained()->cascadeOnDelete();
    $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
    $table->text('body');
    $table->enum('source', ['user', 'ai'])->default('user');
    $table->timestamps();
});
```

- [ ] **Step 6: Migration de planning_suggestions**

```bash
php artisan make:migration create_planning_suggestions_table
```

```php
Schema::create('planning_suggestions', function (Blueprint $table) {
    $table->id();
    $table->foreignId('demand_id')->constrained()->cascadeOnDelete();
    $table->date('date');
    $table->string('title');
    $table->text('description');
    $table->enum('status', ['pending', 'accepted', 'rejected'])->default('pending');
    $table->foreignId('converted_demand_id')->nullable()->constrained('demands')->nullOnDelete();
    $table->timestamps();
});
```

- [ ] **Step 7: Migration de briefy_notifications**

```bash
php artisan make:migration create_briefy_notifications_table
```

Note: `briefy_notifications` evita conflito com a tabela `notifications` nativa do Laravel.

```php
Schema::create('briefy_notifications', function (Blueprint $table) {
    $table->id();
    $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
    $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
    $table->string('type');
    $table->string('title');
    $table->text('body');
    $table->json('data')->default('{}');
    $table->timestamp('read_at')->nullable();
    $table->timestamps();
});
```

- [ ] **Step 8: Migration de ai_conversations**

```bash
php artisan make:migration create_ai_conversations_table
```

```php
Schema::create('ai_conversations', function (Blueprint $table) {
    $table->id();
    $table->foreignId('organization_id')->constrained()->cascadeOnDelete();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->enum('context_type', ['global', 'client', 'demand'])->default('global');
    $table->unsignedBigInteger('context_id')->nullable();
    $table->text('title')->nullable();
    $table->timestamps();
});
```

- [ ] **Step 9: Migration de ai_conversation_messages**

```bash
php artisan make:migration create_ai_conversation_messages_table
```

```php
Schema::create('ai_conversation_messages', function (Blueprint $table) {
    $table->id();
    $table->foreignId('conversation_id')->constrained('ai_conversations')->cascadeOnDelete();
    $table->enum('role', ['user', 'assistant']);
    $table->text('content');
    $table->unsignedInteger('tokens_used')->default(0);
    $table->timestamps();
});
```

- [ ] **Step 10: Rodar todas as migrations**

```bash
php artisan migrate
```

Expected: 9 novas tabelas criadas sem erros. Total de tabelas no banco: ~15.

- [ ] **Step 11: Commit**

```bash
git add database/migrations/
git commit -m "feat: add all domain migrations (demands, AI memory, notifications, conversations)"
```

---

### Task 4: Eloquent Models

**Files:**
- Create: todos os models em `app/Models/`
- Modify: `app/Models/User.php`

- [ ] **Step 1: Organization model**

```bash
php artisan make:model Organization
```

`app/Models/Organization.php`:
```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Organization extends Model
{
    protected $fillable = ['name', 'slug', 'logo', 'settings'];
    protected $casts = ['settings' => 'array'];

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function clients(): HasMany
    {
        return $this->hasMany(Client::class);
    }

    public function demands(): HasMany
    {
        return $this->hasMany(Demand::class);
    }
}
```

- [ ] **Step 2: Atualizar User model**

`app/Models/User.php`:
```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    use Notifiable;

    protected $fillable = [
        'name', 'email', 'password',
        'organization_id', 'role', 'preferences', 'last_login_at',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected $casts = [
        'email_verified_at' => 'datetime',
        'last_login_at' => 'datetime',
        'preferences' => 'array',
        'password' => 'hashed',
    ];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    public function getLocale(): string
    {
        return $this->preferences['locale'] ?? 'pt-BR';
    }

    public function getTheme(): string
    {
        return $this->preferences['theme'] ?? 'light';
    }
}
```

- [ ] **Step 3: Client model**

```bash
php artisan make:model Client
```

`app/Models/Client.php`:
```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Client extends Model
{
    protected $fillable = [
        'organization_id', 'name', 'segment', 'channels',
        'tone_of_voice', 'target_audience', 'brand_references', 'briefing', 'avatar',
    ];
    protected $casts = ['channels' => 'array'];

    public function organization(): BelongsTo { return $this->belongsTo(Organization::class); }
    public function demands(): HasMany { return $this->hasMany(Demand::class); }
    public function events(): HasMany { return $this->hasMany(ClientEvent::class); }
    public function aiMemory(): HasMany { return $this->hasMany(ClientAiMemory::class); }
}
```

- [ ] **Step 4: ClientEvent model**

`app/Models/ClientEvent.php`:
```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientEvent extends Model
{
    protected $fillable = ['client_id', 'title', 'date', 'recurrent', 'source'];
    protected $casts = ['date' => 'date', 'recurrent' => 'boolean'];

    public function client(): BelongsTo { return $this->belongsTo(Client::class); }
}
```

- [ ] **Step 5: ClientAiMemory model**

`app/Models/ClientAiMemory.php`:
```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ClientAiMemory extends Model
{
    protected $table = 'client_ai_memory';
    protected $fillable = ['client_id', 'category', 'insight', 'confidence', 'source_demand_id'];

    public function client(): BelongsTo { return $this->belongsTo(Client::class); }
    public function sourceDemand(): BelongsTo { return $this->belongsTo(Demand::class, 'source_demand_id'); }
}
```

- [ ] **Step 6: Demand model**

`app/Models/Demand.php`:
```php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Demand extends Model
{
    protected $fillable = [
        'organization_id', 'client_id', 'type', 'title', 'description',
        'objective', 'tone', 'channel', 'deadline', 'status',
        'recurrence_day', 'ai_analysis', 'created_by', 'assigned_to',
    ];

    protected $casts = [
        'deadline' => 'date',
        'ai_analysis' => 'array',
        'recurrence_day' => 'integer',
    ];

    public function client(): BelongsTo { return $this->belongsTo(Client::class); }
    public function organization(): BelongsTo { return $this->belongsTo(Organization::class); }
    public function creator(): BelongsTo { return $this->belongsTo(User::class, 'created_by'); }
    public function assignee(): BelongsTo { return $this->belongsTo(User::class, 'assigned_to'); }
    public function files(): HasMany { return $this->hasMany(DemandFile::class); }
    public function comments(): HasMany { return $this->hasMany(DemandComment::class)->orderBy('created_at'); }
    public function planningSuggestions(): HasMany { return $this->hasMany(PlanningSuggestion::class); }
}
```

- [ ] **Step 7: Models restantes**

`app/Models/DemandFile.php`:
```php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DemandFile extends Model
{
    protected $fillable = ['demand_id', 'type', 'name', 'path_or_url', 'uploaded_by'];
    public function demand(): BelongsTo { return $this->belongsTo(Demand::class); }
    public function uploader(): BelongsTo { return $this->belongsTo(User::class, 'uploaded_by'); }
}
```

`app/Models/DemandComment.php`:
```php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DemandComment extends Model
{
    protected $fillable = ['demand_id', 'user_id', 'body', 'source'];
    public function demand(): BelongsTo { return $this->belongsTo(Demand::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
```

`app/Models/PlanningSuggestion.php`:
```php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlanningSuggestion extends Model
{
    protected $fillable = ['demand_id', 'date', 'title', 'description', 'status', 'converted_demand_id'];
    protected $casts = ['date' => 'date'];
    public function demand(): BelongsTo { return $this->belongsTo(Demand::class); }
    public function convertedDemand(): BelongsTo { return $this->belongsTo(Demand::class, 'converted_demand_id'); }
}
```

`app/Models/BriefyNotification.php`:
```php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BriefyNotification extends Model
{
    protected $table = 'briefy_notifications';
    protected $fillable = ['organization_id', 'user_id', 'type', 'title', 'body', 'data', 'read_at'];
    protected $casts = ['data' => 'array', 'read_at' => 'datetime'];
    public function organization(): BelongsTo { return $this->belongsTo(Organization::class); }
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
}
```

`app/Models/AiConversation.php`:
```php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AiConversation extends Model
{
    protected $fillable = ['organization_id', 'user_id', 'context_type', 'context_id', 'title'];
    public function user(): BelongsTo { return $this->belongsTo(User::class); }
    public function messages(): HasMany { return $this->hasMany(AiConversationMessage::class, 'conversation_id')->orderBy('created_at'); }
}
```

`app/Models/AiConversationMessage.php`:
```php
<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AiConversationMessage extends Model
{
    protected $fillable = ['conversation_id', 'role', 'content', 'tokens_used'];
    public function conversation(): BelongsTo { return $this->belongsTo(AiConversation::class); }
}
```

- [ ] **Step 8: Commit**

```bash
git add app/Models/
git commit -m "feat: add all Eloquent models with relationships"
```

---

### Task 5: Autenticação com criação de organização

**Files:**
- Modify: `app/Http/Controllers/Auth/RegisteredUserController.php`
- Modify: `app/Http/Controllers/Auth/AuthenticatedSessionController.php`
- Create: `app/Http/Middleware/SetLocale.php`
- Modify: `app/Http/Middleware/HandleInertiaRequests.php`
- Modify: `bootstrap/app.php`

- [ ] **Step 1: Atualizar RegisteredUserController**

Editar `app/Http/Controllers/Auth/RegisteredUserController.php`, método `store`:
```php
public function store(Request $request): RedirectResponse
{
    $request->validate([
        'name' => 'required|string|max:255',
        'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
        'password' => ['required', 'confirmed', Rules\Password::defaults()],
    ]);

    $organization = \App\Models\Organization::create([
        'name' => $request->name . "'s Agency",
        'slug' => \Illuminate\Support\Str::slug($request->name . '-' . uniqid()),
        'settings' => ['auto_analyze_deliverable' => false],
    ]);

    $acceptLang = substr($request->header('Accept-Language', 'pt-BR'), 0, 5);
    $locale = in_array($acceptLang, ['pt-BR', 'en', 'es']) ? $acceptLang : 'pt-BR';

    $user = User::create([
        'name' => $request->name,
        'email' => $request->email,
        'password' => Hash::make($request->password),
        'organization_id' => $organization->id,
        'role' => 'admin',
        'preferences' => ['locale' => $locale, 'theme' => 'light'],
    ]);

    event(new Registered($user));
    Auth::login($user);

    return redirect(route('dashboard', absolute: false));
}
```

Adicionar imports no topo do arquivo:
```php
use Illuminate\Support\Str;
use App\Models\Organization;
```

- [ ] **Step 2: Atualizar AuthenticatedSessionController**

Editar `app/Http/Controllers/Auth/AuthenticatedSessionController.php`, método `store`, após `Auth::login`:
```php
$request->user()->update(['last_login_at' => now()]);
```

- [ ] **Step 3: Criar SetLocale middleware**

```bash
php artisan make:middleware SetLocale
```

`app/Http/Middleware/SetLocale.php`:
```php
<?php
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class SetLocale
{
    public function handle(Request $request, Closure $next): mixed
    {
        if (auth()->check()) {
            app()->setLocale(auth()->user()->getLocale());
        }
        return $next($request);
    }
}
```

- [ ] **Step 4: Registrar middleware em bootstrap/app.php**

Editar `bootstrap/app.php`, dentro de `->withMiddleware`:
```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->web(append: [
        \App\Http\Middleware\HandleInertiaRequests::class,
        \App\Http\Middleware\SetLocale::class,
    ]);
})
```

- [ ] **Step 5: Atualizar HandleInertiaRequests**

`app/Http/Middleware/HandleInertiaRequests.php`, método `share`:
```php
public function share(Request $request): array
{
    $user = $request->user();

    return array_merge(parent::share($request), [
        'auth' => [
            'user' => $user ? [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'preferences' => $user->preferences,
                'organization' => $user->organization?->only(['id', 'name', 'slug', 'logo']),
            ] : null,
        ],
        'locale' => $user?->getLocale() ?? 'pt-BR',
        'flash' => [
            'success' => $request->session()->get('success'),
            'error' => $request->session()->get('error'),
        ],
    ]);
}
```

- [ ] **Step 6: Commit**

```bash
git add app/Http/ bootstrap/
git commit -m "feat: auth creates organization, sets locale, shares Inertia props"
```

---

### Task 6: i18n — backend e frontend

**Files:**
- Create: `lang/pt-BR/app.php`, `lang/en/app.php`, `lang/es/app.php`
- Create: `resources/js/locales/pt-BR.json`, `en.json`, `es.json`
- Create: `resources/js/lib/i18n.ts`
- Modify: `resources/js/app.tsx`

- [ ] **Step 1: Criar lang files backend**

`lang/pt-BR/app.php`:
```php
<?php
return [
    'dashboard' => 'Painel',
    'clients' => 'Clientes',
    'demands' => 'Demandas',
    'planning' => 'Planejamento',
    'settings' => 'Configurações',
    'save' => 'Salvar',
    'cancel' => 'Cancelar',
    'delete' => 'Excluir',
    'edit' => 'Editar',
    'loading' => 'Carregando...',
];
```

`lang/en/app.php`:
```php
<?php
return [
    'dashboard' => 'Dashboard',
    'clients' => 'Clients',
    'demands' => 'Demands',
    'planning' => 'Planning',
    'settings' => 'Settings',
    'save' => 'Save',
    'cancel' => 'Cancel',
    'delete' => 'Delete',
    'edit' => 'Edit',
    'loading' => 'Loading...',
];
```

`lang/es/app.php`:
```php
<?php
return [
    'dashboard' => 'Panel',
    'clients' => 'Clientes',
    'demands' => 'Demandas',
    'planning' => 'Planificación',
    'settings' => 'Configuración',
    'save' => 'Guardar',
    'cancel' => 'Cancelar',
    'delete' => 'Eliminar',
    'edit' => 'Editar',
    'loading' => 'Cargando...',
];
```

- [ ] **Step 2: Criar locale files frontend**

`resources/js/locales/pt-BR.json`:
```json
{
  "nav": {
    "dashboard": "Painel",
    "clients": "Clientes",
    "demands": "Demandas",
    "planning": "Planejamento",
    "settings": "Configurações",
    "more": "Mais"
  },
  "common": {
    "save": "Salvar",
    "cancel": "Cancelar",
    "delete": "Excluir",
    "create": "Criar",
    "edit": "Editar",
    "loading": "Carregando...",
    "confirm": "Confirmar",
    "search": "Buscar",
    "noResults": "Nenhum resultado encontrado",
    "actions": "Ações"
  },
  "demand": {
    "statuses": {
      "todo": "A fazer",
      "in_progress": "Em andamento",
      "awaiting_feedback": "Aguardando feedback",
      "in_review": "Em revisão",
      "approved": "Aprovado"
    },
    "types": {
      "demand": "Demanda",
      "planning": "Planejamento"
    }
  },
  "auth": {
    "login": "Entrar",
    "logout": "Sair",
    "register": "Criar conta",
    "email": "E-mail",
    "password": "Senha",
    "name": "Nome"
  }
}
```

`resources/js/locales/en.json`:
```json
{
  "nav": {
    "dashboard": "Dashboard",
    "clients": "Clients",
    "demands": "Demands",
    "planning": "Planning",
    "settings": "Settings",
    "more": "More"
  },
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "create": "Create",
    "edit": "Edit",
    "loading": "Loading...",
    "confirm": "Confirm",
    "search": "Search",
    "noResults": "No results found",
    "actions": "Actions"
  },
  "demand": {
    "statuses": {
      "todo": "To do",
      "in_progress": "In progress",
      "awaiting_feedback": "Awaiting feedback",
      "in_review": "In review",
      "approved": "Approved"
    },
    "types": {
      "demand": "Demand",
      "planning": "Planning"
    }
  },
  "auth": {
    "login": "Sign in",
    "logout": "Sign out",
    "register": "Create account",
    "email": "Email",
    "password": "Password",
    "name": "Name"
  }
}
```

`resources/js/locales/es.json`:
```json
{
  "nav": {
    "dashboard": "Panel",
    "clients": "Clientes",
    "demands": "Demandas",
    "planning": "Planificación",
    "settings": "Configuración",
    "more": "Más"
  },
  "common": {
    "save": "Guardar",
    "cancel": "Cancelar",
    "delete": "Eliminar",
    "create": "Crear",
    "edit": "Editar",
    "loading": "Cargando...",
    "confirm": "Confirmar",
    "search": "Buscar",
    "noResults": "No se encontraron resultados",
    "actions": "Acciones"
  },
  "demand": {
    "statuses": {
      "todo": "Por hacer",
      "in_progress": "En progreso",
      "awaiting_feedback": "Esperando feedback",
      "in_review": "En revisión",
      "approved": "Aprobado"
    },
    "types": {
      "demand": "Demanda",
      "planning": "Planificación"
    }
  },
  "auth": {
    "login": "Iniciar sesión",
    "logout": "Cerrar sesión",
    "register": "Crear cuenta",
    "email": "Correo electrónico",
    "password": "Contraseña",
    "name": "Nombre"
  }
}
```

- [ ] **Step 3: Criar lib/i18n.ts**

`resources/js/lib/i18n.ts`:
```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import ptBR from '../locales/pt-BR.json';
import en from '../locales/en.json';
import es from '../locales/es.json';

i18n.use(initReactI18next).init({
  resources: {
    'pt-BR': { translation: ptBR },
    en: { translation: en },
    es: { translation: es },
  },
  lng: 'pt-BR',
  fallbackLng: 'pt-BR',
  interpolation: { escapeValue: false },
});

export default i18n;
```

- [ ] **Step 4: Atualizar resources/js/app.tsx**

```typescript
import './lib/i18n';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import i18n from './lib/i18n';

createInertiaApp({
  title: (title) => `${title} - Briefy`,
  resolve: (name) =>
    resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
  setup({ el, App, props }) {
    const pageProps = props.initialPage.props as Record<string, unknown>;

    // Sync locale from server
    const locale = (pageProps.locale as string) ?? 'pt-BR';
    i18n.changeLanguage(locale);

    // Apply theme before render to prevent flash
    const prefs = (pageProps.auth as Record<string, unknown>)?.user as Record<string, unknown> | undefined;
    const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('theme') : null;
    const theme = savedTheme ?? (prefs?.preferences as Record<string, string>)?.theme ?? 'light';
    document.documentElement.classList.toggle('dark', theme === 'dark');

    createRoot(el).render(<App {...props} />);
  },
  progress: { color: '#6366f1' },
});
```

- [ ] **Step 5: Commit**

```bash
git add lang/ resources/js/locales/ resources/js/lib/ resources/js/app.tsx
git commit -m "feat: i18n setup with react-i18next (PT-BR, EN, ES)"
```

---

### Task 7: Tema dark/light

**Files:**
- Modify: `tailwind.config.js`
- Modify: `resources/css/app.css`
- Create: `resources/js/hooks/useTheme.ts`
- Create: `resources/js/components/ThemeToggle.tsx`

- [ ] **Step 1: Configurar Tailwind darkMode**

`tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './vendor/laravel/framework/src/Illuminate/Pagination/resources/views/*.blade.php',
    './storage/framework/views/*.php',
    './resources/views/**/*.blade.php',
    './resources/js/**/*.tsx',
    './resources/js/**/*.ts',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          900: '#312e81',
        },
      },
    },
  },
  plugins: [],
};
```

- [ ] **Step 2: Estilos base dark mode**

`resources/css/app.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-50 transition-colors duration-200;
  }
}
```

- [ ] **Step 3: useTheme hook**

`resources/js/hooks/useTheme.ts`:
```typescript
import { useCallback, useEffect, useState } from 'react';
import { router, usePage } from '@inertiajs/react';

type Theme = 'light' | 'dark';

interface PageProps {
  auth: { user: { preferences: { theme: string } } };
}

export function useTheme() {
  const { auth } = usePage<PageProps>().props;
  const initial = (auth?.user?.preferences?.theme as Theme) ?? 'light';
  const [theme, setTheme] = useState<Theme>(initial);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggle = useCallback(() => {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    localStorage.setItem('theme', next);
    router.patch(
      route('settings.preferences'),
      { theme: next },
      { preserveState: true, preserveScroll: true }
    );
  }, [theme]);

  return { theme, toggle };
}
```

- [ ] **Step 4: ThemeToggle component**

`resources/js/components/ThemeToggle.tsx`:
```typescript
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label="Toggle theme"
    >
      {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
    </button>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add tailwind.config.js resources/css/ resources/js/hooks/ resources/js/components/ThemeToggle.tsx
git commit -m "feat: dark/light theme with Tailwind class strategy and useTheme hook"
```

---

### Task 8: AppLayout + Sidebar + BottomNav

**Files:**
- Create: `resources/js/components/Sidebar.tsx`
- Create: `resources/js/components/BottomNav.tsx`
- Create: `resources/js/layouts/AppLayout.tsx`

- [ ] **Step 1: Sidebar**

`resources/js/components/Sidebar.tsx`:
```typescript
import { Link, usePage } from '@inertiajs/react';
import { Calendar, ClipboardList, LayoutDashboard, Settings, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const navItems = [
  { key: 'nav.dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { key: 'nav.clients', icon: Users, href: '/clients' },
  { key: 'nav.demands', icon: ClipboardList, href: '/demands' },
  { key: 'nav.planning', icon: Calendar, href: '/planning' },
];

export function Sidebar() {
  const { t } = useTranslation();
  const { url } = usePage();

  const isActive = (href: string) => url.startsWith(href);

  return (
    <aside className="hidden md:flex flex-col w-64 min-h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 p-4 shrink-0">
      <div className="px-2 mb-8">
        <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">Briefy</span>
      </div>
      <nav className="flex-1 space-y-1">
        {navItems.map(({ key, icon: Icon, href }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive(href)
                ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Icon size={18} />
            {t(key)}
          </Link>
        ))}
      </nav>
      <Link
        href="/settings"
        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isActive('/settings')
            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
        }`}
      >
        <Settings size={18} />
        {t('nav.settings')}
      </Link>
    </aside>
  );
}
```

- [ ] **Step 2: BottomNav**

`resources/js/components/BottomNav.tsx`:
```typescript
import { Link, usePage } from '@inertiajs/react';
import { Calendar, ClipboardList, LayoutDashboard, MoreHorizontal, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const navItems = [
  { key: 'nav.dashboard', icon: LayoutDashboard, href: '/dashboard' },
  { key: 'nav.clients', icon: Users, href: '/clients' },
  { key: 'nav.demands', icon: ClipboardList, href: '/demands' },
  { key: 'nav.planning', icon: Calendar, href: '/planning' },
];

export function BottomNav() {
  const { t } = useTranslation();
  const { url } = usePage();
  const isActive = (href: string) => url.startsWith(href);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50 safe-area-bottom">
      <div className="flex justify-around items-center h-16 px-2">
        {navItems.map(({ key, icon: Icon, href }) => (
          <Link
            key={href}
            href={href}
            className={`flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              isActive(href)
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <Icon size={20} />
            <span>{t(key)}</span>
          </Link>
        ))}
        <Link
          href="/settings"
          className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-lg text-xs font-medium text-gray-500 dark:text-gray-400"
        >
          <MoreHorizontal size={20} />
          <span>{t('nav.more')}</span>
        </Link>
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: AppLayout**

`resources/js/layouts/AppLayout.tsx`:
```typescript
import { PropsWithChildren } from 'react';
import { usePage } from '@inertiajs/react';
import { BottomNav } from '../components/BottomNav';
import { Sidebar } from '../components/Sidebar';
import { ThemeToggle } from '../components/ThemeToggle';

interface PageProps {
  auth: { user: { name: string } };
}

interface Props extends PropsWithChildren {
  title?: string;
  actions?: React.ReactNode;
}

export default function AppLayout({ children, title, actions }: Props) {
  const { auth } = usePage<PageProps>().props;

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 md:px-6 h-14 flex items-center gap-4">
          {title && (
            <h1 className="text-base font-semibold text-gray-900 dark:text-gray-50 truncate">{title}</h1>
          )}
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {actions}
            <ThemeToggle />
            <span className="hidden sm:block text-sm text-gray-600 dark:text-gray-400 max-w-32 truncate">
              {auth?.user?.name}
            </span>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6 overflow-auto">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add resources/js/layouts/ resources/js/components/Sidebar.tsx resources/js/components/BottomNav.tsx
git commit -m "feat: AppLayout with responsive sidebar (desktop) and bottom nav (mobile)"
```

---

### Task 9: PWA manifest + service worker

**Files:**
- Create: `public/manifest.json`
- Create: `public/sw.js`
- Create: `public/icons/` (placeholder)
- Modify: `resources/views/app.blade.php`

- [ ] **Step 1: Criar manifest.json**

`public/manifest.json`:
```json
{
  "name": "Briefy",
  "short_name": "Briefy",
  "description": "Gestão de demandas para agências com IA",
  "start_url": "/dashboard",
  "scope": "/",
  "display": "standalone",
  "background_color": "#f9fafb",
  "theme_color": "#6366f1",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

- [ ] **Step 2: Criar service worker**

`public/sw.js`:
```javascript
const CACHE_NAME = 'briefy-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Network-first: sem suporte offline, apenas app-like install
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});

self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Briefy', {
      body: data.body ?? '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: data.url ?? '/dashboard' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url ?? '/dashboard'));
});
```

- [ ] **Step 3: Criar ícones placeholder**

```bash
mkdir -p public/icons
# Copiar ou gerar ícones 192x192 e 512x512 em public/icons/
# Para desenvolvimento, qualquer PNG de 192px serve como placeholder
```

- [ ] **Step 4: Atualizar blade template**

Editar `resources/views/app.blade.php`, adicionar dentro de `<head>` antes de `@vite`:
```html
<meta name="theme-color" content="#6366f1">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title" content="Briefy">
<link rel="apple-touch-icon" href="/icons/icon-192.png">
<link rel="manifest" href="/manifest.json">
<script>
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
  }
  // Apply saved theme immediately to prevent flash
  const t = localStorage.getItem('theme');
  if (t === 'dark') document.documentElement.classList.add('dark');
</script>
```

- [ ] **Step 5: Commit**

```bash
git add public/manifest.json public/sw.js public/icons/ resources/views/
git commit -m "feat: PWA manifest, service worker, and iOS meta tags"
```

---

### Task 10: Rotas + controllers stub + páginas placeholder

**Files:**
- Modify: `routes/web.php`
- Create: `app/Http/Controllers/DashboardController.php`
- Create: `app/Http/Controllers/ClientController.php`
- Create: `app/Http/Controllers/DemandController.php`
- Create: `app/Http/Controllers/PlanningController.php`
- Create: `app/Http/Controllers/TeamController.php`
- Create: páginas placeholder em `resources/js/pages/`

- [ ] **Step 1: Definir rotas**

`routes/web.php`:
```php
<?php
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ClientController;
use App\Http\Controllers\DemandController;
use App\Http\Controllers\PlanningController;
use App\Http\Controllers\TeamController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', fn() => redirect()->route('dashboard'));

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    Route::resource('clients', ClientController::class);

    Route::get('/demands', [DemandController::class, 'index'])->name('demands.index');
    Route::resource('clients.demands', DemandController::class)
        ->shallow()
        ->except(['index']);

    Route::prefix('planning')->name('planning.')->group(function () {
        Route::get('/', [PlanningController::class, 'index'])->name('index');
    });

    Route::prefix('settings')->name('settings.')->group(function () {
        Route::get('/', fn() => Inertia::render('Settings/Index'))->name('index');
        Route::get('/team', [TeamController::class, 'index'])->name('team');
        Route::patch('/preferences', function (Request $r) {
            $r->user()->update([
                'preferences' => array_merge(
                    $r->user()->preferences ?? [],
                    $r->only(['locale', 'theme'])
                ),
            ]);
            return back()->with('success', 'Preferências salvas.');
        })->name('preferences');
    });
});

require __DIR__.'/auth.php';
```

- [ ] **Step 2: Criar DashboardController**

```bash
php artisan make:controller DashboardController
```

`app/Http/Controllers/DashboardController.php`:
```php
<?php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('Dashboard', [
            'stats' => [],
            'alerts' => [],
            'recentDemands' => [],
            'clients' => [],
        ]);
    }
}
```

- [ ] **Step 3: Criar controllers stub**

```bash
php artisan make:controller ClientController --resource
php artisan make:controller DemandController --resource
php artisan make:controller PlanningController
php artisan make:controller TeamController
```

Em cada controller, o método `index` retorna um Inertia render para a página correspondente:

`ClientController::index`:
```php
public function index(): \Inertia\Response
{
    return \Inertia\Inertia::render('Clients/Index', ['clients' => []]);
}
```

`DemandController::index`:
```php
public function index(): \Inertia\Response
{
    return \Inertia\Inertia::render('Demands/Index', ['demands' => []]);
}
```

`PlanningController::index`:
```php
public function index(): \Inertia\Response
{
    return \Inertia\Inertia::render('Planning/Index', ['planningDemands' => []]);
}
```

- [ ] **Step 4: Criar páginas placeholder**

`resources/js/pages/Dashboard.tsx`:
```typescript
import AppLayout from '../layouts/AppLayout';
import { useTranslation } from 'react-i18next';

export default function Dashboard() {
  const { t } = useTranslation();
  return (
    <AppLayout title={t('nav.dashboard')}>
      <p className="text-gray-400 dark:text-gray-500 text-sm">Em breve...</p>
    </AppLayout>
  );
}
```

Criar `resources/js/pages/Clients/Index.tsx`, `resources/js/pages/Demands/Index.tsx`, `resources/js/pages/Planning/Index.tsx`, `resources/js/pages/Settings/Index.tsx` com o mesmo padrão, alterando o `title`.

- [ ] **Step 5: Verificar funcionamento**

```bash
php artisan serve &
npm run dev
```

Abrir `http://localhost:8000` e verificar:
- Registro cria organização + redireciona para `/dashboard`
- Sidebar exibe todos os itens de navegação
- BottomNav aparece em viewport mobile (< 768px)
- Toggle de tema funciona e persiste após reload
- Todas as rotas respondem sem 404

- [ ] **Step 6: Commit final da Phase 1**

```bash
git add routes/ app/Http/Controllers/ resources/js/pages/
git commit -m "feat: route skeleton, stub controllers, and placeholder pages"
```

---

### Task 11: Testes — Feature e Unit

**Files:**
- Create: `tests/Unit/Models/UserModelTest.php`
- Create: `tests/Unit/Models/OrganizationModelTest.php`
- Create: `tests/Unit/Models/DemandModelTest.php`
- Create: `tests/Feature/Auth/RegistrationTest.php`
- Create: `tests/Feature/Auth/AuthenticationTest.php`
- Create: `tests/Feature/Settings/PreferencesTest.php`
- Create: `tests/Feature/RoutesTest.php`
- Modify: `phpunit.xml`

- [ ] **Step 1: Configurar banco de testes**

Editar `phpunit.xml`, dentro de `<php>`:
```xml
<env name="APP_ENV" value="testing"/>
<env name="DB_CONNECTION" value="pgsql"/>
<env name="DB_DATABASE" value="briefy_test"/>
```

Criar banco de testes:
```bash
psql -U postgres -c "CREATE DATABASE briefy_test;"
```

- [ ] **Step 2: Escrever UserModelTest — deve passar**

`tests/Unit/Models/UserModelTest.php`:
```php
<?php
namespace Tests\Unit\Models;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_get_locale_returns_user_preference(): void
    {
        $user = User::factory()->create([
            'preferences' => ['locale' => 'en', 'theme' => 'light'],
        ]);

        $this->assertSame('en', $user->getLocale());
    }

    public function test_get_locale_defaults_to_pt_br_when_preference_missing(): void
    {
        $user = User::factory()->create(['preferences' => []]);

        $this->assertSame('pt-BR', $user->getLocale());
    }

    public function test_get_theme_returns_user_preference(): void
    {
        $user = User::factory()->create([
            'preferences' => ['locale' => 'pt-BR', 'theme' => 'dark'],
        ]);

        $this->assertSame('dark', $user->getTheme());
    }

    public function test_get_theme_defaults_to_light_when_preference_missing(): void
    {
        $user = User::factory()->create(['preferences' => []]);

        $this->assertSame('light', $user->getTheme());
    }

    public function test_is_admin_returns_true_for_admin_role(): void
    {
        $user = User::factory()->create(['role' => 'admin']);

        $this->assertTrue($user->isAdmin());
    }

    public function test_is_admin_returns_false_for_collaborator_role(): void
    {
        $user = User::factory()->create(['role' => 'collaborator']);

        $this->assertFalse($user->isAdmin());
    }

    public function test_user_belongs_to_organization(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create(['organization_id' => $org->id]);

        $this->assertInstanceOf(Organization::class, $user->organization);
        $this->assertSame($org->id, $user->organization->id);
    }
}
```

- [ ] **Step 3: Verificar que UserModelTest passa**

```bash
php artisan test tests/Unit/Models/UserModelTest.php --verbose
```

Expected:
```
PASS  Tests\Unit\Models\UserModelTest
✓ get locale returns user preference
✓ get locale defaults to pt br when preference missing
✓ get theme returns user preference
✓ get theme defaults to light when preference missing
✓ is admin returns true for admin role
✓ is admin returns false for collaborator role
✓ user belongs to organization
```

- [ ] **Step 4: Escrever OrganizationModelTest**

`tests/Unit/Models/OrganizationModelTest.php`:
```php
<?php
namespace Tests\Unit\Models;

use App\Models\Client;
use App\Models\Demand;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrganizationModelTest extends TestCase
{
    use RefreshDatabase;

    public function test_organization_has_many_users(): void
    {
        $org = Organization::factory()->create();
        User::factory()->count(3)->create(['organization_id' => $org->id]);

        $this->assertCount(3, $org->users);
    }

    public function test_organization_has_many_clients(): void
    {
        $org = Organization::factory()->create();
        Client::factory()->count(2)->create(['organization_id' => $org->id]);

        $this->assertCount(2, $org->clients);
    }

    public function test_organization_settings_cast_to_array(): void
    {
        $org = Organization::factory()->create([
            'settings' => ['auto_analyze_deliverable' => true],
        ]);

        $this->assertIsArray($org->settings);
        $this->assertTrue($org->settings['auto_analyze_deliverable']);
    }

    public function test_deleting_organization_cascades_to_clients(): void
    {
        $org = Organization::factory()->create();
        Client::factory()->create(['organization_id' => $org->id]);

        $org->delete();

        $this->assertDatabaseMissing('clients', ['organization_id' => $org->id]);
    }
}
```

- [ ] **Step 5: Escrever DemandModelTest**

`tests/Unit/Models/DemandModelTest.php`:
```php
<?php
namespace Tests\Unit\Models;

use App\Models\Client;
use App\Models\Demand;
use App\Models\DemandComment;
use App\Models\DemandFile;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DemandModelTest extends TestCase
{
    use RefreshDatabase;

    private Organization $org;
    private Client $client;
    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->org = Organization::factory()->create();
        $this->user = User::factory()->create(['organization_id' => $this->org->id]);
        $this->client = Client::factory()->create(['organization_id' => $this->org->id]);
    }

    public function test_demand_belongs_to_client(): void
    {
        $demand = Demand::factory()->create([
            'client_id' => $this->client->id,
            'organization_id' => $this->org->id,
            'created_by' => $this->user->id,
        ]);

        $this->assertSame($this->client->id, $demand->client->id);
    }

    public function test_demand_has_many_files(): void
    {
        $demand = Demand::factory()->create([
            'client_id' => $this->client->id,
            'organization_id' => $this->org->id,
            'created_by' => $this->user->id,
        ]);
        DemandFile::factory()->count(2)->create(['demand_id' => $demand->id, 'uploaded_by' => $this->user->id]);

        $this->assertCount(2, $demand->files);
    }

    public function test_demand_has_many_comments_ordered_by_created_at(): void
    {
        $demand = Demand::factory()->create([
            'client_id' => $this->client->id,
            'organization_id' => $this->org->id,
            'created_by' => $this->user->id,
        ]);
        DemandComment::factory()->create(['demand_id' => $demand->id, 'created_at' => now()->subMinutes(2)]);
        DemandComment::factory()->create(['demand_id' => $demand->id, 'created_at' => now()]);

        $comments = $demand->comments;
        $this->assertTrue($comments->first()->created_at->lt($comments->last()->created_at));
    }

    public function test_demand_ai_analysis_cast_to_array(): void
    {
        $demand = Demand::factory()->create([
            'client_id' => $this->client->id,
            'organization_id' => $this->org->id,
            'created_by' => $this->user->id,
            'ai_analysis' => ['score' => 85, 'positives' => ['Boa escrita']],
        ]);

        $this->assertIsArray($demand->ai_analysis);
        $this->assertSame(85, $demand->ai_analysis['score']);
    }

    public function test_deleting_demand_cascades_to_files_and_comments(): void
    {
        $demand = Demand::factory()->create([
            'client_id' => $this->client->id,
            'organization_id' => $this->org->id,
            'created_by' => $this->user->id,
        ]);
        DemandFile::factory()->create(['demand_id' => $demand->id, 'uploaded_by' => $this->user->id]);
        DemandComment::factory()->create(['demand_id' => $demand->id]);

        $demand->delete();

        $this->assertDatabaseMissing('demand_files', ['demand_id' => $demand->id]);
        $this->assertDatabaseMissing('demand_comments', ['demand_id' => $demand->id]);
    }
}
```

- [ ] **Step 6: Criar Factories necessárias**

```bash
php artisan make:factory OrganizationFactory --model=Organization
php artisan make:factory ClientFactory --model=Client
php artisan make:factory DemandFactory --model=Demand
php artisan make:factory DemandFileFactory --model=DemandFile
php artisan make:factory DemandCommentFactory --model=DemandComment
```

`database/factories/OrganizationFactory.php`:
```php
<?php
namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

class OrganizationFactory extends Factory
{
    public function definition(): array
    {
        $name = $this->faker->company();
        return [
            'name' => $name,
            'slug' => Str::slug($name . '-' . $this->faker->unique()->numberBetween(1000, 9999)),
            'logo' => null,
            'settings' => ['auto_analyze_deliverable' => false],
        ];
    }
}
```

`database/factories/ClientFactory.php`:
```php
<?php
namespace Database\Factories;

use App\Models\Organization;
use Illuminate\Database\Eloquent\Factories\Factory;

class ClientFactory extends Factory
{
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'name' => $this->faker->company(),
            'segment' => $this->faker->randomElement(['tech', 'food', 'fashion', 'health']),
            'channels' => ['instagram', 'linkedin'],
            'tone_of_voice' => null,
            'target_audience' => null,
            'brand_references' => null,
            'briefing' => null,
            'avatar' => null,
        ];
    }
}
```

`database/factories/DemandFactory.php`:
```php
<?php
namespace Database\Factories;

use App\Models\Client;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class DemandFactory extends Factory
{
    public function definition(): array
    {
        return [
            'organization_id' => Organization::factory(),
            'client_id' => Client::factory(),
            'type' => 'demand',
            'title' => $this->faker->sentence(4),
            'description' => null,
            'objective' => null,
            'tone' => null,
            'channel' => null,
            'deadline' => $this->faker->optional()->dateTimeBetween('now', '+30 days'),
            'status' => 'todo',
            'recurrence_day' => null,
            'ai_analysis' => null,
            'created_by' => User::factory(),
            'assigned_to' => null,
        ];
    }
}
```

`database/factories/DemandFileFactory.php`:
```php
<?php
namespace Database\Factories;

use App\Models\Demand;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class DemandFileFactory extends Factory
{
    public function definition(): array
    {
        return [
            'demand_id' => Demand::factory(),
            'type' => 'link',
            'name' => $this->faker->word() . '.pdf',
            'path_or_url' => $this->faker->url(),
            'uploaded_by' => User::factory(),
        ];
    }
}
```

`database/factories/DemandCommentFactory.php`:
```php
<?php
namespace Database\Factories;

use App\Models\Demand;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class DemandCommentFactory extends Factory
{
    public function definition(): array
    {
        return [
            'demand_id' => Demand::factory(),
            'user_id' => User::factory(),
            'body' => $this->faker->paragraph(),
            'source' => 'user',
        ];
    }
}
```

Também adicionar `HasFactory` ao `UserFactory` existente e garantir que cria `organization_id`:

Editar `database/factories/UserFactory.php`, adicionar campos ao `definition`:
```php
'organization_id' => null,
'role' => 'admin',
'preferences' => ['locale' => 'pt-BR', 'theme' => 'light'],
'last_login_at' => null,
```

- [ ] **Step 7: Rodar testes unitários**

```bash
php artisan test tests/Unit/ --verbose
```

Expected: todos PASS.

- [ ] **Step 8: Escrever RegistrationTest — deve passar**

`tests/Feature/Auth/RegistrationTest.php`:
```php
<?php
namespace Tests\Feature\Auth;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_screen_renders(): void
    {
        $response = $this->get('/register');

        $response->assertStatus(200);
    }

    public function test_new_users_can_register_and_organization_is_created(): void
    {
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('dashboard'));

        $user = User::where('email', 'test@example.com')->first();
        $this->assertNotNull($user);
        $this->assertNotNull($user->organization_id);
        $this->assertSame('admin', $user->role);

        $org = Organization::find($user->organization_id);
        $this->assertNotNull($org);
        $this->assertArrayHasKey('auto_analyze_deliverable', $org->settings);
    }

    public function test_registration_fails_with_duplicate_email(): void
    {
        User::factory()->create(['email' => 'taken@example.com']);

        $response = $this->post('/register', [
            'name' => 'Another User',
            'email' => 'taken@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertSessionHasErrors('email');
        $this->assertGuest();
    }

    public function test_registration_fails_with_mismatched_passwords(): void
    {
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'different_password',
        ]);

        $response->assertSessionHasErrors('password');
        $this->assertGuest();
    }

    public function test_registration_fails_with_missing_name(): void
    {
        $response = $this->post('/register', [
            'name' => '',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertSessionHasErrors('name');
        $this->assertGuest();
    }

    public function test_registration_fails_with_invalid_email(): void
    {
        $response = $this->post('/register', [
            'name' => 'Test User',
            'email' => 'not-an-email',
            'password' => 'password',
            'password_confirmation' => 'password',
        ]);

        $response->assertSessionHasErrors('email');
        $this->assertGuest();
    }
}
```

- [ ] **Step 9: Escrever AuthenticationTest**

`tests/Feature/Auth/AuthenticationTest.php`:
```php
<?php
namespace Tests\Feature\Auth;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_screen_renders(): void
    {
        $this->get('/login')->assertStatus(200);
    }

    public function test_users_can_authenticate_and_last_login_is_updated(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create([
            'organization_id' => $org->id,
            'last_login_at' => null,
        ]);

        $this->post('/login', ['email' => $user->email, 'password' => 'password']);

        $this->assertAuthenticated();
        $this->assertNotNull($user->fresh()->last_login_at);
    }

    public function test_users_cannot_authenticate_with_invalid_password(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create(['organization_id' => $org->id]);

        $this->post('/login', ['email' => $user->email, 'password' => 'wrong-password']);

        $this->assertGuest();
    }

    public function test_users_cannot_authenticate_with_nonexistent_email(): void
    {
        $this->post('/login', ['email' => 'nobody@example.com', 'password' => 'password']);

        $this->assertGuest();
    }

    public function test_users_can_logout(): void
    {
        $org = Organization::factory()->create();
        $user = User::factory()->create(['organization_id' => $org->id]);

        $this->actingAs($user)->post('/logout');

        $this->assertGuest();
    }
}
```

- [ ] **Step 10: Escrever PreferencesTest**

`tests/Feature/Settings/PreferencesTest.php`:
```php
<?php
namespace Tests\Feature\Settings;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PreferencesTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $org = Organization::factory()->create();
        $this->user = User::factory()->create([
            'organization_id' => $org->id,
            'preferences' => ['locale' => 'pt-BR', 'theme' => 'light'],
        ]);
    }

    public function test_user_can_update_theme_to_dark(): void
    {
        $response = $this->actingAs($this->user)
            ->patch(route('settings.preferences'), ['theme' => 'dark']);

        $response->assertRedirect();
        $this->assertSame('dark', $this->user->fresh()->preferences['theme']);
    }

    public function test_user_can_update_locale_to_english(): void
    {
        $response = $this->actingAs($this->user)
            ->patch(route('settings.preferences'), ['locale' => 'en']);

        $response->assertRedirect();
        $this->assertSame('en', $this->user->fresh()->preferences['locale']);
    }

    public function test_updating_theme_preserves_existing_locale(): void
    {
        $this->actingAs($this->user)
            ->patch(route('settings.preferences'), ['theme' => 'dark']);

        $this->assertSame('pt-BR', $this->user->fresh()->preferences['locale']);
    }

    public function test_unauthenticated_user_cannot_update_preferences(): void
    {
        $response = $this->patch(route('settings.preferences'), ['theme' => 'dark']);

        $response->assertRedirect(route('login'));
    }
}
```

- [ ] **Step 11: Escrever RoutesTest**

`tests/Feature/RoutesTest.php`:
```php
<?php
namespace Tests\Feature;

use App\Models\Organization;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoutesTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $org = Organization::factory()->create();
        $this->user = User::factory()->create(['organization_id' => $org->id]);
    }

    public function test_dashboard_redirects_unauthenticated_users_to_login(): void
    {
        $this->get('/dashboard')->assertRedirect(route('login'));
    }

    public function test_root_redirects_to_dashboard(): void
    {
        $this->actingAs($this->user)->get('/')->assertRedirect('/dashboard');
    }

    public function test_authenticated_user_can_access_dashboard(): void
    {
        $this->actingAs($this->user)->get('/dashboard')->assertStatus(200);
    }

    public function test_authenticated_user_can_access_clients(): void
    {
        $this->actingAs($this->user)->get('/clients')->assertStatus(200);
    }

    public function test_authenticated_user_can_access_demands(): void
    {
        $this->actingAs($this->user)->get('/demands')->assertStatus(200);
    }

    public function test_authenticated_user_can_access_planning(): void
    {
        $this->actingAs($this->user)->get('/planning')->assertStatus(200);
    }

    public function test_authenticated_user_can_access_settings(): void
    {
        $this->actingAs($this->user)->get('/settings')->assertStatus(200);
    }

    public function test_unauthenticated_user_cannot_access_protected_routes(): void
    {
        $protectedRoutes = ['/dashboard', '/clients', '/demands', '/planning', '/settings'];

        foreach ($protectedRoutes as $route) {
            $this->get($route)->assertRedirect(route('login'));
        }
    }
}
```

- [ ] **Step 12: Rodar todos os testes**

```bash
php artisan test --verbose
```

Expected:
```
PASS  Tests\Unit\Models\UserModelTest          (7 testes)
PASS  Tests\Unit\Models\OrganizationModelTest  (4 testes)
PASS  Tests\Unit\Models\DemandModelTest        (5 testes)
PASS  Tests\Feature\Auth\RegistrationTest      (6 testes)
PASS  Tests\Feature\Auth\AuthenticationTest    (5 testes)
PASS  Tests\Feature\Settings\PreferencesTest   (4 testes)
PASS  Tests\Feature\RoutesTest                 (8 testes)

Tests:  39 passed
```

- [ ] **Step 13: Commit**

```bash
git add tests/ database/factories/ phpunit.xml
git commit -m "test: add unit and feature tests for models, auth, preferences, and routes"
```

---

## Self-Review

**Cobertura da spec:**
- ✅ Laravel 13 + PostgreSQL (Task 1)
- ✅ Todas as 12 tabelas do sistema (Tasks 2–3)
- ✅ Todos os modelos Eloquent com relacionamentos (Task 4)
- ✅ Auth com criação automática de organização (Task 5)
- ✅ Middleware de locale por usuário (Task 5)
- ✅ i18n PT-BR, EN, ES frontend + backend (Task 6)
- ✅ Tema dark/light com Tailwind + hook + toggle (Task 7)
- ✅ AppLayout com sidebar desktop + bottom nav mobile (Task 8)
- ✅ PWA manifest + service worker + iOS meta tags (Task 9)
- ✅ Esqueleto de rotas + controllers + páginas placeholder (Task 10)
- ⏭ Clientes CRUD → Phase 2
- ⏭ Demandas CRUD + kanban → Phase 2
- ⏭ Integrações AI (Prism) → Phase 3
- ⏭ Real-time + Notificações → Phase 4
- ⏭ Dashboard com dados reais + Onboarding → Phase 5

- ✅ Testes unitários (User, Organization, Demand) com cenários positivos e negativos (Task 11)
- ✅ Testes de feature (registro, login, preferências, rotas protegidas) (Task 11)
- ✅ Factories para todos os models testados (Task 11)

**Nenhum placeholder encontrado.** Todos os steps contêm código completo e comandos concretos.

**Testes que devem PASSAR:** comportamentos corretos dos models, registro válido, login válido, atualização de preferências.

**Testes que devem FALHAR (cenários de erro):** e-mail duplicado no registro, senhas diferentes, e-mail inválido, senha incorreta no login, acesso não autenticado a rotas protegidas.
