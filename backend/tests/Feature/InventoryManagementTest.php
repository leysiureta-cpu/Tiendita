<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\MovimientoInventario;
use App\Models\Producto;
use App\Models\Rol;
use App\Models\User;
use Database\Seeders\RolSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InventoryManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolSeeder::class);
        $this->withHeader('Origin', 'http://127.0.0.1:5173');
    }

    public function test_inventory_lists_all_products_and_reports_the_stock_status(): void
    {
        $cashier = $this->createUser('Cajero', 'cashier@example.test');
        $category = Categoria::query()->create(['nombre' => 'Bebidas']);
        $sufficient = $this->createProduct($category, 'Agua', 6);
        $low = $this->createProduct($category, 'Jugo', 5);
        $out = $this->createProduct($category, 'Leche', 0);
        $out->update(['estado' => false]);
        $this->actingAs($cashier);

        $this->getJson('/api/inventory')
            ->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonFragment([
                'id' => $sufficient->id,
                'inventoryStatus' => 'sufficient',
                'active' => true,
            ])
            ->assertJsonFragment([
                'id' => $low->id,
                'inventoryStatus' => 'low',
            ])
            ->assertJsonFragment([
                'id' => $out->id,
                'inventoryStatus' => 'out',
                'active' => false,
            ]);
        $this->getJson('/api/inventory/movements')->assertForbidden();
    }

    public function test_administrator_can_register_an_idempotent_inventory_entry(): void
    {
        $administrator = $this->createUser('Administrador', 'admin@example.test');
        $category = Categoria::query()->create(['nombre' => 'Botanas']);
        $product = $this->createProduct($category, 'Papas', 4);
        $this->actingAs($administrator);
        $payload = [
            'operationId' => '1f011a65-1c35-4d8c-a8ea-b15db5c084d2',
            'productId' => $product->id,
            'type' => 'entrada',
            'quantity' => 5,
            'reason' => 'Reposición de mercancía',
            'movementAt' => '2026-11-25T13:00:00-07:00',
        ];

        $this->postJson('/api/inventory/movements', $payload)
            ->assertCreated()
            ->assertJsonPath('data.productName', 'Papas')
            ->assertJsonPath('data.type', 'entrada')
            ->assertJsonPath('data.quantity', 5)
            ->assertJsonPath('data.previousStock', 4)
            ->assertJsonPath('data.newStock', 9)
            ->assertJsonPath('data.reason', 'Reposición de mercancía')
            ->assertJsonPath('data.userName', 'Admin');

        $this->postJson('/api/inventory/movements', $payload)
            ->assertOk()
            ->assertJsonPath('duplicate', true)
            ->assertJsonPath('data.newStock', 9);
        $this->postJson('/api/inventory/movements', [
            ...$payload,
            'quantity' => 6,
        ])->assertConflict();
        $this->getJson('/api/inventory/movements')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.userName', 'Admin');

        $this->assertDatabaseHas('productos', ['id' => $product->id, 'stock' => 9]);
        $this->assertDatabaseHas('movimientos_inventario', [
            'operation_id' => $payload['operationId'],
            'producto_id' => $product->id,
            'usuario_id' => $administrator->id,
            'tipo' => 'entrada',
            'cantidad' => 5,
            'existencias_anteriores' => 4,
            'existencias_posteriores' => 9,
        ]);
        $this->assertDatabaseCount('movimientos_inventario', 1);
    }

    public function test_inventory_exit_rejects_insufficient_or_invalid_quantities_without_changes(): void
    {
        $administrator = $this->createUser('Administrador', 'admin@example.test');
        $category = Categoria::query()->create(['nombre' => 'Lácteos']);
        $product = $this->createProduct($category, 'Leche', 2);
        $this->actingAs($administrator);

        $this->postJson('/api/inventory/movements', [
            'operationId' => 'fa643da0-6a36-4925-9fbe-171a0d26c74a',
            'productId' => $product->id,
            'type' => 'salida',
            'quantity' => 3,
            'reason' => 'Merma',
            'movementAt' => now()->toISOString(),
        ])->assertUnprocessable();

        $this->postJson('/api/inventory/movements', [
            'operationId' => '6f979dd9-0201-4786-a5dc-a4506f72c1d9',
            'productId' => $product->id,
            'type' => 'salida',
            'quantity' => 0,
            'reason' => '',
            'movementAt' => 'no-es-fecha',
        ])->assertUnprocessable();

        $this->assertDatabaseHas('productos', ['id' => $product->id, 'stock' => 2]);
        $this->assertDatabaseCount('movimientos_inventario', 0);
    }

    public function test_cashier_can_read_inventory_but_cannot_register_manual_movements(): void
    {
        $cashier = $this->createUser('Cajero', 'cashier@example.test');
        $category = Categoria::query()->create(['nombre' => 'Panadería']);
        $product = $this->createProduct($category, 'Pan', 10);
        $this->actingAs($cashier);

        $this->getJson('/api/inventory')->assertOk();
        $this->getJson('/api/inventory/movements')->assertForbidden();
        $this->postJson('/api/inventory/movements', [
            'operationId' => '3bbde7a1-7c55-4a2f-9cad-e3564b064d7c',
            'productId' => $product->id,
            'type' => 'salida',
            'quantity' => 1,
            'reason' => 'Prueba',
            'movementAt' => now()->toISOString(),
        ])->assertForbidden();

        $this->assertDatabaseHas('productos', ['id' => $product->id, 'stock' => 10]);
    }

    public function test_product_creation_and_stock_edits_are_recorded_in_the_movement_history(): void
    {
        $administrator = $this->createUser('Administrador', 'admin@example.test');
        $category = Categoria::query()->create(['nombre' => 'Abarrotes']);
        $this->actingAs($administrator);

        $created = $this->postJson('/api/products', [
            'name' => 'Arroz',
            'categoryId' => $category->id,
            'price' => '25.00',
            'stock' => 8,
        ])->assertCreated();
        $productId = $created->json('data.id');

        $this->putJson('/api/products/'.$productId, [
            'name' => 'Arroz',
            'categoryId' => $category->id,
            'price' => '25.00',
            'stock' => 5,
        ])->assertOk();

        $this->assertDatabaseHas('movimientos_inventario', [
            'producto_id' => $productId,
            'tipo' => 'entrada',
            'cantidad' => 8,
            'existencias_anteriores' => 0,
            'existencias_posteriores' => 8,
            'motivo' => 'Existencias iniciales al registrar el producto.',
        ]);
        $this->assertDatabaseHas('movimientos_inventario', [
            'producto_id' => $productId,
            'tipo' => 'salida',
            'cantidad' => 3,
            'existencias_anteriores' => 8,
            'existencias_posteriores' => 5,
        ]);
        $this->assertDatabaseHas('productos', ['id' => $productId, 'stock' => 5]);

        $this->deleteJson('/api/products/'.$productId)->assertConflict();
        $this->assertDatabaseHas('productos', ['id' => $productId, 'stock' => 5]);
    }

    public function test_sale_decrements_stock_and_records_a_single_linked_exit(): void
    {
        $cashier = $this->createUser('Cajero', 'cashier@example.test');
        $category = Categoria::query()->create(['nombre' => 'Bebidas']);
        $product = $this->createProduct($category, 'Agua', 5);
        $this->actingAs($cashier);
        $payload = [
            'operationId' => '4fa2c600-7b88-4bc4-a4a6-68a5f7836559',
            'items' => [['productId' => $product->id, 'quantity' => 2]],
            'discount' => 0,
            'paymentMethod' => 'tarjeta',
            'paymentConfirmed' => true,
        ];

        $saleResponse = $this->postJson('/api/sales', $payload)->assertCreated();
        $saleId = $saleResponse->json('data.id');
        $this->postJson('/api/sales', $payload)->assertOk();

        $this->assertDatabaseHas('productos', ['id' => $product->id, 'stock' => 3]);
        $this->assertDatabaseHas('movimientos_inventario', [
            'producto_id' => $product->id,
            'usuario_id' => $cashier->id,
            'venta_id' => $saleId,
            'tipo' => 'salida',
            'cantidad' => 2,
            'existencias_anteriores' => 5,
            'existencias_posteriores' => 3,
        ]);
        $this->assertSame(
            1,
            MovimientoInventario::query()->where('venta_id', $saleId)->count(),
        );
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
        string $name,
        int $stock,
    ): Producto {
        return Producto::query()->create([
            'nombre' => $name,
            'categoria_id' => $category->id,
            'precio' => '10.00',
            'stock' => $stock,
            'estado' => true,
        ]);
    }
}
