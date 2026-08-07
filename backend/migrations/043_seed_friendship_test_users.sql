-- Local/demo seed: two owners with same-species cats for friendship testing.
-- Password for both: SeedPets1!
-- Idempotent by email / (user_id + pet name).

-- bcrypt hash of SeedPets1! (cost 12)
-- $2b$12$0.SufTUjk9zZy/NFpqoj2.pqB5f5fYXU06GHVBF3X9MLHUj8O3GHe

WITH inserted_users AS (
  INSERT INTO users (
    full_name,
    nickname,
    gender,
    date_of_birth,
    email,
    email_verified_at,
    is_beta_tester,
    beta_terms_accepted_at,
    show_full_name,
    show_nickname
  )
  VALUES
    (
      'Maria Catlover',
      'maria_cats',
      'female',
      '1992-04-12',
      'maria.catlover@petsbook.local',
      NOW(),
      TRUE,
      NOW(),
      TRUE,
      TRUE
    ),
    (
      'Alex Paws',
      'alex_paws',
      'male',
      '1988-09-03',
      'alex.paws@petsbook.local',
      NOW(),
      TRUE,
      NOW(),
      TRUE,
      TRUE
    )
  ON CONFLICT (email) DO UPDATE
  SET
    full_name = EXCLUDED.full_name,
    nickname = EXCLUDED.nickname,
    email_verified_at = COALESCE(users.email_verified_at, EXCLUDED.email_verified_at),
    is_beta_tester = TRUE,
    beta_terms_accepted_at = COALESCE(users.beta_terms_accepted_at, EXCLUDED.beta_terms_accepted_at),
    updated_at = NOW()
  RETURNING id, email
),
auth AS (
  INSERT INTO user_auth (user_id, password_hash, must_change_password)
  SELECT
    u.id,
    '$2b$12$0.SufTUjk9zZy/NFpqoj2.pqB5f5fYXU06GHVBF3X9MLHUj8O3GHe',
    FALSE
  FROM inserted_users u
  ON CONFLICT (user_id) DO UPDATE
  SET
    password_hash = EXCLUDED.password_hash,
    must_change_password = FALSE,
    password_updated_at = NOW()
  RETURNING user_id
)
SELECT COUNT(*) AS seeded_users FROM auth;

-- Maria: 3 cats
WITH maria AS (
  SELECT id AS user_id FROM users WHERE email = 'maria.catlover@petsbook.local'
),
cat AS (
  SELECT id AS species_id FROM pet_species WHERE slug = 'cat' LIMIT 1
),
breed_dsh AS (
  SELECT id AS breed_id FROM pet_breeds
  WHERE species_id = (SELECT species_id FROM cat) AND label = 'Domestic Shorthair'
  LIMIT 1
),
breed_maine AS (
  SELECT id AS breed_id FROM pet_breeds
  WHERE species_id = (SELECT species_id FROM cat) AND label = 'Maine Coon'
  LIMIT 1
),
breed_siamese AS (
  SELECT id AS breed_id FROM pet_breeds
  WHERE species_id = (SELECT species_id FROM cat) AND label = 'Siamese'
  LIMIT 1
)
INSERT INTO pets (
  user_id, name, species_id, breed_id, date_of_birth, sex,
  description, greeting, greeting_fr, virtual_life_enabled
)
SELECT
  m.user_id,
  v.name,
  c.species_id,
  v.breed_id,
  v.dob,
  v.sex::pet_sex,
  v.description,
  v.greeting,
  v.greeting_fr,
  TRUE
FROM maria m
CROSS JOIN cat c
CROSS JOIN (
  VALUES
    (
      'Mochi',
      (SELECT breed_id FROM breed_dsh),
      DATE '2021-03-15',
      'female',
      'A curious apartment cat who loves windowsills.',
      'Hi! I''m Mochi, a curious little cat. Come say hello!',
      'Salut ! Je suis Mochi, une petite chatte curieuse. Viens me dire bonjour !'
    ),
    (
      'Nori',
      (SELECT breed_id FROM breed_maine),
      DATE '2019-11-02',
      'male',
      'Big fluffy boy with a soft voice.',
      'Hey there! I''m Nori, a big fluffy cat ready to make friends.',
      'Salut ! Je suis Nori, un gros chat tout doux prêt à se faire des amis.'
    ),
    (
      'Pixel',
      (SELECT breed_id FROM breed_siamese),
      DATE '2023-01-20',
      'female',
      'Talkative Siamese who runs the household.',
      'Hello! I''m Pixel. I have opinions and I share them loudly.',
      'Bonjour ! Je suis Pixel. J''ai des opinions et je les partage fort.'
    )
) AS v(name, breed_id, dob, sex, description, greeting, greeting_fr)
WHERE NOT EXISTS (
  SELECT 1 FROM pets p WHERE p.user_id = m.user_id AND p.name = v.name
);

-- Alex: 2 cats + 1 dog
WITH alex AS (
  SELECT id AS user_id FROM users WHERE email = 'alex.paws@petsbook.local'
),
cat AS (
  SELECT id AS species_id FROM pet_species WHERE slug = 'cat' LIMIT 1
),
dog AS (
  SELECT id AS species_id FROM pet_species WHERE slug = 'dog' LIMIT 1
),
breed_brit AS (
  SELECT id AS breed_id FROM pet_breeds
  WHERE species_id = (SELECT species_id FROM cat) AND label = 'British Shorthair'
  LIMIT 1
),
breed_mix_cat AS (
  SELECT id AS breed_id FROM pet_breeds
  WHERE species_id = (SELECT species_id FROM cat) AND label = 'Mixed breed'
  LIMIT 1
),
breed_lab AS (
  SELECT id AS breed_id FROM pet_breeds
  WHERE species_id = (SELECT species_id FROM dog) AND label = 'Labrador Retriever'
  LIMIT 1
)
INSERT INTO pets (
  user_id, name, species_id, breed_id, date_of_birth, sex,
  description, greeting, greeting_fr, virtual_life_enabled
)
SELECT
  a.user_id,
  v.name,
  v.species_id,
  v.breed_id,
  v.dob,
  v.sex::pet_sex,
  v.description,
  v.greeting,
  v.greeting_fr,
  TRUE
FROM alex a
CROSS JOIN (
  VALUES
    (
      'Luna',
      (SELECT species_id FROM cat),
      (SELECT breed_id FROM breed_brit),
      DATE '2020-07-08',
      'female',
      'Calm British Shorthair who naps in sunbeams.',
      'Hi! I''m Luna. Soft paws, quieter purrs, always ready for a gentle friend.',
      'Salut ! Je suis Luna. Des pattes douces, un ronron tranquille, prête pour un ami gentil.'
    ),
    (
      'Bean',
      (SELECT species_id FROM cat),
      (SELECT breed_id FROM breed_mix_cat),
      DATE '2022-05-30',
      'male',
      'Playful mixed-breed cat who chases paper balls.',
      'Hey! I''m Bean. Got a paper ball? Let''s be friends!',
      'Salut ! Je suis Bean. Tu as une boule de papier ? On devient amis !'
    ),
    (
      'Scout',
      (SELECT species_id FROM dog),
      (SELECT breed_id FROM breed_lab),
      DATE '2018-02-14',
      'male',
      'Friendly Labrador who loves walks and new dog friends.',
      'Woof! I''m Scout. Always happy to meet another dog!',
      'Ouaf ! Je suis Scout. Toujours content de rencontrer un autre chien !'
    )
) AS v(name, species_id, breed_id, dob, sex, description, greeting, greeting_fr)
WHERE NOT EXISTS (
  SELECT 1 FROM pets p WHERE p.user_id = a.user_id AND p.name = v.name
);
