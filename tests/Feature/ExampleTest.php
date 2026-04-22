<?php

namespace Tests\Feature;

use Tests\TestCase;

class ExampleTest extends TestCase
{
    public function test_the_application_root_redirects(): void
    {
        $response = $this->get('/');
        $response->assertRedirect();
    }
}
