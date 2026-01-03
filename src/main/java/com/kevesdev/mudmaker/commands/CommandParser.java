package com.kevesdev.mudmaker.commands;

public class CommandParser {

    // Now takes a senderId along with the input
    public Command parse(String input, String senderId) {
        input = input.trim();
        if (input.isEmpty()) return null;

        String[] parts = input.split("\\s+"); // split by spaces
        String name = parts[0];
        String[] args = new String[parts.length - 1];
        System.arraycopy(parts, 1, args, 0, args.length);

        return new Command(name, args, senderId);
    }
}