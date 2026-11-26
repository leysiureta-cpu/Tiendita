<?php

namespace Tests\Feature;

use App\Models\Rol;
use App\Models\User;
use Database\Seeders\RolSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolSeeder::class);
        $this->withHeader('Origin', 'http://127.0.0.1:5173');
    }

    public function test_registration_hashes_the_password_and_assigns_the_cashier_role(): void
    {
        $response = $this->postJson('/api/register', [
            'account_type' => 'employee',
            'nombre' => 'Cuenta de prueba',
            'correo' => 'prueba@example.test',
            'password' => 'una-clave-segura',
            'password_confirmation' => 'una-clave-segura',
            'rol_id' => Rol::query()->where('nombre', 'Administrador')->value('id'),
        ]);

        $response->assertCreated()
            ->assertJsonPath('user.role', 'cashier')
            ->assertJsonPath('user.email', 'prueba@example.test');

        $user = User::query()->where('correo', 'prueba@example.test')->firstOrFail();

        $this->assertNotSame('una-clave-segura', $user->password);
        $this->assertTrue(Hash::check('una-clave-segura', $user->password));
        $this->assertSame(
            Rol::query()->where('nombre', 'Cajero')->value('id'),
            $user->rol_id,
        );
    }

    public function test_duplicate_email_is_rejected(): void
    {
        $data = [
            'account_type' => 'employee',
            'nombre' => 'Cuenta de prueba',
            'correo' => 'prueba@example.test',
            'password' => 'una-clave-segura',
            'password_confirmation' => 'una-clave-segura',
        ];

        $this->postJson('/api/register', $data)->assertCreated();
        $this->postJson('/api/register', $data)->assertUnprocessable();

        $this->assertDatabaseCount('usuarios', 1);
    }

    public function test_login_rejects_an_incorrect_password(): void
    {
        $this->postJson('/api/register', [
            'account_type' => 'employee',
            'nombre' => 'Cuenta de prueba',
            'correo' => 'prueba@example.test',
            'password' => 'una-clave-segura',
            'password_confirmation' => 'una-clave-segura',
        ])->assertCreated();

        $this->postJson('/api/login', [
            'correo' => 'prueba@example.test',
            'password' => 'una-clave-incorrecta',
        ])->assertUnauthorized();

        $this->getJson('/api/user')->assertUnauthorized();
    }

    public function test_login_restores_the_server_profile_and_logout_ends_the_session(): void
    {
        $this->postJson('/api/register', [
            'account_type' => 'employee',
            'nombre' => 'Cuenta de prueba',
            'correo' => 'prueba@example.test',
            'password' => 'una-clave-segura',
            'password_confirmation' => 'una-clave-segura',
        ])->assertCreated();

        $this->postJson('/api/login', [
            'correo' => 'PRUEBA@example.test',
            'password' => 'una-clave-segura',
        ])->assertOk()
            ->assertJsonPath('user.username', 'Cuenta de prueba')
            ->assertJsonPath('user.role', 'cashier');

        $this->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('user.email', 'prueba@example.test');
        $this->getJson('/api/users/count')
            ->assertForbidden();

        $this->postJson('/api/logout')->assertOk();
        Auth::forgetGuards();
        $this->getJson('/api/user')->assertUnauthorized();
    }

    public function test_admin_registration_requires_and_validates_the_authorization_code(): void
    {
        $details = [
            'account_type' => 'administrator',
            'nombre' => 'Administradora de prueba',
            'correo' => 'admin@example.test',
            'password' => 'una-clave-segura',
            'password_confirmation' => 'una-clave-segura',
        ];

        $this->postJson('/api/register', [
            ...$details,
            'admin_registration_code' => 'incorrecto',
        ])->assertUnprocessable()
            ->assertDontSee('test-admin-registration-code');
        $this->assertDatabaseCount('usuarios', 0);

        $this->postJson('/api/register', $details)->assertUnprocessable();
        $this->assertDatabaseCount('usuarios', 0);

        $response = $this->postJson('/api/register', [
            ...$details,
            'admin_registration_code' => 'test-admin-registration-code',
            'rol_id' => Rol::query()->where('nombre', 'Cajero')->value('id'),
        ]);

        $response->assertCreated()
            ->assertJsonPath('user.role', 'admin')
            ->assertJsonMissingPath('user.admin_registration_code')
            ->assertDontSee('test-admin-registration-code');

        $admin = User::query()->where('correo', 'admin@example.test')->firstOrFail();
        $this->assertSame(
            Rol::query()->where('nombre', 'Administrador')->value('id'),
            $admin->rol_id,
        );
        $this->assertTrue(Hash::check('una-clave-segura', $admin->password));
        $this->postJson('/api/login', [
            'correo' => 'admin@example.test',
            'password' => 'una-clave-segura',
        ])->assertOk()
            ->assertJsonPath('user.role', 'admin');
    }

    public function test_admin_registration_is_unavailable_without_backend_configuration(): void
    {
        config(['app.admin_registration_code' => null]);

        $this->postJson('/api/register', [
            'account_type' => 'administrator',
            'nombre' => 'Administradora de prueba',
            'correo' => 'admin@example.test',
            'password' => 'una-clave-segura',
            'password_confirmation' => 'una-clave-segura',
            'admin_registration_code' => 'cualquier-codigo',
        ])->assertStatus(503)
            ->assertDontSee('cualquier-codigo');

        $this->assertDatabaseCount('usuarios', 0);
    }
}
