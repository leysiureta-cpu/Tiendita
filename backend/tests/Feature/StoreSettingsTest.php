<?php

namespace Tests\Feature;

use App\Models\ConfiguracionTienda;
use App\Models\Rol;
use App\Models\User;
use Database\Seeders\RolSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StoreSettingsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolSeeder::class);
        $this->withHeader('Origin', 'http://127.0.0.1:5173');
    }

    public function test_administrator_can_save_shared_store_settings_and_replace_the_logo(): void
    {
        Storage::fake('public');
        $administrator = $this->createUser('Administrador', 'store-admin@example.test');
        $this->actingAs($administrator);
        $fields = [
            'storeName' => 'Mini Súper Central',
            'address' => 'Calle Principal 123',
            'phone' => '5551234567',
            'email' => 'contacto@example.test',
            'ticketMessage' => 'Gracias por preferirnos',
            'latitude' => '24.8091',
            'longitude' => '-107.3940',
        ];

        $this->post('/api/store-settings', [
            ...$fields,
            'logo' => UploadedFile::fake()->createWithContent('logo.png', $this->tinyPng()),
        ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('data.storeName', 'Mini Súper Central')
            ->assertJsonPath('data.address', 'Calle Principal 123')
            ->assertJsonPath('data.phone', '5551234567')
            ->assertJsonPath('data.email', 'contacto@example.test')
            ->assertJsonPath('data.ticketMessage', 'Gracias por preferirnos')
            ->assertJsonPath('data.latitude', 24.8091)
            ->assertJsonPath('data.longitude', -107.394);

        $settings = ConfiguracionTienda::query()->findOrFail(1);
        $oldLogoPath = $settings->logo_path;
        $this->assertDatabaseHas('configuracion_tienda', [
            'id' => 1,
            'nombre_comercial' => 'Mini Súper Central',
            'logo_path' => $oldLogoPath,
        ]);
        Storage::disk('public')->assertExists($oldLogoPath);
        $this->getJson('/api/store-settings')
            ->assertOk()
            ->assertJsonPath('data.latitude', 24.8091)
            ->assertJsonPath('data.longitude', -107.394);

        $this->post('/api/store-settings', [
            ...$fields,
            'storeName' => 'Mini Súper Actualizado',
            'logo' => UploadedFile::fake()->createWithContent('nuevo-logo.png', $this->tinyPng()),
        ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('data.storeName', 'Mini Súper Actualizado');

        $newLogoPath = $settings->fresh()->logo_path;
        $this->assertNotSame($oldLogoPath, $newLogoPath);
        Storage::disk('public')->assertMissing($oldLogoPath);
        Storage::disk('public')->assertExists($newLogoPath);
        $this->assertSame(1, ConfiguracionTienda::query()->count());
    }

    public function test_cashier_can_read_ticket_settings_but_cannot_update_them(): void
    {
        ConfiguracionTienda::query()->create([
            'id' => 1,
            'nombre_comercial' => 'Tienda Compartida',
            'direccion' => 'Avenida 10',
            'latitud' => 25.0,
            'longitud' => -108.0,
        ]);
        $cashier = $this->createUser('Cajero', 'store-cashier@example.test');
        $this->actingAs($cashier);

        $this->getJson('/api/store-settings')
            ->assertOk()
            ->assertJsonPath('data.storeName', 'Tienda Compartida')
            ->assertJsonPath('data.address', 'Avenida 10');
        $this->postJson('/api/store-settings', [
            'storeName' => 'Cambio no autorizado',
            'latitude' => '20.0',
            'longitude' => '-100.0',
        ])->assertForbidden();

        $this->assertDatabaseHas('configuracion_tienda', [
            'id' => 1,
            'nombre_comercial' => 'Tienda Compartida',
            'latitud' => 25.0,
            'longitud' => -108.0,
        ]);
    }

    public function test_coordinates_must_be_in_range_and_provided_as_a_pair(): void
    {
        $administrator = $this->createUser('Administrador', 'store-coordinates@example.test');
        ConfiguracionTienda::query()->create([
            'id' => 1,
            'nombre_comercial' => 'Tienda con ubicación',
            'latitud' => 25.0,
            'longitud' => -108.0,
        ]);
        $this->actingAs($administrator);
        $fields = [
            'storeName' => 'Tienda con ubicación',
            'address' => '',
            'phone' => '',
            'email' => '',
            'ticketMessage' => '',
        ];

        $this->postJson('/api/store-settings', [
            ...$fields,
            'latitude' => '90.1',
            'longitude' => '-108',
        ])->assertUnprocessable();

        $this->postJson('/api/store-settings', [
            ...$fields,
            'latitude' => '25',
        ])->assertUnprocessable();

        $this->postJson('/api/store-settings', $fields)
            ->assertOk()
            ->assertJsonPath('data.latitude', 25)
            ->assertJsonPath('data.longitude', -108);

        $this->postJson('/api/store-settings', [
            ...$fields,
            'latitude' => null,
            'longitude' => null,
        ])->assertOk()
            ->assertJsonPath('data.latitude', null)
            ->assertJsonPath('data.longitude', null);

        $this->assertDatabaseHas('configuracion_tienda', [
            'id' => 1,
            'latitud' => null,
            'longitud' => null,
        ]);
    }

    public function test_invalid_or_oversized_logos_are_rejected_without_changing_settings(): void
    {
        Storage::fake('public');
        $administrator = $this->createUser('Administrador', 'store-validation@example.test');
        ConfiguracionTienda::query()->create([
            'id' => 1,
            'nombre_comercial' => 'Nombre Conservado',
        ]);
        $this->actingAs($administrator);
        $fields = [
            'storeName' => 'Nombre Modificado',
            'address' => '',
            'phone' => '',
            'email' => '',
            'ticketMessage' => '',
        ];

        $this->post('/api/store-settings', [
            ...$fields,
            'logo' => UploadedFile::fake()->create('document.pdf', 100, 'application/pdf'),
        ], ['Accept' => 'application/json'])->assertUnprocessable();

        $this->post('/api/store-settings', [
            ...$fields,
            'logo' => UploadedFile::fake()->createWithContent(
                'demasiado-grande.png',
                $this->tinyPng().str_repeat('x', 2 * 1024 * 1024),
            ),
        ], ['Accept' => 'application/json'])->assertUnprocessable();

        $this->assertDatabaseHas('configuracion_tienda', [
            'id' => 1,
            'nombre_comercial' => 'Nombre Conservado',
            'logo_path' => null,
        ]);
        Storage::disk('public')->assertDirectoryEmpty('store-logos');
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

    private function tinyPng(): string
    {
        return (string) base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jq7sAAAAASUVORK5CYII=',
            true,
        );
    }
}
