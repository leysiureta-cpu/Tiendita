<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use RuntimeException;

class TestUsersSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new RuntimeException('Las cuentas de prueba solo se pueden crear en local o testing.');
        }

        $password = config('app.test_users_password');
        if (! is_string($password) || strlen($password) < 12) {
            throw new RuntimeException('Configura TEST_USERS_PASSWORD con al menos 12 caracteres en backend/.env.');
        }

        $users = [
            [
                'name' => 'Administrador de prueba',
                'email' => 'test.admin@mini-super.test',
                'role' => 'administrator',
            ],
            [
                'name' => 'Cajero de prueba',
                'email' => 'test.cashier@mini-super.test',
                'role' => 'cashier',
            ],
            [
                'name' => 'Encargado de inventario de prueba',
                'email' => 'test.inventory@mini-super.test',
                'role' => 'inventory_manager',
            ],
        ];

        foreach ($users as $userData) {
            if (! Role::where('name', $userData['role'])->exists()) {
                throw new RuntimeException("Falta el rol requerido: {$userData['role']}.");
            }
        }

        DB::transaction(function () use ($users, $password): void {
            foreach ($users as $userData) {
                $user = User::firstOrCreate(
                    ['email' => $userData['email']],
                    [
                        'name' => $userData['name'],
                        'password' => Hash::make($password),
                    ],
                );

                $role = Role::where('name', $userData['role'])->firstOrFail();
                $user->roles()->syncWithoutDetaching([$role->id]);
            }
        });
    }
}
