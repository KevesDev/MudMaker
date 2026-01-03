package com.kevesdev.mudmaker.ui.panels;

import com.kevesdev.mudmaker.server.ServerManager;
import javax.swing.*;
import javax.swing.border.Border;
import java.awt.*;
import java.io.IOException;

public class ConnectionPanel extends JPanel {

    private JTextArea outputArea;
    private ServerManager manager;

    public ConnectionPanel(ServerManager manager) {
        this.manager = manager;

        setLayout(new BorderLayout());
        setBackground(Color.DARK_GRAY);
        setForeground(Color.WHITE);

        outputArea = new JTextArea();
        outputArea.setEditable(false);
        outputArea.setLineWrap(true);
        outputArea.setWrapStyleWord(true);
        outputArea.setForeground(Color.PINK);
        outputArea.setBackground(Color.BLACK);
        outputArea.setCaretColor(Color.PINK);
        outputArea.setBorder(
                BorderFactory.createCompoundBorder(
                        outputArea.getBorder(),
                        BorderFactory.createEmptyBorder(5, 8, 5, 8)
                )
        );
        JScrollPane scrollPane = new JScrollPane(outputArea);

        JButton startButton = new JButton("Start Server");
        JButton stopButton = new JButton("Stop Server");

        startButton.addActionListener(e -> {
            try {
                manager.startServer(message -> updateWindow(message));
            } catch (IOException ex) {
                ex.printStackTrace();
            }
        });

        stopButton.addActionListener(e -> {
            try {
                manager.stopServer();
            } catch (IOException ex) {
                ex.printStackTrace();
            }
        });
        JPanel inputPanel = new JPanel();
        inputPanel.setLayout(new BorderLayout());

        inputPanel.add(startButton, BorderLayout.WEST);
        inputPanel.add(stopButton, BorderLayout.EAST);

        add(scrollPane, BorderLayout.CENTER);
        add(inputPanel, BorderLayout.SOUTH);
    }

    public void updateWindow(String message) {
        SwingUtilities.invokeLater(() -> {
            outputArea.append(message + "\n");
            outputArea.setCaretPosition(outputArea.getDocument().getLength());
        });
    }

    public ServerManager getManager() {
        return manager;
    }

    public void setManager(ServerManager manager) throws IOException {
        if (this.manager != null) {
            if (this.manager.isRunning()) {
                this.manager.stopServer();
            }
        }
        this.manager = manager;
    }
}
