// Host-installed module binder. This runs INSIDE the separate local script worker.
// Not callable by a player; the native host provides a verified release manifest.
#nullable enable
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Security.Cryptography;
using MudMaker.Scripting.V1;

namespace MudMaker.Scripting.Worker;

public sealed record PublishedBinding(
    Guid BindingId, string HookId, string ModuleId, string ClassName,
    string MethodName, string EventClrName, string ReturnClrName);

public sealed record PublishedModule(
    string ReleaseHash, string AssemblyFileName, string Sha256Hex,
    IReadOnlyList<PublishedBinding> Bindings);

public sealed class InstalledScriptCatalog
{
    private readonly Dictionary<Guid, (PublishedBinding Binding, object Instance, MethodInfo Method)> _handlers = new();
    public int Count => _handlers.Count;

    public InstalledScriptCatalog(string releaseDirectory, PublishedModule module)
    {
        var releasePath = Path.GetFullPath(releaseDirectory);
        var assemblyPath = Path.GetFullPath(Path.Combine(releasePath, module.AssemblyFileName));
        if (!assemblyPath.StartsWith(releasePath + Path.DirectorySeparatorChar, StringComparison.Ordinal))
            throw new InvalidOperationException("MM-SCRIPT-PATH-OUTSIDE-RELEASE");
        if (!string.Equals(Path.GetExtension(assemblyPath), ".dll", StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("MM-SCRIPT-NOT-DLL");
        var bytes = File.ReadAllBytes(assemblyPath);
        var hash = Convert.ToHexString(SHA256.HashData(bytes));
        if (!string.Equals(hash, module.Sha256Hex, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("MM-SCRIPT-RELEASE-HASH-MISMATCH");

        // Reflection here is server-side trusted binding discovery INSIDE
        // the bounded worker, not access to mutable ECS objects or raw pointers.
        var assembly = Assembly.LoadFrom(assemblyPath);
        foreach (var binding in module.Bindings)
        {
            if (_handlers.ContainsKey(binding.BindingId))
                throw new InvalidOperationException("MM-SCRIPT-BINDING-DUPLICATE");

            var type = assembly.GetType(binding.ClassName, throwOnError: true)!;
            var script = type.GetCustomAttribute<MudScriptAttribute>();
            if (script?.ModuleId != binding.ModuleId)
                throw new InvalidOperationException("MM-SCRIPT-MODULE-MISMATCH");
            var method = type.GetMethod(binding.MethodName, BindingFlags.Public | BindingFlags.Instance);
            if (method is null || method.IsGenericMethod ||
                method.ReturnType.FullName != binding.ReturnClrName ||
                (method.ReturnType != typeof(HookDecision) &&
                 method.ReturnType != typeof(HookQueryResult)))
                throw new InvalidOperationException("MM-SCRIPT-HANDLER-SIGNATURE");

            var parameters = method.GetParameters();
            if (parameters.Length != 2 || parameters[0].ParameterType != typeof(HookContext) ||
                parameters[1].ParameterType.FullName != binding.EventClrName ||
                !typeof(MudEvent).IsAssignableFrom(parameters[1].ParameterType))
                throw new InvalidOperationException("MM-SCRIPT-EVENT-TYPE");

            var attrs = method.GetCustomAttributes<MudHookAttribute>().ToArray();
            if (!attrs.Any(x => x.HookId == binding.HookId))
                throw new InvalidOperationException("MM-SCRIPT-HOOK-ID");
            var instance = Activator.CreateInstance(type) ??
                throw new InvalidOperationException("MM-SCRIPT-CONSTRUCTOR");

            _handlers[binding.BindingId] = (binding, instance, method);
        }
    }

    public object Invoke(
        Guid bindingId, string hookId, HookContext context, MudEvent eventData)
    {
        if (!_handlers.TryGetValue(bindingId, out var binding))
            throw new InvalidOperationException("MM-SCRIPT-BINDING-NOT-IN-RELEASE");
        if (binding.Binding.HookId != hookId ||
            context.BoundAsset.Id != bindingId ||
            binding.Method.GetParameters()[1].ParameterType != eventData.GetType())
            throw new InvalidOperationException("MM-SCRIPT-DISPATCH-MISMATCH");

        try
        {
            return binding.Method.Invoke(
                binding.Instance, new object[] { context, eventData }) ??
                throw new InvalidOperationException("MM-SCRIPT-NULL-RESULT");
        }
        catch (TargetInvocationException ex) when (ex.InnerException != null)
        {
            // Exception is logged with host trace ID by the worker dispatcher.
            // Only a structured safe error code travels back to the player.
            throw new ScriptHandlerFaultException("MM-SCRIPT-EXECUTION-FAILED", ex.InnerException);
        }
    }
}

public sealed class ScriptHandlerFaultException(string code, Exception inner)
    : Exception(code, inner);
