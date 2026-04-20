param(
    [string]$OutputFile = "project_export.txt"
)

$ErrorActionPreference = "Stop"

# =========================================================
# RWK project export configuration
# =========================================================

$coreFiles = @(
    "index.html",
    "style.css",
    "app.js",
    "main.js",
    "workspace.html",
    "workspace.js"
)

$extraFiles = @(
    "env.example",
    ".gitignore",
    "data\origins.json"
)

$includePatterns = @(
    "config\*.js",
    "data\*.js",
    "docs\*.md",
    "engine\*.js",
    "map\*.js",
    "routing\*.js",
    "state\*.js",
    "ui\*.js",
    "workspace\*.js"
)

# =========================================================
# Helper functions
# =========================================================

function Resolve-ProjectFiles {
    param(
        [string[]]$DirectFiles,
        [string[]]$Patterns,
        [string]$ProjectRoot,
        [string]$OutputFullPath
    )

    $resolved = New-Object System.Collections.Generic.List[string]

    foreach ($file in $DirectFiles) {
        if ([string]::IsNullOrWhiteSpace($file)) {
            continue
        }

        $candidatePath = Join-Path $ProjectRoot $file

        if (Test-Path -LiteralPath $candidatePath) {
            $fullPath = (Resolve-Path -LiteralPath $candidatePath).Path

            if ($fullPath -eq $OutputFullPath) {
                continue
            }

            if (-not $resolved.Contains($fullPath)) {
                $resolved.Add($fullPath)
            }
        }
        else {
            Write-Host "Skipping missing file: $file" -ForegroundColor Yellow
        }
    }

    foreach ($pattern in $Patterns) {
        if ([string]::IsNullOrWhiteSpace($pattern)) {
            continue
        }

        $patternPath = Join-Path $ProjectRoot $pattern
        $matched = Get-ChildItem -Path $patternPath -File -ErrorAction SilentlyContinue | Sort-Object FullName

        foreach ($item in $matched) {
            $fullPath = $item.FullName

            if ($fullPath -eq $OutputFullPath) {
                continue
            }

            if (-not $resolved.Contains($fullPath)) {
                $resolved.Add($fullPath)
            }
        }
    }

    return $resolved
}

function Get-RelativeProjectPath {
    param(
        [string]$BasePath,
        [string]$FullPath
    )

    $baseUri = New-Object System.Uri(($BasePath.TrimEnd('\') + '\'))
    $fileUri = New-Object System.Uri($FullPath)
    $relativeUri = $baseUri.MakeRelativeUri($fileUri)

    return [System.Uri]::UnescapeDataString($relativeUri.ToString()).Replace('/', '\')
}

function New-Utf8StreamWriter {
    param(
        [string]$Path
    )

    $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
    return New-Object System.IO.StreamWriter($Path, $false, $utf8NoBom)
}

function Write-ExportLine {
    param(
        [System.IO.StreamWriter]$Writer,
        [string]$Text = ""
    )

    $Writer.WriteLine($Text)
}

# =========================================================
# Resolve paths and build export list
# =========================================================

$projectRoot = (Get-Location).Path
$outputFullPath = Join-Path $projectRoot $OutputFile
$allRequestedFiles = @($coreFiles + $extraFiles)

$filesToExport = Resolve-ProjectFiles `
    -DirectFiles $allRequestedFiles `
    -Patterns $includePatterns `
    -ProjectRoot $projectRoot `
    -OutputFullPath $outputFullPath

# =========================================================
# Write output
# =========================================================

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

$headerLines = @(
    "RWK Project Export",
    "Generated: $timestamp",
    "Project Root: $projectRoot",
    "File Count: $($filesToExport.Count)",
    "",
    "============================================================",
    ""
)

$writer = $null

try {
    $writer = New-Utf8StreamWriter -Path $outputFullPath

    foreach ($line in $headerLines) {
        Write-ExportLine -Writer $writer -Text $line
    }

    foreach ($filePath in $filesToExport) {
        $relativePath = Get-RelativeProjectPath -BasePath $projectRoot -FullPath $filePath

        Write-ExportLine -Writer $writer -Text "===== $relativePath ====="
        Write-ExportLine -Writer $writer -Text ""

        $content = Get-Content -LiteralPath $filePath -Raw -ErrorAction Stop

        if (-not [string]::IsNullOrEmpty($content)) {
            $writer.Write($content)
        }

        Write-ExportLine -Writer $writer -Text ""
        Write-ExportLine -Writer $writer -Text ""
    }
}
catch {
    Write-Host "Export failed: $($_.Exception.Message)" -ForegroundColor Red
    throw
}
finally {
    if ($null -ne $writer) {
        $writer.Flush()
        $writer.Close()
        $writer.Dispose()
    }
}

Write-Host "Export complete: $outputFullPath" -ForegroundColor Green
Write-Host "Files exported: $($filesToExport.Count)" -ForegroundColor Cyan