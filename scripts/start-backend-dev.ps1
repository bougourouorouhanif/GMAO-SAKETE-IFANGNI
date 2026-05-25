$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$backend = Join-Path $root 'backend'

Set-Location $backend

$env:Path = 'C:\Program Files\nodejs;C:\Windows\System32;C:\Windows\System32\WindowsPowerShell\v1.0'
$env:NODE_ENV = 'development'
$env:JWT_SECRET = if ($env:JWT_SECRET) { $env:JWT_SECRET } else { 'dev-secret' }
$env:DATABASE_URL = if ($env:DATABASE_URL) { $env:DATABASE_URL } else { 'postgresql://postgres:postgres@localhost:5432/gmao_db?schema=public' }

$nodeCode = "import('./server.js'); setInterval(function(){}, 2147483647);"
& 'C:\Program Files\nodejs\node.exe' '--input-type=module' '-e' $nodeCode
