#pragma once

#include <Windows.h>
#include <TlHelp32.h>
#include <string>
#include <vector>
#include <iostream>
#include <iomanip>
#include <sstream>
#include <functional>
#include <thread>
#include <atomic>
#include <mutex>
#include <map>
#include <set>

// Pattern scanning result
struct ScanResult {
    uintptr_t address;
    std::vector<BYTE> bytes;
};

// Memory region information
struct MemoryRegion {
    uintptr_t start;
    uintptr_t end;
    DWORD protection;
    bool isExecutable;
    bool isReadable;
    bool isWritable;
    std::string moduleName;
};

class MemoryScanner {
public:
    MemoryScanner(DWORD processId = 0) : m_processId(processId), m_processHandle(NULL) {
        if (m_processId) {
            Open();
        }
    }
    
    ~MemoryScanner() {
        Close();
    }
    
    // Open a process by ID
    bool Open(DWORD processId = 0) {
        if (processId != 0) {
            m_processId = processId;
        }
        
        if (m_processId == 0) {
            std::cerr << "No process ID specified" << std::endl;
            return false;
        }
        
        // Close any existing handle
        Close();
        
        // Open the process with required access rights
        m_processHandle = OpenProcess(PROCESS_VM_READ | PROCESS_VM_WRITE | PROCESS_VM_OPERATION | PROCESS_QUERY_INFORMATION, FALSE, m_processId);
        
        if (m_processHandle == NULL) {
            std::cerr << "Failed to open process. Error code: " << GetLastError() << std::endl;
            return false;
        }
        
        return true;
    }
    
    // Close the process handle
    void Close() {
        if (m_processHandle != NULL) {
            CloseHandle(m_processHandle);
            m_processHandle = NULL;
        }
    }
    
    // Get a list of all memory regions in the process
    std::vector<MemoryRegion> GetMemoryRegions() {
        std::vector<MemoryRegion> regions;
        
        if (m_processHandle == NULL) {
            std::cerr << "Process not open" << std::endl;
            return regions;
        }
        
        // Get a map of loaded modules
        std::map<uintptr_t, std::string> moduleMap;
        HANDLE hSnapshot = CreateToolhelp32Snapshot(TH32CS_SNAPMODULE | TH32CS_SNAPMODULE32, m_processId);
        
        if (hSnapshot != INVALID_HANDLE_VALUE) {
            MODULEENTRY32 moduleEntry;
            moduleEntry.dwSize = sizeof(MODULEENTRY32);
            
            if (Module32First(hSnapshot, &moduleEntry)) {
                do {
                    moduleMap[reinterpret_cast<uintptr_t>(moduleEntry.modBaseAddr)] = moduleEntry.szModule;
                } while (Module32Next(hSnapshot, &moduleEntry));
            }
            
            CloseHandle(hSnapshot);
        }
        
        // Scan memory regions
        MEMORY_BASIC_INFORMATION memInfo;
        uintptr_t address = 0;
        
        while (VirtualQueryEx(m_processHandle, reinterpret_cast<LPCVOID>(address), &memInfo, sizeof(memInfo))) {
            MemoryRegion region;
            region.start = reinterpret_cast<uintptr_t>(memInfo.BaseAddress);
            region.end = region.start + memInfo.RegionSize;
            region.protection = memInfo.Protect;
            region.isExecutable = (memInfo.Protect & (PAGE_EXECUTE | PAGE_EXECUTE_READ | PAGE_EXECUTE_READWRITE | PAGE_EXECUTE_WRITECOPY)) != 0;
            region.isReadable = (memInfo.Protect & (PAGE_READONLY | PAGE_READWRITE | PAGE_EXECUTE_READ | PAGE_EXECUTE_READWRITE)) != 0;
            region.isWritable = (memInfo.Protect & (PAGE_READWRITE | PAGE_WRITECOPY | PAGE_EXECUTE_READWRITE | PAGE_EXECUTE_WRITECOPY)) != 0;
            
            // Check if this region belongs to a module
            auto it = moduleMap.find(reinterpret_cast<uintptr_t>(memInfo.AllocationBase));
            if (it != moduleMap.end()) {
                region.moduleName = it->second;
            }
            
            regions.push_back(region);
            
            // Move to next region
            address = region.end;
        }
        
        return regions;
    }
    
    // Read memory
    template <typename T>
    bool Read(uintptr_t address, T& value) {
        if (m_processHandle == NULL) {
            std::cerr << "Process not open" << std::endl;
            return false;
        }
        
        SIZE_T bytesRead;
        if (!ReadProcessMemory(m_processHandle, reinterpret_cast<LPCVOID>(address), &value, sizeof(T), &bytesRead) || bytesRead != sizeof(T)) {
            std::cerr << "Failed to read memory at 0x" << std::hex << address << ". Error code: " << std::dec << GetLastError() << std::endl;
            return false;
        }
        
        return true;
    }
    
    // Read memory block
    bool ReadMemory(uintptr_t address, void* buffer, SIZE_T size) {
        if (m_processHandle == NULL) {
            std::cerr << "Process not open" << std::endl;
            return false;
        }
        
        SIZE_T bytesRead;
        if (!ReadProcessMemory(m_processHandle, reinterpret_cast<LPCVOID>(address), buffer, size, &bytesRead) || bytesRead != size) {
            std::cerr << "Failed to read memory block at 0x" << std::hex << address << ". Error code: " << std::dec << GetLastError() << std::endl;
            return false;
        }
        
        return true;
    }
    
    // Write memory
    template <typename T>
    bool Write(uintptr_t address, const T& value) {
        if (m_processHandle == NULL) {
            std::cerr << "Process not open" << std::endl;
            return false;
        }
        
        SIZE_T bytesWritten;
        if (!WriteProcessMemory(m_processHandle, reinterpret_cast<LPVOID>(address), &value, sizeof(T), &bytesWritten) || bytesWritten != sizeof(T)) {
            std::cerr << "Failed to write memory at 0x" << std::hex << address << ". Error code: " << std::dec << GetLastError() << std::endl;
            return false;
        }
        
        return true;
    }
    
    // Write memory block
    bool WriteMemory(uintptr_t address, const void* buffer, SIZE_T size) {
        if (m_processHandle == NULL) {
            std::cerr << "Process not open" << std::endl;
            return false;
        }
        
        // Change memory protection if needed
        DWORD oldProtect;
        if (!VirtualProtectEx(m_processHandle, reinterpret_cast<LPVOID>(address), size, PAGE_EXECUTE_READWRITE, &oldProtect)) {
            std::cerr << "Failed to change memory protection at 0x" << std::hex << address << ". Error code: " << std::dec << GetLastError() << std::endl;
            return false;
        }
        
        // Write memory
        SIZE_T bytesWritten;
        if (!WriteProcessMemory(m_processHandle, reinterpret_cast<LPVOID>(address), buffer, size, &bytesWritten) || bytesWritten != size) {
            std::cerr << "Failed to write memory block at 0x" << std::hex << address << ". Error code: " << std::dec << GetLastError() << std::endl;
            
            // Restore original protection
            VirtualProtectEx(m_processHandle, reinterpret_cast<LPVOID>(address), size, oldProtect, &oldProtect);
            return false;
        }
        
        // Restore original protection
        VirtualProtectEx(m_processHandle, reinterpret_cast<LPVOID>(address), size, oldProtect, &oldProtect);
        
        // Flush instruction cache to ensure changes take effect
        FlushInstructionCache(m_processHandle, reinterpret_cast<LPVOID>(address), size);
        
        return true;
    }
    
    // Scan memory for a pattern
    std::vector<ScanResult> ScanPattern(const std::vector<BYTE>& pattern, const std::vector<BYTE>& mask = {}) {
        std::vector<ScanResult> results;
        
        if (m_processHandle == NULL) {
            std::cerr << "Process not open" << std::endl;
            return results;
        }
        
        // Get memory regions
        auto regions = GetMemoryRegions();
        
        // Prepare effective mask
        std::vector<BYTE> effectiveMask = mask;
        if (effectiveMask.empty()) {
            effectiveMask.resize(pattern.size(), 0xFF);
        }
        
        // Scan each region
        for (const auto& region : regions) {
            // Skip non-readable regions
            if (!region.isReadable) {
                continue;
            }
            
            // Skip regions that are too small
            if (region.end - region.start < pattern.size()) {
                continue;
            }
            
            // Read the region memory
            std::vector<BYTE> buffer(region.end - region.start);
            if (!ReadMemory(region.start, buffer.data(), buffer.size())) {
                continue;
            }
            
            // Scan for pattern
            for (size_t i = 0; i <= buffer.size() - pattern.size(); i++) {
                bool found = true;
                
                for (size_t j = 0; j < pattern.size(); j++) {
                    if ((buffer[i + j] & effectiveMask[j]) != (pattern[j] & effectiveMask[j])) {
                        found = false;
                        break;
                    }
                }
                
                if (found) {
                    ScanResult result;
                    result.address = region.start + i;
                    result.bytes.assign(buffer.begin() + i, buffer.begin() + i + pattern.size());
                    results.push_back(result);
                }
            }
        }
        
        return results;
    }
    
    // Find a specific pattern within a module
    std::vector<ScanResult> ScanPatternInModule(const std::string& moduleName, const std::vector<BYTE>& pattern, const std::vector<BYTE>& mask = {}) {
        std::vector<ScanResult> results;
        
        if (m_processHandle == NULL) {
            std::cerr << "Process not open" << std::endl;
            return results;
        }
        
        // Get module information
        MODULEENTRY32 moduleEntry;
        bool moduleFound = false;
        
        HANDLE hSnapshot = CreateToolhelp32Snapshot(TH32CS_SNAPMODULE | TH32CS_SNAPMODULE32, m_processId);
        if (hSnapshot != INVALID_HANDLE_VALUE) {
            moduleEntry.dwSize = sizeof(MODULEENTRY32);
            
            if (Module32First(hSnapshot, &moduleEntry)) {
                do {
                    if (_stricmp(moduleEntry.szModule, moduleName.c_str()) == 0) {
                        moduleFound = true;
                        break;
                    }
                } while (Module32Next(hSnapshot, &moduleEntry));
            }
            
            CloseHandle(hSnapshot);
        }
        
        if (!moduleFound) {
            std::cerr << "Module not found: " << moduleName << std::endl;
            return results;
        }
        
        // Prepare effective mask
        std::vector<BYTE> effectiveMask = mask;
        if (effectiveMask.empty()) {
            effectiveMask.resize(pattern.size(), 0xFF);
        }
        
        // Read the module memory
        std::vector<BYTE> buffer(moduleEntry.modBaseSize);
        if (!ReadMemory(reinterpret_cast<uintptr_t>(moduleEntry.modBaseAddr), buffer.data(), buffer.size())) {
            std::cerr << "Failed to read module memory" << std::endl;
            return results;
        }
        
        // Scan for pattern
        for (size_t i = 0; i <= buffer.size() - pattern.size(); i++) {
            bool found = true;
            
            for (size_t j = 0; j < pattern.size(); j++) {
                if ((buffer[i + j] & effectiveMask[j]) != (pattern[j] & effectiveMask[j])) {
                    found = false;
                    break;
                }
            }
            
            if (found) {
                ScanResult result;
                result.address = reinterpret_cast<uintptr_t>(moduleEntry.modBaseAddr) + i;
                result.bytes.assign(buffer.begin() + i, buffer.begin() + i + pattern.size());
                results.push_back(result);
            }
        }
        
        return results;
    }
    
    // Get process ID
    DWORD GetProcessId() const {
        return m_processId;
    }
    
    // Get process handle
    HANDLE GetProcessHandle() const {
        return m_processHandle;
    }
    
private:
    DWORD m_processId;
    HANDLE m_processHandle;
};

// Roblox-specific memory scanner
class RobloxMemoryScanner : public MemoryScanner {
public:
    RobloxMemoryScanner() : MemoryScanner() {
        // Try to find Roblox process
        DWORD pid = 0;
        
        // First, try to find by RobloxPlayerBeta.exe
        HANDLE snapshot = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
        if (snapshot != INVALID_HANDLE_VALUE) {
            PROCESSENTRY32 processEntry;
            processEntry.dwSize = sizeof(PROCESSENTRY32);
            
            if (Process32First(snapshot, &processEntry)) {
                do {
                    if (_stricmp(processEntry.szExeFile, "RobloxPlayerBeta.exe") == 0) {
                        pid = processEntry.th32ProcessID;
                        break;
                    }
                } while (Process32Next(snapshot, &processEntry));
            }
            
            CloseHandle(snapshot);
        }
        
        // If found, open the process
        if (pid != 0) {
            Open(pid);
        }
    }
    
    // Find Roblox process by window title
    bool FindRobloxWindowByTitle(const std::string& partialTitle) {
        DWORD pid = 0;
        
        // Enumerate all windows
        EnumWindows([](HWND hwnd, LPARAM lParam) -> BOOL {
            auto params = reinterpret_cast<std::pair<DWORD*, const std::string*>*>(lParam);
            
            // Skip invisible windows
            if (!IsWindowVisible(hwnd)) {
                return TRUE; // Continue enumeration
            }
            
            // Get window title
            char title[256];
            GetWindowTextA(hwnd, title, sizeof(title));
            
            // Check if title contains the partial title
            if (strstr(title, params->second->c_str()) != NULL) {
                // Get process ID
                DWORD winPid;
                GetWindowThreadProcessId(hwnd, &winPid);
                
                // Get process name
                HANDLE hProcess = OpenProcess(PROCESS_QUERY_INFORMATION, FALSE, winPid);
                if (hProcess != NULL) {
                    char processName[MAX_PATH];
                    DWORD size = sizeof(processName);
                    
                    if (QueryFullProcessImageNameA(hProcess, 0, processName, &size)) {
                        // Extract only the filename part
                        const char* filename = strrchr(processName, '\\');
                        filename = (filename != NULL) ? filename + 1 : processName;
                        
                        // Check if it's RobloxPlayerBeta.exe
                        if (_stricmp(filename, "RobloxPlayerBeta.exe") == 0) {
                            *(params->first) = winPid;
                            CloseHandle(hProcess);
                            return FALSE; // Stop enumeration
                        }
                    }
                    
                    CloseHandle(hProcess);
                }
            }
            
            return TRUE; // Continue enumeration
        }, reinterpret_cast<LPARAM>(&std::make_pair(&pid, &partialTitle)));
        
        // If found, open the process
        if (pid != 0) {
            return Open(pid);
        }
        
        return false;
    }
    
    // Find PS99 memory signatures
    bool FindPS99Signatures() {
        // Different signatures to look for in Pet Simulator 99
        
        // Luck calculation signature
        std::vector<BYTE> luckSignature = {
            0x55, 0x8B, 0xEC, 0x83, 0xEC, 0x10, 0x53, 0x56, 0x57, 0x8B, 0xF9, 0x80, 0x7F, 0x10, 0x00
        };
        
        // Pattern for egg hatching time calculation
        std::vector<BYTE> hatchTimeSignature = {
            0x55, 0x8B, 0xEC, 0x83, 0xE4, 0xF8, 0x83, 0xEC, 0x18, 0x56, 0x8B, 0xF1, 0x57, 0x8B, 0x7D, 0x08
        };
        
        // Pattern for rainbow chance calculation
        std::vector<BYTE> rainbowChanceSignature = {
            0x55, 0x8B, 0xEC, 0x83, 0xEC, 0x14, 0x53, 0x56, 0x57, 0x8B, 0xF9, 0xC6, 0x45, 0xF3, 0x00
        };
        
        // Find all of these patterns
        auto luckResults = ScanPattern(luckSignature);
        auto hatchTimeResults = ScanPattern(hatchTimeSignature);
        auto rainbowChanceResults = ScanPattern(rainbowChanceSignature);
        
        // Print results
        std::cout << "Luck calculation function addresses:" << std::endl;
        for (const auto& result : luckResults) {
            std::cout << "  0x" << std::hex << result.address << std::dec << std::endl;
        }
        
        std::cout << "Hatch time calculation function addresses:" << std::endl;
        for (const auto& result : hatchTimeResults) {
            std::cout << "  0x" << std::hex << result.address << std::dec << std::endl;
        }
        
        std::cout << "Rainbow chance calculation function addresses:" << std::endl;
        for (const auto& result : rainbowChanceResults) {
            std::cout << "  0x" << std::hex << result.address << std::dec << std::endl;
        }
        
        return !luckResults.empty() || !hatchTimeResults.empty() || !rainbowChanceResults.empty();
    }
    
    // Find player stats in memory
    bool FindPlayerStats() {
        // Pattern for player stats structure
        std::vector<BYTE> statsSignature = {
            0x00, 0x00, 0x80, 0x3F, 0x00, 0x00, 0x80, 0x3F, 0x00, 0x00, 0x80, 0x3F, 0x00, 0x00, 0x80, 0x3F
        };
        
        // Find all instances of this pattern
        auto results = ScanPattern(statsSignature);
        
        std::cout << "Potential player stats addresses:" << std::endl;
        for (const auto& result : results) {
            // Read memory around this address to see if we can identify it as player stats
            std::vector<BYTE> memory(256);
            if (ReadMemory(result.address - 128, memory.data(), memory.size())) {
                // Check for potential stats markers
                bool hasLuckMarker = false;
                bool hasSpeedMarker = false;
                
                for (size_t i = 0; i < memory.size() - 4; i++) {
                    // Check for luck multiplier marker
                    if (memcmp(&memory[i], "\x4C\x75\x63\x6B", 4) == 0) { // "Luck"
                        hasLuckMarker = true;
                    }
                    
                    // Check for speed multiplier marker
                    if (memcmp(&memory[i], "\x53\x70\x65\x65\x64", 5) == 0) { // "Speed"
                        hasSpeedMarker = true;
                    }
                }
                
                std::cout << "  0x" << std::hex << result.address << std::dec;
                if (hasLuckMarker || hasSpeedMarker) {
                    std::cout << " (Likely player stats - ";
                    if (hasLuckMarker) std::cout << "Luck ";
                    if (hasSpeedMarker) std::cout << "Speed";
                    std::cout << ")";
                }
                std::cout << std::endl;
            }
        }
        
        return !results.empty();
    }
};