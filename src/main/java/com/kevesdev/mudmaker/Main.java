package com.kevesdev.mudmaker;


import com.kevesdev.mudmaker.commands.CommandManager;
import com.kevesdev.mudmaker.server.GameServer;
import com.kevesdev.mudmaker.server.ServerManager;
import com.kevesdev.mudmaker.ui.panels.ConnectionPanel;
import com.kevesdev.mudmaker.ui.panels.GamePanel;

import javax.swing.*;
import java.awt.*;
import java.awt.event.KeyEvent;

public class Main {

    private static CommandManager commandManager;

    public static void main(String[] args) {
        System.out.print("Starting Mudmaker...");
        commandManager = new CommandManager();

        ServerManager manager = new ServerManager(4000, commandManager);

        JFrame frame = new JFrame();
        frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        frame.setSize(800, 600);
        frame.setTitle("Mudmaker");
        frame.getContentPane().setBackground(Color.darkGray);

        JTabbedPane tabs = new JTabbedPane();
        JPanel connectionTab = new ConnectionPanel(manager); // for setting up and enabling connections/ports
        JPanel gameTab = new GamePanel(commandManager); // main window for testplaying and administration
        JPanel CommandsTab = new JPanel(); // For setting and managing user input commands
        JPanel ObjectsTab = new JPanel(); // For creating and managing game objects.

        tabs.addTab("Connection", connectionTab);
        tabs.addTab("Game", gameTab);
        tabs.addTab("Commands", CommandsTab);
        tabs.addTab("Objects", ObjectsTab);

        frame.add(tabs);

        frame.setVisible(true);
    }

    public static CommandManager getCommandManager() {
        return commandManager;
    }
}