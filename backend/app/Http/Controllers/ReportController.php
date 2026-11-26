<?php

namespace App\Http\Controllers;

use App\Models\DetalleVenta;
use App\Models\Venta;
use App\Support\SaleDiscountAllocator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

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
        $sales = Venta::query()
            ->with(['detalles.producto'])
            ->whereBetween('fecha', [$start, $end])
            ->orderBy('fecha')
            ->get();
        $totalsByProduct = [];

        foreach ($sales as $sale) {
            $details = $sale->detalles->values();
            $subtotals = $details
                ->map(fn (DetalleVenta $detail): int => $this->toCents($detail->subtotal))
                ->all();
            $discounts = SaleDiscountAllocator::allocate(
                $this->toCents($sale->descuento),
                $subtotals,
            );

            foreach ($details as $index => $detail) {
                $key = $detail->producto_id;
                $totalsByProduct[$key] ??= [
                    'product' => $detail->producto?->nombre ?? 'Producto eliminado',
                    'quantity' => 0,
                    'totalCents' => 0,
                ];
                $totalsByProduct[$key]['quantity'] += $detail->cantidad;
                $totalsByProduct[$key]['totalCents'] += $subtotals[$index] - ($discounts[$index] ?? 0);
            }
        }

        $rows = collect($totalsByProduct)
            ->map(fn (array $row): array => [
                'product' => $row['product'],
                'quantity' => $row['quantity'],
                'total' => $row['totalCents'] / 100,
            ])
            ->sortBy('product', SORT_NATURAL | SORT_FLAG_CASE)
            ->values();

        return response()->json([
            'summary' => [
                'rows' => $rows,
                'units' => $rows->sum('quantity'),
                'revenue' => (float) $sales->sum('total'),
                'sales' => $sales->count(),
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
