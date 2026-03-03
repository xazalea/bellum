using System;
using System.IO.Compression;
using System.Runtime.InteropServices.JavaScript;
using System.Text;
using System.Text.Json;

namespace Challenger.Wasm;

/// <summary>
/// WASM entry point for Challenger Deep binary processing
/// Exposes APK/EXE processing functions to JavaScript
/// </summary>
public class Program
{
    private static void Main(string[] args)
    {
        Console.WriteLine("Challenger WASM Module Initialized");
    }
}

/// <summary>
/// APK/EXE Processing functions exposed to JavaScript
/// </summary>
public static class BinaryProcessor
{
    /// <summary>
    /// Extract APK file and return metadata
    /// </summary>
    [JSExport]
    public static string ExtractApk(byte[] apkData)
    {
        try
        {
            using var stream = new MemoryStream(apkData);
            using var zip = new ZipArchive(stream, ZipArchiveMode.Read);
            
            var files = new List<string>();
            bool hasManifest = false;
            bool hasResources = false;
            bool hasDex = false;
            
            foreach (var entry in zip.Entries)
            {
                files.Add(entry.FullName);
                
                if (entry.FullName == "AndroidManifest.xml")
                    hasManifest = true;
                if (entry.FullName == "resources.arsc")
                    hasResources = true;
                if (entry.FullName.EndsWith(".dex"))
                    hasDex = true;
            }
            
            var result = new
            {
                success = true,
                extracted = true,
                fileCount = files.Count,
                files = files.Take(100).ToArray(), // Limit to first 100
                hasManifest,
                hasResources,
                hasDex,
                size = apkData.Length
            };
            
            return JsonSerializer.Serialize(result);
        }
        catch (Exception ex)
        {
            return JsonSerializer.Serialize(new { success = false, error = ex.Message });
        }
    }

    /// <summary>
    /// Extract EXE file and return PE metadata
    /// </summary>
    [JSExport]
    public static string ExtractExe(byte[] exeData)
    {
        try
        {
            // Parse PE headers
            if (exeData.Length < 64)
                return JsonSerializer.Serialize(new { success = false, error = "File too small" });
            
            // Check DOS header
            if (exeData[0] != 'M' || exeData[1] != 'Z')
                return JsonSerializer.Serialize(new { success = false, error = "Not a valid PE file" });
            
            // Get PE header offset
            int peOffset = BitConverter.ToInt32(exeData, 60);
            
            // Check PE signature
            if (peOffset + 4 > exeData.Length)
                return JsonSerializer.Serialize(new { success = false, error = "Invalid PE header offset" });
            
            bool isPe32Plus = false;
            int imageBase = 0;
            int entryPoint = 0;
            int subsystem = 0;
            
            if (exeData[peOffset] == 'P' && exeData[peOffset + 1] == 'E')
            {
                // Parse COFF header
                int machine = BitConverter.ToUInt16(exeData, peOffset + 4);
                isPe32Plus = exeData[peOffset + 24] == 0x20B; // PE32+ signature
                
                // Get entry point and image base
                int optionalHeaderOffset = peOffset + 24;
                if (isPe32Plus)
                {
                    imageBase = (int)BitConverter.ToInt64(exeData, optionalHeaderOffset + 24);
                    entryPoint = BitConverter.ToInt32(exeData, optionalHeaderOffset + 16);
                    subsystem = BitConverter.ToUInt16(exeData, optionalHeaderOffset + 68);
                }
                else
                {
                    imageBase = BitConverter.ToInt32(exeData, optionalHeaderOffset + 28);
                    entryPoint = BitConverter.ToInt32(exeData, optionalHeaderOffset + 16);
                    subsystem = BitConverter.ToUInt16(exeData, optionalHeaderOffset + 68);
                }
            }
            
            var result = new
            {
                success = true,
                extracted = true,
                size = exeData.Length,
                isPe = true,
                isPe32Plus,
                imageBase = imageBase.ToString("X"),
                entryPoint = entryPoint.ToString("X"),
                subsystem,
                machine = exeData[peOffset + 4..peOffset + 6].ToHexString()
            };
            
            return JsonSerializer.Serialize(result);
        }
        catch (Exception ex)
        {
            return JsonSerializer.Serialize(new { success = false, error = ex.Message });
        }
    }

    /// <summary>
    /// Process disk image (ISO, IMG, VHD)
    /// </summary>
    [JSExport]
    public static string ProcessDiskImage(byte[] imageData, string format)
    {
        try
        {
            var result = new
            {
                success = true,
                processed = true,
                originalSize = imageData.Length,
                format = format.ToLower(),
                detectedType = DetectDiskType(imageData)
            };
            
            return JsonSerializer.Serialize(result);
        }
        catch (Exception ex)
        {
            return JsonSerializer.Serialize(new { success = false, error = ex.Message });
        }
    }

    /// <summary>
    /// Compress data using GZip
    /// </summary>
    [JSExport]
    public static byte[] Compress(byte[] data)
    {
        using var output = new MemoryStream();
        using (var gzip = new GZipStream(output, CompressionLevel.Optimal))
        {
            gzip.Write(data, 0, data.Length);
        }
        return output.ToArray();
    }

    /// <summary>
    /// Decompress GZip data
    /// </summary>
    [JSExport]
    public static byte[] Decompress(byte[] compressedData)
    {
        using var input = new MemoryStream(compressedData);
        using var gzip = new GZipStream(input, CompressionMode.Decompress);
        using var output = new MemoryStream();
        gzip.CopyTo(output);
        return output.ToArray();
    }

    /// <summary>
    /// Get module version
    /// </summary>
    [JSExport]
    public static string GetVersion()
    {
        return "1.0.0";
    }

    /// <summary>
    /// Check if WASM module is ready
    /// </summary>
    [JSExport]
    public static bool IsReady()
    {
        return true;
    }

    private static string DetectDiskType(byte[] data)
    {
        if (data.Length < 512) return "unknown";
        
        // Check for ISO 9660
        if (data.Length > 32769 && data[32769] == 'C' && data[32770] == 'D')
            return "iso9660";
        
        // Check for VHD
        if (data.Length > 512 && data[511] == 'V' && data[510] == 'H' && data[509] == 'D')
            return "vhd";
        
        return "raw";
    }
}

internal static class ByteArrayExtensions
{
    public static string ToHexString(this byte[] bytes)
    {
        return Convert.ToHexString(bytes).ToLower();
    }
}