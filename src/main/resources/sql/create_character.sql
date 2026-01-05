USE mudmaker;

DELETE FROM characters WHERE character_name = 'Bob';
DELETE FROM accounts WHERE username = 'TestAccount';

INSERT INTO accounts (username, email, password_hash)
VALUES ('TestAccount', 'test@test.com', 'mytestpass');

INSERT INTO characters (account_id, character_name, character_description)
VALUES (1, 'Bob', 'A sexy beast.');

SET @char_id = LAST_INSERT_ID();

-- default attributes assigned when the character is created:
INSERT INTO character_attributes (character_id, character_attribute_name, character_attribute_value)
VALUES
    (@char_id, 'strength', '5'),
    (@char_id, 'dex', '2');