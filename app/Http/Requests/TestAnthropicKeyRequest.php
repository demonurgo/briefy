<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class TestAnthropicKeyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'anthropic_api_key' => ['required', 'string', 'starts_with:sk-ant-', 'min:30', 'max:200'],
        ];
    }
}
