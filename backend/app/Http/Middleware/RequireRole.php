<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RequireRole
{
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $roleName = $request->user()?->rol?->nombre;

        if (! in_array($roleName, $roles, true)) {
            abort(403, 'No tienes permiso para realizar esta operación.');
        }

        return $next($request);
    }
}
