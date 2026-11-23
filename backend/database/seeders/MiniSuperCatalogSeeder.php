<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Inventory;
use App\Models\Product;
use Illuminate\Database\Seeder;

class MiniSuperCatalogSeeder extends Seeder
{
    public function run(): void
    {
        $products = [
            ['001', 'Coca-Cola 600 ml', 'Bebidas', 18, 350],
            ['002', 'Pepsi 600 ml', 'Bebidas', 17, 250],
            ['003', 'Agua Ciel 1 litro', 'Bebidas', 14, 400],
            ['004', 'Jugo Jumex 500 ml', 'Bebidas', 16, 200],
            ['005', 'Sabritas Originales', 'Botanas', 18, 280],
            ['006', 'Doritos Nacho', 'Botanas', 19, 220],
            ['007', 'Takis Fuego', 'Botanas', 17, 300],
            ['008', 'Galletas Oreo', 'Botanas', 16, 180],
            ['009', 'Leche entera 1 litro', 'Lácteos', 27, 150],
            ['010', 'Yogur natural', 'Lácteos', 22, 120],
            ['011', 'Queso panela', 'Lácteos', 45, 100],
            ['012', 'Pan blanco', 'Panadería', 42, 140],
            ['013', 'Pan dulce', 'Panadería', 12, 200],
            ['014', 'Galletas Marías', 'Panadería', 15, 250],
            ['015', 'Bolillo', 'Panadería', 3, 50],
        ];

        foreach ($products as [$sku, $name, $categoryName, $price, $quantity]) {
            $category = Category::firstOrCreate(['name' => $categoryName]);
            $product = Product::firstOrCreate(
                ['sku' => $sku],
                [
                    'category_id' => $category->id,
                    'name' => $name,
                    'price' => $price,
                    'is_active' => true,
                ],
            );

            Inventory::firstOrCreate(
                ['product_id' => $product->id],
                ['quantity' => $quantity, 'low_stock_threshold' => 0],
            );
        }
    }
}
