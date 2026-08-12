-- Soft-launch showcase content: replace ugly "Seed Pet" noise with readable demo.
-- 5 local-looking owners (@petsbook.local), pets with greetings (SVG avatars OK),
-- text feed posts, and active marketplace listings (Montreal area).
-- Password for all demo accounts: SeedPets1!
-- Hash: $2b$12$0.SufTUjk9zZy/NFpqoj2.pqB5f5fYXU06GHVBF3X9MLHUj8O3GHe

-- 1) Remove auto-generated seed pets from gallery (clear links first)
WITH seed AS (
  SELECT id FROM pets WHERE name LIKE 'Seed Pet %'
)
DELETE FROM pet_parents
WHERE linked_pet_id IN (SELECT id FROM seed)
   OR pet_id IN (SELECT id FROM seed);

WITH seed AS (
  SELECT id FROM pets WHERE name LIKE 'Seed Pet %'
)
DELETE FROM pet_friendships
WHERE pet_a_id IN (SELECT id FROM seed)
   OR pet_b_id IN (SELECT id FROM seed);

WITH seed AS (
  SELECT id FROM pets WHERE name LIKE 'Seed Pet %'
)
DELETE FROM pet_friendship_suggestions
WHERE from_pet_id IN (SELECT id FROM seed)
   OR to_pet_id IN (SELECT id FROM seed);

DELETE FROM pets WHERE name LIKE 'Seed Pet %';

-- 2) Drop empty feed posts (often leftover media-only tests)
DELETE FROM posts WHERE body IS NULL OR btrim(body) = '';

-- 3) Five showcase owners (idempotent by email)
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
      'Camille Bergeron',
      'camille_b',
      'female',
      '1991-05-18',
      'camille.bergeron@petsbook.local',
      NOW(),
      TRUE,
      NOW(),
      TRUE,
      TRUE
    ),
    (
      'Julien Moreau',
      'julien_m',
      'male',
      '1987-09-02',
      'julien.moreau@petsbook.local',
      NOW(),
      TRUE,
      NOW(),
      TRUE,
      TRUE
    ),
    (
      'Sophie Chen',
      'sophie_c',
      'female',
      '1994-01-22',
      'sophie.chen@petsbook.local',
      NOW(),
      TRUE,
      NOW(),
      TRUE,
      TRUE
    ),
    (
      'Nadia Tremblay',
      'nadia_t',
      'female',
      '1989-11-07',
      'nadia.tremblay@petsbook.local',
      NOW(),
      TRUE,
      NOW(),
      TRUE,
      TRUE
    ),
    (
      'Omar Hassan',
      'omar_h',
      'male',
      '1990-03-30',
      'omar.hassan@petsbook.local',
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
)
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
  password_updated_at = NOW();

-- 4) Pets (1–3 each). No cover photos → species SVG placeholders.
WITH owners AS (
  SELECT id AS user_id, email FROM users
  WHERE email IN (
    'camille.bergeron@petsbook.local',
    'julien.moreau@petsbook.local',
    'sophie.chen@petsbook.local',
    'nadia.tremblay@petsbook.local',
    'omar.hassan@petsbook.local'
  )
),
species AS (
  SELECT slug, id AS species_id FROM pet_species
),
breeds AS (
  SELECT pb.id AS breed_id, pb.label, ps.slug AS species_slug
  FROM pet_breeds pb
  JOIN pet_species ps ON ps.id = pb.species_id
),
wanted AS (
  SELECT * FROM (
    VALUES
      (
        'camille.bergeron@petsbook.local',
        'Maple',
        'cat',
        'Domestic Shorthair',
        DATE '2022-04-12',
        'female',
        'Apartment cat in the Plateau who owns the windowsill.',
        'Hi! I''m Maple. Sunbeam hunter and professional napper.',
        'Salut ! Je suis Maple. Chasseuse de rayons de soleil et pro de la sieste.'
      ),
      (
        'camille.bergeron@petsbook.local',
        'Biscuit',
        'cat',
        'Maine Coon',
        DATE '2020-08-03',
        'male',
        'Fluffy roommate who greets guests at the door.',
        'Hey! I''m Biscuit, the fluffy welcoming committee.',
        'Salut ! Je suis Biscuit, le comité d''accueil tout doux.'
      ),
      (
        'julien.moreau@petsbook.local',
        'Rio',
        'dog',
        'Labrador Retriever',
        DATE '2019-06-20',
        'male',
        'Laval park regular. Loves fetch and lake days.',
        'Woof! I''m Rio. Got a ball? Let''s go!',
        'Wouf ! Je suis Rio. Une balle ? On y va !'
      ),
      (
        'sophie.chen@petsbook.local',
        'Mochi',
        'rabbit',
        NULL,
        DATE '2023-02-14',
        'female',
        'Quiet Verdun bunny who steals banana slices.',
        'Hello! I''m Mochi the rabbit. Soft ears, strong opinions about snacks.',
        'Bonjour ! Je suis Mochi le lapin. Oreilles douces, avis fermes sur les collations.'
      ),
      (
        'sophie.chen@petsbook.local',
        'Ink',
        'cat',
        'Siamese',
        DATE '2021-12-01',
        'male',
        'Talkative Siamese who narrates every grocery bag.',
        'Hi! I''m Ink. I comment on everything — especially dinner.',
        'Salut ! Je suis Ink. Je commente tout — surtout le souper.'
      ),
      (
        'nadia.tremblay@petsbook.local',
        'Nova',
        'dog',
        'Golden Retriever',
        DATE '2018-10-09',
        'female',
        'South Shore golden who believes every stranger is a friend.',
        'Hi! I''m Nova. New friends make my day.',
        'Salut ! Je suis Nova. Les nouveaux amis font ma journée.'
      ),
      (
        'nadia.tremblay@petsbook.local',
        'Pebble',
        'cat',
        'British Shorthair',
        DATE '2022-07-19',
        'female',
        'Round face, calm energy, expert cardboard-box tester.',
        'Hello! I''m Pebble. Got a box? It''s mine now.',
        'Bonjour ! Je suis Pebble. Une boîte ? Elle est à moi.'
      ),
      (
        'omar.hassan@petsbook.local',
        'Koda',
        'dog',
        'Mixed breed',
        DATE '2020-01-28',
        'male',
        'Mile End mutt who knows every café patio.',
        'Hey! I''m Koda. Walks, snacks, and more walks.',
        'Salut ! Je suis Koda. Promenades, collations, et encore des promenades.'
      ),
      (
        'omar.hassan@petsbook.local',
        'Pip',
        'hamster',
        NULL,
        DATE '2025-11-02',
        'unknown',
        'Tiny night athlete on the wheel.',
        'Hi! I''m Pip. I train at midnight.',
        'Salut ! Je suis Pip. Je m''entraîne à minuit.'
      ),
      (
        'omar.hassan@petsbook.local',
        'Cleo',
        'cat',
        'Domestic Shorthair',
        DATE '2017-05-11',
        'female',
        'Senior queen of the couch. Soft but in charge.',
        'Hello! I''m Cleo. Respect the nap schedule.',
        'Bonjour ! Je suis Cleo. Respectez l''horaire des siestes.'
      )
  ) AS v(
    email, name, species_slug, breed_label, dob, sex,
    description, greeting, greeting_fr
  )
)
INSERT INTO pets (
  user_id, name, species_id, breed_id, date_of_birth, sex,
  description, greeting, greeting_fr, virtual_life_enabled, cover_photo_id
)
SELECT
  o.user_id,
  w.name,
  s.species_id,
  b.breed_id,
  w.dob,
  w.sex::pet_sex,
  w.description,
  w.greeting,
  w.greeting_fr,
  TRUE,
  NULL
FROM wanted w
JOIN owners o ON o.email = w.email
JOIN species s ON s.slug = w.species_slug
LEFT JOIN breeds b
  ON b.species_slug = w.species_slug
 AND w.breed_label IS NOT NULL
 AND b.label = w.breed_label
WHERE NOT EXISTS (
  SELECT 1 FROM pets p
  WHERE p.user_id = o.user_id AND p.name = w.name
);

-- 5) Feed posts (text only — no junk screenshots)
WITH authors AS (
  SELECT id AS user_id, email FROM users
  WHERE email IN (
    'camille.bergeron@petsbook.local',
    'julien.moreau@petsbook.local',
    'sophie.chen@petsbook.local',
    'nadia.tremblay@petsbook.local',
    'omar.hassan@petsbook.local'
  )
),
wanted_posts AS (
  SELECT * FROM (
    VALUES
      (
        'camille.bergeron@petsbook.local',
        'Sunday sunbeam shift on the Plateau. Maple claimed the chair; Biscuit claimed me. Soft-launch life.',
        NOW() - INTERVAL '2 days'
      ),
      (
        'julien.moreau@petsbook.local',
        'Rio discovered the fountain at Parc de la Fontaine. 10/10 would splash again. Any other Labrador fans in Laval?',
        NOW() - INTERVAL '1 day 4 hours'
      ),
      (
        'sophie.chen@petsbook.local',
        'New rabbit chew toys arrived. Mochi approved in 12 seconds. Ink narrated the unboxing.',
        NOW() - INTERVAL '18 hours'
      ),
      (
        'nadia.tremblay@petsbook.local',
        'First long walk of the week on the South Shore. Nova made three new friends before we reached the corner.',
        NOW() - INTERVAL '12 hours'
      ),
      (
        'omar.hassan@petsbook.local',
        'Café patio etiquette with Koda: sit, wait, accept one polite sniff. Pip is training for the night Olympics at home.',
        NOW() - INTERVAL '8 hours'
      ),
      (
        'camille.bergeron@petsbook.local',
        'Looking for a calm groomer recommendation near Mont-Royal — preferably bilingual. Thanks!',
        NOW() - INTERVAL '5 hours'
      ),
      (
        'julien.moreau@petsbook.local',
        'Winter tip: keep a towel by the door. Rio invents new kinds of mud every thaw.',
        NOW() - INTERVAL '3 hours'
      ),
      (
        'nadia.tremblay@petsbook.local',
        'Pebble discovered the empty Amazon box. Productivity for the rest of us: zero.',
        NOW() - INTERVAL '90 minutes'
      )
  ) AS v(email, body, created_at)
)
INSERT INTO posts (user_id, body, created_at, updated_at)
SELECT a.user_id, w.body, w.created_at, w.created_at
FROM wanted_posts w
JOIN authors a ON a.email = w.email
WHERE NOT EXISTS (
  SELECT 1 FROM posts p
  WHERE p.user_id = a.user_id AND p.body = w.body
);

-- 6) Marketplace listings (up to 10, Montreal region, mixed types)
WITH sellers AS (
  SELECT id AS user_id, email FROM users
  WHERE email IN (
    'camille.bergeron@petsbook.local',
    'julien.moreau@petsbook.local',
    'sophie.chen@petsbook.local',
    'nadia.tremblay@petsbook.local',
    'omar.hassan@petsbook.local'
  )
),
wanted_listings AS (
  SELECT * FROM (
    VALUES
      (
        'julien.moreau@petsbook.local',
        'sell',
        'Large dog crate — barely used',
        '36" wire crate with divider. Used for a few months for Rio as a puppy. Clean, all panels included. Pickup in Laval.',
        60.00,
        'Laval',
        NOW() - INTERVAL '4 days'
      ),
      (
        'camille.bergeron@petsbook.local',
        'sell',
        'Cat tower + scratching posts bundle',
        'Tall condo-friendly tower plus two spare sisal posts. Moving and need it gone. Cats approved it for two years.',
        45.00,
        'Montréal',
        NOW() - INTERVAL '3 days'
      ),
      (
        'sophie.chen@petsbook.local',
        'sell',
        'Rabbit hay rack and litter pan',
        'Corner hay rack and medium litter pan. Washed and ready. Great starter setup for a house rabbit.',
        20.00,
        'Verdun',
        NOW() - INTERVAL '3 days'
      ),
      (
        'nadia.tremblay@petsbook.local',
        'buy',
        'Looking for gently used car harness (medium dog)',
        'Need a crash-tested style harness for Nova (Golden, ~28 kg). Prefer pickup on the South Shore.',
        NULL,
        'Longueuil',
        NOW() - INTERVAL '2 days'
      ),
      (
        'omar.hassan@petsbook.local',
        'service',
        'Weekend dog walks — Mile End / Plateau',
        'Reliable 30–45 min walks on weekends. Comfortable with friendly dogs. Message with neighbourhood and schedule.',
        25.00,
        'Montréal',
        NOW() - INTERVAL '2 days'
      ),
      (
        'julien.moreau@petsbook.local',
        'exchange',
        'Trade: unused puzzle feeder for tennis ball pack',
        'Have a slow-feeder puzzle toy (dog). Looking for a pack of tennis balls. Meet in Laval or near metro.',
        NULL,
        'Laval',
        NOW() - INTERVAL '36 hours'
      ),
      (
        'camille.bergeron@petsbook.local',
        'sell',
        'Automatic pet fountain (2L)',
        'Quiet USB fountain. Filter set included. Cats drank more water with it. Pickup near Mont-Royal metro.',
        30.00,
        'Montréal',
        NOW() - INTERVAL '30 hours'
      ),
      (
        'sophie.chen@petsbook.local',
        'buy',
        'Wanted: second-hand carrier for medium cat',
        'Hard or soft carrier OK. Need something sturdy for vet visits. Prefer Verdun / Sud-Ouest pickup.',
        NULL,
        'Verdun',
        NOW() - INTERVAL '20 hours'
      ),
      (
        'nadia.tremblay@petsbook.local',
        'service',
        'Basic nail trim for calm dogs (home visit South Shore)',
        'Mobile nail trim for cooperative dogs. Bring your own towel. Booking evenings this month.',
        35.00,
        'Longueuil',
        NOW() - INTERVAL '10 hours'
      ),
      (
        'omar.hassan@petsbook.local',
        'sell',
        'Hamster starter kit leftovers',
        'Unused wheel (silent) and ceramic hideout. Pip outgrew the starter cage accessories. Cash or Interac.',
        15.00,
        'Montréal',
        NOW() - INTERVAL '6 hours'
      )
  ) AS v(
    email, type, title, description, price_amount, city, created_at
  )
)
INSERT INTO marketplace_listings (
  user_id, type, title, description, price_amount, price_currency,
  city, contact_method, status, created_at, updated_at
)
SELECT
  s.user_id,
  w.type,
  w.title,
  w.description,
  w.price_amount,
  'CAD',
  w.city,
  'in_app',
  'active',
  w.created_at,
  w.created_at
FROM wanted_listings w
JOIN sellers s ON s.email = w.email
WHERE NOT EXISTS (
  SELECT 1 FROM marketplace_listings l
  WHERE l.user_id = s.user_id AND l.title = w.title
);
