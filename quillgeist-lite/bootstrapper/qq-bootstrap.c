#define UNICODE
#define _UNICODE
#include <windows.h>
#include <urlmon.h>
#include <stdio.h>
#include <wchar.h>

#pragma comment(lib, "urlmon.lib")
#pragma comment(lib, "user32.lib")
#pragma comment(lib, "shell32.lib")

static void show_error(const wchar_t* msg) {
    MessageBoxW(NULL, msg, L"Clintware QQ", MB_OK | MB_ICONERROR);
}

int WINAPI wWinMain(HINSTANCE hInst, HINSTANCE hPrev, PWSTR cmd, int show) {
    wchar_t tempPath[MAX_PATH + 1] = {0};
    wchar_t scriptPath[MAX_PATH + 1] = {0};
    wchar_t url[1024] = {0};
    wchar_t command[4096] = {0};

    DWORD n = GetTempPathW(MAX_PATH, tempPath);
    if (n == 0 || n > MAX_PATH) {
        show_error(L"Could not resolve the Windows temporary directory.");
        return 2;
    }

    swprintf_s(scriptPath, MAX_PATH, L"%sClintware-QQ-%lu.ps1", tempPath, GetCurrentProcessId());
    swprintf_s(
        url,
        1024,
        L"https://raw.githubusercontent.com/clintkosh/clintware-site/main/quillgeist-lite/bootstrapper/bootstrap.ps1?cb=%llu",
        (unsigned long long)GetTickCount64()
    );

    HRESULT hr = URLDownloadToFileW(NULL, url, scriptPath, 0, NULL);
    if (FAILED(hr)) {
        wchar_t buf[512];
        swprintf_s(buf, 512, L"Could not download the maintained Clintware QQ bootstrap.\n\nHRESULT: 0x%08X", (unsigned int)hr);
        show_error(buf);
        return 3;
    }

    swprintf_s(
        command,
        4096,
        L"powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File \"%s\"",
        scriptPath
    );

    STARTUPINFOW si;
    PROCESS_INFORMATION pi;
    ZeroMemory(&si, sizeof(si));
    ZeroMemory(&pi, sizeof(pi));
    si.cb = sizeof(si);

    BOOL ok = CreateProcessW(
        NULL,
        command,
        NULL,
        NULL,
        FALSE,
        CREATE_NEW_CONSOLE,
        NULL,
        NULL,
        &si,
        &pi
    );

    if (!ok) {
        DeleteFileW(scriptPath);
        show_error(L"Could not start PowerShell for the Clintware QQ bootstrap.");
        return 4;
    }

    WaitForSingleObject(pi.hProcess, INFINITE);

    DWORD exitCode = 1;
    GetExitCodeProcess(pi.hProcess, &exitCode);
    CloseHandle(pi.hThread);
    CloseHandle(pi.hProcess);
    DeleteFileW(scriptPath);

    if (exitCode == 0) {
        MessageBoxW(
            NULL,
            L"QQ is installed and connected.\n\nSingleton launch and duplicate-window protection are enabled.\nThe local runner will remain available through the Clintware control plane.",
            L"Clintware QQ Ready",
            MB_OK | MB_ICONINFORMATION
        );
        return 0;
    }

    wchar_t buf[512];
    swprintf_s(
        buf,
        512,
        L"QQ installation did not complete.\n\nExit code: %lu\nCheck %%LOCALAPPDATA%%\\Clintware\\QuillgeistLite\\portable-installer.log",
        exitCode
    );
    show_error(buf);
    return (int)exitCode;
}
