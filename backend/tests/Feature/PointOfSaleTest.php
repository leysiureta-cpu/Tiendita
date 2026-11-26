<?php

namespace Tests\Feature;

use App\Models\Categoria;
use App\Models\MovimientoInventario;
use App\Models\Producto;
use App\Models\Rol;
use App\Models\User;
use App\Models\Venta;
use Database\Seeders\RolSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PointOfSaleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolSeeder::class);
        $this->withHeader('Origin', 'http://127.0.0.1:5173');
    }

    public function test_transfer_sale_requires_confirmation_and_is_recorded_once_for_the_signed_in_cashier(): void
    {
        $cashier = $this->createCashier();
        $product = $this->createProduct('Agua', '12.50', 6);
        $this->actingAs($cashier);
        $payload = [
            'operationId' => '0c663041-9824-47e3-a5d4-c71e530d1ff0',
            'items' => [['productId' => $product->id, 'quantity' => 2]],
            'discount' => '0.00',
            'paymentMethod' => 'transferencia',
        ];

        $this->postJson('/api/sales', $payload)->assertUnprocessable();
        $this->assertDatabaseCount('ventas', 0);

        $payload['paymentConfirmed'] = true;
        $response = $this->postJson('/api/sales', $payload)
            ->assertCreated()
            ->assertJsonPath('data.total', 25)
            ->assertJsonPath('data.paymentMethod', 'transferencia')
            ->assertJsonPath('data.user.id', $cashier->id)
            ->assertJsonPath('data.items.0.quantity', 2)
            ->assertJsonPath('data.items.0.unitPrice', 12.5);

        $saleId = $response->json('data.id');
        $this->postJson('/api/sales', $payload)
            ->assertOk()
            ->assertJsonPath('data.id', $saleId);

        $this->assertDatabaseHas('ventas', [
            'id' => $saleId,
            'usuario_id' => $cashier->id,
            'metodo_pago' => 'transferencia',
            'total' => '25.00',
        ]);
        $this->assertDatabaseHas('detalle_ventas', [
            'venta_id' => $saleId,
            'producto_id' => $product->id,
            'cantidad' => 2,
            'precio_unitario' => '12.50',
        ]);
        $this->assertDatabaseHas('productos', ['id' => $product->id, 'stock' => 4]);
        $this->assertSame(
            1,
            MovimientoInventario::query()->where('venta_id', $saleId)->count(),
        );
        $this->assertSame(1, Venta::query()->count());
    }

    public function test_cash_sale_with_insufficient_payment_does_not_change_stock_or_create_records(): void
    {
        $cashier = $this->createCashier();
        $product = $this->createProduct('Leche', '20.00', 5);
        $this->actingAs($cashier);

        $this->postJson('/api/sales', [
            'operationId' => '1bbc049f-73cf-4cbc-a72f-a8df48ad9f0c',
            'items' => [['productId' => $product->id, 'quantity' => 1]],
            'discount' => '0.00',
            'paymentMethod' => 'efectivo',
            'amountReceived' => '19.99',
        ])->assertUnprocessable();

        $this->assertDatabaseHas('productos', ['id' => $product->id, 'stock' => 5]);
        $this->assertDatabaseCount('ventas', 0);
        $this->assertDatabaseCount('movimientos_inventario', 0);
    }

    private function createCashier(): User
    {
        return User::query()->create([
            'nombre' => 'Cajero POS',
            'correo' => 'cashier-pos@example.test',
            'password' => 'una-clave-segura',
            'rol_id' => Rol::query()->where('nombre', 'Cajero')->value('id'),
            'estado' => true,
        ]);
    }

    private function createProduct(string $name, string $price, int $stock): Producto
    {
        $category = Categoria::query()->create(['nombre' => 'Bebidas']);

        return Producto::query()->create([
            'nombre' => $name,
            'categoria_id' => $category->id,
            'precio' => $price,
            'stock' => $stock,
            'estado' => true,
        ]);
    }
}
