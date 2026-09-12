<?php

namespace App\Services;

use Illuminate\Support\Str;

class ReportExportFilenameGenerator
{
    public function generate(string $category, string $title, string $extension): string
    {
        $slug = Str::slug($category . ' ' . $title, '-');
        $timestamp = now()->format('YmdHis');

        return sprintf('%s-%s.%s', $slug, $timestamp, $extension);
    }
}
