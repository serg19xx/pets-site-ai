-- Remove legacy dev login (cascade: auth, pets, posts, etc. owned by this user).
DELETE FROM users WHERE email = 'master@pets.local';
