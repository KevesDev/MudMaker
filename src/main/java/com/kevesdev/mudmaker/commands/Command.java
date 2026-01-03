package com.kevesdev.mudmaker.commands;

public class Command {
    private String name; // ex. 'say'
    private String[] args;
    private String senderId;

    public Command(String name, String[] args, String senderId) {
        this.name = name;
        this.args = args;
        this.senderId = senderId;
    }

    public String getName() {
        return name;
    }

    public String[] getArgs() {
        return args;
    }

    public String getSenderId() {
        return senderId;
    }
}
