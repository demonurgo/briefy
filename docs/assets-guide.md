# Briefy — Assets Guide

Onde salvar cada imagem, nome exato do arquivo e resolução necessária.

---

## Estrutura de pastas

```
D:/projetos/briefy/
├── public/
│   ├── favicon.ico
│   ├── favicon.svg
│   └── icons/
│       ├── icon-192.png
│       ├── icon-512.png
│       └── apple-touch-icon.png
└── resources/
    └── js/
        └── assets/
            ├── logo.svg
            ├── logo-dark.svg
            ├── logo-icon.svg
            ├── logo-icon-dark.svg
            ├── chatbot-icon.svg
            ├── bg-light.png
            ├── bg-dark.png
            ├── empty-state-light.svg
            └── empty-state-dark.svg
```

---

## Detalhes de cada arquivo

### Logos — `resources/js/assets/`

| Arquivo | Descrição | Resolução / Formato | Fundo |
|---|---|---|---|
| `logo.svg` | Logo completo (ícone + texto "Briefy") — versão para fundo claro | SVG vetorial | Transparente |
| `logo-dark.svg` | Logo completo — versão para fundo escuro | SVG vetorial | Transparente |
| `logo-icon.svg` | Só o símbolo/ícone, sem texto — versão clara | SVG vetorial | Transparente |
| `logo-icon-dark.svg` | Só o símbolo/ícone, sem texto — versão escura | SVG vetorial | Transparente |
| `chatbot-icon-light.svg` | Ícone do assistente IA — versão para modo claro | SVG vetorial | Transparente |
| `chatbot-icon-dark.svg` | Ícone do assistente IA — versão para modo escuro | SVG vetorial | Transparente |

> **Onde é usado:**
> - `logo.svg` → Sidebar (desktop), tela de login/registro (modo claro)
> - `logo-dark.svg` → Sidebar no dark mode, telas com fundo escuro
> - `logo-icon.svg` → Favicon fallback, sidebar colapsada (mobile, modo claro)
> - `logo-icon-dark.svg` → Favicon fallback modo escuro, sidebar colapsada dark
> - `chatbot-icon-light.svg` → Botão flutuante no modo claro
> - `chatbot-icon-dark.svg` → Botão flutuante no modo escuro

---

### Favicon — `public/`

| Arquivo | Descrição | Resolução | Formato |
|---|---|---|---|
| `favicon.svg` | Favicon moderno (Chrome, Firefox, Edge) | Qualquer (SVG escala) | SVG |
| `favicon.ico` | Favicon legado (IE, apps antigos) | 32×32px (pode conter 16, 32, 48) | ICO |

> Use o `logo-icon.svg` como base para gerar estes dois.
> Ferramentas online para gerar .ico a partir do SVG: **favicon.io** ou **realfavicongenerator.net**

---

### Ícones PWA — `public/icons/`

| Arquivo | Descrição | Resolução | Formato | Fundo |
|---|---|---|---|---|
| `icon-192.png` | Ícone PWA padrão Android/Chrome | 192×192px | PNG | `#7c3aed` (primary-500) |
| `icon-512.png` | Ícone PWA alta resolução | 512×512px | PNG | `#7c3aed` (primary-500) |
| `apple-touch-icon.png` | Ícone para iOS (adicionar à tela inicial) | 180×180px | PNG | `#7c3aed` (primary-500) |

> O ícone no centro deve ser o símbolo do logo (`logo-icon.svg`) em branco, centralizado, ocupando ~60% do espaço. O fundo é a cor roxa `#7c3aed`.

---

### Backgrounds — `resources/js/assets/`

| Arquivo | Descrição | Resolução | Formato |
|---|---|---|---|
| `bg-light.png` | Imagem decorativa de fundo — modo claro | 1920×1080px | PNG |
| `bg-dark.png` | Imagem decorativa de fundo — modo escuro | 1920×1080px | PNG |

> Usado nas telas de **login e registro** como background decorativo.
> Não é usado no app principal (dashboard, clientes, demandas).

---

### Empty States — `resources/js/assets/`

| Arquivo | Descrição | Resolução | Formato |
|---|---|---|---|
| `empty-state-light.svg` | Ilustração para listas vazias — modo claro | SVG vetorial | SVG |
| `empty-state-dark.svg` | Ilustração para listas vazias — modo escuro | SVG vetorial | SVG |

> Aparece quando: lista de clientes vazia, lista de demandas vazia, etc.

---

## Resumo rápido — o que salvar onde

```
public/
  favicon.ico          → 32x32px ICO
  favicon.svg          → SVG (qualquer tamanho)
  icons/
    icon-192.png       → 192x192px PNG, fundo roxo #7c3aed
    icon-512.png       → 512x512px PNG, fundo roxo #7c3aed
    apple-touch-icon.png → 180x180px PNG, fundo roxo #7c3aed

resources/js/assets/
  logo.svg             → SVG, fundo transparente (para fundo claro)
  logo-dark.svg        → SVG, fundo transparente (para fundo escuro)
  logo-icon.svg        → SVG, só símbolo, fundo transparente
  logo-icon-dark.svg   → SVG, só símbolo, versão escura
  chatbot-icon-light.svg → SVG, ícone do assistente IA (modo claro)
  chatbot-icon-dark.svg  → SVG, ícone do assistente IA (modo escuro)
  bg-light.png         → 1920x1080px PNG
  bg-dark.png          → 1920x1080px PNG
  empty-state-light.svg → SVG ilustração
  empty-state-dark.svg  → SVG ilustração
```

---

## O que fazer quando tiver tudo

1. Salve todos os arquivos nas pastas indicadas com os nomes exatos
2. Me avise — vou integrar tudo no código:
   - Tailwind config com as cores do design brief
   - Sidebar usando `logo.svg` / `logo-dark.svg`
   - Blade template com favicon e PWA icons
   - Botão do chatbot com `chatbot-icon.svg`
   - Telas de login/registro com `bg-light.png` / `bg-dark.png`
   - Empty states nas listagens

---

## Opcional mas útil

| Arquivo | Onde salvar | Tamanho | Uso |
|---|---|---|---|
| `og-image.png` | `public/` | 1200×630px | Compartilhamento em redes sociais |
| `logo-applications.png` | `resources/js/assets/` | 512×512px | App stores, diretórios |
