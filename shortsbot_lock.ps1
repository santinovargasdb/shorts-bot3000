# Fila de trabajos de ShortsBot: deja correr UN solo job a la vez.
# Despues de un apagon, "StartWhenAvailable" dispara todas las tareas atrasadas juntas
# y en esta PC (Celeron, 8 GB) la satura. Cada run_*.bat llama a este script, que toma
# un mutex global antes de lanzar el comando; los demas esperan su turno.
# El mutex lo libera Windows solo si el proceso muere o se reinicia la PC (no queda trabado).
# Uso: powershell -NoProfile -File shortsbot_lock.ps1 python daily_post.py --channel x
$esperaMaxHoras = 12
$mutex = New-Object System.Threading.Mutex($false, 'Global\ShortsBotQueue')
$tomado = $false
try {
    $t0 = Get-Date
    try {
        $tomado = $mutex.WaitOne([TimeSpan]::FromHours($esperaMaxHoras))
    } catch [System.Threading.AbandonedMutexException] {
        # el job anterior murio sin soltarlo: el turno es nuestro igual
        $tomado = $true
    }
    if (-not $tomado) {
        Write-Output ("[{0:yyyy-MM-dd HH:mm}] [fila] espere {1}h sin turno, abandono" -f (Get-Date), $esperaMaxHoras)
        exit 2
    }
    $espera = [int]((Get-Date) - $t0).TotalSeconds
    if ($espera -ge 5) {
        Write-Output ("[{0:yyyy-MM-dd HH:mm}] [fila] espere {1}s por mi turno" -f (Get-Date), $espera)
    }
    $exe = $args[0]
    $resto = @()
    if ($args.Count -gt 1) { $resto = $args[1..($args.Count - 1)] }
    & $exe @resto
    exit $LASTEXITCODE
} finally {
    if ($tomado) { $mutex.ReleaseMutex() }
    $mutex.Dispose()
}
