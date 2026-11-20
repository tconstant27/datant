-- Datant : ajout de notre équipe et de nos joueurs
-- Les rôles se modifient ensuite dans Table Editor › players.

with equipe as (
  insert into teams (name, is_ours) values ('Triforce Esport', true)
  returning id
)
insert into players (team_id, display_name, role, game_name, tag_line)
select equipe.id, j.display_name, j.role, j.game_name, j.tag_line
from equipe, (values
  ('CRA FEU', 'BOTTOM', 'CRA FEU 12PA 6PM', 'EXPLO'),
  ('Nono',    'UTILITY', 'NONO',             'AON')
) as j(display_name, role, game_name, tag_line);
