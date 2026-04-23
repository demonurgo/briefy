<?php
namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateClientRequest extends FormRequest
{
    public function authorize(): bool { return true; }

    public function rules(): array
    {
        return [
            'name'             => 'required|string|max:255',
            'segment'          => 'nullable|string|max:100',
            'channels'         => 'nullable|array',
            'channels.*'       => 'string|max:50',
            'tone_of_voice'    => 'nullable|string|max:1000',
            'target_audience'  => 'nullable|string|max:1000',
            'brand_references' => 'nullable|string|max:1000',
            'briefing'         => 'nullable|string|max:5000',
            'avatar'           => 'nullable|image|max:2048',
            'monthly_posts'       => 'nullable|integer|min:0|max:200',
            'monthly_plan_notes'  => 'nullable|string|max:1000',
            'planning_day'        => 'nullable|integer|min:1|max:31',
            'social_handles'      => 'nullable|array',
            'social_handles.*'    => 'string|max:255',
        ];
    }
}
