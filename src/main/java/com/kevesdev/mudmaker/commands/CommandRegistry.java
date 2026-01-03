package com.kevesdev.mudmaker.commands;

import java.util.HashMap;
import java.util.Map;

public class CommandRegistry {

    private Map<String, CommandExecutor> registry = new HashMap<>();

    // register new command
    public void register(String name, CommandExecutor executor) {
        registry.put(name.toLowerCase(), executor);
    }

    public void execute(Command cmd) {
        CommandExecutor executor = registry.get(cmd.getName().toLowerCase());
        if (executor != null) {
            executor.execute(cmd); // call the executor with the Command
        } else {
            System.out.println("Unknown command: " + cmd.getName());
        }
    }
}
