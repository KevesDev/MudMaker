package com.kevesdev.mudmaker.commands.cmdsets;

import com.kevesdev.mudmaker.commands.*;

public class CmdInteract extends CommandSet {

    @Override
    public void registerCommands(CommandRegistry registry) {
        // Example: 'say' command using a lambda executor
        registry.register("say", cmd -> {
            String message = String.join(" ", cmd.getArgs());
            System.out.println("Player says: " + message);
        });

        // You can add look, tell, whisper, shout later
    }
}
