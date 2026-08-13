<?php

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\RouteServiceProvider as ServiceProvider;
use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Cache\RateLimiting\Limit;

class RouteServiceProvider extends ServiceProvider
{
    public const HOME = '/';

    public function boot(): void
    {
        $this->configureRateLimiting();

        // Explicit binding for {company} route parameter to support id, uuid, or slug
        \Illuminate\Support\Facades\Route::bind('company', function ($value) {
            if (is_numeric($value)) {
                return \App\Models\Company::find($value);
            }

            return \App\Models\Company::where('uuid', $value)
                ->orWhere('slug', $value)
                ->first();
        });

        $this->routes(function (): void {
            Route::middleware('api')
                ->prefix('api')
                ->group(base_path('routes/api.php'));

            Route::middleware('web')
                ->group(base_path('routes/web.php'));
        });
    }

    protected function configureRateLimiting(): void
    {
        RateLimiter::for('api', function (Request $request) {
            $identifier = optional($request->user())->id ?: $request->ip();
            return Limit::perMinute(60)->by($identifier);
        });

        RateLimiter::for('login', function (Request $request) {
            $email = (string) $request->input('email');
            $key = 'login|'.$email.'|'.$request->ip();

            return Limit::perMinute(10)->by($key);
        });
    }
}
