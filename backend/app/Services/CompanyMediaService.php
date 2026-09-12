<?php

namespace App\Services;

use App\Models\Company;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CompanyMediaService
{
    /**
     * Supported permanent logo formats for organization branding.
     */
    public const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];

    public function uploadLogo(Company $company, UploadedFile $file): array
    {
        $validatedFile = $this->validateImageFile($file);
        $disk = $this->resolveDisk();
        $previousPath = $this->getCurrentLogoPath($company);

        $path = $this->storeFile($company, $validatedFile, $disk);
        $url = $this->buildPersistentUrl($disk, $path);

        $metadata = $company->metadata ?? [];
        $metadata['company_logo_path'] = $path;
        $metadata['company_logo_url'] = $url;

        if ($previousPath && $previousPath !== $path && Storage::disk($disk)->exists($previousPath)) {
            Storage::disk($disk)->delete($previousPath);
        }

        return $metadata;
    }

    public function saveLogoUrl(Company $company, string $logoUrl): array
    {
        $normalizedUrl = $this->normalizeLogoUrl($logoUrl);
        $metadata = is_array($company->metadata) ? $company->metadata : [];
        $metadata['company_logo_url'] = $normalizedUrl;
        unset($metadata['company_logo_path']);

        $company->metadata = $metadata;

        return $metadata;
    }

    public function getLogoUrl(Company $company): ?string
    {
        $metadata = $company->metadata ?? [];
        $savedUrl = $metadata['company_logo_url'] ?? null;
        $savedPath = $metadata['company_logo_path'] ?? null;

        if (is_string($savedUrl) && $savedUrl !== '') {
            return $savedUrl;
        }

        if (is_string($savedPath) && $savedPath !== '') {
            return $this->buildPersistentUrl($this->resolveDisk(), $savedPath);
        }

        return null;
    }

    public function deleteLogo(Company $company): array
    {
        $disk = $this->resolveDisk();
        $metadata = $company->metadata ?? [];
        $path = $metadata['company_logo_path'] ?? null;

        if (is_string($path) && $path !== '' && Storage::disk($disk)->exists($path)) {
            Storage::disk($disk)->delete($path);
        }

        unset($metadata['company_logo_path'], $metadata['company_logo_url']);

        return $metadata;
    }

    protected function normalizeLogoUrl(string $logoUrl): string
    {
        $trimmed = trim($logoUrl);

        if ($trimmed === '') {
            throw new \InvalidArgumentException('The logo URL cannot be empty.');
        }

        if (! filter_var($trimmed, FILTER_VALIDATE_URL)) {
            throw new \InvalidArgumentException('Please enter a valid direct logo URL.');
        }

        $scheme = strtolower(parse_url($trimmed, PHP_URL_SCHEME) ?? '');
        if (! in_array($scheme, ['http', 'https'], true)) {
            throw new \InvalidArgumentException('Logo URL must start with http:// or https://.');
        }

        return $trimmed;
    }

    protected function validateImageFile(UploadedFile $file): UploadedFile
    {
        $extension = strtolower($file->getClientOriginalExtension() ?: pathinfo($file->getClientOriginalName(), PATHINFO_EXTENSION) ?: 'png');

        if (! in_array($extension, self::ALLOWED_EXTENSIONS, true)) {
            throw new \InvalidArgumentException('The uploaded logo must be a JPG, PNG, or WebP image.');
        }

        $mime = $file->getMimeType();
        $realPath = $file->getRealPath();
        $isImage = ($mime && str_starts_with($mime, 'image/')) || ($realPath && @getimagesize($realPath) !== false);

        if (! $isImage) {
            throw new \InvalidArgumentException('The uploaded logo is not a valid image file.');
        }

        if ($file->getSize() > 10 * 1024 * 1024) {
            throw new \InvalidArgumentException('The logo must be smaller than 10MB.');
        }

        return $file;
    }

    protected function storeFile(Company $company, UploadedFile $file, string $disk): string
    {
        $directory = 'company_logos';
        $name = sprintf('%s-%s.%s', $company->id ?: 'company', Str::uuid()->toString(), strtolower($file->getClientOriginalExtension() ?: 'png'));
        $path = $file->storeAs($directory, $name, $disk);

        if (! is_string($path) || $path === '') {
            throw new \RuntimeException('Unable to persist the company logo.');
        }

        return $path;
    }

    protected function resolveDisk(): string
    {
        $disk = env('FILESYSTEM_DISK', config('filesystems.default', 'public'));

        return in_array($disk, ['public', 's3', 'local'], true) ? $disk : 'public';
    }

    protected function getCurrentLogoPath(Company $company): ?string
    {
        $metadata = $company->metadata ?? [];
        $path = $metadata['company_logo_path'] ?? null;

        return is_string($path) && $path !== '' ? $path : null;
    }

    protected function buildPersistentUrl(string $disk, string $path): string
    {
        $url = Storage::disk($disk)->url($path);

        if (is_string($url) && $url !== '') {
            return $url;
        }

        $base = trim((string) (env('MEDIA_BASE_URL') ?: config('app.url') ?: config('app.frontend_url') ?: ''));
        if ($base !== '') {
            return rtrim($base, '/').'/storage/'.ltrim($path, '/');
        }

        return '/storage/'.ltrim($path, '/');
    }
}
