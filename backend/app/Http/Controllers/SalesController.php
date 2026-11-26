<?php

namespace App\Http\Controllers;

use App\Models\DetalleVenta;
use App\Models\Producto;
use App\Models\Venta;
use App\Services\InventoryMovementService;
use App\Support\SaleDiscountAllocator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SalesController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $sales = $this->visibleSales($request)
            ->with(['usuario', 'detalles.producto'])
            ->orderByDesc('fecha')
            ->orderByDesc('id')
            ->get()
            ->map(fn (Venta $sale): array => $this->saleData($sale));

        return response()->json(['data' => $sales]);
    }

    public function store(
        Request $request,
        InventoryMovementService $movementService,
    ): JsonResponse
    {
        $validated = $request->validate([
            'operationId' => ['required', 'uuid'],
            'items' => ['required', 'array', 'min:1'],
            'items.*.productId' => ['required', 'integer', 'min:1'],
            'items.*.quantity' => ['required', 'integer', 'min:1', 'max:10000'],
            'discount' => ['sometimes', 'numeric', 'min:0', 'decimal:0,2', 'max:99999999.99'],
            'paymentMethod' => ['required', 'in:efectivo,tarjeta,transferencia'],
            'amountReceived' => ['nullable', 'numeric', 'min:0', 'decimal:0,2', 'max:99999999.99'],
            'paymentConfirmed' => ['sometimes', 'boolean'],
        ]);

        $actor = $request->user();
        $existing = Venta::query()
            ->where('operation_id', $validated['operationId'])
            ->first();

        if ($existing) {
            abort_unless($existing->usuario_id === $actor->id, 409, 'La operación ya fue registrada.');

            return response()->json(['data' => $this->saleData($existing->load(['usuario', 'detalles.producto']))]);
        }

        if ($validated['paymentMethod'] !== 'efectivo' && ! ($validated['paymentConfirmed'] ?? false)) {
            return response()->json([
                'message' => 'Confirma la recepción del pago antes de registrar la venta.',
            ], 422);
        }

        $quantities = [];
        foreach ($validated['items'] as $item) {
            $productId = (int) $item['productId'];
            $quantities[$productId] = ($quantities[$productId] ?? 0) + (int) $item['quantity'];
        }

        $sale = DB::transaction(function () use ($validated, $quantities, $actor, $movementService): Venta {
            $products = Producto::query()
                ->whereIn('id', array_keys($quantities))
                ->where('estado', true)
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            if ($products->count() !== count($quantities)) {
                abort(422, 'Uno de los productos ya no está disponible.');
            }

            $subtotalCents = 0;
            $lines = [];
            foreach ($quantities as $productId => $quantity) {
                $product = $products->get($productId);
                if ($product->stock < $quantity) {
                    abort(422, "Inventario insuficiente para {$product->nombre}.");
                }

                $unitPriceCents = $this->toCents($product->precio);
                $lineSubtotalCents = $unitPriceCents * $quantity;
                $subtotalCents += $lineSubtotalCents;
                $lines[] = [
                    'product' => $product,
                    'quantity' => $quantity,
                    'unitPriceCents' => $unitPriceCents,
                    'subtotalCents' => $lineSubtotalCents,
                ];
            }

            $discountCents = $this->toCents($validated['discount'] ?? 0);
            if ($discountCents > $subtotalCents) {
                abort(422, 'El descuento no puede ser mayor que el subtotal.');
            }

            $totalCents = $subtotalCents - $discountCents;
            $receivedCents = null;
            $changeCents = null;

            if ($validated['paymentMethod'] === 'efectivo') {
                if (! array_key_exists('amountReceived', $validated) || $validated['amountReceived'] === null) {
                    abort(422, 'Ingresa el dinero recibido.');
                }
                $receivedCents = $this->toCents($validated['amountReceived']);
                if ($receivedCents < $totalCents) {
                    abort(422, 'El dinero recibido es insuficiente para cubrir el total.');
                }
                $changeCents = $receivedCents - $totalCents;
            }

            $sale = Venta::query()->create([
                'usuario_id' => $actor->id,
                'operation_id' => $validated['operationId'],
                'fecha' => now(),
                'subtotal' => $this->fromCents($subtotalCents),
                'descuento' => $this->fromCents($discountCents),
                'total' => $this->fromCents($totalCents),
                'metodo_pago' => $validated['paymentMethod'],
                'dinero_recibido' => $receivedCents === null ? null : $this->fromCents($receivedCents),
                'cambio' => $changeCents === null ? null : $this->fromCents($changeCents),
            ]);

            foreach ($lines as $line) {
                DetalleVenta::query()->create([
                    'venta_id' => $sale->id,
                    'producto_id' => $line['product']->id,
                    'cantidad' => $line['quantity'],
                    'precio_unitario' => $this->fromCents($line['unitPriceCents']),
                    'subtotal' => $this->fromCents($line['subtotalCents']),
                ]);

                $movementService->record(
                    $line['product'],
                    $actor,
                    'salida',
                    $line['quantity'],
                    "Salida automática por venta #{$sale->id}.",
                    $sale->fecha,
                    $sale,
                );
            }

            return $sale->load(['usuario', 'detalles.producto']);
        });

        return response()->json(['data' => $this->saleData($sale)], 201);
    }

    public function show(Request $request, Venta $sale): JsonResponse
    {
        $this->authorizeSale($request, $sale);

        return response()->json([
            'data' => $this->saleData($sale->load(['usuario', 'detalles.producto'])),
        ]);
    }

    private function visibleSales(Request $request)
    {
        $query = Venta::query();
        if (! $request->user()->rol()->where('nombre', 'Administrador')->exists()) {
            $query->where('usuario_id', $request->user()->id);
        }

        return $query;
    }

    private function authorizeSale(Request $request, Venta $sale): void
    {
        if ($sale->usuario_id === $request->user()->id) {
            return;
        }

        abort_unless(
            $request->user()->rol()->where('nombre', 'Administrador')->exists(),
            403,
            'No tienes permiso para consultar esta venta.',
        );
    }

    private function saleData(Venta $sale): array
    {
        $createdAt = $sale->fecha?->toISOString();
        $details = $sale->detalles->values();
        $subtotals = $details
            ->map(fn (DetalleVenta $detail): int => $this->toCents($detail->subtotal))
            ->all();
        $discounts = SaleDiscountAllocator::allocate(
            $this->toCents($sale->descuento),
            $subtotals,
        );

        return [
            'id' => $sale->id,
            'operationId' => $sale->operation_id,
            'number' => 'V-'.$sale->fecha?->format('Ymd').'-'.str_pad((string) $sale->id, 6, '0', STR_PAD_LEFT),
            'createdAt' => $createdAt,
            'date' => $createdAt,
            'user' => [
                'id' => $sale->usuario?->id,
                'username' => $sale->usuario?->nombre,
            ],
            'items' => $details->map(function (DetalleVenta $detail, int $index) use ($discounts): array {
                $subtotalCents = $this->toCents($detail->subtotal);

                return [
                    'productId' => $detail->producto_id,
                    'productName' => $detail->producto?->nombre ?? 'Producto eliminado',
                    'quantity' => $detail->cantidad,
                    'unitPrice' => (float) $detail->precio_unitario,
                    'subtotal' => (float) $detail->subtotal,
                    'lineTotal' => $this->fromCents($subtotalCents - ($discounts[$index] ?? 0)),
                ];
            })->values(),
            'subtotal' => (float) $sale->subtotal,
            'discount' => (float) $sale->descuento,
            'total' => (float) $sale->total,
            'paymentMethod' => $sale->metodo_pago,
            'amountReceived' => $sale->dinero_recibido === null ? null : (float) $sale->dinero_recibido,
            'change' => $sale->cambio === null ? null : (float) $sale->cambio,
        ];
    }

    private function toCents(string|int|float $amount): int
    {
        $formatted = number_format((float) $amount, 2, '.', '');
        [$whole, $fraction] = explode('.', $formatted);

        return ((int) $whole * 100) + (int) $fraction;
    }

    private function fromCents(int $amount): string
    {
        return number_format($amount / 100, 2, '.', '');
    }
}
