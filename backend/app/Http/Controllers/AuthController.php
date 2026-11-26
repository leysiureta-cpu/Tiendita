<?php

namespace App\Http\Controllers;

use App\Models\Rol;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Throwable;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $name = $request->input('nombre');
        if (is_string($name)) {
            $request->merge(['nombre' => trim($name)]);
        }

        $correo = $request->input('correo');
        if (is_string($correo)) {
            $request->merge(['correo' => mb_strtolower(trim($correo))]);
        }

        $validated = $request->validate([
            'account_type' => ['required', Rule::in(['employee', 'administrator'])],
            'nombre' => ['required', 'string', 'max:255'],
            'correo' => ['required', 'string', 'email', 'max:255', 'unique:usuarios,correo'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'admin_registration_code' => [
                'required_if:account_type,administrator',
                'nullable',
                'string',
                'max:255',
            ],
        ]);

        $roleName = 'Cajero';
        if ($validated['account_type'] === 'administrator') {
            $expectedCode = config('app.admin_registration_code');
            if (! is_string($expectedCode) || $expectedCode === '') {
                return response()->json([
                    'message' => 'El registro de administradores no está habilitado.',
                ], 503);
            }

            if (! hash_equals($expectedCode, $validated['admin_registration_code'])) {
                return response()->json([
                    'message' => 'El código de autorización no es correcto.',
                ], 422);
            }

            $roleName = 'Administrador';
        }

        $role = Rol::query()->where('nombre', $roleName)->first();

        if (! $role) {
            return response()->json([
                'message' => 'No está configurado el rol necesario para crear una cuenta.',
            ], 500);
        }

        $user = User::query()->create([
            'nombre' => trim($validated['nombre']),
            'correo' => $validated['correo'],
            'password' => $validated['password'],
            'rol_id' => $role->id,
            'estado' => true,
        ]);

        return response()->json([
            'user' => $this->userData($user->load('rol')),
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $correo = $request->input('correo');
        if (is_string($correo)) {
            $request->merge(['correo' => mb_strtolower(trim($correo))]);
        }

        $validated = $request->validate([
            'correo' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        $authenticated = Auth::guard('web')->attempt([
            'correo' => $validated['correo'],
            'password' => $validated['password'],
            'estado' => true,
        ]);

        if (! $authenticated) {
            return response()->json([
                'message' => 'El correo o la contraseña no son correctos.',
            ], 401);
        }

        $request->session()->regenerate();

        return response()->json([
            'user' => $this->userData(Auth::guard('web')->user()->load('rol')),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->json([], 200);
    }

    public function user(Request $request): JsonResponse
    {
        return response()->json([
            'user' => $this->userData($request->user()->load('rol')),
        ]);
    }

    public function updateProfile(Request $request): JsonResponse
    {
        $username = $request->input('username');
        if (is_string($username)) {
            $request->merge(['username' => trim($username)]);
        }

        $validated = $request->validate([
            'username' => ['required', 'string', 'max:255'],
            'user_id' => ['prohibited'],
        ]);

        $user = $request->user();
        $user->update(['nombre' => trim($validated['username'])]);

        return response()->json([
            'user' => $this->userData($user->fresh('rol')),
        ]);
    }

    public function updatePreferences(Request $request): JsonResponse
    {
        if (is_string($request->input('photoCrop'))) {
            $photoCrop = json_decode($request->input('photoCrop'), true);
            if (json_last_error() !== JSON_ERROR_NONE || ($photoCrop !== null && ! is_array($photoCrop))) {
                return response()->json([
                    'message' => 'El encuadre de la fotografía no es válido.',
                    'errors' => ['photoCrop' => ['El encuadre de la fotografía no es válido.']],
                ], 422);
            }
            $request->merge(['photoCrop' => $photoCrop]);
        }

        $validated = $request->validate([
            'theme' => ['sometimes', 'required', Rule::in(['light', 'dark', 'system'])],
            'palette' => [
                'sometimes',
                'required',
                Rule::in(['red', 'blue', 'purple', 'green', 'pink', 'orange', 'gray', 'turquoise', 'yellow']),
            ],
            'photoCrop' => ['sometimes', 'nullable', 'array:x,y,zoom'],
            'photoCrop.x' => ['required_with:photoCrop', 'numeric', 'between:-8000,300'],
            'photoCrop.y' => ['required_with:photoCrop', 'numeric', 'between:-8000,300'],
            'photoCrop.zoom' => ['required_with:photoCrop', 'numeric', 'between:1,3'],
            'photo' => [
                'sometimes',
                'required',
                'image',
                'mimes:jpeg,png,webp',
                'max:256',
                'dimensions:max_width=8000,max_height=8000',
            ],
            'user_id' => ['prohibited'],
        ]);

        $user = $request->user();
        $preferences = array_replace(
            ['theme' => 'light', 'palette' => 'red', 'photoCrop' => null],
            $user->preferencias ?? [],
        );
        foreach (['theme', 'palette', 'photoCrop'] as $key) {
            if (array_key_exists($key, $validated)) {
                $preferences[$key] = $validated[$key];
            }
        }

        $oldPhotoPath = $user->foto_perfil;
        $newPhotoPath = null;
        if ($request->hasFile('photo')) {
            $newPhotoPath = $request->file('photo')->storePublicly(
                'profile-photos/'.$user->id,
                'public',
            );
            abort_if(! is_string($newPhotoPath) || $newPhotoPath === '', 500, 'No se pudo guardar la fotografía.');
        }

        if ($newPhotoPath !== null) {
            $user->foto_perfil = $newPhotoPath;
        }
        $user->preferencias = $preferences;

        try {
            $user->save();
        } catch (Throwable $exception) {
            if ($newPhotoPath !== null) {
                Storage::disk('public')->delete($newPhotoPath);
            }
            throw $exception;
        }

        if ($oldPhotoPath && $newPhotoPath && $oldPhotoPath !== $newPhotoPath) {
            if (! Storage::disk('public')->delete($oldPhotoPath)) {
                Log::warning('No se pudo eliminar la fotografía de perfil reemplazada.', [
                    'user_id' => $user->id,
                ]);
            }
        }

        return response()->json([
            'preferences' => $this->preferencesData($user->fresh()),
        ]);
    }

    public function deleteProfilePhoto(Request $request): JsonResponse
    {
        $request->validate(['user_id' => ['prohibited']]);

        $user = $request->user();
        $oldPhotoPath = $user->foto_perfil;
        $user->foto_perfil = null;
        $user->preferencias = array_replace(
            ['theme' => 'light', 'palette' => 'red', 'photoCrop' => null],
            $user->preferencias ?? [],
            ['photoCrop' => null],
        );
        $user->save();

        if ($oldPhotoPath && ! Storage::disk('public')->delete($oldPhotoPath)) {
            Log::warning('No se pudo eliminar la fotografía de perfil.', [
                'user_id' => $user->id,
            ]);
        }

        return response()->json([
            'preferences' => $this->preferencesData($user->fresh()),
        ]);
    }

    public function userCount(): JsonResponse
    {
        return response()->json(['count' => User::query()->count()]);
    }

    private function userData(User $user): array
    {
        $roleName = $user->rol->nombre;

        return [
            'id' => $user->id,
            'username' => $user->nombre,
            'email' => $user->correo,
            'role' => $roleName === 'Administrador' ? 'admin' : 'cashier',
            'roleName' => $roleName,
            'preferences' => $this->preferencesData($user),
        ];
    }

    private function preferencesData(User $user): ?array
    {
        if ($user->preferencias === null) {
            return null;
        }

        return [
            'theme' => $user->preferencias['theme'] ?? 'light',
            'palette' => $user->preferencias['palette'] ?? 'red',
            'profilePhoto' => $user->foto_perfil
                ? Storage::disk('public')->url($user->foto_perfil)
                : null,
            'photoCrop' => $user->preferencias['photoCrop'] ?? null,
        ];
    }
}
