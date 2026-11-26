<?php

namespace App\Services;

use App\Exceptions\ReverseGeocodeUnavailableException;
use Illuminate\Contracts\Cache\LockTimeoutException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;

class ReverseGeocodeService
{
    private const REQUEST_INTERVAL_SECONDS = 1;

    public function lookup(float $latitude, float $longitude): array
    {
        $coordinates = sprintf('%.6f,%.6f', $latitude, $longitude);
        $cacheKey = 'nominatim:reverse:v1:'.hash('sha256', $coordinates);
        $cached = Cache::get($cacheKey);
        if (is_array($cached)) {
            return $cached;
        }

        try {
            return Cache::lock('nominatim:global-request-lock', 15)->block(10, function () use (
                $latitude,
                $longitude,
                $cacheKey,
            ): array {
                $cached = Cache::get($cacheKey);
                if (is_array($cached)) {
                    return $cached;
                }

                $lastRequestAt = (float) Cache::get('nominatim:last-request-at', 0);
                $waitMicroseconds = (int) ceil(
                    (self::REQUEST_INTERVAL_SECONDS - (microtime(true) - $lastRequestAt)) * 1_000_000,
                );
                if ($waitMicroseconds > 0) {
                    usleep($waitMicroseconds);
                }
                Cache::put('nominatim:last-request-at', microtime(true), now()->addMinute());

                $userAgent = trim((string) config('services.nominatim.user_agent'));
                if ($userAgent === '') {
                    throw new ReverseGeocodeUnavailableException(
                        'La identificación del servicio de geocodificación no está configurada.',
                    );
                }

                try {
                    $response = Http::timeout(6)
                        ->connectTimeout(3)
                        ->withHeaders([
                            'User-Agent' => $userAgent,
                            'Accept-Language' => 'es',
                        ])
                        ->acceptJson()
                        ->get(config('services.nominatim.reverse_url'), [
                            'lat' => $latitude,
                            'lon' => $longitude,
                            'format' => 'jsonv2',
                            'addressdetails' => 1,
                        ]);
                } catch (ConnectionException $exception) {
                    throw new ReverseGeocodeUnavailableException(
                        'No se pudo conectar con el servicio de direcciones.',
                        previous: $exception,
                    );
                }

                if ($response->status() === 404) {
                    $result = ['found' => false, 'address' => null, 'components' => []];
                } elseif (! $response->successful()) {
                    throw new ReverseGeocodeUnavailableException(
                        'El servicio de direcciones respondió con un error.',
                    );
                } else {
                    $result = $this->formatAddress($response->json('address', []));
                }

                Cache::put($cacheKey, $result, now()->addDays(7));

                return $result;
            });
        } catch (LockTimeoutException $exception) {
            throw new ReverseGeocodeUnavailableException(
                'El servicio de direcciones está ocupado. Inténtalo nuevamente.',
                previous: $exception,
            );
        }
    }

    private function formatAddress(mixed $address): array
    {
        if (! is_array($address)) {
            return ['found' => false, 'address' => null, 'components' => []];
        }

        $street = $this->firstValue($address, ['road', 'pedestrian', 'residential', 'street', 'path']);
        $houseNumber = $this->firstValue($address, ['house_number']);
        $locality = $this->firstValue($address, [
            'neighbourhood',
            'suburb',
            'quarter',
            'city_district',
            'village',
            'town',
            'hamlet',
            'isolated_dwelling',
        ]);
        $municipality = $this->firstValue($address, ['municipality', 'county']);
        if ($municipality === null && isset($address['city']) && $address['city'] !== $locality) {
            $municipality = $this->firstValue($address, ['city']);
        }

        $components = array_filter([
            'Calle' => $street,
            'Número exterior' => $houseNumber,
            'Colonia o localidad' => $locality,
            'Municipio' => $municipality,
            'Estado' => $this->firstValue($address, ['state']),
            'Código postal' => $this->firstValue($address, ['postcode']),
            'País' => $this->firstValue($address, ['country']),
        ], static fn (?string $value): bool => $value !== null);

        $streetAddress = trim(implode(' ', array_filter([$street, $houseNumber])));
        $addressParts = array_values(array_unique(array_filter([
            $streetAddress !== '' ? $streetAddress : null,
            $locality,
            $municipality,
            $components['Estado'] ?? null,
            $components['Código postal'] ?? null,
            $components['País'] ?? null,
        ])));
        $formattedAddress = implode(', ', $addressParts);
        $hasUsefulAddress = $streetAddress !== '' ||
            $locality !== null ||
            $municipality !== null ||
            isset($components['Estado']) ||
            isset($components['Código postal']);

        return [
            'found' => $hasUsefulAddress,
            'address' => $hasUsefulAddress ? $formattedAddress : null,
            'components' => $hasUsefulAddress ? $components : [],
        ];
    }

    private function firstValue(array $address, array $keys): ?string
    {
        foreach ($keys as $key) {
            $value = $address[$key] ?? null;
            if (is_string($value) && trim($value) !== '') {
                return trim($value);
            }
        }

        return null;
    }
}
