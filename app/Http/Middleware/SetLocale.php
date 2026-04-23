<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class SetLocale
{
    private const SUPPORTED = ['pt-BR', 'en', 'es'];

    public function handle(Request $request, Closure $next): mixed
    {
        if (auth()->check()) {
            app()->setLocale(auth()->user()->getLocale());
        } else {
            app()->setLocale($this->detectFromBrowser($request));
        }

        return $next($request);
    }

    private function detectFromBrowser(Request $request): string
    {
        $accept = $request->header('Accept-Language', '');

        foreach (explode(',', $accept) as $part) {
            $lang = trim(explode(';', $part)[0]);

            if (in_array($lang, self::SUPPORTED)) {
                return $lang;
            }

            // pt-BR match on "pt" prefix
            $prefix = substr($lang, 0, 2);
            if ($prefix === 'pt') return 'pt-BR';
            if ($prefix === 'es') return 'es';
            if ($prefix === 'en') return 'en';
        }

        return config('app.locale', 'pt-BR');
    }
}
