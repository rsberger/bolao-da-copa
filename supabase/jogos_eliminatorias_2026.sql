-- Copa do Mundo 2026 — Fases Eliminatórias
-- Times substituídos por placeholders; datas/horários em BRT (UTC-3)
-- Fonte: FIFA / ESPN (sujeito a alteração oficial)

-- ===== TRINTA E DOIS (Round of 32) — 16 jogos =====
-- June 28 – July 2, 2026

insert into public.matches (home_team, away_team, home_flag, away_flag, match_date, stage) values

('1º Grupo A', '2º Grupo B', null, null, '2026-06-28T16:00:00-03:00', 'Trinta e dois'),
('1º Grupo C', '2º Grupo D', null, null, '2026-06-28T20:00:00-03:00', 'Trinta e dois'),

('1º Grupo E', '2º Grupo F', null, null, '2026-06-29T16:00:00-03:00', 'Trinta e dois'),
('1º Grupo G', '2º Grupo H', null, null, '2026-06-29T20:00:00-03:00', 'Trinta e dois'),

('1º Grupo I', '2º Grupo J', null, null, '2026-06-30T16:00:00-03:00', 'Trinta e dois'),
('1º Grupo K', '2º Grupo L', null, null, '2026-06-30T20:00:00-03:00', 'Trinta e dois'),

('1º Grupo B', '2º Grupo A', null, null, '2026-07-01T16:00:00-03:00', 'Trinta e dois'),
('1º Grupo D', '2º Grupo C', null, null, '2026-07-01T20:00:00-03:00', 'Trinta e dois'),

('1º Grupo F', '2º Grupo E', null, null, '2026-07-02T16:00:00-03:00', 'Trinta e dois'),
('1º Grupo H', '2º Grupo G', null, null, '2026-07-02T20:00:00-03:00', 'Trinta e dois'),

('1º Grupo J', '2º Grupo I', null, null, '2026-07-03T12:00:00-03:00', 'Trinta e dois'),
('1º Grupo L', '2º Grupo K', null, null, '2026-07-03T16:00:00-03:00', 'Trinta e dois'),

('Melhor 3º (1)', 'Melhor 3º (2)', null, null, '2026-07-03T20:00:00-03:00', 'Trinta e dois'),
('Melhor 3º (3)', 'Melhor 3º (4)', null, null, '2026-07-04T12:00:00-03:00', 'Trinta e dois'),
('Melhor 3º (5)', 'Melhor 3º (6)', null, null, '2026-07-04T16:00:00-03:00', 'Trinta e dois'),
('Melhor 3º (7)', 'Melhor 3º (8)', null, null, '2026-07-04T20:00:00-03:00', 'Trinta e dois'),

-- ===== OITAVAS DE FINAL (Round of 16) — 8 jogos =====
-- July 6–9, 2026

('Vencedor R32 (1)', 'Vencedor R32 (2)', null, null, '2026-07-06T16:00:00-03:00', 'Oitavas'),
('Vencedor R32 (3)', 'Vencedor R32 (4)', null, null, '2026-07-06T20:00:00-03:00', 'Oitavas'),

('Vencedor R32 (5)', 'Vencedor R32 (6)', null, null, '2026-07-07T16:00:00-03:00', 'Oitavas'),
('Vencedor R32 (7)', 'Vencedor R32 (8)', null, null, '2026-07-07T20:00:00-03:00', 'Oitavas'),

('Vencedor R32 (9)',  'Vencedor R32 (10)', null, null, '2026-07-08T16:00:00-03:00', 'Oitavas'),
('Vencedor R32 (11)', 'Vencedor R32 (12)', null, null, '2026-07-08T20:00:00-03:00', 'Oitavas'),

('Vencedor R32 (13)', 'Vencedor R32 (14)', null, null, '2026-07-09T16:00:00-03:00', 'Oitavas'),
('Vencedor R32 (15)', 'Vencedor R32 (16)', null, null, '2026-07-09T20:00:00-03:00', 'Oitavas'),

-- ===== QUARTAS DE FINAL — 4 jogos =====
-- July 11–12, 2026

('Vencedor Oitavas (1)', 'Vencedor Oitavas (2)', null, null, '2026-07-11T16:00:00-03:00', 'Quartas'),
('Vencedor Oitavas (3)', 'Vencedor Oitavas (4)', null, null, '2026-07-11T20:00:00-03:00', 'Quartas'),

('Vencedor Oitavas (5)', 'Vencedor Oitavas (6)', null, null, '2026-07-12T16:00:00-03:00', 'Quartas'),
('Vencedor Oitavas (7)', 'Vencedor Oitavas (8)', null, null, '2026-07-12T20:00:00-03:00', 'Quartas'),

-- ===== SEMIFINAIS — 2 jogos =====
-- July 14–15, 2026

('Vencedor Quartas (1)', 'Vencedor Quartas (2)', null, null, '2026-07-14T20:00:00-03:00', 'Semi'),
('Vencedor Quartas (3)', 'Vencedor Quartas (4)', null, null, '2026-07-15T20:00:00-03:00', 'Semi'),

-- ===== TERCEIRO LUGAR =====
-- July 18, 2026

('Perdedor Semi (1)', 'Perdedor Semi (2)', null, null, '2026-07-18T16:00:00-03:00', 'Terceiro'),

-- ===== FINAL =====
-- July 19, 2026

('Vencedor Semi (1)', 'Vencedor Semi (2)', null, null, '2026-07-19T16:00:00-03:00', 'Final');
