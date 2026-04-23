<?php
// (c) 2026 Briefy contributors — AGPL-3.0
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDemandRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string|max:5000',
            'objective'   => 'nullable|string|max:500',
            'tone'        => 'nullable|string|max:100',
            'channel'     => 'nullable|string|max:100',
            'deadline'    => 'nullable|date|after_or_equal:today',
            'status'      => 'sometimes|in:todo,in_progress,awaiting_feedback,in_review,approved',
            'type'        => 'sometimes|in:demand,planning',
            'assigned_to' => 'nullable|exists:users,id',
        ];
    }
}
