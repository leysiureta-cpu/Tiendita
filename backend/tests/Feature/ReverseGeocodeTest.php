<?php

namespace Tests\Feature;

use App\Models\Rol;
use App\Models\User;
use Database\Seeders\RolSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\Request as ClientRequest;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ReverseGeocodeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolSeeder::class);
        $this->withHeader('Origin', 'http://127.0.0.1:5173');
        Cache::flush();
        config(['services.nominatim.user_agent' => 'MiniSuperTest/1.0 (https://example.test)']);
    }

    public function test_administrator_can_reverse_geocode_and_repeated_coordinates_use_the_cache(): void
    {
        Http::fake([
            'nominatim.openstreetmap.org/reverse*' => Http::response([
                'address' => [
                    'road' => 'Avenida Álvaro Obregón',
                    'house_number' => '123',
                    'suburb' => 'Centro',
                    'municipality' => 'Culiacán',
                    'state' => 'Sinaloa',
                    'postcode' => '80000',
                    'country' => 'México',
                ],
            ]),
        ]);
        $this->actingAs($this->createUser('Administrador', 'reverse-admin@example.test'));
        $coordinates = ['latitude' => 24.8091, 'longitude' => -107.394];

        $this->postJson('/api/store-settings/reverse-geocode', $coordinates)
            ->assertOk()
            ->assertJsonPath('data.found', true)
            ->assertJsonPath(
                'data.address',
                'Avenida Álvaro Obregón 123, Centro, Culiacán, Sinaloa, 80000, México',
            )
            ->assertJsonPath('data.components.Calle', 'Avenida Álvaro Obregón')
            ->assertJsonPath('data.components.Número exterior', '123')
            ->assertJsonPath('data.components.Colonia o localidad', 'Centro')
            ->assertJsonPath('data.components.Municipio', 'Culiacán')
            ->assertJsonPath('data.components.Estado', 'Sinaloa')
            ->assertJsonPath('data.components.Código postal', '80000')
            ->assertJsonPath('data.components.País', 'México');

        $this->postJson('/api/store-settings/reverse-geocode', $coordinates)->assertOk();

        Http::assertSent(fn (ClientRequest $request): bool => str_starts_with($request->url(), 'https://nominatim.openstreetmap.org/reverse') &&
            $request->hasHeader('User-Agent', 'MiniSuperTest/1.0 (https://example.test)') &&
            str_contains($request->url(), 'lat=24.8091') &&
            str_contains($request->url(), 'lon=-107.394')
        );
        Http::assertSentCount(1);
    }

    public function test_missing_address_returns_a_non_error_result_without_fabricating_fields(): void
    {
        Http::fake([
            'nominatim.openstreetmap.org/reverse*' => Http::response([], 404),
        ]);
        $this->actingAs($this->createUser('Administrador', 'reverse-empty@example.test'));

        $this->postJson('/api/store-settings/reverse-geocode', [
            'latitude' => 24.8,
            'longitude' => -107.3,
        ])->assertOk()
            ->assertJsonPath('data.found', false)
            ->assertJsonPath('data.address', null)
            ->assertJsonPath('data.components', []);
    }

    public function test_connection_failure_returns_a_friendly_error_and_keeps_the_endpoint_available(): void
    {
        Http::fake(fn () => throw new ConnectionException('Provider unavailable'));
        $this->actingAs($this->createUser('Administrador', 'reverse-error@example.test'));

        $this->postJson('/api/store-settings/reverse-geocode', [
            'latitude' => 24.8,
            'longitude' => -107.3,
        ])->assertServiceUnavailable()
            ->assertJsonPath('message', 'No se pudo consultar la dirección. Inténtalo nuevamente.');
    }

    public function test_cashier_and_invalid_coordinates_cannot_trigger_geocoding(): void
    {
        Http::fake();
        $this->actingAs($this->createUser('Cajero', 'reverse-cashier@example.test'));

        $this->postJson('/api/store-settings/reverse-geocode', [
            'latitude' => 24.8,
            'longitude' => -107.3,
        ])->assertForbidden();

        $this->actingAs($this->createUser('Administrador', 'reverse-validation@example.test'));
        $this->postJson('/api/store-settings/reverse-geocode', [
            'latitude' => 91,
            'longitude' => -107.3,
        ])->assertUnprocessable();

        Http::assertNothingSent();
    }

    private function createUser(string $roleName, string $email): User
    {
        return User::query()->create([
            'nombre' => ucfirst(strstr($email, '@', true)),
            'correo' => $email,
            'password' => 'una-clave-segura',
            'rol_id' => Rol::query()->where('nombre', $roleName)->value('id'),
            'estado' => true,
        ]);
    }
}
