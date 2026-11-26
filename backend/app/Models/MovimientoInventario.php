<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MovimientoInventario extends Model
{
    protected $table = 'movimientos_inventario';

    protected $fillable = [
        'operation_id',
        'producto_id',
        'usuario_id',
        'venta_id',
        'tipo',
        'cantidad',
        'existencias_anteriores',
        'existencias_posteriores',
        'motivo',
        'fecha_movimiento',
    ];

    protected function casts(): array
    {
        return [
            'cantidad' => 'integer',
            'existencias_anteriores' => 'integer',
            'existencias_posteriores' => 'integer',
            'fecha_movimiento' => 'datetime',
        ];
    }

    public function producto()
    {
        return $this->belongsTo(Producto::class, 'producto_id');
    }

    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function venta()
    {
        return $this->belongsTo(Venta::class, 'venta_id');
    }
}
