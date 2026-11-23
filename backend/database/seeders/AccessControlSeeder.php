<?php

namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class AccessControlSeeder extends Seeder
{
    public function run(): void
    {
        $permissions = [
            'products.view' => 'Consultar productos',
            'products.manage' => 'Administrar productos',
            'inventory.view' => 'Consultar inventario',
            'inventory.manage' => 'Administrar inventario',
            'sales.view' => 'Consultar ventas',
            'sales.create' => 'Registrar ventas',
            'purchases.view' => 'Consultar compras',
            'purchases.create' => 'Registrar compras',
            'customers.manage' => 'Administrar clientes',
            'suppliers.manage' => 'Administrar proveedores',
            'users.manage' => 'Administrar usuarios',
            'reports.view' => 'Consultar reportes',
        ];

        foreach ($permissions as $name => $label) {
            Permission::firstOrCreate(['name' => $name], ['label' => $label]);
        }

        $roles = [
            'administrator' => [
                'label' => 'Administrador',
                'permissions' => array_keys($permissions),
            ],
            'cashier' => [
                'label' => 'Cajero',
                'permissions' => [
                    'products.view',
                    'inventory.view',
                    'sales.view',
                    'sales.create',
                    'customers.manage',
                ],
            ],
            'inventory_manager' => [
                'label' => 'Encargado de inventario',
                'permissions' => [
                    'products.view',
                    'products.manage',
                    'inventory.view',
                    'inventory.manage',
                    'purchases.view',
                    'purchases.create',
                    'suppliers.manage',
                ],
            ],
        ];

        foreach ($roles as $name => $roleData) {
            $role = Role::firstOrCreate(
                ['name' => $name],
                ['label' => $roleData['label']],
            );
            $permissionIds = Permission::whereIn('name', $roleData['permissions'])->pluck('id');
            $role->permissions()->syncWithoutDetaching($permissionIds);
        }
    }
}
