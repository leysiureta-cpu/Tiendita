<?php

namespace Database\Seeders;

use App\Models\PaymentMethod;
use Illuminate\Database\Seeder;

class PaymentMethodSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            ['code' => 'cash', 'name' => 'Efectivo'],
            ['code' => 'card', 'name' => 'Tarjeta'],
            ['code' => 'transfer', 'name' => 'Transferencia'],
        ] as $method) {
            PaymentMethod::firstOrCreate(
                ['code' => $method['code']],
                ['name' => $method['name'], 'is_active' => true],
            );
        }
    }
}
