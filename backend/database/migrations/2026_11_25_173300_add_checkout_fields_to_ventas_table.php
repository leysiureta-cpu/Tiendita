<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            $table->uuid('operation_id')->nullable()->unique();
            $table->decimal('dinero_recibido', 10, 2)->unsigned()->nullable();
            $table->decimal('cambio', 10, 2)->unsigned()->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('ventas', function (Blueprint $table) {
            $table->dropUnique(['operation_id']);
            $table->dropColumn(['operation_id', 'dinero_recibido', 'cambio']);
        });
    }
};
