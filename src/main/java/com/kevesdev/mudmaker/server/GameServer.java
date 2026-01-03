package com.kevesdev.mudmaker.server;

import com.kevesdev.mudmaker.commands.CommandManager;

import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;

public class GameServer {

    private ServerSocket serverSocket;
    private int port;
    private ServerListener listener;
    private boolean running = false;
    private final CommandManager commandManager;

    public GameServer(int port, CommandManager commandManager) {
        this.port = port;
        this.commandManager = commandManager;
    }

    public void setServerListener(ServerListener listener){
        this.listener = listener;
    }

    private void log(String message){
        System.out.println(message);
        if (listener != null) listener.onMessage(message);
    }

    public void start() throws IOException {
        serverSocket = new ServerSocket(port);
        log("Server listening on port " + port);
        running = true;

        new Thread(() -> {
            while (running) {
                try {
                    Socket socket = serverSocket.accept();
                    ClientHandler handler = new ClientHandler(socket, listener, commandManager);
                    new Thread(handler).start();
                    log("Client connected from " + socket.getRemoteSocketAddress());
                } catch (IOException e) {
                    if (running) log("Error accepting client connection: " + e.getMessage());
                }
            }
        }).start();
    }

    public void stop() throws IOException {
        running = false;
        if (serverSocket != null && !serverSocket.isClosed()) {
            serverSocket.close();
            log("Server stopped on port " + port);
        } else {
            log("Server not active on port " + port);
        }
    }

    public boolean isRunning() {
        return serverSocket != null && !serverSocket.isClosed();
    }
}