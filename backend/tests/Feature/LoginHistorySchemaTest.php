<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class LoginHistorySchemaTest extends TestCase
{
    public function test_login_histories_table_exists(): void
    {
        $this->assertTrue(Schema::hasTable('login_histories'));
    }
}
