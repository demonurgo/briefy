<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{{ $title }} — Briefy</title>
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <script>
    if (localStorage.getItem('theme') === 'dark') document.documentElement.classList.add('dark');
  </script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --bg: #f9fafb;
      --surface: #ffffff;
      --border: #e5e7eb;
      --text: #111827;
      --muted: #6b7280;
      --accent: #7c3aed;
      --accent-light: #ede9fe;
    }
    .dark {
      --bg: #0b0f14;
      --surface: #111827;
      --border: #1f2937;
      --text: #f9fafb;
      --muted: #9ca3af;
      --accent-light: #4c1d95;
    }
    html { background: var(--bg); color: var(--text); font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; }
    body { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 2.5rem;
      max-width: 420px;
      width: 100%;
      text-align: center;
      box-shadow: 0 4px 24px rgba(0,0,0,.08);
    }
    .icon {
      width: 56px; height: 56px;
      border-radius: 50%;
      background: var(--accent-light);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 1.25rem;
    }
    .icon svg { width: 26px; height: 26px; stroke: var(--accent); fill: none; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
    .code { font-size: .75rem; font-weight: 700; letter-spacing: .1em; color: var(--accent); text-transform: uppercase; margin-bottom: .5rem; }
    h1 { font-size: 1.25rem; font-weight: 700; color: var(--text); margin-bottom: .5rem; }
    p { font-size: .875rem; color: var(--muted); line-height: 1.6; margin-bottom: 1.5rem; }
    a.btn {
      display: inline-flex; align-items: center; gap: .375rem;
      background: var(--accent); color: #fff; font-size: .875rem; font-weight: 600;
      padding: .625rem 1.25rem; border-radius: 8px; text-decoration: none;
      transition: opacity .15s;
    }
    a.btn:hover { opacity: .88; }
    a.back {
      display: inline-block; margin-top: .75rem;
      font-size: .8125rem; color: var(--muted); text-decoration: none;
    }
    a.back:hover { color: var(--text); }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">{!! $icon !!}</div>
    <div class="code">{{ $code }}</div>
    <h1>{{ $title }}</h1>
    <p>{{ $message }}</p>
    <a href="{{ url('/dashboard') }}" class="btn">Ir para o Dashboard</a>
    <br />
    <a href="javascript:history.back()" class="back">← Voltar à página anterior</a>
  </div>
</body>
</html>
