<?php

namespace Tests\Feature;

use App\Models\Rol;
use App\Models\User;
use Database\Seeders\RolSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ProfilePreferencesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolSeeder::class);
        $this->withHeader('Origin', 'http://127.0.0.1:5173');
        Storage::fake('public');
    }

    public function test_cashier_and_administrator_keep_independent_profiles_preferences_and_photos(): void
    {
        $cashier = $this->createUser('Cajero', 'cashier@example.test');
        $administrator = $this->createUser('Administrador', 'admin@example.test');

        $this->actingAs($cashier);
        $this->patchJson('/api/profile', [
            'username' => 'Cajera Ana',
        ])->assertOk()
            ->assertJsonPath('user.username', 'Cajera Ana');
        $this->post('/api/profile/preferences', [
            'theme' => 'dark',
            'palette' => 'blue',
            'photoCrop' => ['x' => -12.5, 'y' => -22.5, 'zoom' => 1.4],
            'photo' => $this->pngFile('ana.png'),
        ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('preferences.theme', 'dark')
            ->assertJsonPath('preferences.palette', 'blue')
            ->assertJsonPath('preferences.photoCrop.zoom', 1.4);
        $cashierProfile = $this->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('user.username', 'Cajera Ana')
            ->assertJsonPath('user.preferences.theme', 'dark')
            ->assertJsonPath('user.preferences.palette', 'blue')
            ->json('user');

        $this->actingAs($administrator);
        $this->patchJson('/api/profile', [
            'username' => 'Dueña Marta',
        ])->assertOk()
            ->assertJsonPath('user.username', 'Dueña Marta');
        $this->post('/api/profile/preferences', [
            'theme' => 'light',
            'palette' => 'green',
            'photoCrop' => ['x' => -4, 'y' => -8, 'zoom' => 2],
            'photo' => $this->pngFile('marta.png'),
        ], ['Accept' => 'application/json'])
            ->assertOk()
            ->assertJsonPath('preferences.theme', 'light')
            ->assertJsonPath('preferences.palette', 'green');
        $administratorProfile = $this->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('user.username', 'Dueña Marta')
            ->assertJsonPath('user.preferences.theme', 'light')
            ->assertJsonPath('user.preferences.palette', 'green')
            ->json('user');

        $cashier->refresh();
        $administrator->refresh();
        $this->assertNotSame($cashier->foto_perfil, $administrator->foto_perfil);
        Storage::disk('public')->assertExists($cashier->foto_perfil);
        Storage::disk('public')->assertExists($administrator->foto_perfil);
        $this->assertNotSame(
            $cashierProfile['preferences']['profilePhoto'],
            $administratorProfile['preferences']['profilePhoto'],
        );

        $this->postJson('/api/logout')->assertOk();
        Auth::forgetGuards();
        $this->postJson('/api/login', [
            'correo' => 'cashier@example.test',
            'password' => 'una-clave-segura',
        ])->assertOk()
            ->assertJsonPath('user.username', 'Cajera Ana')
            ->assertJsonPath('user.preferences.theme', 'dark')
            ->assertJsonPath('user.preferences.palette', 'blue')
            ->assertJsonPath('user.preferences.profilePhoto', $cashierProfile['preferences']['profilePhoto']);

        $this->actingAs($cashier);
        $this->patchJson('/api/profile', [
            'username' => 'Intento ajeno',
            'user_id' => $administrator->id,
        ])->assertUnprocessable();
        $this->patchJson('/api/profile/preferences', [
            'theme' => 'purple',
            'user_id' => $administrator->id,
        ])->assertUnprocessable();
        $this->post('/api/profile/preferences', [
            'user_id' => $administrator->id,
            'photo' => $this->pngFile('spoof.png'),
        ], ['Accept' => 'application/json'])->assertUnprocessable();

        $this->getJson('/api/user')
            ->assertJsonPath('user.username', 'Cajera Ana')
            ->assertJsonPath('user.preferences.theme', 'dark')
            ->assertJsonPath('user.preferences.palette', 'blue');

        $this->deleteJson('/api/profile/photo')
            ->assertOk()
            ->assertJsonPath('preferences.profilePhoto', null)
            ->assertJsonPath('preferences.palette', 'blue');
        Storage::disk('public')->assertMissing($cashier->foto_perfil);

        $this->postJson('/api/logout')->assertOk();
        Auth::forgetGuards();
        $this->postJson('/api/login', [
            'correo' => 'admin@example.test',
            'password' => 'una-clave-segura',
        ])->assertOk()
            ->assertJsonPath('user.username', 'Dueña Marta')
            ->assertJsonPath('user.preferences.theme', 'light')
            ->assertJsonPath('user.preferences.palette', 'green')
            ->assertJsonPath('user.preferences.profilePhoto', $administratorProfile['preferences']['profilePhoto']);
    }

    public function test_profile_photo_rejects_unsupported_formats_and_files_over_the_limit(): void
    {
        $user = $this->createUser('Cajero', 'cashier@example.test');
        $this->actingAs($user);

        $this->post('/api/profile/preferences', [
            'photo' => UploadedFile::fake()->create('avatar.svg', 20, 'image/svg+xml'),
        ], ['Accept' => 'application/json'])->assertUnprocessable();

        $this->post('/api/profile/preferences', [
            'photo' => $this->pngFile('large.png', 300),
        ], ['Accept' => 'application/json'])->assertUnprocessable();

        $this->assertDatabaseHas('usuarios', [
            'id' => $user->id,
            'foto_perfil' => null,
        ]);
        $this->assertSame([], Storage::disk('public')->allFiles('profile-photos'));
    }

    public function test_theme_palette_and_photo_crop_values_are_validated(): void
    {
        $user = $this->createUser('Administrador', 'admin@example.test');
        $this->actingAs($user);

        $this->patchJson('/api/profile/preferences', ['theme' => 'neon'])->assertUnprocessable();
        $this->patchJson('/api/profile/preferences', ['palette' => 'unknown'])->assertUnprocessable();
        $this->patchJson('/api/profile/preferences', [
            'photoCrop' => ['x' => -9000, 'y' => 0, 'zoom' => 4],
        ])->assertUnprocessable();
    }

    private function createUser(string $roleName, string $email): User
    {
        return User::query()->create([
            'nombre' => ucfirst(strstr($email, '@', true)),
            'correo' => $email,
            'password' => 'una-clave-segura',
            'rol_id' => Rol::query()->where('nombre', $roleName)->value('id'),
            'estado' => true,
        ]);
    }

    private function pngFile(string $name, int $paddingKilobytes = 0): UploadedFile
    {
        $image = base64_decode(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADUlEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC',
            true,
        );
        if (! is_string($image)) {
            throw new \RuntimeException('The embedded PNG test image is invalid.');
        }

        return UploadedFile::fake()->createWithContent(
            $name,
            $image.str_repeat("\0", $paddingKilobytes * 1024),
        );
    }
}
