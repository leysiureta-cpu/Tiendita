<?php

namespace Tests\Feature;

use App\Models\Rol;
use App\Models\User;
use App\Models\Venta;
use Database\Seeders\RolSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class EmployeeManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolSeeder::class);
        $this->withHeader('Origin', 'http://127.0.0.1:5173');
    }

    public function test_cashier_cannot_list_view_create_or_update_employees(): void
    {
        $cashier = $this->createUser('Cajero', 'cashier@example.test');
        $this->actingAs($cashier);

        $this->getJson('/api/admin/employees')->assertForbidden();
        $this->getJson('/api/admin/employees/'.$cashier->id)->assertForbidden();
        $this->postJson('/api/admin/employees', [
            'name' => 'Nuevo empleado',
            'email' => 'new@example.test',
            'password' => 'una-clave-segura',
            'password_confirmation' => 'una-clave-segura',
        ])->assertForbidden();
        $this->patchJson('/api/admin/employees/'.$cashier->id, [
            'name' => 'Nombre modificado',
        ])->assertForbidden();
        $this->postJson('/api/admin/employees/'.$cashier->id.'/password', [
            'password' => 'nueva-clave-segura',
            'password_confirmation' => 'nueva-clave-segura',
        ])->assertForbidden();
    }

    public function test_administrator_can_search_and_view_cashiers_but_not_administrators(): void
    {
        $employee = $this->createUser('Cajero', 'ana@example.test', 'Ana Pérez');
        $this->createUser('Cajero', 'otro@example.test', 'Otro empleado');
        $administrator = $this->createUser('Administrador', 'admin@example.test');
        $this->actingAs($administrator);

        $this->getJson('/api/admin/employees')
            ->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonMissing(['email' => 'admin@example.test']);
        $this->getJson('/api/admin/employees?search=Ana')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $employee->id)
            ->assertJsonPath('data.0.roleName', 'Cajero')
            ->assertJsonStructure(['data' => [['registeredAt']]]);

        $this->getJson('/api/admin/employees?search=ana@example.test')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $employee->id);

        $this->getJson('/api/admin/employees/'.$employee->id)
            ->assertOk()
            ->assertJsonPath('data.email', 'ana@example.test')
            ->assertJsonPath('data.roleName', 'Cajero');

        $this->getJson('/api/admin/employees/'.$administrator->id)->assertNotFound();
    }

    public function test_employee_creation_always_assigns_cashier_role_and_rejects_role_input(): void
    {
        $administrator = $this->createUser('Administrador', 'admin@example.test');
        $adminRoleId = Rol::query()->where('nombre', 'Administrador')->value('id');
        $this->actingAs($administrator);

        $details = [
            'name' => 'Empleado nuevo',
            'email' => 'new@example.test',
            'password' => 'una-clave-segura',
            'password_confirmation' => 'una-clave-segura',
        ];

        $this->createUser('Cajero', 'duplicate@example.test');
        $this->postJson('/api/admin/employees', [
            ...$details,
            'email' => 'DUPLICATE@example.test',
        ])->assertUnprocessable();
        $this->assertDatabaseMissing('usuarios', ['correo' => 'new@example.test']);

        $this->postJson('/api/admin/employees', [...$details, 'roleId' => $adminRoleId])
            ->assertUnprocessable();
        $this->assertDatabaseMissing('usuarios', ['correo' => 'new@example.test']);

        $response = $this->postJson('/api/admin/employees', $details)
            ->assertCreated()
            ->assertJsonPath('data.roleName', 'Cajero')
            ->assertJsonMissingPath('data.roleId');

        $employee = User::query()->where('correo', 'new@example.test')->firstOrFail();
        $this->assertSame(
            Rol::query()->where('nombre', 'Cajero')->value('id'),
            $employee->rol_id,
        );
        $this->assertTrue(Hash::check('una-clave-segura', $employee->password));
        $this->assertTrue($response->json('data.active'));
    }

    public function test_employee_password_reset_is_a_separate_admin_action(): void
    {
        $administrator = $this->createUser('Administrador', 'admin@example.test');
        $employee = $this->createUser('Cajero', 'cashier@example.test');
        $this->actingAs($administrator);

        $this->patchJson('/api/admin/employees/'.$employee->id, [
            'password' => 'otra-clave-segura',
            'password_confirmation' => 'otra-clave-segura',
        ])->assertUnprocessable();

        $this->postJson('/api/admin/employees/'.$employee->id.'/password', [
            'password' => 'nueva-clave-segura',
            'password_confirmation' => 'distinta-clave',
        ])->assertUnprocessable();

        $this->postJson('/api/admin/employees/'.$employee->id.'/password', [
            'password' => 'nueva-clave-segura',
            'password_confirmation' => 'nueva-clave-segura',
        ])->assertOk()
            ->assertJsonMissingPath('data.password')
            ->assertJsonMissingPath('password')
            ->assertJsonPath('message', 'La contraseña del empleado se restableció correctamente.');

        $employee->refresh();
        $this->assertTrue(Hash::check('nueva-clave-segura', $employee->password));
        $this->assertFalse(Hash::check('una-clave-segura', $employee->password));

        $this->postJson('/api/logout')->assertOk();
        Auth::forgetGuards();
        $this->postJson('/api/login', [
            'correo' => 'cashier@example.test',
            'password' => 'nueva-clave-segura',
        ])->assertOk()
            ->assertJsonPath('user.role', 'cashier');
    }

    public function test_administrator_can_edit_and_toggle_employee_without_deleting_sales_history(): void
    {
        $administrator = $this->createUser('Administrador', 'admin@example.test');
        $employee = $this->createUser('Cajero', 'cashier@example.test', 'Cajero');
        $sale = Venta::query()->create([
            'usuario_id' => $employee->id,
            'fecha' => now(),
            'subtotal' => '10.00',
            'descuento' => '0.00',
            'total' => '10.00',
            'metodo_pago' => 'efectivo',
        ]);
        $this->actingAs($administrator);

        $this->patchJson('/api/admin/employees/'.$employee->id, [
            'name' => 'Empleado actualizado',
            'email' => 'updated@example.test',
            'active' => false,
        ])->assertOk()
            ->assertJsonPath('data.name', 'Empleado actualizado')
            ->assertJsonPath('data.active', false)
            ->assertJsonPath('data.roleName', 'Cajero');

        $this->assertDatabaseHas('usuarios', [
            'id' => $employee->id,
            'correo' => 'updated@example.test',
            'estado' => false,
            'rol_id' => $employee->rol_id,
        ]);
        $this->assertDatabaseHas('ventas', ['id' => $sale->id, 'usuario_id' => $employee->id]);

        $adminRoleId = Rol::query()->where('nombre', 'Administrador')->value('id');
        $this->patchJson('/api/admin/employees/'.$employee->id, [
            'roleId' => $adminRoleId,
        ])->assertUnprocessable();
        $this->patchJson('/api/admin/employees/'.$administrator->id, [
            'roleId' => Rol::query()->where('nombre', 'Cajero')->value('id'),
        ])->assertNotFound();

        $this->patchJson('/api/admin/employees/'.$employee->id, ['active' => true])
            ->assertOk()
            ->assertJsonPath('data.active', true);
        $this->assertDatabaseHas('usuarios', ['id' => $employee->id, 'estado' => true]);
    }

    public function test_deactivated_cashier_cannot_log_in(): void
    {
        $employee = $this->createUser('Cajero', 'inactive@example.test');
        $employee->update(['estado' => false]);

        $this->postJson('/api/login', [
            'correo' => 'inactive@example.test',
            'password' => 'una-clave-segura',
        ])->assertUnauthorized();
    }

    private function createUser(string $roleName, string $email, ?string $name = null): User
    {
        return User::query()->create([
            'nombre' => $name ?? ucfirst(strstr($email, '@', true)),
            'correo' => $email,
            'password' => 'una-clave-segura',
            'rol_id' => Rol::query()->where('nombre', $roleName)->value('id'),
            'estado' => true,
        ]);
    }
}
