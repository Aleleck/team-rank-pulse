import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Papa from 'papaparse';
import { Trophy, Medal, Award } from 'lucide-react';
import confetti from 'canvas-confetti';

const TEAM_CRESTS: Record<string, string> = {
  'Brazil': '/crests/brazil.png',
  'Colombia': '/crests/colombia.png',
  'Haiti': '/crests/haiti.png',
};

const TEAM_MESA: Record<string, string> = {
  'Colombia': 'MESA 1',
  'Brazil': 'MESA 2',
  'Haiti': 'MESA 3',
};

interface Team {
  name: string;
  score: number;
  previousRank?: number;
}

const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQny2PUN0I8Yf5RA0pbx5QyYjugUKTLhFSbuCSq4RWb0aCKGeLelTKXAGZE_ivHvPFJyL7ZyCVEuRmd/pub?output=csv";
const REFRESH_INTERVAL = 5000;

const RankIcon = ({ rank }: { rank: number }) => {
  switch (rank) {
    case 1:
      return <Trophy className="w-12 h-12 lg:w-16 lg:h-16" />;
    case 2:
      return <Medal className="w-10 h-10 lg:w-14 lg:h-14" />;
    case 3:
      return <Award className="w-10 h-10 lg:w-14 lg:h-14" />;
    default:
      return null;
  }
};

const TieBadge = () => (
  <motion.div
    initial={{ scale: 0 }}
    animate={{ scale: 1 }}
    className="absolute -top-3 -right-3 z-10"
  >
    <motion.div
      animate={{ 
        scale: [1, 1.1, 1],
        boxShadow: [
          '0 0 10px rgba(239, 68, 68, 0.5)',
          '0 0 20px rgba(239, 68, 68, 0.8)',
          '0 0 10px rgba(239, 68, 68, 0.5)'
        ]
      }}
      transition={{ duration: 1.5, repeat: Infinity }}
      className="bg-red-500 text-white font-display text-sm lg:text-base px-3 py-1 rounded-full shadow-lg"
    >
      ¡EMPATE!
    </motion.div>
  </motion.div>
);

const getRankConfig = (rank: number) => {
  switch (rank) {
    case 1:
      return {
        podiumHeight: 'h-48 lg:h-64',
        textColor: 'text-amber-900',
        bgGradient: 'from-amber-300 via-yellow-400 to-amber-500',
        glowColor: 'shadow-[0_0_60px_rgba(251,191,36,0.6)]',
        numberColor: 'text-amber-600',
        order: 'order-2',
        scale: 1.1,
      };
    case 2:
      return {
        podiumHeight: 'h-36 lg:h-48',
        textColor: 'text-slate-700',
        bgGradient: 'from-slate-200 via-gray-300 to-slate-400',
        glowColor: 'shadow-[0_0_40px_rgba(148,163,184,0.5)]',
        numberColor: 'text-slate-500',
        order: 'order-1',
        scale: 1,
      };
    case 3:
      return {
        podiumHeight: 'h-28 lg:h-40',
        textColor: 'text-orange-900',
        bgGradient: 'from-orange-300 via-amber-600 to-orange-700',
        glowColor: 'shadow-[0_0_40px_rgba(234,88,12,0.4)]',
        numberColor: 'text-orange-600',
        order: 'order-3',
        scale: 1,
      };
    default:
      return {
        podiumHeight: 'h-24',
        textColor: 'text-foreground',
        bgGradient: 'from-muted to-muted',
        glowColor: '',
        numberColor: 'text-muted-foreground',
        order: '',
        scale: 1,
      };
  }
};

const fireCelebration = () => {
  const duration = 3000;
  const end = Date.now() + duration;

  const colors = ['#FFD700', '#FFA500', '#FF6347', '#00CED1', '#9370DB'];

  (function frame() {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.7 },
      colors: colors
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.7 },
      colors: colors
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
};

export const Scoreboard = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [changedScores, setChangedScores] = useState<Set<string>>(new Set());
  const previousFirstPlace = useRef<string | null>(null);
  const previousScores = useRef<Record<string, number>>({});

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(SHEET_URL);
      const csvText = await response.text();
      
      Papa.parse(csvText, {
        header: false,
        skipEmptyLines: true,
        complete: (results) => {
          const rows = results.data as string[][];
          
          if (rows.length >= 2) {
            // First row = team names, Second row = scores
            const teamNames = rows[0];
            const scores = rows[1];
            
            const parsedTeams: Team[] = teamNames
              .map((name, index) => ({
                name: String(name || '').trim(),
                score: parseInt(String(scores[index] || '0').replace(/[^0-9.-]/g, ''), 10) || 0
              }))
              .filter(team => team.name.length > 0);

            // Sort by score descending
            const sortedTeams = [...parsedTeams].sort((a, b) => b.score - a.score);
            
            // Check if first place changed
            const newFirstPlace = sortedTeams[0]?.name;
            if (previousFirstPlace.current && newFirstPlace && newFirstPlace !== previousFirstPlace.current) {
              fireCelebration();
            }
            previousFirstPlace.current = newFirstPlace;
            
            // Track which scores actually changed
            const newChangedScores = new Set<string>();
            sortedTeams.forEach((team) => {
              if (previousScores.current[team.name] !== undefined && 
                  previousScores.current[team.name] !== team.score) {
                newChangedScores.add(team.name);
              }
              previousScores.current[team.name] = team.score;
            });
            
            if (newChangedScores.size > 0) {
              setChangedScores(newChangedScores);
              // Clear changed scores after animation completes
              setTimeout(() => setChangedScores(new Set()), 500);
            }
            
            setTeams((prevTeams) => {
              return sortedTeams.map((team) => {
                const prevTeam = prevTeams.find(t => t.name === team.name);
                const prevRank = prevTeam ? prevTeams.indexOf(prevTeam) + 1 : undefined;
                return { ...team, previousRank: prevRank };
              });
            });
          }
          
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

  // Reorder for podium display: 2nd, 1st, 3rd
  const podiumOrder = [1, 0, 2].map(i => teams[i]).filter(Boolean);
  
  // Detect ties - find teams with same score
  const tiedScores = new Set<number>();
  const scoreCounts: Record<number, number> = {};
  teams.forEach(t => {
    scoreCounts[t.score] = (scoreCounts[t.score] || 0) + 1;
  });
  Object.entries(scoreCounts).forEach(([score, count]) => {
    if (count > 1) tiedScores.add(Number(score));
  });

  return (
    <div className="min-h-screen scoreboard-bg flex flex-col p-8 lg:p-12">
      {/* Space background stars */}
      <div className="stars" />
      <div className="stars-2" />
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-8 lg:mb-16"
      >
        <h1 className="font-display text-6xl lg:text-8xl xl:text-9xl text-foreground tracking-wider text-glow-gold">
          MUNDIAL GLOBAL
        </h1>
      </motion.header>

      {/* Podium */}
      <div className="flex-1 flex items-end justify-center pb-8">
        <div className="flex items-end justify-center gap-4 lg:gap-8 w-full max-w-6xl">
          <AnimatePresence mode="popLayout">
            {podiumOrder.map((team, displayIndex) => {
              const actualRank = teams.indexOf(team) + 1;
              const config = getRankConfig(actualRank);
              const isTied = tiedScores.has(team.score);
              
              return (
                <motion.div
                  key={team.name}
                  layout
                  initial={{ opacity: 0, y: 100 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    scale: config.scale,
                  }}
                  exit={{ opacity: 0, y: 100 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 200, 
                    damping: 25,
                    delay: displayIndex * 0.1
                  }}
                  className={`flex-1 max-w-sm ${config.order}`}
                >
                  {/* Team Info Card */}
                  <motion.div 
                    className={`relative bg-gradient-to-b ${config.bgGradient} rounded-t-3xl ${config.glowColor} p-6 lg:p-8 text-center ${isTied ? 'animate-pulse-subtle' : ''}`}
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {/* Tie Badge */}
                    {isTied && <TieBadge />}
                    
                    {/* Team Crest */}
                    {TEAM_CRESTS[team.name] && (
                      <div className="mb-4 flex justify-center">
                        <div className="w-20 h-20 lg:w-28 lg:h-28 flex items-center justify-center">
                          <img 
                            src={TEAM_CRESTS[team.name]} 
                            alt={`${team.name} crest`}
                            className="w-full h-full object-contain drop-shadow-lg"
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Rank Icon */}
                    <div className={`${config.textColor} mb-2 flex justify-center`}>
                      <RankIcon rank={actualRank} />
                    </div>
                    
                    {/* Country Name */}
                    <h2 className={`font-display text-3xl lg:text-5xl xl:text-6xl tracking-wider ${config.textColor} mb-1`}>
                      {team.name.toUpperCase()}
                    </h2>
                    
                    {/* Mesa Label */}
                    <p className={`text-sm lg:text-base ${config.textColor} opacity-60 font-medium mb-2`}>
                      {TEAM_MESA[team.name] || ''}
                    </p>
                    
                    {/* Score */}
                    <motion.div
                      initial={{ scale: 1 }}
                      animate={changedScores.has(team.name) ? { scale: [1, 1.15, 1] } : { scale: 1 }}
                      transition={{ duration: 0.4 }}
                    >
                      <p className={`font-display text-6xl lg:text-8xl xl:text-9xl ${config.textColor}`}>
                        {team.score}
                      </p>
                      <p className={`text-sm lg:text-base ${config.textColor} opacity-70 font-medium mt-1`}>
                        PUNTOS
                      </p>
                    </motion.div>
                  </motion.div>

                  {/* Podium Base */}
                  <div className={`${config.podiumHeight} bg-gradient-to-b ${config.bgGradient} relative overflow-hidden`}>
                    {/* Rank Number */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`font-display text-[10rem] lg:text-[14rem] ${config.numberColor} opacity-30`}>
                        {actualRank}
                      </span>
                    </div>
                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" 
                         style={{ backgroundSize: '200% 100%' }} />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Footer */}
      <motion.footer 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center mt-8"
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
