<?php

namespace App\Http\Controllers;

use App\Models\DetalleVenta;
use App\Models\Producto;
use App\Models\User;
use App\Models\Venta;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $actor = $request->user();
        $isAdmin = $actor->rol()->where('nombre', 'Administrador')->exists();
        $todaySales = Venta::query()->whereDate('fecha', now()->toDateString());
        $bestSellerDetails = DetalleVenta::query()
            ->join('productos', 'detalle_ventas.producto_id', '=', 'productos.id')
            ->join('ventas', 'detalle_ventas.venta_id', '=', 'ventas.id');

        if (! $isAdmin) {
            $todaySales->where('usuario_id', $actor->id);
            $bestSellerDetails->where('ventas.usuario_id', $actor->id);
        }

        $bestSellers = $bestSellerDetails
            ->selectRaw('productos.nombre as name, SUM(detalle_ventas.cantidad) as quantity')
            ->groupBy('productos.id', 'productos.nombre')
            ->orderByDesc('quantity')
            ->orderBy('productos.nombre')
            ->limit(10)
            ->get()
            ->map(fn ($item): array => [
                'name' => $item->name,
                'quantity' => (int) $item->quantity,
            ]);

        $products = Producto::query()
            ->with('categoria')
            ->where('estado', true)
            ->orderBy('nombre')
            ->get()
            ->map(fn (Producto $product): array => [
                'id' => $product->id,
                'name' => $product->nombre,
                'category' => $product->categoria?->nombre ?? 'Sin categoría',
                'price' => (float) $product->precio,
                'stock' => $product->stock,
            ]);

        $response = [
            'products' => $products->count(),
            'inventory' => $products,
            'salesToday' => (clone $todaySales)->count(),
            'revenueToday' => (float) (clone $todaySales)->sum('total'),
            'bestSellers' => $bestSellers,
        ];

        if ($isAdmin) {
            $response['userCount'] = User::query()->count();
        }

        return response()->json($response);
    }
}
