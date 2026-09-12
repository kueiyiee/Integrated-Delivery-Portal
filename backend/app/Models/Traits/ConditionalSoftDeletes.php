<?php

namespace App\Models\Traits;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use ReflectionClass;

trait ConditionalSoftDeletes
{
    use SoftDeletes {
        SoftDeletes::bootSoftDeletes as private bootSoftDeletesTrait;
        SoftDeletes::performDeleteOnModel as private traitPerformDeleteOnModel;
    }

    protected static function bootSoftDeletes(): void
    {
        if (static::hasDeletedAtColumn()) {
            static::bootSoftDeletesTrait();
        }
    }

    protected static function hasDeletedAtColumn(): bool
    {
        return Schema::hasColumn(static::getTableNameFromClass(), static::getDeletedAtColumnName());
    }

    protected static function getTableNameFromClass(): string
    {
        $reflection = new ReflectionClass(static::class);
        $properties = $reflection->getDefaultProperties();

        if (! empty($properties['table'])) {
            return $properties['table'];
        }

        return Str::snake(Str::pluralStudly(class_basename(static::class)));
    }

    protected static function getDeletedAtColumnName(): string
    {
        return defined(static::class.'::DELETED_AT') ? static::DELETED_AT : 'deleted_at';
    }

    public function newEloquentBuilder($query)
    {
        $builder = parent::newEloquentBuilder($query);

        if (! static::hasDeletedAtColumn()) {
            return $builder->withoutGlobalScope(SoftDeletingScope::class);
        }

        return $builder;
    }

    protected function performDeleteOnModel()
    {
        if (! static::hasDeletedAtColumn()) {
            return tap($this->setKeysForSaveQuery($this->newModelQuery())->delete(), function () {
                $this->exists = false;
            });
        }

        return $this->traitPerformDeleteOnModel();
    }
}
