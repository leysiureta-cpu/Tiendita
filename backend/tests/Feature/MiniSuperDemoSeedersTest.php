<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Inventory;
use App\Models\Product;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\User;
use Database\Seeders\TestUsersSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class MiniSuperDemoSeedersTest extends TestCase
{
    use RefreshDatabase;

    public function test_demo_seeders_are_repeatable_and_preserve_catalog_inventory(): void
    {
        config()->set('app.test_users_password', 'MiniSuper-Test-Pass-2026!');

        $this->seed();
        $testProduct = Product::where('sku', '001')->firstOrFail();
        Inventory::where('product_id', $testProduct->id)->update(['quantity' => 347]);
        $inventoryBefore = Inventory::orderBy('product_id')->pluck('quantity')->all();
        $this->seed();

        $this->assertSame(4, Category::count());
        $this->assertSame(15, Product::count());
        $this->assertSame(15, Inventory::count());
        $this->assertSame($inventoryBefore, Inventory::orderBy('product_id')->pluck('quantity')->all());
        $this->assertSame(3, User::count());
        $this->assertSame(3, Sale::count());
        $this->assertSame(9, SaleItem::count());

        $cashier = User::where('email', 'test.cashier@mini-super.test')->firstOrFail();
        $this->assertTrue(Hash::check('MiniSuper-Test-Pass-2026!', $cashier->password));
        $this->assertTrue($cashier->roles()->where('name', 'cashier')->exists());

        foreach (Sale::with(['cashier', 'paymentMethod', 'items.product.inventory'])->get() as $sale) {
            $this->assertNotNull($sale->cashier);
            $this->assertNotNull($sale->paymentMethod);
            $this->assertCount(3, $sale->items);

            $calculatedSubtotal = $sale->items->sum(
                fn (SaleItem $item): float => (float) $item->line_total,
            );
            $this->assertEquals($calculatedSubtotal, (float) $sale->subtotal);
            $this->assertEquals(
                (float) $sale->subtotal - (float) $sale->discount,
                (float) $sale->total,
            );

            foreach ($sale->items as $item) {
                $this->assertNotNull($item->product->inventory);
                $this->assertEquals(
                    $item->quantity * (float) $item->unit_price - (float) $item->discount,
                    (float) $item->line_total,
                );
            }
        }
    }

    public function test_test_user_seeder_requires_a_private_password_setting(): void
    {
        config()->set('app.test_users_password', null);

        $this->expectException(\RuntimeException::class);
        $this->seed(TestUsersSeeder::class);
    }
}
