using System.Diagnostics;
using System.Text;
using System.Text.Json;

namespace Bellum.Backend.Services;

public class CodeCompilationService
{
    private readonly ILogger<CodeCompilationService> _logger;
    private readonly string _tempDirectory;

    public CodeCompilationService(ILogger<CodeCompilationService> logger)
    {
        _logger = logger;
        _tempDirectory = Path.Combine(Path.GetTempPath(), "bellum-compile");
        Directory.CreateDirectory(_tempDirectory);
    }

    /// <summary>
    /// Compile C++ code to WebAssembly
    /// </summary>
    public async Task<CompilationResult> CompileCppAsync(string code)
    {
        try
        {
            _logger.LogInformation("Compiling C++ code to WebAssembly");

            var workDir = Path.Combine(_tempDirectory, Guid.NewGuid().ToString());
            Directory.CreateDirectory(workDir);

            try
            {
                var sourceFile = Path.Combine(workDir, "main.cpp");
                var wasmFile = Path.Combine(workDir, "main.wasm");

                await File.WriteAllTextAsync(sourceFile, code);

                // Compile using clang/emcc
                // Assuming 'clang' with wasm target support is installed
                var processInfo = new ProcessStartInfo
                {
                    FileName = "clang",
                    // -O3: Optimize
                    // --target=wasm32: Target WASM
                    // -nostdlib: No standard lib (unless we have wasi-libc)
                    // -Wl,--no-entry: No main entry if we use _start
                    // -Wl,--export-all: Export symbols
                    Arguments = $"--target=wasm32 -O3 -flto -nostdlib -Wl,--no-entry -Wl,--export-all -o {wasmFile} {sourceFile}",
                    WorkingDirectory = workDir,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                var process = Process.Start(processInfo);
                if (process == null)
                {
                    return new CompilationResult
                    {
                        Success = false,
                        Error = "Failed to start Clang compiler. Ensure 'clang' is installed."
                    };
                }

                var output = await process.StandardOutput.ReadToEndAsync();
                var error = await process.StandardError.ReadToEndAsync();
                await process.WaitForExitAsync();

                if (process.ExitCode != 0)
                {
                    return new CompilationResult
                    {
                        Success = false,
                        Error = $"C++ compilation failed: {error}"
                    };
                }

                if (!File.Exists(wasmFile))
                {
                    return new CompilationResult
                    {
                        Success = false,
                        Error = "WASM file not generated"
                    };
                }

                var wasmBytes = await File.ReadAllBytesAsync(wasmFile);
                return new CompilationResult
                {
                    Success = true,
                    WasmBase64 = Convert.ToBase64String(wasmBytes),
                    Warnings = ExtractWarnings(output + error)
                };
            }
            finally
            {
                try { Directory.Delete(workDir, true); } catch { }
            }
        }
        catch (Exception ex)
        {
            return new CompilationResult { Success = false, Error = ex.Message };
        }
    }

    /// <summary>
    /// Compile Rust code to WebAssembly
    /// </summary>
    public async Task<CompilationResult> CompileRustAsync(string code, string? cargoToml = null)
    {
        try
        {
            _logger.LogInformation("Compiling Rust code to WebAssembly");

            var workDir = Path.Combine(_tempDirectory, Guid.NewGuid().ToString());
            Directory.CreateDirectory(workDir);

            try
            {
                // Create Cargo.toml if not provided
                var cargoTomlContent = cargoToml ?? GenerateRustCargoToml();
                await File.WriteAllTextAsync(Path.Combine(workDir, "Cargo.toml"), cargoTomlContent);

                // Create src directory
                var srcDir = Path.Combine(workDir, "src");
                Directory.CreateDirectory(srcDir);

                // Write main.rs
                await File.WriteAllTextAsync(Path.Combine(srcDir, "main.rs"), code);

                // Compile using wasm-pack or rustc
                var wasmPath = Path.Combine(workDir, "target", "wasm32-unknown-unknown", "release", "bellum.wasm");

                // Try wasm-pack first (preferred)
                var wasmPackResult = await TryCompileWithWasmPack(workDir);
                if (wasmPackResult.Success)
                {
                    var wasmBytes = await File.ReadAllBytesAsync(wasmPackResult.WasmPath!);
                    return new CompilationResult
                    {
                        Success = true,
                        WasmBase64 = Convert.ToBase64String(wasmBytes),
                        Warnings = wasmPackResult.Warnings
                    };
                }

                // Fallback to rustc
                var rustcResult = await TryCompileWithRustc(workDir, code);
                if (rustcResult.Success)
                {
                    var wasmBytes = await File.ReadAllBytesAsync(rustcResult.WasmPath!);
                    return new CompilationResult
                    {
                        Success = true,
                        WasmBase64 = Convert.ToBase64String(wasmBytes),
                        Warnings = rustcResult.Warnings
                    };
                }

                return new CompilationResult
                {
                    Success = false,
                    Error = "Failed to compile Rust code. Ensure rustc or wasm-pack is installed."
                };
            }
            finally
            {
                // Cleanup
                try
                {
                    Directory.Delete(workDir, true);
                }
                catch { }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error compiling Rust code");
            return new CompilationResult
            {
                Success = false,
                Error = ex.Message
            };
        }
    }

    /// <summary>
    /// Compile Zig code to WebAssembly
    /// </summary>
    public async Task<CompilationResult> CompileZigAsync(string code)
    {
        try
        {
            _logger.LogInformation("Compiling Zig code to WebAssembly");

            var workDir = Path.Combine(_tempDirectory, Guid.NewGuid().ToString());
            Directory.CreateDirectory(workDir);

            try
            {
                var sourceFile = Path.Combine(workDir, "main.zig");
                var wasmFile = Path.Combine(workDir, "main.wasm");

                await File.WriteAllTextAsync(sourceFile, code);

                // Compile using zig
                var processInfo = new ProcessStartInfo
                {
                    FileName = "zig",
                    Arguments = $"build-exe {sourceFile} -target wasm32-freestanding -O ReleaseSmall --name main",
                    WorkingDirectory = workDir,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                var process = Process.Start(processInfo);
                if (process == null)
                {
                    return new CompilationResult
                    {
                        Success = false,
                        Error = "Failed to start Zig compiler. Ensure 'zig' is installed and in PATH."
                    };
                }

                var output = await process.StandardOutput.ReadToEndAsync();
                var error = await process.StandardError.ReadToEndAsync();
                await process.WaitForExitAsync();

                if (process.ExitCode != 0)
                {
                    return new CompilationResult
                    {
                        Success = false,
                        Error = $"Zig compilation failed: {error}"
                    };
                }

                // Check for output file
                var outputWasm = Path.Combine(workDir, "main.wasm");
                if (!File.Exists(outputWasm))
                {
                    return new CompilationResult
                    {
                        Success = false,
                        Error = "WASM file not generated"
                    };
                }

                var wasmBytes = await File.ReadAllBytesAsync(outputWasm);
                return new CompilationResult
                {
                    Success = true,
                    WasmBase64 = Convert.ToBase64String(wasmBytes),
                    Warnings = output.Split('\n').Where(l => l.Contains("warning", StringComparison.OrdinalIgnoreCase)).ToArray()
                };
            }
            finally
            {
                try
                {
                    Directory.Delete(workDir, true);
                }
                catch { }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error compiling Zig code");
            return new CompilationResult
            {
                Success = false,
                Error = ex.Message
            };
        }
    }

    /// <summary>
    /// Compile Go code to WebAssembly
    /// </summary>
    public async Task<CompilationResult> CompileGoAsync(string code)
    {
        try
        {
            _logger.LogInformation("Compiling Go code to WebAssembly");

            var workDir = Path.Combine(_tempDirectory, Guid.NewGuid().ToString());
            Directory.CreateDirectory(workDir);

            try
            {
                var sourceFile = Path.Combine(workDir, "main.go");
                var wasmFile = Path.Combine(workDir, "main.wasm");

                await File.WriteAllTextAsync(sourceFile, code);

                // Try TinyGo first (better for WASM)
                var tinyGoResult = await TryCompileWithTinyGo(workDir, sourceFile, wasmFile);
                if (tinyGoResult.Success)
                {
                    var wasmBytes = await File.ReadAllBytesAsync(wasmFile);
                    return new CompilationResult
                    {
                        Success = true,
                        WasmBase64 = Convert.ToBase64String(wasmBytes),
                        Warnings = tinyGoResult.Warnings
                    };
                }

                // Fallback to standard Go compiler
                var goResult = await TryCompileWithGo(workDir, sourceFile, wasmFile);
                if (goResult.Success)
                {
                    var wasmBytes = await File.ReadAllBytesAsync(wasmFile);
                    return new CompilationResult
                    {
                        Success = true,
                        WasmBase64 = Convert.ToBase64String(wasmBytes),
                        Warnings = goResult.Warnings
                    };
                }

                return new CompilationResult
                {
                    Success = false,
                    Error = "Failed to compile Go code. Ensure 'go' or 'tinygo' is installed."
                };
            }
            finally
            {
                try
                {
                    Directory.Delete(workDir, true);
                }
                catch { }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error compiling Go code");
            return new CompilationResult
            {
                Success = false,
                Error = ex.Message
            };
        }
    }

    private async Task<(bool Success, string? WasmPath, string[] Warnings)> TryCompileWithWasmPack(string workDir)
    {
        try
        {
            var processInfo = new ProcessStartInfo
            {
                FileName = "wasm-pack",
                Arguments = "build --target web --out-dir pkg",
                WorkingDirectory = workDir,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            var process = Process.Start(processInfo);
            if (process == null) return (false, null, Array.Empty<string>());

            var output = await process.StandardOutput.ReadToEndAsync();
            var error = await process.StandardError.ReadToEndAsync();
            await process.WaitForExitAsync();

            if (process.ExitCode != 0) return (false, null, Array.Empty<string>());

            var wasmPath = Path.Combine(workDir, "pkg", "bellum_bg.wasm");
            if (File.Exists(wasmPath))
            {
                return (true, wasmPath, ExtractWarnings(output + error));
            }

            return (false, null, Array.Empty<string>());
        }
        catch
        {
            return (false, null, Array.Empty<string>());
        }
    }

    private async Task<(bool Success, string? WasmPath, string[] Warnings)> TryCompileWithRustc(string workDir, string code)
    {
        try
        {
            var sourceFile = Path.Combine(workDir, "main.rs");
            var wasmFile = Path.Combine(workDir, "main.wasm");

            var processInfo = new ProcessStartInfo
            {
                FileName = "rustc",
                Arguments = $"{sourceFile} --target wasm32-unknown-unknown -O -o {wasmFile}",
                WorkingDirectory = workDir,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            var process = Process.Start(processInfo);
            if (process == null) return (false, null, Array.Empty<string>());

            var output = await process.StandardOutput.ReadToEndAsync();
            var error = await process.StandardError.ReadToEndAsync();
            await process.WaitForExitAsync();

            if (process.ExitCode != 0) return (false, null, Array.Empty<string>());

            if (File.Exists(wasmFile))
            {
                return (true, wasmFile, ExtractWarnings(output + error));
            }

            return (false, null, Array.Empty<string>());
        }
        catch
        {
            return (false, null, Array.Empty<string>());
        }
    }

    private async Task<(bool Success, string[] Warnings)> TryCompileWithTinyGo(string workDir, string sourceFile, string wasmFile)
    {
        try
        {
            var processInfo = new ProcessStartInfo
            {
                FileName = "tinygo",
                Arguments = $"build -target wasm -o {wasmFile} {sourceFile}",
                WorkingDirectory = workDir,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            var process = Process.Start(processInfo);
            if (process == null) return (false, Array.Empty<string>());

            var output = await process.StandardOutput.ReadToEndAsync();
            var error = await process.StandardError.ReadToEndAsync();
            await process.WaitForExitAsync();

            if (process.ExitCode != 0) return (false, ExtractWarnings(output + error));

            return (File.Exists(wasmFile), ExtractWarnings(output + error));
        }
        catch
        {
            return (false, Array.Empty<string>());
        }
    }

    private async Task<(bool Success, string[] Warnings)> TryCompileWithGo(string workDir, string sourceFile, string wasmFile)
    {
        try
        {
            // Set GOOS and GOARCH for WASM
            var env = new Dictionary<string, string>
            {
                ["GOOS"] = "js",
                ["GOARCH"] = "wasm"
            };

            var processInfo = new ProcessStartInfo
            {
                FileName = "go",
                Arguments = $"build -o {wasmFile} {sourceFile}",
                WorkingDirectory = workDir,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                UseShellExecute = false,
                CreateNoWindow = true
            };

            foreach (var kvp in env)
            {
                processInfo.EnvironmentVariables[kvp.Key] = kvp.Value;
            }

            var process = Process.Start(processInfo);
            if (process == null) return (false, Array.Empty<string>());

            var output = await process.StandardOutput.ReadToEndAsync();
            var error = await process.StandardError.ReadToEndAsync();
            await process.WaitForExitAsync();

            if (process.ExitCode != 0) return (false, ExtractWarnings(output + error));

            return (File.Exists(wasmFile), ExtractWarnings(output + error));
        }
        catch
        {
            return (false, Array.Empty<string>());
        }
    }

    private string GenerateRustCargoToml()
    {
        return @"[package]
name = ""bellum""
version = ""0.1.0""
edition = ""2021""

[lib]
crate-type = [""cdylib""]

[dependencies]
wasm-bindgen = ""0.2""
";
    }

    private string[] ExtractWarnings(string output)
    {
        return output.Split('\n')
            .Where(l => l.Contains("warning", StringComparison.OrdinalIgnoreCase))
            .ToArray();
    }
}

public class CompilationResult
{
    public bool Success { get; set; }
    public string? WasmBase64 { get; set; }
    public string? Error { get; set; }
    public string[] Warnings { get; set; } = Array.Empty<string>();
}
