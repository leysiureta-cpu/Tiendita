<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

# Backend de Mini Súper

Este directorio contiene el backend Laravel, separado de `mi-aplicacion/`; no modifica el frontend React/Vite.

## Configuración de Mini Súper

Requiere PHP 8.3 o posterior con `pdo_mysql`, Composer, MySQL de XAMPP en ejecución y la base `mini_super` creada. Desde esta carpeta, crea `backend/.env` a partir de `.env.example` si todavía no existe y revisa sus variables `DB_*`. El archivo `backend/.env` está excluido de Git; no publiques sus credenciales.

```powershell
Copy-Item .env.example .env
php artisan key:generate
```

Composer crea `.env` y la clave de aplicación al instalar el proyecto. No regeneres la clave si ya existe.
Antes de ejecutar los seeders de prueba, configura `TEST_USERS_PASSWORD` en `.env` con una contraseña privada de al menos 12 caracteres.

Antes de migrar, revisa el estado:

```powershell
php artisan migrate:status
```

Aplica migraciones pendientes y carga los datos de referencia:

```powershell
php artisan migrate
```

Los seeders son repetibles: no duplican roles, permisos, métodos de pago, categorías ni productos, ni reemplazan existencias guardadas. No uses `migrate:fresh` ni `db:wipe`, que eliminan tablas o datos.

## Datos de prueba de usuarios y ventas

Para crear cuentas y ventas de prueba, configura `TEST_USERS_PASSWORD` en `backend/.env` con una contraseña privada de al menos 12 caracteres. Los seeders solo funcionan con `APP_ENV=local` o `testing`; no se incluye una contraseña predeterminada en el código.

```powershell
php artisan db:seed --class=TestUsersSeeder
php artisan db:seed --class=TestSalesSeeder
```

También puedes ejecutar `php artisan db:seed` para correr todos los seeders. Se crean tres usuarios con los roles existentes y tres ventas con tres productos cada una, a partir de los SKU, precios, métodos de pago y relaciones existentes. Los totales se calculan desde el precio actual de cada producto. Las ventas de prueba no cambian las cantidades de inventario y se pueden volver a sembrar sin duplicar usuarios, ventas o detalles. La contraseña configurada solo se aplica al crear las cuentas inicialmente; volver a sembrar no restablece contraseñas existentes.

<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## About Laravel

Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects, such as:

- [Simple, fast routing engine](https://laravel.com/docs/routing).
- [Powerful dependency injection container](https://laravel.com/docs/container).
- Multiple back-ends for [session](https://laravel.com/docs/session) and [cache](https://laravel.com/docs/cache) storage.
- Expressive, intuitive [database ORM](https://laravel.com/docs/eloquent).
- Database agnostic [schema migrations](https://laravel.com/docs/migrations).
- [Robust background job processing](https://laravel.com/docs/queues).
- [Real-time event broadcasting](https://laravel.com/docs/broadcasting).

Laravel is accessible, powerful, and provides tools required for large, robust applications.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework.

In addition, [Laracasts](https://laracasts.com) contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

You can also watch bite-sized lessons with real-world projects on [Laravel Learn](https://laravel.com/learn), where you will be guided through building a Laravel application from scratch while learning PHP fundamentals.

## Agentic Development

Laravel's predictable structure and conventions make it ideal for AI coding agents like Claude Code, Cursor, and GitHub Copilot. Install [Laravel Boost](https://laravel.com/docs/ai) to supercharge your AI workflow:

```bash
composer require laravel/boost --dev

php artisan boost:install
```

Boost provides your agent 15+ tools and skills that help agents build Laravel applications while following best practices.

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
