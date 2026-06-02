$path = "c:\Users\MI\OneDrive\Desktop\koduvellisahitholsv\design-studio.html"
$content = [System.IO.File]::ReadAllText($path)

# Use single quotes to keep backticks literal!
$broken1 = 'alert(\Poster successfully sent to all \ WhatsApp targets!\);' + "`r`n" + '                } else {' + "`r`n" + '                    alert(\Poster sending complete. Sent successfully: \. Failed: \.\);'
$broken2 = 'alert(\Poster successfully sent to all \ WhatsApp targets!\);' + "`n" + '                } else {' + "`n" + '                    alert(\Poster sending complete. Sent successfully: \. Failed: \.\);'

$correctLF = 'alert(`Poster successfully sent to all ${successCount} WhatsApp targets!`);' + "`n" + '                } else {' + "`n" + '                    alert(`Poster sending complete. Sent successfully: ${successCount}. Failed: ${failCount}.`);'
$correctCRLF = 'alert(`Poster successfully sent to all ${successCount} WhatsApp targets!`);' + "`r`n" + '                } else {' + "`r`n" + '                    alert(`Poster sending complete. Sent successfully: ${successCount}. Failed: ${failCount}.`);'

if ($content.Contains($broken1)) {
    $content = $content.Replace($broken1, $correctCRLF)
    [System.IO.File]::WriteAllText($path, $content)
    Write-Host "Fixed CRLF version with literal backticks."
} elseif ($content.Contains($broken2)) {
    $content = $content.Replace($broken2, $correctLF)
    [System.IO.File]::WriteAllText($path, $content)
    Write-Host "Fixed LF version with literal backticks."
} else {
    Write-Host "ERROR: Broken pattern not found."
    # Let's print around the line
    $lines = Get-Content -Path $path
    for ($i = 0; $i -lt $lines.Length; $i++) {
        if ($lines[$i] -like "*Poster successfully sent*") {
            Write-Host "Line $i : '$($lines[$i])'"
            Write-Host "Line $($i+1) : '$($lines[$i+1])'"
            Write-Host "Line $($i+2) : '$($lines[$i+2])'"
        }
    }
}
