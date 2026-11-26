<?php

namespace App\Http\Controllers;

use App\Models\Categoria;
use App\Models\Producto;
use App\Services\InventoryMovementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class CatalogController extends Controller
{
    public function products(Request $request): JsonResponse
    {
        $search = trim((string) $request->query('search', ''));

        $products = Producto::query()
            ->with('categoria')
            ->where('estado', true)
            ->when($search !== '', function ($query) use ($search): void {
                $query->where(function ($query) use ($search): void {
                    $query->where('nombre', 'like', "%{$search}%")
                        ->orWhere('id', 'like', "%{$search}%");
                });
            })
            ->orderBy('nombre')
            ->get()
            ->map(fn (Producto $product): array => $this->productData($product));

        return response()->json(['data' => $products]);
    }

    public function storeProduct(
        Request $request,
        InventoryMovementService $movementService,
    ): JsonResponse
    {
        $request->merge(['name' => trim((string) $request->input('name'))]);
        $validated = $request->validate($this->productRules());
        $product = DB::transaction(function () use ($validated, $request, $movementService): Producto {
            $initialStock = (int) $validated['stock'];
            $attributes = $this->productAttributes($validated);
            $attributes['stock'] = 0;
            $product = Producto::query()->create($attributes);

            if ($initialStock > 0) {
                $movementService->record(
                    $product,
                    $request->user(),
                    'entrada',
                    $initialStock,
                    'Existencias iniciales al registrar el producto.',
                    now(),
                );
            }

            return $product->load('categoria');
        });

        return response()->json([
            'data' => $this->productData($product),
        ], 201);
    }

    public function updateProduct(
        Request $request,
        Producto $product,
        InventoryMovementService $movementService,
    ): JsonResponse
    {
        $request->merge(['name' => trim((string) $request->input('name'))]);
        $validated = $request->validate($this->productRules($product));
        $product = DB::transaction(function () use ($validated, $product, $request, $movementService): Producto {
            $lockedProduct = Producto::query()
                ->lockForUpdate()
                ->findOrFail($product->id);
            $requestedStock = (int) $validated['stock'];
            $currentStock = (int) $lockedProduct->stock;
            $attributes = $this->productAttributes($validated);
            $attributes['stock'] = $currentStock;
            $lockedProduct->update($attributes);

            if ($requestedStock !== $currentStock) {
                $movementService->record(
                    $lockedProduct,
                    $request->user(),
                    $requestedStock > $currentStock ? 'entrada' : 'salida',
                    abs($requestedStock - $currentStock),
                    'Ajuste de existencias desde la edición del producto.',
                    now(),
                );
            }

            return $lockedProduct->fresh('categoria');
        });

        return response()->json([
            'data' => $this->productData($product),
        ]);
    }

    public function deleteProduct(Producto $product): JsonResponse
    {
        if ($product->movimientosInventario()->exists()) {
            return response()->json([
                'message' => 'No se puede eliminar un producto que tiene movimientos de inventario registrados.',
            ], 409);
        }

        if ($product->detalleVentas()->exists()) {
            return response()->json([
                'message' => 'No se puede eliminar un producto que aparece en ventas registradas.',
            ], 409);
        }

        $product->delete();

        return response()->json([], 204);
    }

    public function categories(): JsonResponse
    {
        $categories = Categoria::query()
            ->orderBy('nombre')
            ->get()
            ->map(fn (Categoria $category): array => $this->categoryData($category));

        return response()->json(['data' => $categories]);
    }

    public function storeCategory(Request $request): JsonResponse
    {
        $request->merge(['name' => trim((string) $request->input('name'))]);
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('categorias', 'nombre')],
            'description' => ['nullable', 'string', 'max:5000'],
        ]);

        $category = Categoria::query()->create([
            'nombre' => trim($validated['name']),
            'descripcion' => $validated['description'] ?? null,
        ]);

        return response()->json(['data' => $this->categoryData($category)], 201);
    }

    public function updateCategory(Request $request, Categoria $category): JsonResponse
    {
        $request->merge(['name' => trim((string) $request->input('name'))]);
        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('categorias', 'nombre')->ignore($category->id),
            ],
            'description' => ['nullable', 'string', 'max:5000'],
        ]);

        $category->update([
            'nombre' => trim($validated['name']),
            'descripcion' => $validated['description'] ?? null,
        ]);

        return response()->json(['data' => $this->categoryData($category->fresh())]);
    }

    public function deleteCategory(Categoria $category): JsonResponse
    {
        if ($category->productos()->exists()) {
            return response()->json([
                'message' => 'No se puede eliminar una categoría que contiene productos.',
            ], 409);
        }

        $category->delete();

        return response()->json([], 204);
    }

    private function productRules(?Producto $product = null): array
    {
        return [
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('productos', 'nombre')->ignore($product?->id),
            ],
            'categoryId' => ['required', 'integer', 'exists:categorias,id'],
            'price' => ['required', 'numeric', 'gt:0', 'decimal:0,2', 'max:99999999.99'],
            'stock' => ['required', 'integer', 'min:0'],
        ];
    }

    private function productAttributes(array $validated): array
    {
        return [
            'nombre' => trim($validated['name']),
            'categoria_id' => $validated['categoryId'],
            'precio' => $validated['price'],
            'stock' => $validated['stock'],
            'estado' => true,
        ];
    }

    private function productData(Producto $product): array
    {
        return [
            'id' => $product->id,
            'name' => $product->nombre,
            'category' => $product->categoria?->nombre ?? 'Sin categoría',
            'categoryId' => $product->categoria_id,
            'price' => (float) $product->precio,
            'stock' => $product->stock,
        ];
    }

    private function categoryData(Categoria $category): array
    {
        return [
            'id' => $category->id,
            'name' => $category->nombre,
            'description' => $category->descripcion,
        ];
    }
}
