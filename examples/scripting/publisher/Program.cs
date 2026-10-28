#nullable enable
using System;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace MudMaker.LocalPublisher;

// Host-owner tool. Never exposed on player networking ports.
// Installs a host-compiled assembly into a version-pinned local release.
internal static class Program
{
    private sealed record Binding(Guid BindingId, string HookId, string ModuleId,
        string ClassName, string MethodName, string EventClrName, string ReturnClrName);

    private static int Main(string[] args)
    {
        if (args.Length != 4)
        {
            Console.Error.WriteLine(
                "Usage: publisher <compiled-script.dll> <bindings.json> <release-hash> <local-release-dir>");
            return 2;
        }

        try
        {
            string compiledDll = Path.GetFullPath(args[0]);
            string bindingsFile = Path.GetFullPath(args[1]);
            string releaseHash = args[2];
            string root = Path.GetFullPath(args[3]);
            if (releaseHash.Length < 16 || releaseHash.Length > 128 ||
                !releaseHash.All(c => char.IsAsciiHexDigit(c)))
                throw new InvalidOperationException("MM-PUBLISH-RELEASE-ID-INVALID");
            if (!string.Equals(Path.GetExtension(compiledDll), ".dll",
                    StringComparison.OrdinalIgnoreCase))
                throw new InvalidOperationException("MM-PUBLISH-NOT-DLL");

            var bindings = JsonSerializer.Deserialize<Binding[]>(
                File.ReadAllText(bindingsFile)) ??
                throw new InvalidOperationException("MM-PUBLISH-BINDINGS-INVALID");
            if (bindings.Length == 0 || bindings.Any(b => b.BindingId == Guid.Empty) ||
                bindings.GroupBy(b => b.BindingId).Any(g => g.Count() > 1))
                throw new InvalidOperationException("MM-PUBLISH-BINDINGS-DUPLICATED");

            // A production publisher additionally reads and validates the
            // project hook registry, capability grants, and world binding owners.
            // The host must not start until that publish validation is built.
            Directory.CreateDirectory(root);
            string name = Path.GetFileName(compiledDll);
            string destination = Path.Combine(root, name);
            if (File.Exists(destination))
                throw new InvalidOperationException("MM-PUBLISH-IMMUTABLE-RELEASE-EXISTS");
            File.Copy(compiledDll, destination);
            string sha256 = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(destination)));
            string manifest = JsonSerializer.Serialize(new {
                ReleaseHash = releaseHash,
                AssemblyFileName = name,
                Sha256Hex = sha256,
                Bindings = bindings
            }, new JsonSerializerOptions { WriteIndented = true });
            string manifestPath = Path.Combine(root, "module-manifest.json");
            if (File.Exists(manifestPath))
                throw new InvalidOperationException("MM-PUBLISH-MANIFEST-EXISTS");
            File.WriteAllText(manifestPath, manifest, Encoding.UTF8);
            Console.WriteLine($"Published host script: {sha256}; bindings={bindings.Length}");
            return 0;
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"MM-PUBLISH-FAILED: {ex.GetType().Name}");
            return 3;
        }
    }
}
