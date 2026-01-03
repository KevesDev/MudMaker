package com.kevesdev.mudmaker.ui.panels;

import com.kevesdev.mudmaker.commands.Command;
import com.kevesdev.mudmaker.commands.CommandManager;
import com.kevesdev.mudmaker.commands.CommandParser;

import javax.swing.*;
import javax.swing.border.Border;
import java.awt.*;

public class GamePanel extends JPanel {

    private JTextArea outputArea;
    private JTextField inputField;
    private JButton sendButton;
    private CommandManager commandManager;

    public GamePanel(CommandManager commandManager) {
        this.commandManager = commandManager;

        setLayout(new BorderLayout());

        // Output area
        outputArea = new JTextArea();
        outputArea.setEditable(false);
        outputArea.setLineWrap(true);
        outputArea.setWrapStyleWord(true);
        outputArea.setForeground(Color.GREEN);
        outputArea.setBackground(Color.BLACK);
        outputArea.setCaretColor(Color.GREEN);
        outputArea.setBorder(
                BorderFactory.createCompoundBorder(
                        outputArea.getBorder(),
                        BorderFactory.createEmptyBorder(5, 8, 5, 8)
                )
        );
        JScrollPane scrollPane = new JScrollPane(outputArea);

        // Input field
        inputField = new JTextField();
        inputField.setBackground(Color.DARK_GRAY);
        inputField.setForeground(Color.WHITE);
        inputField.setBorder(
                BorderFactory.createCompoundBorder(
                        inputField.getBorder(),
                        BorderFactory.createEmptyBorder(5, 8, 5, 8)
                )
        );
        inputField.addActionListener(e -> handleInput());

        // Send button
        sendButton = new JButton("Send");
        sendButton.addActionListener(e -> handleInput());

        // Input panel at bottom
        JPanel inputPanel = new JPanel();
        inputPanel.setLayout(new BorderLayout());
        inputPanel.add(inputField, BorderLayout.CENTER);
        inputPanel.add(sendButton, BorderLayout.EAST);

        // Add components to main panel
        add(scrollPane, BorderLayout.CENTER);
        add(inputPanel, BorderLayout.SOUTH);
    }

    // Append text to the output area
    public void appendOutput(String text) {
        outputArea.append(text + "\n");
        outputArea.setCaretPosition(outputArea.getDocument().getLength());
    }

    // Handle input from field or send button
    private void handleInput() {
        String input = inputField.getText().trim();
        if (input.isEmpty()) return;

        appendOutput("> " + input); // echo locally
        inputField.setText("");

        // Parse and execute command
        CommandParser parser = new CommandParser();
        Command cmd = parser.parse(input, "Admin");
        commandManager.getRegistry().execute(cmd);
    }
}
