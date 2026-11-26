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

class SalesReportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolSeeder::class);
        $this->withHeader('Origin', 'http://127.0.0.1:5173');
    }

    public function test_report_aggregates_only_the_selected_period_and_orders_products_by_quantity(): void
    {
        $admin = $this->createAdministrator();
        $category = Categoria::query()->create(['nombre' => 'Abarrotes']);
        $secondCategory = Categoria::query()->create(['nombre' => 'Bebidas']);
        $firstProduct = $this->createProduct($category, 'Producto A');
        $secondProduct = $this->createProduct($secondCategory, 'Producto B');
        $cashSale = $this->createSale($admin, '2026-03-10 10:00:00', 'efectivo', '18.00', '2.00');
        $this->addDetail($cashSale, $firstProduct, 1, '10.00');
        $this->addDetail($cashSale, $secondProduct, 1, '10.00');
        $transferSale = $this->createSale($admin, '2026-03-10 12:00:00', 'transferencia', '20.00');
        $this->addDetail($transferSale, $firstProduct, 2, '20.00');
        $outsideSale = $this->createSale($admin, '2026-03-11 12:00:00', 'tarjeta', '100.00');
        $this->addDetail($outsideSale, $firstProduct, 10, '100.00');
        $this->actingAs($admin);

        $this->getJson('/api/reports/sales?start_date=2026-03-10&end_date=2026-03-10')
            ->assertOk()
            ->assertJsonPath('summary.sales', 2)
            ->assertJsonPath('summary.revenue', 38)
            ->assertJsonPath('summary.units', 4)
            ->assertJsonPath('summary.averageTicket', 19)
            ->assertJsonPath('summary.rows.0.product', 'Producto A')
            ->assertJsonPath('summary.rows.0.quantity', 3)
            ->assertJsonPath('summary.rows.0.salesCount', 2)
            ->assertJsonPath('summary.rows.0.total', 29)
            ->assertJsonPath('summary.rows.1.quantity', 1)
            ->assertJsonPath('summary.rows.1.salesCount', 1)
            ->assertJsonPath('summary.rows.1.total', 9)
            ->assertJsonPath('summary.categories.0.category', 'Abarrotes')
            ->assertJsonPath('summary.categories.0.quantity', 3)
            ->assertJsonPath('summary.categories.0.total', 29)
            ->assertJsonPath('summary.categories.0.percentage', 75)
            ->assertJsonPath('summary.categories.1.category', 'Bebidas')
            ->assertJsonPath('summary.categories.1.quantity', 1)
            ->assertJsonPath('summary.categories.1.total', 9)
            ->assertJsonPath('summary.categories.1.percentage', 25)
            ->assertJsonPath('summary.dailySales.0.date', '2026-03-10')
            ->assertJsonPath('summary.dailySales.0.sales', 2)
            ->assertJsonPath('summary.dailySales.0.units', 4)
            ->assertJsonPath('summary.dailySales.0.revenue', 38)
            ->assertJsonPath('summary.hourlySales.10.hour', '10:00')
            ->assertJsonPath('summary.hourlySales.10.sales', 1)
            ->assertJsonPath('summary.hourlySales.10.revenue', 18)
            ->assertJsonPath('summary.hourlySales.12.hour', '12:00')
            ->assertJsonPath('summary.hourlySales.12.revenue', 20)
            ->assertJsonPath('summary.paymentMethods.0.method', 'efectivo')
            ->assertJsonPath('summary.paymentMethods.0.revenue', 18)
            ->assertJsonPath('summary.paymentMethods.0.percentage', 47.4)
            ->assertJsonPath('summary.paymentMethods.1.method', 'tarjeta')
            ->assertJsonPath('summary.paymentMethods.1.revenue', 0)
            ->assertJsonPath('summary.paymentMethods.2.method', 'transferencia')
            ->assertJsonPath('summary.paymentMethods.2.revenue', 20)
            ->assertJsonPath('summary.paymentMethods.2.percentage', 52.6);
    }

    public function test_empty_period_returns_zero_indicators_and_payment_methods(): void
    {
        $this->actingAs($this->createAdministrator());

        $this->getJson('/api/reports/sales?start_date=2026-03-12&end_date=2026-03-12')
            ->assertOk()
            ->assertJsonPath('summary.sales', 0)
            ->assertJsonPath('summary.revenue', 0)
            ->assertJsonPath('summary.units', 0)
            ->assertJsonPath('summary.averageTicket', 0)
            ->assertJsonCount(0, 'summary.rows')
            ->assertJsonCount(0, 'summary.categories')
            ->assertJsonCount(1, 'summary.dailySales')
            ->assertJsonPath('summary.dailySales.0.revenue', 0)
            ->assertJsonCount(24, 'summary.hourlySales')
            ->assertJsonPath('summary.paymentMethods.0.revenue', 0)
            ->assertJsonPath('summary.paymentMethods.0.percentage', 0)
            ->assertJsonPath('summary.paymentMethods.1.revenue', 0)
            ->assertJsonPath('summary.paymentMethods.2.revenue', 0);
    }

    public function test_multi_day_report_includes_days_without_sales_in_the_daily_series(): void
    {
        $admin = $this->createAdministrator();
        $category = Categoria::query()->create(['nombre' => 'Bebidas']);
        $product = $this->createProduct($category, 'Agua');
        $sale = $this->createSale($admin, '2026-03-10 10:00:00', 'efectivo', '10.00');
        $this->addDetail($sale, $product, 1, '10.00');
        $this->actingAs($admin);

        $this->getJson('/api/reports/sales?start_date=2026-03-10&end_date=2026-03-12')
            ->assertOk()
            ->assertJsonCount(3, 'summary.dailySales')
            ->assertJsonPath('summary.dailySales.0.date', '2026-03-10')
            ->assertJsonPath('summary.dailySales.0.revenue', 10)
            ->assertJsonPath('summary.dailySales.1.date', '2026-03-11')
            ->assertJsonPath('summary.dailySales.1.revenue', 0)
            ->assertJsonPath('summary.dailySales.2.date', '2026-03-12')
            ->assertJsonPath('summary.dailySales.2.revenue', 0)
            ->assertJsonCount(0, 'summary.hourlySales');
    }

    public function test_invalid_or_reversed_report_dates_are_rejected(): void
    {
        $this->actingAs($this->createAdministrator());

        $this->getJson('/api/reports/sales?start_date=not-a-date&end_date=2026-03-12')
            ->assertUnprocessable();
        $this->getJson('/api/reports/sales?start_date=2026-03-13&end_date=2026-03-12')
            ->assertUnprocessable();
    }

    private function createAdministrator(): User
    {
        return User::query()->create([
            'nombre' => 'Administrador de reportes',
            'correo' => 'reports-admin@example.test',
            'password' => 'una-clave-segura',
            'rol_id' => Rol::query()->where('nombre', 'Administrador')->value('id'),
            'estado' => true,
        ]);
    }

    private function createProduct(Categoria $category, string $name): Producto
    {
        return Producto::query()->create([
            'nombre' => $name,
            'categoria_id' => $category->id,
            'precio' => '10.00',
            'stock' => 100,
            'estado' => true,
        ]);
    }

    private function createSale(
        User $user,
        string $date,
        string $paymentMethod,
        string $total,
        string $discount = '0.00',
    ): Venta {
        return Venta::query()->create([
            'usuario_id' => $user->id,
            'fecha' => $date,
            'subtotal' => number_format((float) $total + (float) $discount, 2, '.', ''),
            'descuento' => $discount,
            'total' => $total,
            'metodo_pago' => $paymentMethod,
        ]);
    }

    private function addDetail(Venta $sale, Producto $product, int $quantity, string $subtotal): void
    {
        DetalleVenta::query()->create([
            'venta_id' => $sale->id,
            'producto_id' => $product->id,
            'cantidad' => $quantity,
            'precio_unitario' => '10.00',
            'subtotal' => $subtotal,
        ]);
    }
}
