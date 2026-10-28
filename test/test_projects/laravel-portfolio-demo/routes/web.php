<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('Welcome', [
        'canLogin' => true,
        'canRegister' => true,
        'laravelVersion' => '11.0.0',
        'phpVersion' => '8.2.0',
    ]);
});

Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->name('dashboard');

Route::get('/login', function () {
    return Inertia::render('Auth/Login');
})->name('login');

Route::get('/landing', function () {
    return view('landing');
})->name('landing');
