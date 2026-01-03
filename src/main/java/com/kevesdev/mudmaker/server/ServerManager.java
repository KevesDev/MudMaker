package com.kevesdev.mudmaker.server;

import com.kevesdev.mudmaker.commands.CommandManager;

import java.io.IOException;

public class ServerManager {
    private GameServer server;
    private int port;
    private final CommandManager commandManager;

    public ServerManager(int port, CommandManager commandManager) {
        this.port = port;
        this.commandManager = commandManager;
    }

    public void startServer(ServerListener listener) throws IOException {
        if (server == null || !server.isRunning()) {
            server = new GameServer(port, commandManager);
            server.setServerListener(listener);
            server.start();
        }
    }

    public void stopServer() throws IOException {
        if (server != null) server.stop();
    }

    public boolean isRunning() {
        return server != null && server.isRunning();
    }
}