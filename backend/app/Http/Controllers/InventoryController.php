<?php

namespace App\Http\Controllers;

use App\Models\MovimientoInventario;
use App\Models\Producto;
use App\Models\User;
use App\Services\InventoryMovementService;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class InventoryController extends Controller
{
    private const LOW_STOCK_THRESHOLD = 5;

    public function index(): JsonResponse
    {
        $products = Producto::query()
            ->with('categoria')
            ->orderBy('nombre')
            ->get()
            ->map(fn (Producto $product): array => $this->productData($product));

        return response()->json(['data' => $products]);
    }

    public function movements(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'perPage' => ['sometimes', 'integer', 'min:1', 'max:100'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $movements = MovimientoInventario::query()
            ->with(['producto', 'usuario'])
            ->orderByDesc('fecha_movimiento')
            ->orderByDesc('id')
            ->paginate($validated['perPage'] ?? 15);

        return response()->json([
            'data' => $movements->getCollection()
                ->map(fn (MovimientoInventario $movement): array => $this->movementData($movement))
                ->values(),
            'meta' => [
                'currentPage' => $movements->currentPage(),
                'lastPage' => $movements->lastPage(),
                'total' => $movements->total(),
            ],
        ]);
    }

    public function storeMovement(
        Request $request,
        InventoryMovementService $movementService,
    ): JsonResponse {
        $request->merge([
            'reason' => trim((string) $request->input('reason')),
        ]);
        $validated = $request->validate([
            'operationId' => ['required', 'uuid'],
            'productId' => ['required', 'integer', 'exists:productos,id'],
            'type' => ['required', Rule::in(['entrada', 'salida'])],
            'quantity' => ['required', 'integer', 'min:1', 'max:4294967295'],
            'reason' => ['required', 'string', 'max:1000'],
            'movementAt' => ['required', 'date'],
        ]);
        $user = $request->user();
        $existing = MovimientoInventario::query()
            ->where('operation_id', $validated['operationId'])
            ->first();

        if ($existing) {
            return $this->duplicateResponse($existing, $validated, $user);
        }

        $movementAt = Carbon::parse($validated['movementAt'])
            ->setTimezone(config('app.timezone'));

        try {
            $movement = DB::transaction(function () use ($validated, $user, $movementAt, $movementService) {
                $product = Producto::query()
                    ->lockForUpdate()
                    ->findOrFail($validated['productId']);

                return $movementService->record(
                    $product,
                    $user,
                    $validated['type'],
                    (int) $validated['quantity'],
                    trim($validated['reason']),
                    $movementAt,
                    operationId: $validated['operationId'],
                );
            });
        } catch (QueryException $error) {
            $existing = MovimientoInventario::query()
                ->where('operation_id', $validated['operationId'])
                ->first();

            if (! $existing) {
                throw $error;
            }

            return $this->duplicateResponse($existing, $validated, $user);
        }

        return response()->json([
            'data' => $this->movementData($movement->load(['producto', 'usuario'])),
        ], 201);
    }

    private function duplicateResponse(
        MovimientoInventario $existing,
        array $validated,
        User $user,
    ): JsonResponse {
        $sameRequest = (int) $existing->usuario_id === (int) $user->id
            && (int) $existing->producto_id === (int) $validated['productId']
            && $existing->tipo === $validated['type']
            && (int) $existing->cantidad === (int) $validated['quantity']
            && $existing->motivo === trim($validated['reason'])
            && $existing->fecha_movimiento?->format('Y-m-d H:i:s')
                === Carbon::parse($validated['movementAt'])
                    ->setTimezone(config('app.timezone'))
                    ->format('Y-m-d H:i:s');

        if (! $sameRequest) {
            return response()->json([
                'message' => 'El identificador de operación ya fue utilizado para otro movimiento.',
            ], 409);
        }

        return response()->json([
            'data' => $this->movementData($existing->load(['producto', 'usuario'])),
            'duplicate' => true,
        ]);
    }

    private function productData(Producto $product): array
    {
        $stock = (int) $product->stock;
        $inventoryStatus = match (true) {
            $stock === 0 => 'out',
            $stock <= self::LOW_STOCK_THRESHOLD => 'low',
            default => 'sufficient',
        };

        return [
            'id' => $product->id,
            'name' => $product->nombre,
            'category' => $product->categoria?->nombre ?? 'Sin categoría',
            'categoryId' => $product->categoria_id,
            'price' => (float) $product->precio,
            'stock' => $stock,
            'active' => (bool) $product->estado,
            'inventoryStatus' => $inventoryStatus,
        ];
    }

    private function movementData(MovimientoInventario $movement): array
    {
        return [
            'id' => $movement->id,
            'productId' => $movement->producto_id,
            'productName' => $movement->producto?->nombre ?? 'Producto no disponible',
            'type' => $movement->tipo,
            'quantity' => $movement->cantidad,
            'previousStock' => $movement->existencias_anteriores,
            'newStock' => $movement->existencias_posteriores,
            'reason' => $movement->motivo,
            'userName' => $movement->usuario?->nombre ?? 'Usuario no disponible',
            'movementAt' => $movement->fecha_movimiento?->toISOString(),
            'saleId' => $movement->venta_id,
        ];
    }
}
