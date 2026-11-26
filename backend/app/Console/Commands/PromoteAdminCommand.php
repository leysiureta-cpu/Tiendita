<?php

namespace App\Console\Commands;

use App\Models\Rol;
use App\Models\User;
use Illuminate\Console\Command;

class PromoteAdminCommand extends Command
{
    protected $signature = 'mini-super:promote-admin {email : Correo de una cuenta existente}';

    protected $description = 'Asigna el rol Administrador a una cuenta existente desde la consola';

    public function handle(): int
    {
        $email = mb_strtolower(trim((string) $this->argument('email')));
        $user = User::query()->where('correo', $email)->first();
        if (! $user) {
            $this->error('No existe una cuenta con ese correo. Regístrala primero como Cajero.');

            return self::FAILURE;
        }

        $adminRole = Rol::query()->where('nombre', 'Administrador')->first();
        if (! $adminRole) {
            $this->error('No está configurado el rol Administrador.');

            return self::FAILURE;
        }

        $user->update([
            'rol_id' => $adminRole->id,
            'estado' => true,
        ]);

        $this->info("Se asignó el rol Administrador a {$user->correo}.");

        return self::SUCCESS;
    }
}
