<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('configuracion_tienda', function (Blueprint $table) {
            $table->unsignedTinyInteger('id')->primary();
            $table->string('nombre_comercial', 150);
            $table->string('direccion')->nullable();
            $table->string('telefono', 40)->nullable();
            $table->string('correo', 255)->nullable();
            $table->string('logo_path')->nullable();
            $table->string('mensaje_ticket', 500)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('configuracion_tienda');
    }
};
