<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('movimientos_inventario', function (Blueprint $table) {
            $table->id();
            $table->uuid('operation_id')->unique();
            $table->foreignId('producto_id')->constrained('productos')->restrictOnDelete();
            $table->foreignId('usuario_id')->constrained('usuarios')->restrictOnDelete();
            $table->foreignId('venta_id')->nullable()->constrained('ventas')->restrictOnDelete();
            $table->enum('tipo', ['entrada', 'salida']);
            $table->unsignedInteger('cantidad');
            $table->unsignedInteger('existencias_anteriores');
            $table->unsignedInteger('existencias_posteriores');
            $table->string('motivo', 1000);
            $table->dateTime('fecha_movimiento')->index();
            $table->timestamps();

            $table->unique(['venta_id', 'producto_id']);
            $table->index(['producto_id', 'fecha_movimiento']);
            $table->index(['usuario_id', 'fecha_movimiento']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('movimientos_inventario');
    }
};
