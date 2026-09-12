<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Role extends Model
{
    use HasFactory;

    protected static function booted()
    {
        static::deleting(function (Role $role) {
            if ($role->is_system) {
                throw new \Exception('Cannot delete protected system role.');
            }
        });
        static::updating(function (Role $role) {
            if ($role->is_system && $role->isDirty('name')) {
                throw new \Exception('Cannot rename protected system role.');
            }
        });
    }

    protected $fillable = [
        'name',
        'description',
        'is_system',
    ];

    public function permissions(): BelongsToMany
    {
        return $this->belongsToMany(Permission::class, 'role_permission');
    }

    public function users(): BelongsToMany
    {
        return $this->belongsToMany(User::class);
    }
}
