<?php

namespace App\Support;

class SaleDiscountAllocator
{
    public static function allocate(int $discountCents, array $lineSubtotalCents): array
    {
        $subtotalCents = array_sum($lineSubtotalCents);
        if ($subtotalCents < 1 || $discountCents < 1) {
            return array_fill(0, count($lineSubtotalCents), 0);
        }

        $allocations = [];
        $allocatedCents = 0;
        $lastIndex = count($lineSubtotalCents) - 1;

        foreach ($lineSubtotalCents as $index => $lineCents) {
            $lineDiscount = $index === $lastIndex
                ? $discountCents - $allocatedCents
                : intdiv($discountCents * $lineCents, $subtotalCents);
            $allocations[] = $lineDiscount;
            $allocatedCents += $lineDiscount;
        }

        return $allocations;
    }
}
