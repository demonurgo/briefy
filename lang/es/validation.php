<?php

return [
    'accepted'         => 'El campo :attribute debe ser aceptado.',
    'confirmed'        => 'La confirmación de :attribute no coincide.',
    'current_password' => 'La contraseña actual es incorrecta.',
    'email'            => 'Ingresa un correo electrónico válido.',
    'max'              => [
        'string' => 'El campo :attribute no puede tener más de :max caracteres.',
    ],
    'min'              => [
        'string' => 'El campo :attribute debe tener al menos :min caracteres.',
    ],
    'password'         => [
        'letters'       => 'La contraseña debe contener al menos una letra.',
        'mixed'         => 'La contraseña debe contener letras mayúsculas y minúsculas.',
        'numbers'       => 'La contraseña debe contener al menos un número.',
        'symbols'       => 'La contraseña debe contener al menos un carácter especial.',
        'uncompromised' => 'Esta contraseña apareció en filtraciones de datos. Por favor elige otra.',
    ],
    'required'         => 'El campo :attribute es obligatorio.',
    'same'             => 'Los campos :attribute y :other deben coincidir.',
    'unique'           => 'Este :attribute ya está en uso.',
    'lowercase'        => 'El campo :attribute debe estar en minúsculas.',

    'attributes' => [
        'name'                  => 'nombre',
        'email'                 => 'correo electrónico',
        'password'              => 'contraseña',
        'password_confirmation' => 'confirmación de contraseña',
    ],
];
