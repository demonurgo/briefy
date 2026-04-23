<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class RedesignItemRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'feedback' => ['required', 'string', 'min:5', 'max:1000'],
        ];
    }
}
