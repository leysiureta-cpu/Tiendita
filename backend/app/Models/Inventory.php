<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Inventory extends Model
{
    protected $table = 'inventory';

    protected $fillable = ['product_id', 'quantity', 'low_stock_threshold'];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }
}
