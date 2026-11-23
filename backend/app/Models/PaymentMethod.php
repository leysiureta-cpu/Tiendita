<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PaymentMethod extends Model
{
    protected $fillable = ['code', 'name', 'is_active'];

    public function sales(): HasMany
    {
        return $this->hasMany(Sale::class);
    }
}
