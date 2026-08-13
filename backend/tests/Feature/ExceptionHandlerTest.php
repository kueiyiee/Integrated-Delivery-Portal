<?php

namespace Tests\Feature;

use Illuminate\Contracts\Debug\ExceptionHandler;
use Tests\TestCase;

class ExceptionHandlerTest extends TestCase
{
    public function test_exception_handler_is_bound_to_application(): void
    {
        $this->assertTrue($this->app->bound(ExceptionHandler::class));
        $this->assertInstanceOf(\App\Exceptions\Handler::class, $this->app->make(ExceptionHandler::class));
    }
}
