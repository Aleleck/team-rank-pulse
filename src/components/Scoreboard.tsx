import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Papa from 'papaparse';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';

interface Team {
  name: string;
  score: number;
  previousRank?: number;
}

const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQny2PUN0I8Yf5RA0pbx5QyYjugUKTLhFSbuCSq4RWb0aCKGeLelTKXAGZE_ivHvPFJyL7ZyCVEuRmd/pub?output=csv";
const REFRESH_INTERVAL = 5000; // 5 seconds

const RankIcon = ({ rank }: { rank: number }) => {
  switch (rank) {
    case 1:
      return <Trophy className="w-16 h-16 text-primary-foreground" />;
    case 2:
      return <Medal className="w-14 h-14 text-secondary-foreground" />;
    case 3:
      return <Award className="w-14 h-14 text-primary-foreground" />;
    default:
      return null;
  }
};

const getRankStyles = (rank: number) => {
  switch (rank) {
    case 1:
      return {
        card: 'card-gold',
        text: 'text-glow-gold',
        textColor: 'text-primary-foreground',
        rankBg: 'bg-primary-foreground/20',
      };
    case 2:
      return {
        card: 'card-silver',
        text: 'text-glow-silver',
        textColor: 'text-secondary-foreground',
        rankBg: 'bg-secondary-foreground/20',
      };
    case 3:
      return {
        card: 'card-bronze',
        text: 'text-glow-bronze',
        textColor: 'text-primary-foreground',
        rankBg: 'bg-primary-foreground/20',
      };
    default:
      return {
        card: 'bg-card',
        text: '',
        textColor: 'text-foreground',
        rankBg: 'bg-muted',
      };
  }
};

export const Scoreboard = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(SHEET_URL);
      const csvText = await response.text();
      
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsedTeams: Team[] = results.data
            .map((row: any) => {
              const name = row['Equipo'] || row['Team'] || row['Nombre'] || Object.values(row)[0];
              const scoreValue = row['Puntaje'] || row['Score'] || row['Puntos'] || row['Total'] || Object.values(row)[1];
              const score = parseInt(String(scoreValue).replace(/[^0-9.-]/g, ''), 10) || 0;
              return { name: String(name || '').trim(), score };
            })
            .filter((team: Team) => team.name && team.name.length > 0);

          // Sort by score descending
          const sortedTeams = [...parsedTeams].sort((a, b) => b.score - a.score);
          
          setTeams((prevTeams) => {
            // Track previous ranks for animation
            return sortedTeams.map((team) => {
              const prevTeam = prevTeams.find(t => t.name === team.name);
              const prevRank = prevTeam ? prevTeams.indexOf(prevTeam) + 1 : undefined;
              return { ...team, previousRank: prevRank };
            });
          });
          
          setLastUpdate(new Date());
          setLoading(false);
          setError(null);
        },
        error: (err) => {
          setError('Error parsing CSV data');
          console.error('Parse error:', err);
        }
      });
    } catch (err) {
      setError('Error fetching data');
      console.error('Fetch error:', err);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen scoreboard-bg flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-24 h-24 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6" />
          <p className="font-display text-4xl text-foreground tracking-wider">CARGANDO DATOS...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen scoreboard-bg flex items-center justify-center">
        <div className="text-center">
          <p className="font-display text-4xl text-destructive mb-4">{error}</p>
          <button 
            onClick={fetchData}
            className="px-8 py-3 bg-primary text-primary-foreground font-display text-2xl rounded-lg hover:opacity-90 transition-opacity"
          >
            REINTENTAR
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen scoreboard-bg flex flex-col p-8 lg:p-12">
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-8 lg:mb-12"
      >
        <h1 className="font-display text-6xl lg:text-8xl xl:text-9xl text-foreground tracking-wider text-glow-gold">
          RANKING EN VIVO
        </h1>
        <div className="flex items-center justify-center gap-3 mt-4">
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="w-3 h-3 rounded-full bg-green-500"
          />
          <p className="text-muted-foreground text-lg lg:text-xl font-medium">
            Actualización automática cada 5 segundos
          </p>
        </div>
      </motion.header>

      {/* Scoreboard */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-7xl">
          <AnimatePresence mode="popLayout">
            <div className="grid gap-6 lg:gap-8">
              {teams.slice(0, 3).map((team, index) => {
                const rank = index + 1;
                const styles = getRankStyles(rank);
                const moved = team.previousRank && team.previousRank !== rank;
                
                return (
                  <motion.div
                    key={team.name}
                    layout
                    initial={{ opacity: 0, x: -100 }}
                    animate={{ 
                      opacity: 1, 
                      x: 0,
                      scale: moved ? [1, 1.02, 1] : 1,
                    }}
                    exit={{ opacity: 0, x: 100 }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 300, 
                      damping: 30,
                      layout: { duration: 0.5 }
                    }}
                    className={`${styles.card} rounded-2xl lg:rounded-3xl overflow-hidden`}
                  >
                    <div className="flex items-center px-8 py-6 lg:px-12 lg:py-8">
                      {/* Rank */}
                      <div className={`${styles.rankBg} w-24 h-24 lg:w-32 lg:h-32 rounded-2xl flex items-center justify-center mr-8 lg:mr-12`}>
                        <span className={`font-display text-6xl lg:text-8xl ${styles.textColor}`}>
                          {rank}
                        </span>
                      </div>

                      {/* Icon */}
                      <div className="mr-8 lg:mr-12">
                        <RankIcon rank={rank} />
                      </div>

                      {/* Team Name */}
                      <div className="flex-1">
                        <h2 className={`font-display text-5xl lg:text-7xl xl:text-8xl tracking-wider ${styles.textColor} ${styles.text}`}>
                          {team.name.toUpperCase()}
                        </h2>
                        {moved && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center gap-2 mt-2"
                          >
                            <TrendingUp className={`w-5 h-5 ${team.previousRank! > rank ? 'text-green-400' : 'text-red-400 rotate-180'}`} />
                            <span className={`text-sm font-medium ${team.previousRank! > rank ? 'text-green-400' : 'text-red-400'}`}>
                              {team.previousRank! > rank ? 'Subió' : 'Bajó'} posición
                            </span>
                          </motion.div>
                        )}
                      </div>

                      {/* Score */}
                      <motion.div 
                        key={team.score}
                        initial={{ scale: 1 }}
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 0.3 }}
                        className="text-right"
                      >
                        <p className={`text-lg lg:text-xl ${styles.textColor} opacity-80 font-medium mb-1`}>
                          PUNTOS
                        </p>
                        <p className={`font-display text-6xl lg:text-8xl xl:text-9xl ${styles.textColor} ${styles.text}`}>
                          {team.score.toLocaleString()}
                        </p>
                      </motion.div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center mt-8 lg:mt-12"
      >
        {lastUpdate && (
          <p className="text-muted-foreground text-base lg:text-lg">
            Última actualización: {lastUpdate.toLocaleTimeString()}
          </p>
        )}
      </motion.footer>
    </div>
  );
};

export default Scoreboard;
