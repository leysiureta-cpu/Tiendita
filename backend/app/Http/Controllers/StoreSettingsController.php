<?php

namespace App\Http\Controllers;

use App\Exceptions\ReverseGeocodeUnavailableException;
use App\Models\ConfiguracionTienda;
use App\Services\ReverseGeocodeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

class StoreSettingsController extends Controller
{
    public function reverseGeocode(Request $request, ReverseGeocodeService $reverseGeocode): JsonResponse
    {
        $validated = $request->validate([
            'latitude' => ['required', 'numeric', 'between:-90,90'],
            'longitude' => ['required', 'numeric', 'between:-180,180'],
        ]);

        try {
            return response()->json([
                'data' => $reverseGeocode->lookup(
                    (float) $validated['latitude'],
                    (float) $validated['longitude'],
                ),
            ]);
        } catch (ReverseGeocodeUnavailableException $exception) {
            Log::warning('Reverse geocoding service is unavailable.', [
                'exception' => $exception::class,
            ]);

            return response()->json([
                'message' => 'No se pudo consultar la dirección. Inténtalo nuevamente.',
            ], 503);
        }
    }

    public function show(): JsonResponse
    {
        return response()->json([
            'data' => $this->settingsData(ConfiguracionTienda::query()->find(1)),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'storeName' => ['required', 'string', 'max:150'],
            'address' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:40'],
            'email' => ['nullable', 'email', 'max:255'],
            'ticketMessage' => ['nullable', 'string', 'max:500'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90', 'required_with:longitude'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180', 'required_with:latitude'],
            'logo' => [
                'sometimes',
                'required',
                'image',
                'mimes:jpeg,png,webp',
                'max:2048',
                'dimensions:max_width=3000,max_height=3000',
            ],
        ]);

        $settings = ConfiguracionTienda::query()->find(1) ?? new ConfiguracionTienda;
        if (! $settings->exists) {
            $settings->id = 1;
            $settings->nombre_comercial = 'Mini Súper';
        }
        $oldLogoPath = $settings->logo_path;
        $newLogoPath = null;

        if ($request->hasFile('logo')) {
            $newLogoPath = $request->file('logo')->storePublicly('store-logos', 'public');
            abort_if(
                ! is_string($newLogoPath) || $newLogoPath === '',
                500,
                'No se pudo guardar el logotipo.',
            );
        }

        $settings->fill([
            'nombre_comercial' => trim($validated['storeName']),
            'direccion' => $validated['address'] ?? null,
            'telefono' => $validated['phone'] ?? null,
            'correo' => $validated['email'] ?? null,
            'mensaje_ticket' => $validated['ticketMessage'] ?? null,
            'latitud' => array_key_exists('latitude', $validated)
                ? $validated['latitude']
                : $settings->latitud,
            'longitud' => array_key_exists('longitude', $validated)
                ? $validated['longitude']
                : $settings->longitud,
        ]);
        if ($newLogoPath !== null) {
            $settings->logo_path = $newLogoPath;
        }

        try {
            $settings->save();
        } catch (Throwable $exception) {
            if ($newLogoPath !== null) {
                Storage::disk('public')->delete($newLogoPath);
            }
            throw $exception;
        }

        if ($oldLogoPath && $newLogoPath && $oldLogoPath !== $newLogoPath) {
            if (! Storage::disk('public')->delete($oldLogoPath)) {
                Log::warning('No se pudo eliminar el logotipo de tienda reemplazado.', [
                    'settings_id' => $settings->id,
                ]);
            }
        }

        return response()->json([
            'data' => $this->settingsData($settings->fresh()),
        ]);
    }

    private function settingsData(?ConfiguracionTienda $settings): array
    {
        return [
            'storeName' => $settings?->nombre_comercial ?? 'Mini Súper',
            'address' => $settings?->direccion,
            'phone' => $settings?->telefono,
            'email' => $settings?->correo,
            'latitude' => $settings?->latitud,
            'longitude' => $settings?->longitud,
            'logoUrl' => $settings?->logo_path
                ? Storage::disk('public')->url($settings->logo_path)
                : null,
            'ticketMessage' => $settings?->mensaje_ticket,
        ];
    }
}
