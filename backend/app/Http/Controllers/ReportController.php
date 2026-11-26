<?php

namespace App\Http\Controllers;

use App\Models\DetalleVenta;
use App\Models\Categoria;
use App\Models\Venta;
use App\Support\SaleDiscountAllocator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use DateInterval;
use DatePeriod;
use DateTimeImmutable;

class ReportController extends Controller
{
    public function sales(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start_date' => ['required', 'date_format:Y-m-d', 'before_or_equal:end_date'],
            'end_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:start_date'],
        ]);

        $start = $validated['start_date'].' 00:00:00';
        $end = $validated['end_date'].' 23:59:59';
        $isSingleDay = $validated['start_date'] === $validated['end_date'];
        $sales = Venta::query()
            ->with(['detalles.producto.categoria'])
            ->whereBetween('fecha', [$start, $end])
            ->orderBy('fecha')
            ->get();
        $products = [];
        $categories = Categoria::query()
            ->orderBy('nombre')
            ->get(['id', 'nombre'])
            ->mapWithKeys(fn (Categoria $category): array => [
                (string) $category->id => [
                    'category' => $category->nombre,
                    'quantity' => 0,
                    'totalCents' => 0,
                    'saleIds' => [],
                ],
            ])
            ->all();
        $dailyTotals = [];
        $hourlyTotals = $isSingleDay
            ? array_fill(0, 24, ['sales' => 0, 'units' => 0, 'revenueCents' => 0])
            : [];
        $paymentTotals = array_fill_keys(
            ['efectivo', 'tarjeta', 'transferencia'],
            ['sales' => 0, 'revenueCents' => 0],
        );
        $revenueCents = 0;
        $units = 0;

        foreach ($sales as $sale) {
            $saleTotalCents = $this->toCents($sale->total);
            $saleDate = $sale->fecha->toDateString();
            $revenueCents += $saleTotalCents;
            $dailyTotals[$saleDate] ??= [
                'sales' => 0,
                'units' => 0,
                'revenueCents' => 0,
            ];
            $dailyTotals[$saleDate]['sales']++;
            $dailyTotals[$saleDate]['revenueCents'] += $saleTotalCents;
            if ($isSingleDay) {
                $hour = (int) $sale->fecha->format('G');
                $hourlyTotals[$hour]['sales']++;
                $hourlyTotals[$hour]['revenueCents'] += $saleTotalCents;
            }

            $paymentMethod = $sale->metodo_pago;
            $paymentTotals[$paymentMethod]['sales']++;
            $paymentTotals[$paymentMethod]['revenueCents'] += $saleTotalCents;

            $details = $sale->detalles->values();
            $subtotals = $details
                ->map(fn (DetalleVenta $detail): int => $this->toCents($detail->subtotal))
                ->all();
            $discounts = SaleDiscountAllocator::allocate(
                $this->toCents($sale->descuento),
                $subtotals,
            );

            foreach ($details as $index => $detail) {
                $key = (string) $detail->producto_id;
                $quantity = (int) $detail->cantidad;
                $lineRevenueCents = $subtotals[$index] - ($discounts[$index] ?? 0);
                $products[$key] ??= [
                    'product' => $detail->producto?->nombre ?? 'Producto eliminado',
                    'quantity' => 0,
                    'totalCents' => 0,
                    'saleIds' => [],
                ];
                $products[$key]['quantity'] += $quantity;
                $products[$key]['totalCents'] += $lineRevenueCents;
                $products[$key]['saleIds'][$sale->id] = true;
                $categoryKey = (string) ($detail->producto?->categoria_id ?? 'unknown');
                $categories[$categoryKey] ??= [
                    'category' => $detail->producto?->categoria?->nombre ?? 'Sin categoría',
                    'quantity' => 0,
                    'totalCents' => 0,
                    'saleIds' => [],
                ];
                $categories[$categoryKey]['quantity'] += $quantity;
                $categories[$categoryKey]['totalCents'] += $lineRevenueCents;
                $categories[$categoryKey]['saleIds'][$sale->id] = true;
                $dailyTotals[$saleDate]['units'] += $quantity;
                $units += $quantity;
                if ($isSingleDay) {
                    $hourlyTotals[$hour]['units'] += $quantity;
                }
            }
        }

        $periodStart = new DateTimeImmutable($validated['start_date']);
        $periodEnd = new DateTimeImmutable($validated['end_date']);
        if ($periodStart->diff($periodEnd)->days <= 366) {
            foreach (new DatePeriod($periodStart, new DateInterval('P1D'), $periodEnd->modify('+1 day')) as $date) {
                $dateKey = $date->format('Y-m-d');
                $dailyTotals[$dateKey] ??= [
                    'sales' => 0,
                    'units' => 0,
                    'revenueCents' => 0,
                ];
            }
            ksort($dailyTotals);
        }

        $rows = collect($products)
            ->map(fn (array $row): array => [
                'product' => $row['product'],
                'quantity' => $row['quantity'],
                'total' => $row['totalCents'] / 100,
                'salesCount' => count($row['saleIds']),
            ])
            ->sort(function (array $first, array $second): int {
                return ($second['quantity'] <=> $first['quantity'])
                    ?: strnatcasecmp($first['product'], $second['product']);
            })
            ->values();
        $categoryRows = collect($categories)
            ->map(fn (array $category): array => [
                'category' => $category['category'],
                'quantity' => $category['quantity'],
                'total' => $category['totalCents'] / 100,
                'salesCount' => count($category['saleIds']),
                'percentage' => $units > 0
                    ? round($category['quantity'] / $units * 100, 1)
                    : 0,
            ])
            ->sort(function (array $first, array $second): int {
                return ($second['quantity'] <=> $first['quantity'])
                    ?: strnatcasecmp($first['category'], $second['category']);
            })
            ->values();
        $dailySales = collect($dailyTotals)
            ->map(fn (array $day, string $date): array => [
                'date' => $date,
                'sales' => $day['sales'],
                'units' => $day['units'],
                'revenue' => $day['revenueCents'] / 100,
            ])
            ->values();
        $hourlySales = collect($hourlyTotals)
            ->map(fn (array $hour, int $index): array => [
                'hour' => sprintf('%02d:00', $index),
                'sales' => $hour['sales'],
                'units' => $hour['units'],
                'revenue' => $hour['revenueCents'] / 100,
            ])
            ->values();
        $payments = collect($paymentTotals)
            ->map(fn (array $payment, string $method): array => [
                'method' => $method,
                'sales' => $payment['sales'],
                'revenue' => $payment['revenueCents'] / 100,
                'percentage' => $revenueCents > 0
                    ? round($payment['revenueCents'] / $revenueCents * 100, 1)
                    : 0,
            ])
            ->values();

        return response()->json([
            'summary' => [
                'rows' => $rows,
                'categories' => $categoryRows,
                'dailySales' => $dailySales,
                'hourlySales' => $hourlySales,
                'paymentMethods' => $payments,
                'units' => $units,
                'revenue' => $revenueCents / 100,
                'sales' => $sales->count(),
                'averageTicket' => $sales->count() > 0
                    ? round($revenueCents / $sales->count()) / 100
                    : 0,
                'incompleteSales' => 0,
            ],
        ]);
    }

    private function toCents(string|int|float $amount): int
    {
        $formatted = number_format((float) $amount, 2, '.', '');
        [$whole, $fraction] = explode('.', $formatted);

        return ((int) $whole * 100) + (int) $fraction;
    }
}
