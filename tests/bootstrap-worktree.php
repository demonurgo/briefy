<?php
/**
 * Bootstrap for parallel-executor worktree testing.
 *
 * The vendor/ directory in this worktree is a junction to the main project's vendor/,
 * which causes Composer's autoload_classmap.php $baseDir to resolve to the main project.
 * This bootstrap patches the Composer ClassLoader's classmap so all App\ classes resolve
 * from THIS worktree's app/ directory, not from the main project.
 */

$worktreeRoot = realpath(dirname(__DIR__));

// Load Composer autoloader — this registers the ClassLoader with the main project's classmap.
$loader = require $worktreeRoot . '/vendor/autoload.php';

// The vendor junction resolves (via realpath) to the main project's vendor/.
// We need the real path of the main project's app/ to compare against classmap entries.
$worktreeAppPath = $worktreeRoot . DIRECTORY_SEPARATOR . 'app';

// Read classmap and build overrides: any App\ class whose file exists in the worktree
// should be redirected to the worktree's copy.
$reflection = new ReflectionClass($loader);
$classmapProp = $reflection->getProperty('classMap');
$classmapProp->setAccessible(true);
$classmap = $classmapProp->getValue($loader);

$overrides = [];
foreach ($classmap as $class => $rawPath) {
    if (!str_starts_with($class, 'App\\')) {
        continue;
    }
    // Resolve the existing classmap path to its canonical form.
    $resolved = realpath($rawPath);
    if ($resolved === false) {
        continue;
    }
    // Extract the portion after /app/ (e.g. "/Models/Demand.php")
    // Works on both Windows and Unix by normalising separators.
    $normalised = str_replace('\\', '/', $resolved);
    $appMarker = '/app/';
    $appPos = strrpos($normalised, $appMarker);
    if ($appPos === false) {
        continue;
    }
    $relativeToApp = substr($normalised, $appPos + strlen($appMarker));
    $worktreePath = $worktreeAppPath . DIRECTORY_SEPARATOR
        . str_replace('/', DIRECTORY_SEPARATOR, $relativeToApp);
    if (file_exists($worktreePath)) {
        $overrides[$class] = $worktreePath;
    }
}

if (!empty($overrides)) {
    $loader->addClassMap($overrides);
}

return $loader;
