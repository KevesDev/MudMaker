DROP DATABASE IF EXISTS mudmaker;
CREATE DATABASE IF NOT EXISTS mudmaker;
USE mudmaker;


CREATE TABLE IF NOT EXISTS accounts (
    account_id SMALLINT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL DEFAULT 'guest',
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE rooms (
    room_id INTEGER AUTO_INCREMENT PRIMARY KEY,
    room_name VARCHAR(255) NOT NULL,
    room_description TEXT,
    room_zone VARCHAR(255)
);

INSERT INTO rooms (room_name, room_description, room_zone)
VALUES ('The Void', 'Somewhere in a swirling void.', 'Void');

-- Default character table that custom attributes will link to
CREATE TABLE IF NOT EXISTS characters (
    character_id MEDIUMINT AUTO_INCREMENT PRIMARY KEY,
    account_id SMALLINT NOT NULL,
    character_name VARCHAR(50) NOT NULL,
    character_description TEXT,
    character_room_id INTEGER DEFAULT 1,
    FOREIGN KEY(account_id) REFERENCES accounts(account_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY(character_room_id) REFERENCES rooms(room_id)
        ON DELETE SET NULL
        ON UPDATE CASCADE,
    CONSTRAINT unique_account_character UNIQUE (account_id, character_name)
);

-- Works as key/value mapped pairs, using java to interpret
CREATE TABLE IF NOT EXISTS character_attributes (
    character_attribute_id INTEGER AUTO_INCREMENT PRIMARY KEY,
    character_id MEDIUMINT NOT NULL,
    character_attribute_name VARCHAR(50) NOT NULL, -- the 'key'
    character_attribute_value VARCHAR(255) NOT NULL, -- the 'value'
    FOREIGN KEY(character_id) REFERENCES characters(character_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT unique_char_attr UNIQUE(character_id, character_attribute_name)
);

CREATE TABLE IF NOT EXISTS items (
    item_id INTEGER AUTO_INCREMENT PRIMARY KEY,
    item_room_id INTEGER DEFAULT 1 NULL,
    item_carrier_id MEDIUMINT, -- carrying character if any
    item_name VARCHAR(50) NOT NULL,
    item_description VARCHAR(255),
    FOREIGN KEY(item_room_id) REFERENCES rooms(room_id) ON DELETE SET NULL,
    FOREIGN KEY(item_carrier_id) REFERENCES characters(character_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS item_attributes (
    item_attribute_id INTEGER AUTO_INCREMENT PRIMARY KEY,
    item_id INTEGER NOT NULL,
    item_attribute_name VARCHAR(50) NOT NULL,
    item_attribute_value VARCHAR(255) NOT NULL,
    FOREIGN KEY(item_id) REFERENCES items(item_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT unique_item_attr UNIQUE(item_id, item_attribute_name)
);

/* character inventory, but name character_items is clearer to understand.
   Since items might have custom stats like durability or modifications,
   we can use a custom attribute to list a JSON of specific values
   that might need to be overridden, and handle/parse that in the java side.
   This also means the player might have 3 of one item type but each instance
   must be unique unless stackable.
   */
CREATE TABLE IF NOT EXISTS character_items (
    character_item_id INTEGER AUTO_INCREMENT PRIMARY KEY,
    character_id MEDIUMINT NOT NULL,
    item_id INTEGER NOT NULL,
    item_current_stack TINYINT UNSIGNED NOT NULL DEFAULT 1, -- if this goes to 0 something went wrong
    item_max_stack TINYINT UNSIGNED NOT NULL DEFAULT 1, -- 1 means no stacking
    item_instance_values JSON, -- ex. ({'durability': '10', 'mod' : 'ice dmg'})
    FOREIGN KEY(character_id) REFERENCES characters(character_id)
        ON DELETE CASCADE,
    FOREIGN KEY(item_id) REFERENCES items(item_id)
        ON DELETE CASCADE
);

CREATE TABLE room_exits (
    room_exit_id INTEGER AUTO_INCREMENT PRIMARY KEY,
    exit_from_room_id INTEGER DEFAULT 1, -- default room is 'nowhere'
    exit_to_room_id INTEGER NOT NULL, -- this MUST be set.
    room_exit_name VARCHAR(50) NOT NULL DEFAULT 'out',
    room_exit_description VARCHAR(255),
    room_exit_permissions JSON, -- Specific flags of who can pass through if locked, ex. 'admin'
    room_exit_lock SMALLINT UNSIGNED NOT NULL DEFAULT 0, -- Define as needed. ex. 0 = unlocked.
    FOREIGN KEY(exit_from_room_id) REFERENCES rooms(room_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    FOREIGN KEY(exit_to_room_id) REFERENCES rooms(room_id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT unique_exit UNIQUE (exit_from_room_id, room_exit_name)
);

-- create indexes for efficient common searches
CREATE INDEX idx_characters_account ON characters(account_id);
CREATE INDEX idx_attributes_character ON character_attributes(character_id);
CREATE INDEX idx_attributes_item ON item_attributes(item_id);
CREATE INDEX idx_character_items ON character_items(character_id, item_id);
CREATE INDEX idx_room_exits_from ON room_exits(exit_from_room_id);
CREATE INDEX idx_room_exits_to ON room_exits(exit_to_room_id);
CREATE INDEX idx_items_room ON items(item_room_id);
CREATE INDEX idx_items_carrier ON items(item_carrier_id);
CREATE INDEX idx_character_items_item ON character_items(item_id);

SHOW TABLES;