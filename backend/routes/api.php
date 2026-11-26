<?php

use App\Http\Controllers\AdminUserController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\CatalogController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\SalesController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:5,1');
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:6,1');

Route::middleware(['auth:sanctum', 'active'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::patch('/profile', [AuthController::class, 'updateProfile']);
    Route::patch('/profile/preferences', [AuthController::class, 'updatePreferences']);
    Route::post('/profile/preferences', [AuthController::class, 'updatePreferences']);
    Route::delete('/profile/photo', [AuthController::class, 'deleteProfilePhoto']);

    Route::get('/dashboard', DashboardController::class);
    Route::get('/products', [CatalogController::class, 'products']);
    Route::get('/categories', [CatalogController::class, 'categories']);
    Route::get('/inventory', [InventoryController::class, 'index']);
    Route::get('/sales', [SalesController::class, 'index']);
    Route::post('/sales', [SalesController::class, 'store']);
    Route::get('/sales/{sale}', [SalesController::class, 'show']);

    Route::middleware('role:Administrador')->group(function () {
        Route::get('/inventory/movements', [InventoryController::class, 'movements']);
        Route::post('/inventory/movements', [InventoryController::class, 'storeMovement']);
        Route::get('/users/count', [AuthController::class, 'userCount']);
        Route::get('/reports/sales', [ReportController::class, 'sales']);

        Route::post('/products', [CatalogController::class, 'storeProduct']);
        Route::put('/products/{product}', [CatalogController::class, 'updateProduct']);
        Route::delete('/products/{product}', [CatalogController::class, 'deleteProduct']);

        Route::post('/categories', [CatalogController::class, 'storeCategory']);
        Route::put('/categories/{category}', [CatalogController::class, 'updateCategory']);
        Route::delete('/categories/{category}', [CatalogController::class, 'deleteCategory']);

        Route::get('/admin/roles', [AdminUserController::class, 'roles']);
        Route::get('/admin/users', [AdminUserController::class, 'index']);
        Route::post('/admin/users', [AdminUserController::class, 'store']);
        Route::patch('/admin/users/{user}', [AdminUserController::class, 'update']);

        Route::get('/admin/employees', [AdminUserController::class, 'employees']);
        Route::post('/admin/employees', [AdminUserController::class, 'storeEmployee']);
        Route::get('/admin/employees/{user}', [AdminUserController::class, 'showEmployee']);
        Route::patch('/admin/employees/{user}', [AdminUserController::class, 'updateEmployee']);
    });
});
