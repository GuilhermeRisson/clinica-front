<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'device_name' => ['nullable', 'string', 'max:255'],
        ]);

        $masterEmail = config('master.email');
        $masterPassword = config('master.password');
        $masterName = config('master.name', 'Master');

        if (! $masterEmail || ! $masterPassword) {
            return response()->json([
                'message' => 'Master credentials are not configured.',
            ], 500);
        }

        if ($data['email'] !== $masterEmail || $data['password'] !== $masterPassword) {
            throw ValidationException::withMessages([
                'email' => 'Credenciais invalidas.',
            ]);
        }

        $user = User::firstOrCreate(
            ['email' => $masterEmail],
            [
                'name' => $masterName,
                'password' => Hash::make($masterPassword),
            ]
        );

        if (! Hash::check($masterPassword, $user->password)) {
            $user->forceFill([
                'password' => Hash::make($masterPassword),
            ])->save();
        }

        $token = $user->createToken($data['device_name'] ?? 'master', ['master'])->plainTextToken;

        return [
            'token' => $token,
            'user' => $user,
        ];
    }

    public function me(Request $request)
    {
        return $request->user();
    }

    public function logout(Request $request)
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->noContent();
    }
}
