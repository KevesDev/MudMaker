// HOST-LOCAL SCRIPT WORKER REFERENCE IMPLEMENTATION.
// The world server starts this process at startup and provides a pinned
// published module + typed protobuf frames via protected local pipes.
// Never expose this process to remote game players.
#nullable enable
using System;
using System.Buffers.Binary;
using System.IO;
using System.Text.Json;
using Google.Protobuf;
using MudMaker.Scripting.V1;
using Wire = MudMaker.Scripting.V1.Wire;

namespace MudMaker.Scripting.Worker;

internal static class Program
{
    private const int MaxFrameBytes = 1_048_576; // fixed v1 frame ceiling
    private static int Main(string[] args)
    {
        if (args.Length != 2)
        {
            Console.Error.WriteLine("MM-SCRIPT-ARGS: releaseDirectory manifestPath");
            return 2;
        }

        try
        {
            string root = Path.GetFullPath(args[0]);
            string manifestPath = Path.GetFullPath(args[1]);
            if (!manifestPath.StartsWith(root + Path.DirectorySeparatorChar,
                                        StringComparison.Ordinal))
                throw new InvalidOperationException("MM-SCRIPT-MANIFEST-PATH");

            PublishedModule published = JsonSerializer.Deserialize<PublishedModule>(
                File.ReadAllText(manifestPath)) ??
                throw new InvalidOperationException("MM-SCRIPT-MANIFEST-INVALID");
            var installed = new InstalledScriptCatalog(root, published);
            using Stream input = Console.OpenStandardInput();
            using Stream output = Console.OpenStandardOutput();

            Wire.WorkerFrame? first = ReadFrame(input);
            if (first?.PayloadCase != Wire.WorkerFrame.PayloadOneofCase.Hello ||
                first.Hello.MinMajor > 1 || first.Hello.MaxMajor < 1 ||
                first.Hello.ReleaseHash != published.ReleaseHash)
                throw new InvalidOperationException("MM-SCRIPT-HANDSHAKE");

            WriteFrame(output, new Wire.WorkerFrame {
                Ready = new Wire.WorkerReady {
                    ProtocolMajor = 1, ReleaseHash = published.ReleaseHash,
                    BoundHandlers = (uint)installed.Count
                }
            });

            while (ReadFrame(input) is { } frame)
            {
                if (frame.PayloadCase != Wire.WorkerFrame.PayloadOneofCase.Invoke)
                    throw new InvalidOperationException("MM-SCRIPT-UNKNOWN-FRAME");
                var invocation = frame.Invoke;
                Wire.HookReply reply;
                try
                {
                    if (invocation.ProtocolMajor != 1 ||
                        invocation.ReleaseHash != published.ReleaseHash)
                        throw new InvalidOperationException("MM-SCRIPT-RELEASE-MISMATCH");

                    HookContext ctx = ScriptWireCodec.Context(invocation);
                    MudEvent gameEvent = ScriptWireCodec.Event(invocation.Event);
                    object result = installed.Invoke(
                        Guid.Parse(invocation.Binding.Id),
                        invocation.HookId, ctx, gameEvent);

                    reply = result switch {
                        HookDecision decision when ctx.Phase != HookPhase.Query =>
                            ScriptWireCodec.Reply(invocation, decision),
                        HookQueryResult answer when ctx.Phase == HookPhase.Query =>
                            ScriptWireCodec.QueryReply(invocation, answer),
                        _ => throw new InvalidOperationException("MM-SCRIPT-RESULT-TYPE")
                    };
                }
                catch (Exception error)
                {
                    // Operator logs stay on stderr. Protobuf stdout contains no
                    // logs; player response receives a SAFE code only.
                    Console.Error.WriteLine(JsonSerializer.Serialize(new {
                        code = "MM-SCRIPT-INVOCATION-FAILED",
                        trace = invocation.TraceId,
                        invocation = invocation.InvocationId,
                        errorType = error.GetType().Name
                    }));
                    reply = new Wire.HookReply {
                        ProtocolMajor = 1,
                        InvocationId = invocation.InvocationId,
                        Binding = invocation.Binding,
                        TraceId = invocation.TraceId,
                        Disposition = Wire.Disposition.Veto,
                        SafeErrorCode = "MM-SCRIPT-INVOCATION-FAILED"
                    };
                }

                WriteFrame(output, new Wire.WorkerFrame { Reply = reply });
            }
            return 0;
        }
        catch (Exception fatal)
        {
            Console.Error.WriteLine(JsonSerializer.Serialize(new {
                code = "MM-SCRIPT-WORKER-STOPPED", errorType = fatal.GetType().Name
            }));
            return 3;
        }
    }

    private static Wire.WorkerFrame? ReadFrame(Stream stream)
    {
        int first = stream.ReadByte();
        if (first == -1) return null;

        Span<byte> header = stackalloc byte[4];
        header[0] = (byte)first;
        stream.ReadExactly(header[1..]);
        int size = BinaryPrimitives.ReadInt32LittleEndian(header);
        if (size <= 0 || size > MaxFrameBytes)
            throw new InvalidOperationException("MM-SCRIPT-FRAME-INVALID");

        byte[] bytes = new byte[size];
        stream.ReadExactly(bytes);
        return Wire.WorkerFrame.Parser.ParseFrom(bytes);
    }

    private static void WriteFrame(Stream stream, Wire.WorkerFrame message)
    {
        byte[] bytes = message.ToByteArray();
        if (bytes.Length is < 1 or > MaxFrameBytes)
            throw new InvalidOperationException("MM-SCRIPT-REPLY-TOO-LARGE");

        Span<byte> header = stackalloc byte[4];
        BinaryPrimitives.WriteInt32LittleEndian(header, bytes.Length);
        stream.Write(header);
        stream.Write(bytes);
        stream.Flush();
    }
}
