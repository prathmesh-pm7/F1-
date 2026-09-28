import { useEffect, useState } from 'react';
import { Team } from '../types/f1';

const FAVORITE_TEAM_KEY = 'f1-pulse.favorite-team';

export function useFavoriteTeam(teams: Team[]) {
  const [favoriteTeamId, setFavoriteTeamId] = useState<string | null>(() => {
    try { return window.localStorage.getItem(FAVORITE_TEAM_KEY); } catch { return null; }
  });
  const [teamSetupDismissed, setTeamSetupDismissed] = useState(false);
  const [showTeamSetup, setShowTeamSetup] = useState(false);

  useEffect(() => {
    try {
      if (favoriteTeamId) window.localStorage.setItem(FAVORITE_TEAM_KEY, favoriteTeamId);
      else window.localStorage.removeItem(FAVORITE_TEAM_KEY);
    } catch { /* optional preference storage */ }
  }, [favoriteTeamId]);

  const favoriteTeam = teams.find(team => team.id === favoriteTeamId) ?? null;
  useEffect(() => {
    if (teams.length > 0 && !favoriteTeam && !teamSetupDismissed) setShowTeamSetup(true);
  }, [teams, favoriteTeam, teamSetupDismissed]);

  return { favoriteTeamId, setFavoriteTeamId, favoriteTeam, showTeamSetup, setShowTeamSetup, teamSetupDismissed, setTeamSetupDismissed };
}
