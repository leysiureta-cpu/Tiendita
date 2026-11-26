<?php

namespace App\Http\Controllers;

use App\Models\Rol;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminUserController extends Controller
{
    public function roles(): JsonResponse
    {
        return response()->json([
            'data' => Rol::query()->orderBy('id')->get(['id', 'nombre', 'descripcion']),
        ]);
    }

    public function employees(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));
        $query = $this->employeeQuery()->with('rol');

        if ($search !== '') {
            $query->where(function (Builder $filter) use ($search): void {
                $filter->where('nombre', 'like', "%{$search}%")
                    ->orWhere('correo', 'like', "%{$search}%");
            });
        }

        $employees = $query
            ->orderBy('nombre')
            ->get()
            ->map(fn (User $user): array => $this->employeeData($user));

        return response()->json(['data' => $employees]);
    }

    public function showEmployee(User $user): JsonResponse
    {
        $this->ensureEmployee($user);

        return response()->json(['data' => $this->employeeData($user->load('rol'))]);
    }

    public function storeEmployee(Request $request): JsonResponse
    {
        $this->normalizeEmail($request);
        $this->normalizeName($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('usuarios', 'correo')],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'roleId' => ['prohibited'],
            'role_id' => ['prohibited'],
            'rol_id' => ['prohibited'],
        ]);

        $cashierRoleId = Rol::query()->where('nombre', 'Cajero')->value('id');
        abort_if($cashierRoleId === null, 500, 'El rol Cajero no está configurado.');

        $employee = User::query()->create([
            'nombre' => $validated['name'],
            'correo' => $validated['email'],
            'password' => $validated['password'],
            'rol_id' => $cashierRoleId,
            'estado' => true,
        ]);

        return response()->json([
            'data' => $this->employeeData($employee->load('rol')),
        ], 201);
    }

    public function updateEmployee(Request $request, User $user): JsonResponse
    {
        $this->ensureEmployee($user);
        $this->normalizeEmail($request);
        $this->normalizeName($request);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => [
                'sometimes',
                'required',
                'email',
                'max:255',
                Rule::unique('usuarios', 'correo')->ignore($user->id),
            ],
            'password' => ['sometimes', 'nullable', 'string', 'min:8', 'confirmed'],
            'active' => ['sometimes', 'required', 'boolean'],
            'roleId' => ['prohibited'],
            'role_id' => ['prohibited'],
            'rol_id' => ['prohibited'],
        ]);

        $attributes = [];
        if (array_key_exists('name', $validated)) {
            $attributes['nombre'] = $validated['name'];
        }
        if (array_key_exists('email', $validated)) {
            $attributes['correo'] = $validated['email'];
        }
        if (array_key_exists('active', $validated)) {
            $attributes['estado'] = $validated['active'];
        }
        if (! empty($validated['password'])) {
            $attributes['password'] = $validated['password'];
        }

        $user->update($attributes);

        return response()->json([
            'data' => $this->employeeData($user->fresh('rol')),
        ]);
    }

    public function index(): JsonResponse
    {
        $users = User::query()
            ->with('rol')
            ->orderBy('nombre')
            ->get()
            ->map(fn (User $user): array => $this->userData($user));

        return response()->json(['data' => $users]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->normalizeEmail($request);
        $this->normalizeName($request);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('usuarios', 'correo')],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'roleId' => ['required', 'integer', 'exists:roles,id'],
            'active' => ['sometimes', 'boolean'],
        ]);

        $user = User::query()->create([
            'nombre' => trim($validated['name']),
            'correo' => $validated['email'],
            'password' => $validated['password'],
            'rol_id' => $validated['roleId'],
            'estado' => $validated['active'] ?? true,
        ]);

        return response()->json([
            'data' => $this->userData($user->load('rol')),
        ], 201);
    }

    public function update(Request $request, User $user): JsonResponse
    {
        $this->normalizeEmail($request);
        $this->normalizeName($request);

        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => [
                'sometimes',
                'required',
                'email',
                'max:255',
                Rule::unique('usuarios', 'correo')->ignore($user->id),
            ],
            'password' => ['sometimes', 'nullable', 'string', 'min:8', 'confirmed'],
            'roleId' => ['sometimes', 'required', 'integer', 'exists:roles,id'],
            'active' => ['sometimes', 'required', 'boolean'],
        ]);

        $actor = $request->user();
        if ($actor->is($user)) {
            $requestedRole = $validated['roleId'] ?? $user->rol_id;
            if ((int) $requestedRole !== (int) $user->rol_id) {
                abort(403, 'No puedes cambiar tu propio rol.');
            }
            if (($validated['active'] ?? true) === false) {
                abort(403, 'No puedes desactivar tu propia cuenta.');
            }
        }

        $currentRoleIsAdmin = $user->rol()->where('nombre', 'Administrador')->exists();
        $requestedRoleIsAdmin = isset($validated['roleId'])
            ? Rol::query()->whereKey($validated['roleId'])->where('nombre', 'Administrador')->exists()
            : $currentRoleIsAdmin;
        $willRemainActive = $validated['active'] ?? $user->estado;

        if ($currentRoleIsAdmin && $user->estado && (! $requestedRoleIsAdmin || ! $willRemainActive)) {
            $otherActiveAdmins = User::query()
                ->where('estado', true)
                ->where('id', '!=', $user->id)
                ->whereHas('rol', fn ($query) => $query->where('nombre', 'Administrador'))
                ->exists();

            if (! $otherActiveAdmins) {
                abort(422, 'Debe permanecer al menos una cuenta Administrador activa.');
            }
        }

        $attributes = [];
        if (array_key_exists('name', $validated)) {
            $attributes['nombre'] = trim($validated['name']);
        }
        if (array_key_exists('email', $validated)) {
            $attributes['correo'] = $validated['email'];
        }
        if (array_key_exists('roleId', $validated)) {
            $attributes['rol_id'] = $validated['roleId'];
        }
        if (array_key_exists('active', $validated)) {
            $attributes['estado'] = $validated['active'];
        }
        if (! empty($validated['password'])) {
            $attributes['password'] = $validated['password'];
        }

        $user->update($attributes);

        return response()->json([
            'data' => $this->userData($user->fresh('rol')),
        ]);
    }

    private function normalizeEmail(Request $request): void
    {
        $email = $request->input('email');
        if (is_string($email)) {
            $request->merge(['email' => mb_strtolower(trim($email))]);
        }
    }

    private function normalizeName(Request $request): void
    {
        $name = $request->input('name');
        if (is_string($name)) {
            $request->merge(['name' => trim($name)]);
        }
    }

    private function userData(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->nombre,
            'email' => $user->correo,
            'roleId' => $user->rol_id,
            'roleName' => $user->rol?->nombre,
            'active' => $user->estado,
        ];
    }

    private function employeeQuery(): Builder
    {
        return User::query()->whereHas('rol', function (Builder $query): void {
            $query->where('nombre', 'Cajero');
        });
    }

    private function ensureEmployee(User $user): void
    {
        abort_unless($user->rol()->where('nombre', 'Cajero')->exists(), 404);
    }

    private function employeeData(User $user): array
    {
        return [
            'id' => $user->id,
            'name' => $user->nombre,
            'email' => $user->correo,
            'roleName' => $user->rol?->nombre,
            'active' => $user->estado,
            'registeredAt' => $user->created_at?->toISOString(),
        ];
    }
}
