<?php

namespace Database\Seeders;

use App\Models\Categoria;
use App\Models\Producto;
use Illuminate\Database\Seeder;

class ProductoSeeder extends Seeder
{
    public function run(): void
    {
        $productos = [
            ['Coca-Cola 600 ml', 'Bebidas', 18, 350],
            ['Pepsi 600 ml', 'Bebidas', 17, 250],
            ['Agua Ciel 1 litro', 'Bebidas', 14, 400],
            ['Jugo Jumex 500 ml', 'Bebidas', 16, 200],
            ['Sabritas Originales', 'Botanas', 18, 280],
            ['Doritos Nacho', 'Botanas', 19, 220],
            ['Takis Fuego', 'Botanas', 17, 300],
            ['Galletas Oreo', 'Botanas', 16, 180],
            ['Leche entera 1 litro', 'Lácteos', 27, 150],
            ['Yogur natural', 'Lácteos', 22, 120],
            ['Queso panela', 'Lácteos', 45, 100],
            ['Pan blanco', 'Panadería', 42, 140],
            ['Pan dulce', 'Panadería', 12, 200],
            ['Galletas Marías', 'Panadería', 15, 250],
            ['Bolillo', 'Panadería', 3, 50],
        ];

        foreach ($productos as [$nombre, $categoriaNombre, $precio, $stock]) {
            $categoria = Categoria::where('nombre', $categoriaNombre)->firstOrFail();

            Producto::firstOrCreate(
                ['nombre' => $nombre],
                [
                    'categoria_id' => $categoria->id,
                    'precio' => $precio,
                    'stock' => $stock,
                    'estado' => true,
                ],
            );
        }
    }
}
