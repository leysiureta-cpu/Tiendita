<?php

namespace Database\Seeders;

use App\Models\PaymentMethod;
use App\Models\Product;
use App\Models\Sale;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class TestSalesSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new RuntimeException('Las ventas de prueba solo se pueden crear en local o testing.');
        }

        $sales = [
            [
                'sale_number' => 'TEST-SALE-001',
                'payment_method' => 'cash',
                'days_ago' => 3,
                'items' => [
                    ['sku' => '001', 'quantity' => 2],
                    ['sku' => '005', 'quantity' => 1],
                    ['sku' => '009', 'quantity' => 1],
                ],
            ],
            [
                'sale_number' => 'TEST-SALE-002',
                'payment_method' => 'card',
                'days_ago' => 2,
                'items' => [
                    ['sku' => '002', 'quantity' => 2],
                    ['sku' => '006', 'quantity' => 1],
                    ['sku' => '013', 'quantity' => 2],
                ],
            ],
            [
                'sale_number' => 'TEST-SALE-003',
                'payment_method' => 'transfer',
                'days_ago' => 1,
                'items' => [
                    ['sku' => '003', 'quantity' => 3],
                    ['sku' => '010', 'quantity' => 1],
                    ['sku' => '015', 'quantity' => 4],
                ],
            ],
        ];

        DB::transaction(function () use ($sales): void {
            $cashier = User::where('email', 'test.cashier@mini-super.test')->firstOrFail();

            foreach ($sales as $saleData) {
                $paymentMethod = PaymentMethod::where('code', $saleData['payment_method'])->firstOrFail();
                $lines = [];

                foreach ($saleData['items'] as $itemData) {
                    $product = Product::with('inventory')
                        ->where('sku', $itemData['sku'])
                        ->firstOrFail();

                    if (! $product->inventory) {
                        throw new RuntimeException("El producto {$itemData['sku']} no tiene registro de inventario.");
                    }

                    $quantity = $itemData['quantity'];
                    $unitPrice = round((float) $product->price, 2);
                    $lineTotal = round($unitPrice * $quantity, 2);

                    $lines[] = [
                        'product_id' => $product->id,
                        'quantity' => $quantity,
                        'unit_price' => $unitPrice,
                        'discount' => 0,
                        'line_total' => $lineTotal,
                    ];
                }

                $subtotal = round(array_sum(array_column($lines, 'line_total')), 2);
                $sale = Sale::firstOrCreate(
                    ['sale_number' => $saleData['sale_number']],
                    [
                        'user_id' => $cashier->id,
                        'payment_method_id' => $paymentMethod->id,
                        'sold_at' => now()->subDays($saleData['days_ago'])->setTime(10, 30),
                        'subtotal' => $subtotal,
                        'discount' => 0,
                        'total' => $subtotal,
                    ],
                );

                foreach ($lines as $line) {
                    $sale->items()->firstOrCreate(
                        ['product_id' => $line['product_id']],
                        $line,
                    );
                }
            }
        });
    }
}
