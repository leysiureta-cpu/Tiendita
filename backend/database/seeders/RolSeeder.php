<?php

namespace Database\Seeders;

use App\Models\Rol;
use Illuminate\Database\Seeder;

class RolSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            ['nombre' => 'Administrador', 'descripcion' => 'Administra el sistema y la tienda.'],
            ['nombre' => 'Cajero', 'descripcion' => 'Registra las ventas de la tienda.'],
        ] as $rol) {
            Rol::firstOrCreate(
                ['nombre' => $rol['nombre']],
                ['descripcion' => $rol['descripcion']],
            );
        }
    }
}
