package com.kevesdev.mudmaker.server;

import com.kevesdev.mudmaker.commands.Command;
import com.kevesdev.mudmaker.commands.CommandManager;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.Socket;

public class ClientHandler implements Runnable {
    private final Socket client;
    private final ServerListener listener;
    private final CommandManager commandManager;
    private PrintWriter out;

    public ClientHandler(Socket client, ServerListener listener, CommandManager commandManager) {
        this.client = client;
        this.listener = listener;
        this.commandManager = commandManager;
    }

    @Override
    public void run() {
        try {
            BufferedReader in = new BufferedReader(
                    new InputStreamReader(client.getInputStream())
            );
            out = new PrintWriter(client.getOutputStream(), true);

            String line;
            while ((line = in.readLine()) != null) {
                logToServer("Client: " + line);
                // Now we correctly use the parser from CommandManager
                String senderId = client.getRemoteSocketAddress().toString();
                Command cmd = commandManager.getParser().parse(line, senderId); // <-- fixed
                if (cmd != null) {
                    commandManager.getRegistry().execute(cmd);
                }
            }
        } catch (IOException e) {
            if (listener != null) listener.onMessage("Client connection error: " + e.getMessage());
        } finally {
            try {
                client.close();
                if (listener != null) listener.onMessage("Client disconnected");
            } catch (IOException ignored) {}
        }
    }

    private void logToServer(String message) {
        if (listener != null) listener.onMessage(message);
    }

    public void sendToClient(String message) {
        if (out != null) out.println(message);
    }
}