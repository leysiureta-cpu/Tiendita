<?php

namespace Database\Seeders;

use App\Models\Categoria;
use Illuminate\Database\Seeder;

class CategoriaSeeder extends Seeder
{
    public function run(): void
    {
        $categorias = [
            'Bebidas',
            'Botanas',
            'Dulces y golosinas',
            'Lácteos',
            'Panadería',
            'Abarrotes y productos básicos',
            'Enlatados y conservas',
            'Limpieza',
            'Higiene personal',
            'Congelados',
        ];

        foreach ($categorias as $nombre) {
            Categoria::firstOrCreate(['nombre' => $nombre]);
        }
    }
}
