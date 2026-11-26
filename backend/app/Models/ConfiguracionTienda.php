<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConfiguracionTienda extends Model
{
    protected $table = 'configuracion_tienda';

    protected $fillable = [
        'nombre_comercial',
        'direccion',
        'telefono',
        'correo',
        'logo_path',
        'mensaje_ticket',
        'latitud',
        'longitud',
    ];

    protected function casts(): array
    {
        return [
            'latitud' => 'float',
            'longitud' => 'float',
        ];
    }
}
