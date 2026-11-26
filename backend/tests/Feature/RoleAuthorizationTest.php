<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\DetalleVenta;
use App\Models\Producto;
use App\Models\Rol;
use App\Models\User;
use App\Models\Venta;
use Database\Seeders\RolSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolSeeder::class);
        $this->withHeader('Origin', 'http://127.0.0.1:5173');
    }

    public function test_cashier_cannot_call_administrative_endpoints_directly(): void
    {
        $cashier = $this->createUser('Cajero', 'cashier@example.test');
        $category = Categoria::query()->create(['nombre' => 'Bebidas']);
        $product = $this->createProduct($category);
        $this->actingAs($cashier);

        $this->getJson('/api/products')
            ->assertOk()
            ->assertJsonFragment(['id' => $product->id]);
        $this->getJson('/api/admin/users')->assertForbidden();
        $this->getJson('/api/reports/sales?start_date=2026-01-01&end_date=2026-01-31')->assertForbidden();
        $this->postJson('/api/products', [
            'name' => 'Producto nuevo',
            'categoryId' => $category->id,
            'price' => 10,
            'stock' => 5,
        ])->assertForbidden();
        $this->putJson('/api/products/'.$product->id, [
            'name' => 'Precio modificado',
            'categoryId' => $category->id,
            'price' => 1,
            'stock' => 100,
        ])->assertForbidden();
        $this->deleteJson('/api/products/'.$product->id)->assertForbidden();
        $this->postJson('/api/categories', ['name' => 'Nueva categoría'])->assertForbidden();
    }

    public function test_cashier_can_only_list_and_open_their_own_sales(): void
    {
        $cashier = $this->createUser('Cajero', 'cashier@example.test');
        $otherCashier = $this->createUser('Cajero', 'other@example.test');
        $ownSale = $this->createSale($cashier);
        $otherSale = $this->createSale($otherCashier);
        $this->actingAs($cashier);

        $this->getJson('/api/sales')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $ownSale->id);
        $this->getJson('/api/sales/'.$otherSale->id)->assertForbidden();
        $this->getJson('/api/dashboard')
            ->assertOk()
            ->assertJsonCount(1, 'bestSellers')
            ->assertJsonPath('bestSellers.0.name', 'Producto '.$cashier->id)
            ->assertJsonMissingPath('userCount');
    }

    public function test_sale_owner_and_total_come_from_the_server_not_client_input(): void
    {
        $cashier = $this->createUser('Cajero', 'cashier@example.test');
        $administrator = $this->createUser('Administrador', 'admin@example.test');
        $category = Categoria::query()->create(['nombre' => 'Botanas']);
        $product = $this->createProduct($category, 'Producto de prueba', '12.50', 8);
        $this->actingAs($cashier);

        $response = $this->postJson('/api/sales', [
            'operationId' => '8f64406f-2d7a-4fef-95bf-12a61e9cfc5b',
            'user_id' => $administrator->id,
            'total' => 0.01,
            'items' => [
                ['productId' => $product->id, 'quantity' => 2, 'price' => 0.01],
            ],
            'discount' => 0,
            'paymentMethod' => 'tarjeta',
            'paymentConfirmed' => true,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.user.id', $cashier->id)
            ->assertJsonPath('data.total', 25)
            ->assertJsonCount(1, 'data.items')
            ->assertJsonPath('data.items.0.productName', 'Producto de prueba')
            ->assertJsonPath('data.items.0.quantity', 2);
        $this->assertDatabaseHas('ventas', [
            'id' => $response->json('data.id'),
            'usuario_id' => $cashier->id,
            'total' => '25.00',
        ]);
        $this->assertDatabaseHas('productos', ['id' => $product->id, 'stock' => 6]);
    }

    public function test_administrator_cannot_change_their_own_role(): void
    {
        $administrator = $this->createUser('Administrador', 'admin@example.test');
        $cashierRoleId = Rol::query()->where('nombre', 'Cajero')->value('id');
        $this->actingAs($administrator);

        $this->patchJson('/api/admin/users/'.$administrator->id, [
            'roleId' => $cashierRoleId,
        ])->assertForbidden();

        $this->assertDatabaseHas('usuarios', [
            'id' => $administrator->id,
            'rol_id' => $administrator->rol_id,
        ]);
    }

    public function test_cashier_cannot_change_their_own_role_through_profile_updates(): void
    {
        $cashier = $this->createUser('Cajero', 'cashier@example.test');
        $administratorRoleId = Rol::query()->where('nombre', 'Administrador')->value('id');
        $this->actingAs($cashier);

        $this->patchJson('/api/profile', [
            'username' => 'Nombre actualizado',
            'role_id' => $administratorRoleId,
        ])->assertOk()
            ->assertJsonPath('user.role', 'cashier')
            ->assertJsonPath('user.username', 'Nombre actualizado');

        $this->assertDatabaseHas('usuarios', [
            'id' => $cashier->id,
            'rol_id' => $cashier->rol_id,
            'nombre' => 'Nombre actualizado',
        ]);
    }

    public function test_deactivated_account_cannot_use_an_existing_session(): void
    {
        $cashier = $this->createUser('Cajero', 'cashier@example.test');
        $this->actingAs($cashier);
        $this->getJson('/api/products')->assertOk();

        $cashier->update(['estado' => false]);

        $this->getJson('/api/products')->assertUnauthorized();
        $this->getJson('/api/user')->assertUnauthorized();
    }

    public function test_administrator_can_manage_catalog_and_users_and_read_all_sales(): void
    {
        $administrator = $this->createUser('Administrador', 'admin@example.test');
        $cashier = $this->createUser('Cajero', 'cashier@example.test');
        $this->actingAs($administrator);

        $categoryResponse = $this->postJson('/api/categories', [
            'name' => 'Bebidas',
            'description' => 'Productos líquidos',
        ])->assertCreated();
        $categoryId = $categoryResponse->json('data.id');

        $this->postJson('/api/products', [
            'name' => 'Agua natural',
            'categoryId' => $categoryId,
            'price' => '14.00',
            'stock' => 20,
        ])->assertCreated()
            ->assertJsonPath('data.category', 'Bebidas');

        $this->postJson('/api/admin/users', [
            'name' => 'Empleado nuevo',
            'email' => 'new-cashier@example.test',
            'password' => 'una-clave-segura',
            'password_confirmation' => 'una-clave-segura',
            'roleId' => Rol::query()->where('nombre', 'Cajero')->value('id'),
        ])->assertCreated()
            ->assertJsonPath('data.roleName', 'Cajero');

        $this->patchJson('/api/admin/users/'.$cashier->id, [
            'roleId' => Rol::query()->where('nombre', 'Administrador')->value('id'),
        ])->assertOk()
            ->assertJsonPath('data.roleName', 'Administrador');

        $this->getJson('/api/admin/users')->assertOk()->assertJsonCount(3, 'data');
        $this->getJson('/api/admin/roles')->assertOk()->assertJsonCount(2, 'data');
        $this->getJson('/api/users/count')->assertOk()->assertJsonPath('count', 3);

        $this->createSale($administrator);
        $this->createSale($cashier);
        $this->getJson('/api/sales')->assertOk()->assertJsonCount(2, 'data');
        $today = now()->toDateString();
        $this->getJson("/api/reports/sales?start_date={$today}&end_date={$today}")
            ->assertOk()
            ->assertJsonPath('summary.sales', 2);
    }

    public function test_sales_report_uses_server_prices_and_allocates_sale_discounts(): void
    {
        $administrator = $this->createUser('Administrador', 'admin@example.test');
        $category = Categoria::query()->create(['nombre' => 'Botanas']);
        $firstProduct = $this->createProduct($category, 'Producto A', '10.00', 5);
        $secondProduct = $this->createProduct($category, 'Producto B', '15.00', 5);
        $this->actingAs($administrator);
        $operationId = '20e735ba-6049-4caa-a20d-791a1f208b87';

        $this->postJson('/api/sales', [
            'operationId' => $operationId,
            'items' => [
                ['productId' => $firstProduct->id, 'quantity' => 1],
                ['productId' => $secondProduct->id, 'quantity' => 1],
            ],
            'discount' => '3.00',
            'paymentMethod' => 'tarjeta',
            'paymentConfirmed' => true,
        ])->assertCreated()
            ->assertJsonPath('data.total', 22)
            ->assertJsonPath('data.items.0.lineTotal', '8.80')
            ->assertJsonPath('data.items.1.lineTotal', '13.20');

        $today = now()->toDateString();
        $this->getJson("/api/reports/sales?start_date={$today}&end_date={$today}")
            ->assertOk()
            ->assertJsonPath('summary.revenue', 22)
            ->assertJsonPath('summary.rows.0.total', 8.8)
            ->assertJsonPath('summary.rows.1.total', 13.2);
    }

    public function test_administrator_can_update_product_price_and_inventory_stock(): void
    {
        $administrator = $this->createUser('Administrador', 'admin@example.test');
        $category = Categoria::query()->create(['nombre' => 'Bebidas']);
        $product = $this->createProduct($category, 'Agua natural', '10.00', 5);
        $this->actingAs($administrator);

        $this->putJson('/api/products/'.$product->id, [
            'name' => 'Agua natural',
            'categoryId' => $category->id,
            'price' => '14.50',
            'stock' => 18,
        ])->assertOk();

        $this->assertDatabaseHas('productos', [
            'id' => $product->id,
            'precio' => '14.50',
            'stock' => 18,
        ]);
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

    private function createProduct(
        Categoria $category,
        string $name = 'Producto protegido',
        string $price = '10.00',
        int $stock = 5,
    ): Producto {
        return Producto::query()->create([
            'nombre' => $name,
            'categoria_id' => $category->id,
            'precio' => $price,
            'stock' => $stock,
            'estado' => true,
        ]);
    }

    private function createSale(User $user): Venta
    {
        $category = Categoria::query()->firstOrCreate(['nombre' => 'Bebidas']);
        $product = Producto::query()->create([
            'nombre' => 'Producto '.$user->id,
            'categoria_id' => $category->id,
            'precio' => '10.00',
            'stock' => 5,
            'estado' => true,
        ]);
        $sale = Venta::query()->create([
            'usuario_id' => $user->id,
            'fecha' => now(),
            'subtotal' => '10.00',
            'descuento' => '0.00',
            'total' => '10.00',
            'metodo_pago' => 'efectivo',
            'dinero_recibido' => '10.00',
            'cambio' => '0.00',
        ]);
        DetalleVenta::query()->create([
            'venta_id' => $sale->id,
            'producto_id' => $product->id,
            'cantidad' => 1,
            'precio_unitario' => '10.00',
            'subtotal' => '10.00',
        ]);

        return $sale;
    }
}
