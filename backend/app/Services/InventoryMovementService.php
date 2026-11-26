<?php

namespace App\Services;

use App\Models\MovimientoInventario;
use App\Models\Producto;
use App\Models\User;
use App\Models\Venta;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use DateTimeInterface;

class InventoryMovementService
{
    private const MAX_STOCK = 4294967295;

    public function record(
        Producto $product,
        User $user,
        string $type,
        int $quantity,
        string $reason,
        DateTimeInterface $movementAt,
        ?Venta $sale = null,
        ?string $operationId = null,
    ): MovimientoInventario {
        $previousStock = (int) $product->stock;

        if ($type === 'entrada') {
            if ($quantity > self::MAX_STOCK - $previousStock) {
                throw ValidationException::withMessages([
                    'quantity' => 'La entrada excede el máximo de existencias permitido.',
                ]);
            }
            $newStock = $previousStock + $quantity;
        } else {
            if ($quantity > $previousStock) {
                throw ValidationException::withMessages([
                    'quantity' => "No hay existencias suficientes de {$product->nombre}.",
                ]);
            }
            $newStock = $previousStock - $quantity;
        }

        $product->stock = $newStock;
        $product->save();

        return MovimientoInventario::query()->create([
            'operation_id' => $operationId ?? (string) Str::uuid(),
            'producto_id' => $product->id,
            'usuario_id' => $user->id,
            'venta_id' => $sale?->id,
            'tipo' => $type,
            'cantidad' => $quantity,
            'existencias_anteriores' => $previousStock,
            'existencias_posteriores' => $newStock,
            'motivo' => $reason,
            'fecha_movimiento' => $movementAt,
        ]);
    }
}
