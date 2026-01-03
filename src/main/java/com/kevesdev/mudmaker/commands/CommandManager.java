package com.kevesdev.mudmaker.commands;

import com.kevesdev.mudmaker.commands.cmdsets.CmdInteract;

public class CommandManager {

    private final CommandRegistry registry;
    private final CommandParser parser;

    public CommandManager() {
        registry = new CommandRegistry();
        parser = new CommandParser();
        initializeCommandSets();
    }

    private void initializeCommandSets() {
        CmdInteract interactSet = new CmdInteract();
        interactSet.registerCommands(registry);
    }

    public CommandRegistry getRegistry() {
        return registry;
    }

    public CommandParser getParser() {
        return parser;
    }
}