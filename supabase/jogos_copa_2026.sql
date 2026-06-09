-- Copa do Mundo 2026 — Fase de Grupos (todos os 48 jogos)
-- Horários em BRT (UTC-3). Fonte: FIFA/ESPN/Olympics.com
-- Grupos: A-L, 4 times cada, 3 jogos por time

insert into public.matches (home_team, away_team, home_flag, away_flag, match_date, stage, group_name) values

-- ===== GRUPO A: México, África do Sul, Coreia do Sul, Tchéquia =====
('México',         'África do Sul',  'MX', 'ZA', '2026-06-11T22:00:00-03:00', 'Grupos', 'A'),
('Coreia do Sul',  'Tchéquia',       'KR', 'CZ', '2026-06-11T19:00:00-03:00', 'Grupos', 'A'),
('México',         'Coreia do Sul',  'MX', 'KR', '2026-06-17T19:00:00-03:00', 'Grupos', 'A'),
('África do Sul',  'Tchéquia',       'ZA', 'CZ', '2026-06-17T16:00:00-03:00', 'Grupos', 'A'),
('México',         'Tchéquia',       'MX', 'CZ', '2026-06-22T16:00:00-03:00', 'Grupos', 'A'),
('Coreia do Sul',  'África do Sul',  'KR', 'ZA', '2026-06-22T16:00:00-03:00', 'Grupos', 'A'),

-- ===== GRUPO B: Canadá, Suíça, Qatar, Bósnia-Herzegovina =====
('Canadá',              'Bósnia-Herzegovina', 'CA', 'BA', '2026-06-12T19:00:00-03:00', 'Grupos', 'B'),
('Suíça',               'Qatar',              'CH', 'QA', '2026-06-12T16:00:00-03:00', 'Grupos', 'B'),
('Canadá',              'Qatar',              'CA', 'QA', '2026-06-18T19:00:00-03:00', 'Grupos', 'B'),
('Bósnia-Herzegovina',  'Suíça',              'BA', 'CH', '2026-06-18T16:00:00-03:00', 'Grupos', 'B'),
('Canadá',              'Suíça',              'CA', 'CH', '2026-06-23T16:00:00-03:00', 'Grupos', 'B'),
('Qatar',               'Bósnia-Herzegovina', 'QA', 'BA', '2026-06-23T16:00:00-03:00', 'Grupos', 'B'),

-- ===== GRUPO C: Brasil, Marrocos, Haiti, Escócia =====
('Brasil',    'Marrocos', 'BR', 'MA', '2026-06-13T19:00:00-03:00', 'Grupos', 'C'),
('Haiti',     'Escócia',  'HT', 'GB', '2026-06-13T16:00:00-03:00', 'Grupos', 'C'),
('Brasil',    'Haiti',    'BR', 'HT', '2026-06-19T22:00:00-03:00', 'Grupos', 'C'),
('Marrocos',  'Escócia',  'MA', 'GB', '2026-06-19T19:00:00-03:00', 'Grupos', 'C'),
('Brasil',    'Escócia',  'BR', 'GB', '2026-06-24T19:00:00-03:00', 'Grupos', 'C'),
('Haiti',     'Marrocos', 'HT', 'MA', '2026-06-24T19:00:00-03:00', 'Grupos', 'C'),

-- ===== GRUPO D: Estados Unidos, Paraguai, Austrália, Turquia =====
('Estados Unidos', 'Paraguai',  'US', 'PY', '2026-06-12T22:00:00-03:00', 'Grupos', 'D'),
('Austrália',      'Turquia',   'AU', 'TR', '2026-06-13T16:00:00-03:00', 'Grupos', 'D'),
('Estados Unidos', 'Austrália', 'US', 'AU', '2026-06-18T22:00:00-03:00', 'Grupos', 'D'),
('Paraguai',       'Turquia',   'PY', 'TR', '2026-06-18T19:00:00-03:00', 'Grupos', 'D'),
('Estados Unidos', 'Turquia',   'US', 'TR', '2026-06-23T16:00:00-03:00', 'Grupos', 'D'),
('Paraguai',       'Austrália', 'PY', 'AU', '2026-06-23T16:00:00-03:00', 'Grupos', 'D'),

-- ===== GRUPO E: Alemanha, Curaçao, Costa do Marfim, Equador =====
('Alemanha',        'Curaçao',         'DE', 'CW', '2026-06-14T14:00:00-03:00', 'Grupos', 'E'),
('Costa do Marfim', 'Equador',         'CI', 'EC', '2026-06-14T20:00:00-03:00', 'Grupos', 'E'),
('Alemanha',        'Costa do Marfim', 'DE', 'CI', '2026-06-20T19:00:00-03:00', 'Grupos', 'E'),
('Curaçao',         'Equador',         'CW', 'EC', '2026-06-20T16:00:00-03:00', 'Grupos', 'E'),
('Alemanha',        'Equador',         'DE', 'EC', '2026-06-25T16:00:00-03:00', 'Grupos', 'E'),
('Curaçao',         'Costa do Marfim', 'CW', 'CI', '2026-06-25T16:00:00-03:00', 'Grupos', 'E'),

-- ===== GRUPO F: Holanda, Japão, Suécia, Tunísia =====
('Holanda',  'Japão',   'NL', 'JP', '2026-06-14T17:00:00-03:00', 'Grupos', 'F'),
('Suécia',   'Tunísia', 'SE', 'TN', '2026-06-14T23:00:00-03:00', 'Grupos', 'F'),
('Holanda',  'Suécia',  'NL', 'SE', '2026-06-20T22:00:00-03:00', 'Grupos', 'F'),
('Japão',    'Tunísia', 'JP', 'TN', '2026-06-20T19:00:00-03:00', 'Grupos', 'F'),
('Holanda',  'Tunísia', 'NL', 'TN', '2026-06-25T19:00:00-03:00', 'Grupos', 'F'),
('Japão',    'Suécia',  'JP', 'SE', '2026-06-25T19:00:00-03:00', 'Grupos', 'F'),

-- ===== GRUPO G: Bélgica, Egito, Irã, Nova Zelândia =====
('Bélgica',      'Egito',        'BE', 'EG', '2026-06-15T19:00:00-03:00', 'Grupos', 'G'),
('Irã',          'Nova Zelândia','IR', 'NZ', '2026-06-16T01:00:00-03:00', 'Grupos', 'G'),
('Bélgica',      'Irã',          'BE', 'IR', '2026-06-21T16:00:00-03:00', 'Grupos', 'G'),
('Egito',        'Nova Zelândia','EG', 'NZ', '2026-06-21T19:00:00-03:00', 'Grupos', 'G'),
('Bélgica',      'Nova Zelândia','BE', 'NZ', '2026-06-26T16:00:00-03:00', 'Grupos', 'G'),
('Egito',        'Irã',          'EG', 'IR', '2026-06-26T16:00:00-03:00', 'Grupos', 'G'),

-- ===== GRUPO H: Espanha, Cabo Verde, Arábia Saudita, Uruguai =====
('Espanha',        'Cabo Verde',   'ES', 'CV', '2026-06-15T14:00:00-03:00', 'Grupos', 'H'),
('Arábia Saudita', 'Uruguai',      'SA', 'UY', '2026-06-15T19:00:00-03:00', 'Grupos', 'H'),
('Espanha',        'Arábia Saudita','ES','SA', '2026-06-21T22:00:00-03:00', 'Grupos', 'H'),
('Cabo Verde',     'Uruguai',      'CV', 'UY', '2026-06-21T19:00:00-03:00', 'Grupos', 'H'),
('Espanha',        'Uruguai',      'ES', 'UY', '2026-06-26T19:00:00-03:00', 'Grupos', 'H'),
('Arábia Saudita', 'Cabo Verde',   'SA', 'CV', '2026-06-26T19:00:00-03:00', 'Grupos', 'H'),

-- ===== GRUPO I: França, Senegal, Iraque, Noruega =====
('França',   'Senegal', 'FR', 'SN', '2026-06-16T19:00:00-03:00', 'Grupos', 'I'),
('Iraque',   'Noruega', 'IQ', 'NO', '2026-06-16T16:00:00-03:00', 'Grupos', 'I'),
('França',   'Iraque',  'FR', 'IQ', '2026-06-22T19:00:00-03:00', 'Grupos', 'I'),
('Senegal',  'Noruega', 'SN', 'NO', '2026-06-22T16:00:00-03:00', 'Grupos', 'I'),
('França',   'Noruega', 'FR', 'NO', '2026-06-26T22:00:00-03:00', 'Grupos', 'I'),
('Senegal',  'Iraque',  'SN', 'IQ', '2026-06-26T22:00:00-03:00', 'Grupos', 'I'),

-- ===== GRUPO J: Argentina, Argélia, Áustria, Jordânia =====
('Argentina', 'Argélia',  'AR', 'DZ', '2026-06-16T22:00:00-03:00', 'Grupos', 'J'),
('Áustria',   'Jordânia', 'AT', 'JO', '2026-06-16T19:00:00-03:00', 'Grupos', 'J'),
('Argentina', 'Áustria',  'AR', 'AT', '2026-06-22T22:00:00-03:00', 'Grupos', 'J'),
('Argélia',   'Jordânia', 'DZ', 'JO', '2026-06-22T19:00:00-03:00', 'Grupos', 'J'),
('Argentina', 'Jordânia', 'AR', 'JO', '2026-06-27T16:00:00-03:00', 'Grupos', 'J'),
('Argélia',   'Áustria',  'DZ', 'AT', '2026-06-27T16:00:00-03:00', 'Grupos', 'J'),

-- ===== GRUPO K: Portugal, Rep. Dem. Congo, Uzbequistão, Colômbia =====
('Portugal',       'Rep. Dem. Congo', 'PT', 'CD', '2026-06-17T19:00:00-03:00', 'Grupos', 'K'),
('Uzbequistão',    'Colômbia',        'UZ', 'CO', '2026-06-17T16:00:00-03:00', 'Grupos', 'K'),
('Portugal',       'Uzbequistão',     'PT', 'UZ', '2026-06-23T22:00:00-03:00', 'Grupos', 'K'),
('Rep. Dem. Congo','Colômbia',        'CD', 'CO', '2026-06-23T19:00:00-03:00', 'Grupos', 'K'),
('Portugal',       'Colômbia',        'PT', 'CO', '2026-06-27T19:00:00-03:00', 'Grupos', 'K'),
('Rep. Dem. Congo','Uzbequistão',     'CD', 'UZ', '2026-06-27T19:00:00-03:00', 'Grupos', 'K'),

-- ===== GRUPO L: Inglaterra, Croácia, Gana, Panamá =====
('Inglaterra', 'Croácia', 'GB', 'HR', '2026-06-17T22:00:00-03:00', 'Grupos', 'L'),
('Gana',       'Panamá',  'GH', 'PA', '2026-06-17T19:00:00-03:00', 'Grupos', 'L'),
('Inglaterra', 'Gana',    'GB', 'GH', '2026-06-24T16:00:00-03:00', 'Grupos', 'L'),
('Croácia',    'Panamá',  'HR', 'PA', '2026-06-24T16:00:00-03:00', 'Grupos', 'L'),
('Inglaterra', 'Panamá',  'GB', 'PA', '2026-06-27T22:00:00-03:00', 'Grupos', 'L'),
('Croácia',    'Gana',    'HR', 'GH', '2026-06-27T22:00:00-03:00', 'Grupos', 'L');
