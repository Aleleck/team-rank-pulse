import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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

// PEGA AQUÍ TU URL DE APPS SCRIPT (La que termina en /exec)
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxy6tc2LygaAmAJYqPJensKynvRYIlGK30zDzPZw-kkpiY5-x4XBCD76qqUuG4J9Hx5/exec";
const REFRESH_INTERVAL = 2000; // 2 segundos (ahora sí aguantará esta velocidad)

const RankIcon = ({ rank }: { rank: number }) => {
  switch (rank) {
    case 1: return <Trophy className="w-12 h-12 lg:w-16 lg:h-16" />;
    case 2: return <Medal className="w-10 h-10 lg:w-14 lg:h-14" />;
    case 3: return <Award className="w-10 h-10 lg:w-14 lg:h-14" />;
    default: return null;
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
        boxShadow: ['0 0 10px rgba(239, 68, 68, 0.5)', '0 0 20px rgba(239, 68, 68, 0.8)', '0 0 10px rgba(239, 68, 68, 0.5)']
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
    confetti({ particleCount: 5, angle: 60, spread: 55, origin: { x: 0, y: 0.7 }, colors: colors });
    confetti({ particleCount: 5, angle: 120, spread: 55, origin: { x: 1, y: 0.7 }, colors: colors });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
};

export const Scoreboard = () => {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [changedScores, setChangedScores] = useState<Set<string>>(new Set());
  
  // Usamos useRef para guardar el estado anterior y evitar re-renders si la data es igual
  const previousFirstPlace = useRef<string | null>(null);
  const currentTeamsRef = useRef<Team[]>([]); 

  const fetchData = useCallback(async () => {
    // Si la URL sigue siendo el texto de ejemplo, mostramos error
    if (APPS_SCRIPT_URL.includes("AQUI_TU_URL")) {
      setError("Falta poner la URL del Apps Script en el código");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(APPS_SCRIPT_URL);
      
      if (!response.ok) {
        throw new Error(`Error de conexión: ${response.status}`);
      }

      const data = await response.json();
      
      if (Array.isArray(data) && data.length >= 2) {
        const teamNames = data[0];
        const scores = data[1];

        const parsedTeams: Team[] = teamNames
          .map((name: string, index: number) => ({
            name: String(name || '').trim(),
            score: parseInt(String(scores[index] || '0').replace(/[^0-9.-]/g, ''), 10) || 0
          }))
          .filter((team: Team) => team.name.length > 0);

        const sortedTeams = [...parsedTeams].sort((a, b) => b.score - a.score);
        const isDataIdentical = JSON.stringify(sortedTeams) === JSON.stringify(currentTeamsRef.current);
        
        if (!isDataIdentical) {
          const newChangedScores = new Set<string>();
          sortedTeams.forEach(newTeam => {
            const oldTeam = currentTeamsRef.current.find(t => t.name === newTeam.name);
            if (oldTeam && oldTeam.score !== newTeam.score) {
              newChangedScores.add(newTeam.name);
            }
          });

          const newFirstPlace = sortedTeams[0]?.name;
          if (previousFirstPlace.current && newFirstPlace && newFirstPlace !== previousFirstPlace.current) {
            fireCelebration();
          }
          previousFirstPlace.current = newFirstPlace;

          if (newChangedScores.size > 0) {
            setChangedScores(newChangedScores);
            setTimeout(() => setChangedScores(new Set()), 1000);
          }

          currentTeamsRef.current = sortedTeams;
          
          setTeams(sortedTeams.map((team) => {
              const prevTeam = currentTeamsRef.current.find(t => t.name === team.name);
              const prevRank = prevTeam ? currentTeamsRef.current.indexOf(prevTeam) + 1 : undefined;
              return { ...team, previousRank: prevRank };
          }));
          
          setLastUpdate(new Date());
        }
      }
      setLoading(false);
      setError(null);

    } catch (err) {
      console.error('Fetch error:', err);
      // AQUÍ ESTABA EL ERROR ANTES: Faltaba apagar el loading
      setLoading(false);
      // Mostramos el error en pantalla para que sepas qué pasa
      setError('Error cargando datos. Revisa la consola (F12) para más detalles.');
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
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Lógica de podio y renderizado...
  const podiumOrder = [1, 0, 2].map(i => teams[i]).filter(Boolean);
  const tiedScores = new Set<number>();
  const scoreCounts: Record<number, number> = {};
  teams.forEach(t => scoreCounts[t.score] = (scoreCounts[t.score] || 0) + 1);
  Object.entries(scoreCounts).forEach(([score, count]) => {
    if (count > 1) tiedScores.add(Number(score));
  });

  return (
    <div className="min-h-screen scoreboard-bg flex flex-col p-8 lg:p-12">
      <div className="stars" />
      <div className="stars-2" />
      
      <motion.header 
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8 lg:mb-16"
      >
        <h1 className="font-display text-6xl lg:text-8xl xl:text-9xl text-white tracking-wider text-glow-gold drop-shadow-lg">
          MUNDIAL GLOBAL
        </h1>
      </motion.header>

      <div className="flex-1 flex items-end justify-center pb-8">
        <div className="flex items-end justify-center gap-4 lg:gap-8 w-full max-w-6xl">
          <AnimatePresence mode="popLayout">
            {podiumOrder.map((team, displayIndex) => {
              const actualRank = teams.indexOf(team) + 1;
              const config = getRankConfig(actualRank);
              const isTied = tiedScores.has(team.score);
              const hasScoreChanged = changedScores.has(team.name);
              
              return (
                <motion.div
                  key={team.name}
                  layout
                  initial={{ opacity: 0, y: 100 }}
                  animate={{ opacity: 1, y: 0, scale: config.scale }}
                  transition={{ type: "spring", stiffness: 200, damping: 25 }}
                  className={`flex-1 max-w-sm ${config.order}`}
                >
                  <motion.div 
                    className={`relative bg-gradient-to-b ${config.bgGradient} rounded-t-3xl ${config.glowColor} p-6 lg:p-8 text-center`}
                  >
                    {isTied && <TieBadge />}
                    
                    {TEAM_CRESTS[team.name] && (
                      <div className="mb-4 flex justify-center">
                        <img src={TEAM_CRESTS[team.name]} alt={team.name} className="w-20 h-20 lg:w-28 lg:h-28 object-contain drop-shadow-lg"/>
                      </div>
                    )}
                    
                    <div className={`${config.textColor} mb-2 flex justify-center`}><RankIcon rank={actualRank} /></div>
                    <h2 className={`font-display text-3xl lg:text-5xl xl:text-6xl tracking-wider ${config.textColor} mb-1`}>{team.name.toUpperCase()}</h2>
                    <p className={`text-sm lg:text-base ${config.textColor} opacity-60 font-medium mb-2`}>{TEAM_MESA[team.name] || ''}</p>
                    
                    <motion.div
                      animate={hasScoreChanged ? { scale: [1, 1.3, 1], color: ['#fff', '#ff0000', 'inherit'] } : { scale: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <p className={`font-display text-6xl lg:text-8xl xl:text-9xl ${config.textColor}`}>{team.score}</p>
                    </motion.div>
                  </motion.div>

                  <div className={`${config.podiumHeight} bg-gradient-to-b ${config.bgGradient} relative overflow-hidden`}>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className={`font-display text-[10rem] lg:text-[14rem] ${config.numberColor} opacity-30`}>{actualRank}</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default Scoreboard;