'use client';

import { useEffect, useState, useRef } from 'react';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrophy, faChartBar, faUsers, faBaseball, faBaseballBatBall, faMedal, faChevronLeft, faChevronRight, faArrowRight, faTimes, faSearch, faSort, faSortUp, faSortDown } from '@fortawesome/free-solid-svg-icons';
import Header from '@/components/Header';
import { useMinecraftServer } from '@/hooks/useMinecraftServer';
import { preloadImages } from '@/lib/imageCache';

interface Game {
  id: string;
  date: string;
  time: string;
  homeTeam: string;
  awayTeam: string;
  stadium: string;
  status: string;
  homeScore?: number;
  awayScore?: number;
}

interface Team {
  id: string;
  name: string;
  logo?: string;
  color?: string;
}

interface TeamRecord {
  team: string;
  wins: number;
  losses: number;
  draws: number;
  totalGames: number;
  winRate: number;
  totalScore: number;
  totalConceded: number;
}

interface TeamOffensiveStats {
  team: string;
  battingAvg: number; // 타율
  runs: number; // 득점
  rbi: number; // 타점
  atBats: number; // 타수
  homeRuns: number; // 홈런
  hits: number; // 안타
  doubles: number; // 2루타
  triples: number; // 3루타
  stolenBases: number; // 도루
  walks: number; // 사사구
  strikeouts: number; // 삼진
  doublePlays: number; // 병살타
  obp: number; // 출루율
  slg: number; // 장타율
  ops: number; // OPS
}

interface TeamDefensiveStats {
  team: string;
  era: number; // 평균자책
  runsAllowed: number; // 실점
  earnedRuns: number; // 자책점
  innings: number; // 이닝
  hitsAllowed: number; // 피안타
  homeRunsAllowed: number; // 피홈런
  strikeouts: number; // 탈삼진
  walks: number; // 사사구
  wildPitches: number; // 폭투
  errors: number; // 실책
  whip: number; // WHIP
  qualityStarts: number; // QS
  holds: number; // 홀드
  saves: number; // 세이브
}

interface BatterRecord {
  id: string;
  name: string;
  team: string;
  profileImage?: string;
  battingAvg: number; // 타율
  games: number; // 경기
  atBats: number; // 타수
  hits: number; // 안타
  homeRuns: number; // 홈런
  doubles: number; // 2루타
  triples: number; // 3루타
  rbi: number; // 타점
  runs: number; // 득점
  stolenBases: number; // 도루
  walks: number; // 볼넷
  hitByPitch: number; // 사구
  strikeouts: number; // 삼진
  obp: number; // 출루율
  slg?: number; // 장타율
  ops?: number; // OPS
  war?: number; // WAR
}

interface PitcherRecord {
  id: string;
  name: string;
  team: string;
  profileImage?: string;
  era: number; // 평균자책
  games: number; // 경기
  wins: number; // 승
  losses: number; // 패
  saves: number; // 세이브
  holds: number; // 홀드
  innings: number; // 이닝
  strikeouts: number; // 탈삼진
  hitsAllowed: number; // 피안타
  homeRunsAllowed: number; // 피홈런
  runsAllowed: number; // 실점
  earnedRuns: number; // 자책점
  walks: number; // 볼넷
  hitBatters: number; // 사구
}

type TabType = 'team-rank' | 'team-stats' | 'batter' | 'pitcher';

export default function RecordsPage() {
  const { status } = useMinecraftServer();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamRecords, setTeamRecords] = useState<TeamRecord[]>([]);
  const [teamMap, setTeamMap] = useState<Record<string, Team>>({});
  const [offensiveStats, setOffensiveStats] = useState<TeamOffensiveStats[]>([]);
  const [defensiveStats, setDefensiveStats] = useState<TeamDefensiveStats[]>([]);
  const [batterRecords, setBatterRecords] = useState<BatterRecord[]>([]);
  const [pitcherRecords, setPitcherRecords] = useState<PitcherRecord[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('team-rank');
  
  // 타자 기록 정렬 및 검색 상태
  const [batterSortField, setBatterSortField] = useState<string>('battingAvg');
  const [batterSortOrder, setBatterSortOrder] = useState<'asc' | 'desc'>('desc');
  const [batterSearchQuery, setBatterSearchQuery] = useState<string>('');
  const [batterFilter, setBatterFilter] = useState<string>('전체');
  
  // 투수 기록 정렬 및 검색 상태
  const [pitcherSortField, setPitcherSortField] = useState<string>('era');
  const [pitcherSortOrder, setPitcherSortOrder] = useState<'asc' | 'desc'>('asc');
  const [pitcherSearchQuery, setPitcherSearchQuery] = useState<string>('');
  const [pitcherFilter, setPitcherFilter] = useState<string>('전체');
  
  // 드래그 스크롤 상태
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  
  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStatType, setModalStatType] = useState<string>('');
  const [modalData, setModalData] = useState<any[]>([]);
  const [modalTab, setModalTab] = useState<string>('');

  useEffect(() => {
    loadData();
    loadBatterRecords();
    loadPitcherRecords();
  }, []);

  const loadBatterRecords = async () => {
    try {
      // Firestore에서 타자 기록 불러오기
      const battersSnapshot = await getDocs(collection(db, 'batterRecords'));
      const battersData = battersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BatterRecord[];
      
      // 타율 기준으로 정렬
      battersData.sort((a, b) => b.battingAvg - a.battingAvg);
      setBatterRecords(battersData);
    } catch (error) {
      console.error('타자 기록 로드 실패:', error);
      // 더미 데이터 사용 (개발용)
      const dummyBatters: BatterRecord[] = [
        { id: '1', name: '양의지', team: '두산', battingAvg: 0.337, games: 130, atBats: 454, hits: 153, homeRuns: 20, doubles: 27, triples: 1, rbi: 89, runs: 56, stolenBases: 4, walks: 50, hitByPitch: 7, strikeouts: 63, obp: 0.406, ops: 0.939, war: 5.79 },
        { id: '2', name: '안현민', team: 'KT', battingAvg: 0.334, games: 112, atBats: 395, hits: 132, homeRuns: 22, doubles: 19, triples: 4, rbi: 80, runs: 72, stolenBases: 7, walks: 75, hitByPitch: 9, strikeouts: 72, obp: 0.448, ops: 1.018, war: 7.22 },
        { id: '3', name: '김성윤', team: '삼성', battingAvg: 0.331, games: 127, atBats: 456, hits: 151, homeRuns: 6, doubles: 29, triples: 9, rbi: 61, runs: 92, stolenBases: 26, walks: 65, hitByPitch: 5, strikeouts: 54, obp: 0.419, ops: 0.850, war: 4.12 },
        { id: '4', name: '레이예스', team: '롯데', battingAvg: 0.326, games: 144, atBats: 573, hits: 187, homeRuns: 13, doubles: 44, triples: 1, rbi: 107, runs: 75, stolenBases: 7, walks: 58, hitByPitch: 3, strikeouts: 66, obp: 0.386, ops: 0.820, war: 4.56 },
        { id: '5', name: '문현빈', team: '한화', battingAvg: 0.320, games: 141, atBats: 528, hits: 169, homeRuns: 12, doubles: 30, triples: 2, rbi: 80, runs: 71, stolenBases: 17, walks: 38, hitByPitch: 10, strikeouts: 82, obp: 0.370, ops: 0.780, war: 3.89 },
        { id: '6', name: '구자욱', team: '삼성', battingAvg: 0.319, games: 142, atBats: 529, hits: 169, homeRuns: 19, doubles: 43, triples: 2, rbi: 96, runs: 106, stolenBases: 4, walks: 73, hitByPitch: 5, strikeouts: 91, obp: 0.402, ops: 0.910, war: 5.12 },
        { id: '7', name: '송성문', team: '키움', battingAvg: 0.315, games: 144, atBats: 574, hits: 181, homeRuns: 26, doubles: 37, triples: 4, rbi: 90, runs: 103, stolenBases: 25, walks: 68, hitByPitch: 1, strikeouts: 96, obp: 0.387, ops: 0.870, war: 6.84 },
        { id: '8', name: '디아즈', team: '삼성', battingAvg: 0.314, games: 144, atBats: 551, hits: 173, homeRuns: 50, doubles: 32, triples: 0, rbi: 158, runs: 93, stolenBases: 1, walks: 60, hitByPitch: 6, strikeouts: 100, obp: 0.381, ops: 1.025, war: 6.23 },
        { id: '9', name: '신민재', team: 'LG', battingAvg: 0.313, games: 135, atBats: 463, hits: 145, homeRuns: 1, doubles: 15, triples: 7, rbi: 61, runs: 87, stolenBases: 15, walks: 62, hitByPitch: 3, strikeouts: 57, obp: 0.395, ops: 0.750, war: 4.45 },
        { id: '10', name: '오스틴', team: 'LG', battingAvg: 0.313, games: 116, atBats: 425, hits: 133, homeRuns: 31, doubles: 25, triples: 1, rbi: 95, runs: 82, stolenBases: 3, walks: 61, hitByPitch: 2, strikeouts: 62, obp: 0.393, ops: 0.988, war: 5.34 },
        { id: '11', name: '박해민', team: 'LG', battingAvg: 0.305, games: 140, atBats: 520, hits: 159, homeRuns: 8, doubles: 22, triples: 5, rbi: 58, runs: 95, stolenBases: 49, walks: 45, hitByPitch: 3, strikeouts: 78, obp: 0.365, ops: 0.720, war: 4.78 },
        { id: '12', name: '김주원', team: 'NC', battingAvg: 0.302, games: 138, atBats: 510, hits: 154, homeRuns: 15, doubles: 28, triples: 3, rbi: 72, runs: 88, stolenBases: 44, walks: 52, hitByPitch: 4, strikeouts: 85, obp: 0.370, ops: 0.810, war: 4.23 },
        { id: '13', name: '정준재', team: 'SSG', battingAvg: 0.298, games: 142, atBats: 535, hits: 159, homeRuns: 12, doubles: 25, triples: 4, rbi: 65, runs: 92, stolenBases: 37, walks: 48, hitByPitch: 2, strikeouts: 92, obp: 0.360, ops: 0.780, war: 3.95 },
        { id: '14', name: '조수행', team: '두산', battingAvg: 0.295, games: 136, atBats: 508, hits: 150, homeRuns: 9, doubles: 20, triples: 6, rbi: 58, runs: 85, stolenBases: 30, walks: 42, hitByPitch: 5, strikeouts: 88, obp: 0.355, ops: 0.750, war: 3.67 },
        { id: '15', name: '문보경', team: 'LG', battingAvg: 0.292, games: 144, atBats: 562, hits: 164, homeRuns: 28, doubles: 35, triples: 2, rbi: 108, runs: 89, stolenBases: 8, walks: 55, hitByPitch: 4, strikeouts: 105, obp: 0.360, ops: 0.890, war: 5.45 },
        { id: '16', name: '데이비슨', team: 'NC', battingAvg: 0.288, games: 142, atBats: 521, hits: 150, homeRuns: 36, doubles: 28, triples: 1, rbi: 98, runs: 87, stolenBases: 5, walks: 62, hitByPitch: 3, strikeouts: 112, obp: 0.365, ops: 0.920, war: 5.12 },
        { id: '17', name: '위즈덤', team: 'KIA', battingAvg: 0.285, games: 140, atBats: 518, hits: 148, homeRuns: 35, doubles: 26, triples: 2, rbi: 94, runs: 84, stolenBases: 6, walks: 58, hitByPitch: 4, strikeouts: 108, obp: 0.360, ops: 0.910, war: 4.98 },
        { id: '18', name: '노시환', team: '한화', battingAvg: 0.283, games: 143, atBats: 530, hits: 150, homeRuns: 32, doubles: 30, triples: 1, rbi: 101, runs: 82, stolenBases: 4, walks: 61, hitByPitch: 5, strikeouts: 115, obp: 0.365, ops: 0.895, war: 4.89 },
      ];
      setBatterRecords(dummyBatters);
    }
  };

  const loadPitcherRecords = async () => {
    try {
      // Firestore에서 투수 기록 불러오기
      const pitchersSnapshot = await getDocs(collection(db, 'pitcherRecords'));
      const pitchersData = pitchersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PitcherRecord[];
      
      // 평균자책 기준으로 정렬 (낮을수록 좋음)
      pitchersData.sort((a, b) => a.era - b.era);
      setPitcherRecords(pitchersData);
    } catch (error) {
      console.error('투수 기록 로드 실패:', error);
      // 더미 데이터 사용 (개발용)
      const dummyPitchers: PitcherRecord[] = [
        { id: '1', name: '폰세', team: '한화', era: 1.89, games: 29, wins: 17, losses: 1, saves: 0, holds: 0, innings: 180.67, strikeouts: 252, hitsAllowed: 128, homeRunsAllowed: 10, runsAllowed: 41, earnedRuns: 38, walks: 41, hitBatters: 6 },
        { id: '2', name: '네일', team: 'KIA', era: 2.25, games: 27, wins: 8, losses: 4, saves: 0, holds: 0, innings: 164.33, strikeouts: 152, hitsAllowed: 135, homeRunsAllowed: 6, runsAllowed: 46, earnedRuns: 41, walks: 41, hitBatters: 15 },
        { id: '3', name: '앤더슨', team: 'SSG', era: 2.25, games: 30, wins: 12, losses: 7, saves: 0, holds: 0, innings: 171.67, strikeouts: 245, hitsAllowed: 121, homeRunsAllowed: 13, runsAllowed: 53, earnedRuns: 43, walks: 51, hitBatters: 9 },
        { id: '4', name: '후라도', team: '삼성', era: 2.60, games: 30, wins: 15, losses: 8, saves: 0, holds: 0, innings: 197.33, strikeouts: 142, hitsAllowed: 177, homeRunsAllowed: 17, runsAllowed: 65, earnedRuns: 57, walks: 36, hitBatters: 4 },
        { id: '5', name: '잭로그', team: '두산', era: 2.81, games: 30, wins: 10, losses: 8, saves: 0, holds: 1, innings: 176, strikeouts: 156, hitsAllowed: 146, homeRunsAllowed: 8, runsAllowed: 66, earnedRuns: 55, walks: 39, hitBatters: 17 },
        { id: '6', name: '와이스', team: '한화', era: 2.87, games: 30, wins: 16, losses: 5, saves: 0, holds: 0, innings: 178.67, strikeouts: 207, hitsAllowed: 127, homeRunsAllowed: 13, runsAllowed: 63, earnedRuns: 57, walks: 56, hitBatters: 13 },
        { id: '7', name: '임찬규', team: 'LG', era: 3.03, games: 27, wins: 11, losses: 7, saves: 0, holds: 0, innings: 160.33, strikeouts: 107, hitsAllowed: 163, homeRunsAllowed: 9, runsAllowed: 61, earnedRuns: 54, walks: 40, hitBatters: 6 },
        { id: '8', name: '원태인', team: '삼성', era: 3.24, games: 27, wins: 12, losses: 4, saves: 0, holds: 0, innings: 166.67, strikeouts: 108, hitsAllowed: 157, homeRunsAllowed: 20, runsAllowed: 66, earnedRuns: 60, walks: 27, hitBatters: 6 },
        { id: '9', name: '고영표', team: 'KT', era: 3.30, games: 29, wins: 11, losses: 8, saves: 0, holds: 0, innings: 161, strikeouts: 154, hitsAllowed: 170, homeRunsAllowed: 10, runsAllowed: 70, earnedRuns: 59, walks: 30, hitBatters: 15 },
        { id: '10', name: '소형준', team: 'KT', era: 3.30, games: 26, wins: 10, losses: 7, saves: 1, holds: 0, innings: 147.33, strikeouts: 123, hitsAllowed: 155, homeRunsAllowed: 6, runsAllowed: 60, earnedRuns: 54, walks: 29, hitBatters: 3 },
        { id: '11', name: '치리노스', team: 'LG', era: 3.31, games: 30, wins: 13, losses: 6, saves: 0, holds: 0, innings: 177, strikeouts: 137, hitsAllowed: 173, homeRunsAllowed: 5, runsAllowed: 71, earnedRuns: 65, walks: 36, hitBatters: 9 },
        { id: '12', name: '손주영', team: 'LG', era: 3.41, games: 30, wins: 11, losses: 6, saves: 0, holds: 0, innings: 153, strikeouts: 132, hitsAllowed: 153, homeRunsAllowed: 8, runsAllowed: 67, earnedRuns: 58, walks: 49, hitBatters: 4 },
        { id: '13', name: '라일리', team: 'NC', era: 3.45, games: 30, wins: 17, losses: 7, saves: 0, holds: 0, innings: 172, strikeouts: 216, hitsAllowed: 136, homeRunsAllowed: 18, runsAllowed: 76, earnedRuns: 66, walks: 56, hitBatters: 3 },
      ];
      setPitcherRecords(dummyPitchers);
    }
  };

  const loadData = async () => {
    try {
      // 크루 목록 불러오기
      const teamsQuery = query(collection(db, 'teams'), orderBy('name'));
      const teamsSnapshot = await getDocs(teamsQuery);
      const teamsData = teamsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Team[];
      setTeams(teamsData);
      
      // 크루 맵 생성 (이름으로 빠른 조회)
      const map: Record<string, Team> = {};
      teamsData.forEach(team => {
        map[team.name] = team;
      });
      setTeamMap(map);

      // 로고 이미지 프리로드 및 캐싱
      const logoUrls = teamsData
        .filter(team => team.logo)
        .map(team => team.logo!);
      
      if (logoUrls.length > 0) {
        // 백그라운드에서 이미지 프리로드 (블로킹하지 않음)
        preloadImages(logoUrls).catch(error => {
          console.warn('이미지 프리로드 실패:', error);
        });
      }

      const uniqueTeamNames = teamsData.map(team => team.name);

      const gamesSnapshot = await getDocs(collection(db, 'games'));
      const gamesData = gamesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Game[];

      gamesData.sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.time}`);
        const dateB = new Date(`${b.date} ${b.time}`);
        return dateB.getTime() - dateA.getTime();
      });

      setGames(gamesData);
      calculateTeamRecords(gamesData, uniqueTeamNames);
      loadTeamStats(uniqueTeamNames);
      setLoading(false);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      setLoading(false);
    }
  };

  const getTeamRecentGames = (team: string, allGames: Game[]) => {
    const teamGames = allGames
      .filter(g =>
        g.status === '종료' &&
        (g.homeTeam === team || g.awayTeam === team) &&
        g.homeScore !== undefined &&
        g.awayScore !== undefined
      )
      .slice(0, 5);

    return teamGames.map(game => {
      const isHome = game.homeTeam === team;
      const teamScore = isHome ? game.homeScore! : game.awayScore!;
      const opponentScore = isHome ? game.awayScore! : game.homeScore!;

      if (teamScore > opponentScore) return 'W';
      if (teamScore < opponentScore) return 'L';
      return 'D';
    });
  };

  const calculateTeamRecords = (games: Game[], teams: string[]) => {
    const records: Record<string, TeamRecord> = {};

    teams.forEach(team => {
      records[team] = {
        team,
        wins: 0,
        losses: 0,
        draws: 0,
        totalGames: 0,
        winRate: 0,
        totalScore: 0,
        totalConceded: 0
      };
    });

    games.forEach(game => {
      if (game.status === '종료' && game.homeScore !== undefined && game.awayScore !== undefined) {
        // 홈 크루 기록
        if (records[game.homeTeam]) {
          records[game.homeTeam].totalGames++;
          records[game.homeTeam].totalScore += game.homeScore;
          records[game.homeTeam].totalConceded += game.awayScore;

          if (game.homeScore > game.awayScore) {
            records[game.homeTeam].wins++;
          } else if (game.homeScore < game.awayScore) {
            records[game.homeTeam].losses++;
          } else {
            records[game.homeTeam].draws++;
          }
        }

        // 원정 크루 기록
        if (records[game.awayTeam]) {
          records[game.awayTeam].totalGames++;
          records[game.awayTeam].totalScore += game.awayScore;
          records[game.awayTeam].totalConceded += game.homeScore;

          if (game.awayScore > game.homeScore) {
            records[game.awayTeam].wins++;
          } else if (game.awayScore < game.homeScore) {
            records[game.awayTeam].losses++;
          } else {
            records[game.awayTeam].draws++;
          }
        }
      }
    });

    // 승률 계산
    Object.values(records).forEach(record => {
      if (record.totalGames > 0) {
        record.winRate = (record.wins / record.totalGames) * 100;
      }
    });

    const sortedRecords = Object.values(records).sort((a, b) => {
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.winRate !== a.winRate) return b.winRate - a.winRate;
      return (b.totalScore - b.totalConceded) - (a.totalScore - a.totalConceded);
    });

    setTeamRecords(sortedRecords);
  };

  const loadTeamStats = async (teamNames: string[]) => {
    try {
      // 공격 기록 불러오기
      const offensiveSnapshot = await getDocs(collection(db, 'teamOffensiveStats'));
      const offensiveData = offensiveSnapshot.docs.map(doc => ({
        team: doc.id,
        ...doc.data()
      })) as TeamOffensiveStats[];
      
      // 모든 공격 기록 데이터 사용 (크루 이름 필터링 제거)
      // 타율 기준으로 정렬
      offensiveData.sort((a, b) => b.battingAvg - a.battingAvg);
      setOffensiveStats(offensiveData);

      // 수비 기록 불러오기
      const defensiveSnapshot = await getDocs(collection(db, 'teamDefensiveStats'));
      const defensiveData = defensiveSnapshot.docs.map(doc => ({
        team: doc.id,
        ...doc.data()
      })) as TeamDefensiveStats[];
      
      // 모든 수비 기록 데이터 사용 (크루 이름 필터링 제거)
      // 평균자책 기준으로 정렬 (낮을수록 좋음)
      defensiveData.sort((a, b) => a.era - b.era);
      setDefensiveStats(defensiveData);
    } catch (error) {
      console.error('크루 통계 로드 실패:', error);
    }
  };

  const finishedGames = games.filter(g =>
    g.status === '종료' && g.homeScore !== undefined && g.awayScore !== undefined
  );

  // 마우스 드래그 스크롤 핸들러
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2; // 스크롤 속도 조절
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // 모달 열기 함수
  const openModal = (statType: string, data: any[]) => {
    setModalStatType(statType);
    setModalData(data);
    setModalTab(statType);
    setIsModalOpen(true);
  };

  // 모달 닫기 함수
  const closeModal = () => {
    setIsModalOpen(false);
    setModalStatType('');
    setModalData([]);
    setModalTab('');
  };

  // 통계 타입별 값과 추가 정보 가져오기
  const getStatValue = (statType: string, stat: any) => {
    switch (statType) {
      case '타율':
        if (stat.battingAvg !== undefined) {
          return { value: stat.battingAvg.toFixed(3), unit: '', sub: stat.hits !== undefined ? `안타 ${stat.hits.toLocaleString()}개` : '' };
        }
        return { value: '', unit: '', sub: '' };
      case '평균자책':
        return { value: stat.era?.toFixed(2) || '', unit: '', sub: stat.runsAllowed !== undefined ? `실점 ${stat.runsAllowed}점` : '' };
      case '홈런':
        if (stat.homeRuns !== undefined) {
          return { value: stat.homeRuns.toString(), unit: '개', sub: stat.slg !== undefined ? `장타율 ${stat.slg.toFixed(3)}` : '' };
        }
        return { value: '', unit: '개', sub: '' };
      case '안타':
        return { value: stat.hits?.toLocaleString() || '', unit: '개', sub: stat.battingAvg !== undefined ? `타율 ${stat.battingAvg.toFixed(3)}` : '' };
      case '도루':
        return { value: stat.stolenBases?.toString() || '', unit: '개', sub: stat.obp !== undefined ? `출루율 ${stat.obp.toFixed(3)}` : '' };
      case '득점':
        const defStat = defensiveStats.find(d => d.team === stat.team);
        return { value: stat.runs?.toString() || '', unit: '점', sub: defStat?.runsAllowed !== undefined ? `실점 ${defStat.runsAllowed}점` : '' };
      case '실점':
        const offStat = offensiveStats.find(o => o.team === stat.team);
        return { value: stat.runsAllowed?.toString() || '', unit: '점', sub: offStat?.runs !== undefined ? `득점 ${offStat.runs}점` : '' };
      case '타점':
        return { value: stat.rbi?.toString() || '', unit: '점', sub: stat.homeRuns !== undefined ? `홈런 ${stat.homeRuns}개` : '' };
      case 'OPS':
        return { value: stat.ops?.toFixed(3) || '', unit: '', sub: stat.battingAvg !== undefined ? `타율 ${stat.battingAvg.toFixed(3)}` : '' };
      case 'WAR':
        return { value: stat.war?.toFixed(2) || '', unit: '', sub: stat.battingAvg !== undefined ? `타율 ${stat.battingAvg.toFixed(3)}` : '' };
      default:
        return { value: '', unit: '', sub: '' };
    }
  };

  // 통계 타입별 정렬 함수
  const getSortedData = (statType: string) => {
    switch (statType) {
      case '타율':
        return [...offensiveStats].sort((a, b) => b.battingAvg - a.battingAvg);
      case '평균자책':
        return [...defensiveStats].sort((a, b) => a.era - b.era);
      case '홈런':
        return [...offensiveStats].sort((a, b) => b.homeRuns - a.homeRuns);
      case '안타':
        return [...offensiveStats].sort((a, b) => b.hits - a.hits);
      case '도루':
        return [...offensiveStats].sort((a, b) => b.stolenBases - a.stolenBases);
      case '득점':
        return [...offensiveStats].sort((a, b) => b.runs - a.runs);
      case '실점':
        return [...defensiveStats].sort((a, b) => a.runsAllowed - b.runsAllowed);
      case '타점':
        return [...batterRecords].sort((a, b) => b.rbi - a.rbi);
      case 'OPS':
        return [...batterRecords].filter(b => b.ops).sort((a, b) => (b.ops || 0) - (a.ops || 0));
      case 'WAR':
        return [...batterRecords].filter(b => b.war).sort((a, b) => (b.war || 0) - (a.war || 0));
      default:
        return [];
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-gray-800">
        <Header serverStatus={{
          isOnline: status.online,
          maintenance: status.maintenance,
          players: status.players
        }} />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-[#001A35] mb-4"></div>
            <div className="text-xl text-gray-600">로딩 중...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-800">
      <Header serverStatus={{
        isOnline: status.online,
        maintenance: status.maintenance,
        players: status.players
      }} />

      <div className="max-w-[1400px] mx-auto p-5">
        <main className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-[#001A35] mb-2">기록</h1>
            <p className="text-gray-600">시즌 크루별 및 선수별 기록 및 통계</p>
          </div>

          {/* 탭 메뉴 */}
          <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
            <div className="flex border-b-2 border-gray-200">
              <button
                onClick={() => setActiveTab('team-rank')}
                className={`flex-1 px-6 py-4 font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'team-rank'
                    ? 'bg-[#001A35] text-white border-b-2 border-[#001A35]'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <FontAwesomeIcon icon={faTrophy} />
                크루 순위
              </button>
              <button
                onClick={() => setActiveTab('team-stats')}
                className={`flex-1 px-6 py-4 font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'team-stats'
                    ? 'bg-[#001A35] text-white border-b-2 border-[#001A35]'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <FontAwesomeIcon icon={faChartBar} />
                크루 기록
              </button>
              <button
                onClick={() => setActiveTab('batter')}
                className={`flex-1 px-6 py-4 font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'batter'
                    ? 'bg-[#001A35] text-white border-b-2 border-[#001A35]'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <FontAwesomeIcon icon={faBaseballBatBall} />
                타자 기록
              </button>
              <button
                onClick={() => setActiveTab('pitcher')}
                className={`flex-1 px-6 py-4 font-bold transition-all flex items-center justify-center gap-2 ${
                  activeTab === 'pitcher'
                    ? 'bg-[#001A35] text-white border-b-2 border-[#001A35]'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <FontAwesomeIcon icon={faBaseball} />
                투수 기록
              </button>
            </div>
          </div>

          {/* 크루 순위 탭 */}
          {activeTab === 'team-rank' && (
          <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-[#001A35] px-6 py-4">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <FontAwesomeIcon icon={faTrophy} />
                크루 순위
              </h2>
            </div>

            {teamRecords.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                아직 종료된 경기가 없습니다
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">순위</th>
                      <th className="px-3 py-3 text-left text-xs font-bold text-gray-600">크루명</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-blue-600">승률</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">게임차</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">승</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">무</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">패</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">경기</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">연속</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">타율</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">평균자책</th>
                      <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">최근 5경기</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {teamRecords.map((record, index) => {
                      const recentGames = getTeamRecentGames(record.team, games);
                      const gameDiff = index === 0 ? 0 : (teamRecords[0].wins - record.wins) + (record.losses - teamRecords[0].losses);

                      return (
                        <tr key={record.team} className="hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-3 text-center">
                            <span className="text-gray-800 font-bold text-sm">{index + 1}</span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              {teamMap[record.team]?.logo ? (
                                <img
                                  src={teamMap[record.team].logo}
                                  alt={`${record.team} 로고`}
                                  className="w-7 h-7 rounded-full object-cover border border-gray-200"
                                />
                              ) : (
                                <div
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                  style={{ backgroundColor: teamMap[record.team]?.color || '#001A35' }}
                                >
                                  {record.team.charAt(0)}
                              </div>
                              )}
                              <span className="font-bold text-gray-800 text-sm">{record.team}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="text-blue-600 font-bold text-sm">{(record.winRate / 100).toFixed(3)}</span>
                          </td>
                          <td className="px-3 py-3 text-center text-gray-800 text-sm">
                            {index === 0 ? '-' : gameDiff.toFixed(1)}
                          </td>
                          <td className="px-3 py-3 text-center text-gray-800 text-sm">{record.wins}</td>
                          <td className="px-3 py-3 text-center text-gray-800 text-sm">{record.draws}</td>
                          <td className="px-3 py-3 text-center text-gray-800 text-sm">{record.losses}</td>
                          <td className="px-3 py-3 text-center text-gray-800 text-sm">{record.totalGames}</td>
                          <td className="px-3 py-3 text-center">
                            <span className={`font-bold text-sm ${recentGames[0] === 'W' ? 'text-blue-600' :
                                recentGames[0] === 'L' ? 'text-red-600' :
                                  'text-gray-600'
                              }`}>
                              {recentGames[0] === 'W' ? `${recentGames.filter(g => g === 'W').length}승` :
                                recentGames[0] === 'L' ? `${recentGames.filter(g => g === 'L').length}패` :
                                  `${recentGames.filter(g => g === 'D').length}무`}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center text-gray-800 text-sm">
                            {record.totalGames > 0 ? (record.totalScore / record.totalGames).toFixed(3) : '0.000'}
                          </td>
                          <td className="px-3 py-3 text-center text-gray-800 text-sm">
                            {record.totalGames > 0 ? (record.totalConceded / record.totalGames).toFixed(2) : '0.00'}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex gap-1 justify-center">
                              {recentGames.map((result, idx) => (
                                <div
                                  key={idx}
                                  className={`w-7 h-7 rounded flex items-center justify-center text-xs font-bold ${result === 'W' ? 'bg-blue-500 text-white' :
                                      result === 'L' ? 'bg-red-500 text-white' :
                                        'bg-gray-400 text-white'
                                    }`}
                                >
                                  {result === 'W' ? '승' : result === 'L' ? '패' : '무'}
                                </div>
                              ))}
                              {Array.from({ length: 5 - recentGames.length }).map((_, idx) => (
                                <div
                                  key={`empty-${idx}`}
                                  className="w-7 h-7 rounded border-2 border-gray-200"
                                />
                              ))}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          )}

          {/* 크루 기록 탭 */}
          {activeTab === 'team-stats' && (
          <div className="space-y-6">
            {/* 통계 카드 섹션 */}
            {(offensiveStats.length > 0 || defensiveStats.length > 0) && (
              <div className="relative">
                <div
                  ref={scrollContainerRef}
                  className={`overflow-x-auto scrollbar-hide smooth-scroll pb-4 ${isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                >
                  <div className="flex gap-4 min-w-max px-2">
                    {/* 타율 카드 */}
                    {offensiveStats.length > 0 && (
                      <div className="bg-white border-2 border-gray-200 rounded-xl p-6 min-w-[280px] shadow-sm">
                        <div className="text-base font-bold text-gray-800 mb-5">타율</div>
                        {offensiveStats[0] && (
                          <div className="mb-5 pb-4 border-b border-gray-200">
                            <div className="flex items-center gap-3">
                              {teamMap[offensiveStats[0].team]?.logo ? (
                                <img
                                  src={teamMap[offensiveStats[0].team].logo}
                                  alt={`${offensiveStats[0].team} 로고`}
                                  className="w-12 h-12 rounded-full object-cover border border-gray-200"
                                />
                              ) : (
                                <div
                                  className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold"
                                  style={{ backgroundColor: teamMap[offensiveStats[0].team]?.color || '#001A35' }}
                                >
                                  {offensiveStats[0].team.charAt(0)}
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-lg font-bold text-gray-800">{offensiveStats[0].team}</span>
                                  <span className="text-sm font-bold text-gray-500">1</span>
                                  <FontAwesomeIcon icon={faMedal} className="text-yellow-500 text-lg" />
                                </div>
                                <div className="text-2xl font-bold text-blue-600">{offensiveStats[0].battingAvg.toFixed(3)}</div>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="space-y-3">
                          {offensiveStats.slice(1, 4).map((stat, idx) => (
                            <div key={stat.team} className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-1">
                                <span className="text-gray-500 text-sm font-medium w-5">{idx + 2}</span>
                                {teamMap[stat.team]?.logo ? (
                                  <img
                                    src={teamMap[stat.team].logo}
                                    alt={`${stat.team} 로고`}
                                    className="w-7 h-7 rounded-full object-cover border border-gray-200"
                                  />
                                ) : (
                                  <div
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                    style={{ backgroundColor: teamMap[stat.team]?.color || '#001A35' }}
                                  >
                                    {stat.team.charAt(0)}
                                  </div>
                                )}
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{stat.team}</div>
                                  <div className="text-xs text-gray-500">안타 {stat.hits.toLocaleString()}개</div>
                                </div>
                              </div>
                              <span className="text-blue-600 font-bold text-sm ml-2">{stat.battingAvg.toFixed(3)}</span>
                            </div>
                          ))}
                        </div>
                        <button 
                          onClick={() => openModal('타율', getSortedData('타율'))}
                          className="mt-6 w-full py-2.5 text-center text-sm text-gray-600 hover:text-[#001A35] transition-colors border-t border-gray-200 pt-3"
                        >
                          더보기
                        </button>
                      </div>
                    )}

                    {/* 평균자책 카드 */}
                    {defensiveStats.length > 0 && (
                      <div className="bg-white border-2 border-gray-200 rounded-xl p-6 min-w-[280px] shadow-sm">
                        <div className="text-base font-bold text-gray-800 mb-5">평균자책</div>
                        {defensiveStats[0] && (
                          <div className="mb-5 pb-4 border-b border-gray-200">
                            <div className="flex items-center gap-3">
                              {teamMap[defensiveStats[0].team]?.logo ? (
                                <img
                                  src={teamMap[defensiveStats[0].team].logo}
                                  alt={`${defensiveStats[0].team} 로고`}
                                  className="w-12 h-12 rounded-full object-cover border border-gray-200"
                                />
                              ) : (
                                <div
                                  className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold"
                                  style={{ backgroundColor: teamMap[defensiveStats[0].team]?.color || '#001A35' }}
                                >
                                  {defensiveStats[0].team.charAt(0)}
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-lg font-bold text-gray-800">{defensiveStats[0].team}</span>
                                  <span className="text-sm font-bold text-gray-500">1</span>
                                  <FontAwesomeIcon icon={faMedal} className="text-yellow-500 text-lg" />
                                </div>
                                <div className="text-2xl font-bold text-blue-600">{defensiveStats[0].era.toFixed(2)}</div>
                              </div>
                            </div>
                          </div>
                        )}
                        <div className="space-y-3">
                          {defensiveStats.slice(1, 4).map((stat, idx) => (
                            <div key={stat.team} className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-1">
                                <span className="text-gray-500 text-sm font-medium w-5">{idx + 2}</span>
                                {teamMap[stat.team]?.logo ? (
                                  <img
                                    src={teamMap[stat.team].logo}
                                    alt={`${stat.team} 로고`}
                                    className="w-7 h-7 rounded-full object-cover border border-gray-200"
                                  />
                                ) : (
                                  <div
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                    style={{ backgroundColor: teamMap[stat.team]?.color || '#001A35' }}
                                  >
                                    {stat.team.charAt(0)}
                                  </div>
                                )}
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{stat.team}</div>
                                  <div className="text-xs text-gray-500">실점 {stat.runsAllowed}점</div>
                                </div>
                              </div>
                              <span className="text-blue-600 font-bold text-sm ml-2">{stat.era.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        <button 
                          onClick={() => openModal('평균자책', getSortedData('평균자책'))}
                          className="mt-6 w-full py-2.5 text-center text-sm text-gray-600 hover:text-[#001A35] transition-colors border-t border-gray-200 pt-3"
                        >
                          더보기
                        </button>
                      </div>
                    )}

                    {/* 홈런 카드 */}
                    {offensiveStats.length > 0 && (
                      <div className="bg-white border-2 border-gray-200 rounded-xl p-6 min-w-[280px] shadow-sm">
                        <div className="text-base font-bold text-gray-800 mb-5">홈런</div>
                        {(() => {
                          const sortedByHR = [...offensiveStats].sort((a, b) => b.homeRuns - a.homeRuns);
                          return sortedByHR[0] && (
                            <>
                              <div className="mb-5 pb-4 border-b border-gray-200">
                                <div className="flex items-center gap-3">
                                  {teamMap[sortedByHR[0].team]?.logo ? (
                                    <img
                                      src={teamMap[sortedByHR[0].team].logo}
                                      alt={`${sortedByHR[0].team} 로고`}
                                      className="w-12 h-12 rounded-full object-cover border border-gray-200"
                                    />
                                  ) : (
                                    <div
                                      className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold"
                                      style={{ backgroundColor: teamMap[sortedByHR[0].team]?.color || '#001A35' }}
                                    >
                                      {sortedByHR[0].team.charAt(0)}
                                    </div>
                                  )}
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-lg font-bold text-gray-800">{sortedByHR[0].team}</span>
                                      <span className="text-sm font-bold text-gray-500">1</span>
                                      <FontAwesomeIcon icon={faMedal} className="text-yellow-500 text-lg" />
                                    </div>
                                    <div className="text-2xl font-bold text-blue-600">{sortedByHR[0].homeRuns}개</div>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-3">
                                {sortedByHR.slice(1, 4).map((stat, idx) => (
                                  <div key={stat.team} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 flex-1">
                                      <span className="text-gray-500 text-sm font-medium w-5">{idx + 2}</span>
                                      {teamMap[stat.team]?.logo ? (
                                        <img
                                          src={teamMap[stat.team].logo}
                                          alt={`${stat.team} 로고`}
                                          className="w-7 h-7 rounded-full object-cover border border-gray-200"
                                        />
                                      ) : (
                                        <div
                                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                          style={{ backgroundColor: teamMap[stat.team]?.color || '#001A35' }}
                                        >
                                          {stat.team.charAt(0)}
                                        </div>
                                      )}
                                      <div className="flex-1">
                                        <div className="font-medium text-sm">{stat.team}</div>
                                        <div className="text-xs text-gray-500">장타율 {stat.slg.toFixed(3)}</div>
                                      </div>
                                    </div>
                                    <span className="text-blue-600 font-bold text-sm ml-2">{stat.homeRuns}개</span>
                                  </div>
                                ))}
                              </div>
                            </>
                          );
                        })()}
                        <button 
                          onClick={() => openModal('홈런', getSortedData('홈런'))}
                          className="mt-6 w-full py-2.5 text-center text-sm text-gray-600 hover:text-[#001A35] transition-colors border-t border-gray-200 pt-3"
                        >
                          더보기
                        </button>
                      </div>
                    )}

                    {/* 안타 카드 */}
                    {offensiveStats.length > 0 && (
                      <div className="bg-white border-2 border-gray-200 rounded-xl p-6 min-w-[280px] shadow-sm">
                        <div className="text-base font-bold text-gray-800 mb-5">안타</div>
                        {(() => {
                          const sortedByHits = [...offensiveStats].sort((a, b) => b.hits - a.hits);
                          return sortedByHits[0] && (
                            <>
                              <div className="mb-5 pb-4 border-b border-gray-200">
                                <div className="flex items-center gap-3">
                                  {teamMap[sortedByHits[0].team]?.logo ? (
                                    <img
                                      src={teamMap[sortedByHits[0].team].logo}
                                      alt={`${sortedByHits[0].team} 로고`}
                                      className="w-12 h-12 rounded-full object-cover border border-gray-200"
                                    />
                                  ) : (
                                    <div
                                      className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold"
                                      style={{ backgroundColor: teamMap[sortedByHits[0].team]?.color || '#001A35' }}
                                    >
                                      {sortedByHits[0].team.charAt(0)}
                                    </div>
                                  )}
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-lg font-bold text-gray-800">{sortedByHits[0].team}</span>
                                      <span className="text-sm font-bold text-gray-500">1</span>
                                      <FontAwesomeIcon icon={faMedal} className="text-yellow-500 text-lg" />
                                    </div>
                                    <div className="text-2xl font-bold text-blue-600">{sortedByHits[0].hits.toLocaleString()}개</div>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-3">
                                {sortedByHits.slice(1, 4).map((stat, idx) => (
                                  <div key={stat.team} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 flex-1">
                                      <span className="text-gray-500 text-sm font-medium w-5">{idx + 2}</span>
                                      {teamMap[stat.team]?.logo ? (
                                        <img
                                          src={teamMap[stat.team].logo}
                                          alt={`${stat.team} 로고`}
                                          className="w-7 h-7 rounded-full object-cover border border-gray-200"
                                        />
                                      ) : (
                                        <div
                                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                          style={{ backgroundColor: teamMap[stat.team]?.color || '#001A35' }}
                                        >
                                          {stat.team.charAt(0)}
                                        </div>
                                      )}
                                      <div className="flex-1">
                                        <div className="font-medium text-sm">{stat.team}</div>
                                        <div className="text-xs text-gray-500">타율 {stat.battingAvg.toFixed(3)}</div>
                                      </div>
                                    </div>
                                    <span className="text-blue-600 font-bold text-sm ml-2">{stat.hits.toLocaleString()}개</span>
                                  </div>
                                ))}
                              </div>
                            </>
                          );
                        })()}
                        <button 
                          onClick={() => openModal('안타', getSortedData('안타'))}
                          className="mt-6 w-full py-2.5 text-center text-sm text-gray-600 hover:text-[#001A35] transition-colors border-t border-gray-200 pt-3"
                        >
                          더보기
                        </button>
                      </div>
                    )}

                    {/* 도루 카드 */}
                    {offensiveStats.length > 0 && (
                      <div className="bg-white border-2 border-gray-200 rounded-xl p-6 min-w-[280px] shadow-sm">
                        <div className="text-base font-bold text-gray-800 mb-5">도루</div>
                        {(() => {
                          const sortedBySB = [...offensiveStats].sort((a, b) => b.stolenBases - a.stolenBases);
                          return sortedBySB[0] && (
                            <>
                              <div className="mb-5 pb-4 border-b border-gray-200">
                                <div className="flex items-center gap-3">
                                  {teamMap[sortedBySB[0].team]?.logo ? (
                                    <img
                                      src={teamMap[sortedBySB[0].team].logo}
                                      alt={`${sortedBySB[0].team} 로고`}
                                      className="w-12 h-12 rounded-full object-cover border border-gray-200"
                                    />
                                  ) : (
                                    <div
                                      className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold"
                                      style={{ backgroundColor: teamMap[sortedBySB[0].team]?.color || '#001A35' }}
                                    >
                                      {sortedBySB[0].team.charAt(0)}
                                    </div>
                                  )}
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-lg font-bold text-gray-800">{sortedBySB[0].team}</span>
                                      <span className="text-sm font-bold text-gray-500">1</span>
                                      <FontAwesomeIcon icon={faMedal} className="text-yellow-500 text-lg" />
                                    </div>
                                    <div className="text-2xl font-bold text-blue-600">{sortedBySB[0].stolenBases}개</div>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-3">
                                {sortedBySB.slice(1, 4).map((stat, idx) => (
                                  <div key={stat.team} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 flex-1">
                                      <span className="text-gray-500 text-sm font-medium w-5">{idx + 2}</span>
                                      {teamMap[stat.team]?.logo ? (
                                        <img
                                          src={teamMap[stat.team].logo}
                                          alt={`${stat.team} 로고`}
                                          className="w-7 h-7 rounded-full object-cover border border-gray-200"
                                        />
                                      ) : (
                                        <div
                                          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                          style={{ backgroundColor: teamMap[stat.team]?.color || '#001A35' }}
                                        >
                                          {stat.team.charAt(0)}
                                        </div>
                                      )}
                                      <div className="flex-1">
                                        <div className="font-medium text-sm">{stat.team}</div>
                                        <div className="text-xs text-gray-500">출루율 {stat.obp.toFixed(3)}</div>
                                      </div>
                                    </div>
                                    <span className="text-blue-600 font-bold text-sm ml-2">{stat.stolenBases}개</span>
                                  </div>
                                ))}
                              </div>
                            </>
                          );
                        })()}
                        <button 
                          onClick={() => openModal('도루', getSortedData('도루'))}
                          className="mt-6 w-full py-2.5 text-center text-sm text-gray-600 hover:text-[#001A35] transition-colors border-t border-gray-200 pt-3"
                        >
                          더보기
                        </button>
                      </div>
                    )}

                    {/* 득점 카드 */}
                    {offensiveStats.length > 0 && (
                      <div className="bg-white border-2 border-gray-200 rounded-xl p-6 min-w-[280px] shadow-sm">
                        <div className="text-base font-bold text-gray-800 mb-5">득점</div>
                        {(() => {
                          const sortedByRuns = [...offensiveStats].sort((a, b) => b.runs - a.runs);
                          const defensiveMap = new Map(defensiveStats.map(s => [s.team, s]));
                          return sortedByRuns[0] && (
                            <>
                              <div className="mb-5 pb-4 border-b border-gray-200">
                                <div className="flex items-center gap-3">
                                  {teamMap[sortedByRuns[0].team]?.logo ? (
                                    <img
                                      src={teamMap[sortedByRuns[0].team].logo}
                                      alt={`${sortedByRuns[0].team} 로고`}
                                      className="w-12 h-12 rounded-full object-cover border border-gray-200"
                                    />
                                  ) : (
                                    <div
                                      className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold"
                                      style={{ backgroundColor: teamMap[sortedByRuns[0].team]?.color || '#001A35' }}
                                    >
                                      {sortedByRuns[0].team.charAt(0)}
                                    </div>
                                  )}
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-lg font-bold text-gray-800">{sortedByRuns[0].team}</span>
                                      <span className="text-sm font-bold text-gray-500">1</span>
                                      <FontAwesomeIcon icon={faMedal} className="text-yellow-500 text-lg" />
                                    </div>
                                    <div className="text-2xl font-bold text-blue-600">{sortedByRuns[0].runs}점</div>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-3">
                                {sortedByRuns.slice(1, 4).map((stat, idx) => {
                                  const defStat = defensiveMap.get(stat.team);
                                  return (
                                    <div key={stat.team} className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 flex-1">
                                        <span className="text-gray-500 text-sm font-medium w-5">{idx + 2}</span>
                                        {teamMap[stat.team]?.logo ? (
                                          <img
                                            src={teamMap[stat.team].logo}
                                            alt={`${stat.team} 로고`}
                                            className="w-7 h-7 rounded-full object-cover border border-gray-200"
                                          />
                                        ) : (
                                          <div
                                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                            style={{ backgroundColor: teamMap[stat.team]?.color || '#001A35' }}
                                          >
                                            {stat.team.charAt(0)}
                                          </div>
                                        )}
                                        <div className="flex-1">
                                          <div className="font-medium text-sm">{stat.team}</div>
                                          <div className="text-xs text-gray-500">실점 {defStat?.runsAllowed || '-'}점</div>
                                        </div>
                                      </div>
                                      <span className="text-blue-600 font-bold text-sm ml-2">{stat.runs}점</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          );
                        })()}
                        <button 
                          onClick={() => openModal('득점', getSortedData('득점'))}
                          className="mt-6 w-full py-2.5 text-center text-sm text-gray-600 hover:text-[#001A35] transition-colors border-t border-gray-200 pt-3"
                        >
                          더보기
                        </button>
                      </div>
                    )}

                    {/* 실점 카드 */}
                    {defensiveStats.length > 0 && (
                      <div className="bg-white border-2 border-gray-200 rounded-xl p-6 min-w-[280px] shadow-sm">
                        <div className="text-base font-bold text-gray-800 mb-5">실점</div>
                        {(() => {
                          const sortedByRunsAllowed = [...defensiveStats].sort((a, b) => a.runsAllowed - b.runsAllowed);
                          const offensiveMap = new Map(offensiveStats.map(s => [s.team, s]));
                          return sortedByRunsAllowed[0] && (
                            <>
                              <div className="mb-5 pb-4 border-b border-gray-200">
                                <div className="flex items-center gap-3">
                                  {teamMap[sortedByRunsAllowed[0].team]?.logo ? (
                                    <img
                                      src={teamMap[sortedByRunsAllowed[0].team].logo}
                                      alt={`${sortedByRunsAllowed[0].team} 로고`}
                                      className="w-12 h-12 rounded-full object-cover border border-gray-200"
                                    />
                                  ) : (
                                    <div
                                      className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold"
                                      style={{ backgroundColor: teamMap[sortedByRunsAllowed[0].team]?.color || '#001A35' }}
                                    >
                                      {sortedByRunsAllowed[0].team.charAt(0)}
                                    </div>
                                  )}
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-lg font-bold text-gray-800">{sortedByRunsAllowed[0].team}</span>
                                      <span className="text-sm font-bold text-gray-500">1</span>
                                      <FontAwesomeIcon icon={faMedal} className="text-yellow-500 text-lg" />
                                    </div>
                                    <div className="text-2xl font-bold text-blue-600">{sortedByRunsAllowed[0].runsAllowed}점</div>
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-3">
                                {sortedByRunsAllowed.slice(1, 4).map((stat, idx) => {
                                  const offStat = offensiveMap.get(stat.team);
                                  return (
                                    <div key={stat.team} className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 flex-1">
                                        <span className="text-gray-500 text-sm font-medium w-5">{idx + 2}</span>
                                        {teamMap[stat.team]?.logo ? (
                                          <img
                                            src={teamMap[stat.team].logo}
                                            alt={`${stat.team} 로고`}
                                            className="w-7 h-7 rounded-full object-cover border border-gray-200"
                                          />
                                        ) : (
                                          <div
                                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                            style={{ backgroundColor: teamMap[stat.team]?.color || '#001A35' }}
                                          >
                                            {stat.team.charAt(0)}
                                          </div>
                                        )}
                                        <div className="flex-1">
                                          <div className="font-medium text-sm">{stat.team}</div>
                                          <div className="text-xs text-gray-500">득점 {offStat?.runs || '-'}점</div>
                                        </div>
                                      </div>
                                      <span className="text-blue-600 font-bold text-sm ml-2">{stat.runsAllowed}점</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </>
                          );
                        })()}
                        <button 
                          onClick={() => openModal('실점', getSortedData('실점'))}
                          className="mt-6 w-full py-2.5 text-center text-sm text-gray-600 hover:text-[#001A35] transition-colors border-t border-gray-200 pt-3"
                        >
                          더보기
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 공격 기록 */}
          <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-[#001A35] px-6 py-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <FontAwesomeIcon icon={faBaseballBatBall} />
                  공격 기록
              </h2>
            </div>

              {offensiveStats.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                  공격 기록 데이터가 아직 없습니다.
              </div>
            ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b-2 border-gray-200">
                      <tr>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">순위</th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-600">크루</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">타율</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">득점</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">타점</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">타수</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">홈런</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">안타</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">2루타</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">3루타</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">도루</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">사사구</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">삼진</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">병살타</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">출루율</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">장타율</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">OPS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {offensiveStats.map((stat, index) => (
                        <tr key={stat.team} className="hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-3 text-center">
                            <span className="text-gray-800 font-bold text-sm">{index + 1}</span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              {teamMap[stat.team]?.logo ? (
                                <img
                                  src={teamMap[stat.team].logo}
                                  alt={`${stat.team} 로고`}
                                  className="w-6 h-6 rounded-full object-cover border border-gray-200"
                                />
                              ) : (
                                <div
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                  style={{ backgroundColor: teamMap[stat.team]?.color || '#001A35' }}
                                >
                                  {stat.team.charAt(0)}
                                </div>
                              )}
                              <span className="font-bold text-gray-800 text-sm">{stat.team}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center text-gray-800 text-sm">{stat.battingAvg.toFixed(3)}</td>
                          <td className="px-3 py-3 text-center text-gray-800 text-sm">{stat.runs}</td>
                          <td className="px-3 py-3 text-center text-gray-800 text-sm">{stat.rbi}</td>
                          <td className="px-3 py-3 text-center text-gray-800 text-sm">{stat.atBats.toLocaleString()}</td>
                          <td className="px-3 py-3 text-center text-gray-800 text-sm">{stat.homeRuns}</td>
                          <td className="px-3 py-3 text-center text-gray-800 text-sm">{stat.hits}</td>
                          <td className="px-3 py-3 text-center text-gray-800 text-sm">{stat.doubles}</td>
                          <td className="px-3 py-3 text-center text-gray-800 text-sm">{stat.triples}</td>
                          <td className="px-3 py-3 text-center text-gray-800 text-sm">{stat.stolenBases}</td>
                          <td className="px-3 py-3 text-center text-gray-800 text-sm">{stat.walks}</td>
                          <td className="px-3 py-3 text-center text-gray-800 text-sm">{stat.strikeouts}</td>
                          <td className="px-3 py-3 text-center text-gray-800 text-sm">{stat.doublePlays}</td>
                          <td className="px-3 py-3 text-center text-gray-800 text-sm">{stat.obp.toFixed(3)}</td>
                          <td className="px-3 py-3 text-center text-gray-800 text-sm">{stat.slg.toFixed(3)}</td>
                          <td className="px-3 py-3 text-center text-gray-800 text-sm">{stat.ops.toFixed(3)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 수비 기록 */}
            <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
              <div className="bg-[#001A35] px-6 py-4">
                <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                  <FontAwesomeIcon icon={faBaseball} />
                  수비 기록
                </h2>
              </div>

              {defensiveStats.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  수비 기록 데이터가 아직 없습니다.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b-2 border-gray-200">
                      <tr>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">순위</th>
                        <th className="px-3 py-3 text-left text-xs font-bold text-gray-600">크루명</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">평균자책</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">실점</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">자책점</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">이닝</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">피안타</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">피홈런</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">탈삼진</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">사사구</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">폭투</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">실책</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">WHIP</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">QS</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">홀드</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-600">세이브</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {defensiveStats.map((stat, index) => (
                        <tr key={stat.team} className="hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-3 text-center">
                            <span className="text-gray-800 font-bold text-sm">{index + 1}</span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
                              {teamMap[stat.team]?.logo ? (
                                <img
                                  src={teamMap[stat.team].logo}
                                  alt={`${stat.team} 로고`}
                                  className="w-6 h-6 rounded-full object-cover border border-gray-200"
                                />
                              ) : (
                                <div
                                  className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                  style={{ backgroundColor: teamMap[stat.team]?.color || '#001A35' }}
                                >
                                  {stat.team.charAt(0)}
                      </div>
                              )}
                              <span className="font-bold text-gray-800 text-sm">{stat.team}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center text-gray-800 text-sm">{stat.era.toFixed(2)}</td>
                          <td className="px-3 py-3 text-center text-gray-800 text-sm">{stat.runsAllowed}</td>
                          <td className="px-3 py-3 text-center text-gray-800 text-sm">{stat.earnedRuns}</td>
                          <td className="px-3 py-3 text-center text-gray-800 text-sm">{stat.innings.toFixed(1)}</td>
                          <td className="px-3 py-3 text-center text-gray-800 text-sm">{stat.hitsAllowed}</td>
                          <td className="px-3 py-3 text-center text-gray-800 text-sm">{stat.homeRunsAllowed}</td>
                          <td className="px-3 py-3 text-center text-gray-800 text-sm">{stat.strikeouts}</td>
                          <td className="px-3 py-3 text-center text-gray-800 text-sm">{stat.walks}</td>
                          <td className="px-3 py-3 text-center text-gray-800 text-sm">{stat.wildPitches}</td>
                          <td className="px-3 py-3 text-center text-gray-800 text-sm">{stat.errors}</td>
                          <td className="px-3 py-3 text-center text-gray-800 text-sm">{stat.whip.toFixed(2)}</td>
                          <td className="px-3 py-3 text-center text-gray-800 text-sm">{stat.qualityStarts}</td>
                          <td className="px-3 py-3 text-center text-gray-800 text-sm">{stat.holds}</td>
                          <td className="px-3 py-3 text-center text-gray-800 text-sm">{stat.saves}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          )}

          {/* 타자 기록 탭 */}
          {activeTab === 'batter' && (
          <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
            {/* 헤더 */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold text-gray-800">타자 기록 전체</h2>
                  <select
                    value={batterFilter}
                    onChange={(e) => setBatterFilter(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#001A35]"
                  >
                    <option value="전체">전체</option>
                    {teams.map(team => (
                      <option key={team.id} value={team.name}>{team.name}</option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Q 선수 기록 검색"
                    value={batterSearchQuery}
                    onChange={(e) => setBatterSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#001A35] w-64"
                  />
                  <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                </div>
              </div>
            </div>

            {/* 테이블 */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">순위</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600">선수</th>
                    <th 
                      className="px-4 py-3 text-center text-xs font-bold text-blue-600 cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        if (batterSortField === 'battingAvg') {
                          setBatterSortOrder(batterSortOrder === 'desc' ? 'asc' : 'desc');
                        } else {
                          setBatterSortField('battingAvg');
                          setBatterSortOrder('desc');
                        }
                      }}
                    >
                      <div className="flex items-center justify-center gap-1">
                        타율
                        {batterSortField === 'battingAvg' ? (
                          batterSortOrder === 'desc' ? <FontAwesomeIcon icon={faSortDown} /> : <FontAwesomeIcon icon={faSortUp} />
                        ) : (
                          <FontAwesomeIcon icon={faSort} className="text-gray-400" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">경기</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">타수</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">안타</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">홈런</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">2루타</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">3루타</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">타점</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">득점</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">도루</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">볼넷</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">사구</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">삼진</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">출루율</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(() => {
                    // 필터링 및 정렬
                    let filtered = batterRecords;
                    
                    // 크루 필터
                    if (batterFilter !== '전체') {
                      filtered = filtered.filter(b => b.team === batterFilter);
                    }
                    
                    // 검색 필터
                    if (batterSearchQuery) {
                      filtered = filtered.filter(b => 
                        b.name.toLowerCase().includes(batterSearchQuery.toLowerCase()) ||
                        b.team.toLowerCase().includes(batterSearchQuery.toLowerCase())
                      );
                    }
                    
                    // 정렬
                    const sorted = [...filtered].sort((a, b) => {
                      const aVal = (a as any)[batterSortField];
                      const bVal = (b as any)[batterSortField];
                      if (batterSortOrder === 'desc') {
                        return bVal - aVal;
                      } else {
                        return aVal - bVal;
                      }
                    });
                    
                    return sorted.map((batter, index) => (
                      <tr key={batter.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-center text-sm text-gray-600">{index + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {batter.profileImage ? (
                              <img
                                src={batter.profileImage}
                                alt={`${batter.name} 프로필`}
                                className="w-10 h-10 rounded-full object-cover border border-gray-200"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-bold">
                                {batter.name.charAt(0)}
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="font-medium text-sm text-gray-800">{batter.name}</div>
                              <div className="flex items-center gap-2 mt-1">
                                {teamMap[batter.team]?.logo ? (
                                  <img
                                    src={teamMap[batter.team].logo}
                                    alt={`${batter.team} 로고`}
                                    className="w-5 h-5 rounded-full object-cover"
                                  />
                                ) : (
                                  <div
                                    className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                    style={{ backgroundColor: teamMap[batter.team]?.color || '#001A35' }}
                                  >
                                    {batter.team.charAt(0)}
                                  </div>
                                )}
                                <span className="text-xs text-gray-500">{batter.team}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center text-sm font-bold text-blue-600">{batter.battingAvg.toFixed(3)}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-800">{batter.games}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-800">{batter.atBats.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-800">{batter.hits.toLocaleString()}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-800">{batter.homeRuns}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-800">{batter.doubles}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-800">{batter.triples}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-800">{batter.rbi}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-800">{batter.runs}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-800">{batter.stolenBases}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-800">{batter.walks}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-800">{batter.hitByPitch}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-800">{batter.strikeouts}</td>
                        <td className="px-4 py-3 text-center text-sm text-gray-800">{batter.obp.toFixed(3)}</td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
          )}

          {/* 투수 기록 탭 */}
          {activeTab === 'pitcher' && (
          <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
            {/* 헤더 */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-bold text-gray-800">투수 기록 전체</h2>
                  <select
                    value={pitcherFilter}
                    onChange={(e) => setPitcherFilter(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#001A35]"
                  >
                    <option value="전체">전체</option>
                    {teams.map(team => (
                      <option key={team.id} value={team.name}>{team.name}</option>
                    ))}
                  </select>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Q 선수 기록 검색"
                    value={pitcherSearchQuery}
                    onChange={(e) => setPitcherSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#001A35] w-64"
                  />
                  <FontAwesomeIcon icon={faSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
                </div>
              </div>
            </div>

            {/* 테이블 */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-2 border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">순위</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-600">선수</th>
                    <th 
                      className="px-4 py-3 text-center text-xs font-bold text-blue-600 cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        if (pitcherSortField === 'era') {
                          setPitcherSortOrder(pitcherSortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setPitcherSortField('era');
                          setPitcherSortOrder('asc');
                        }
                      }}
                    >
                      <div className="flex items-center justify-center gap-1">
                        평균자책
                        {pitcherSortField === 'era' ? (
                          pitcherSortOrder === 'asc' ? <FontAwesomeIcon icon={faSortUp} /> : <FontAwesomeIcon icon={faSortDown} />
                        ) : (
                          <FontAwesomeIcon icon={faSort} className="text-gray-400" />
                        )}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">경기</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">승</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">패</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">세이브</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">홀드</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">이닝</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">탈삼진</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">피안타</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">피홈런</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">실점</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">자책점</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">볼넷</th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600">사구</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {(() => {
                    // 필터링 및 정렬
                    let filtered = pitcherRecords;
                    
                    // 크루 필터
                    if (pitcherFilter !== '전체') {
                      filtered = filtered.filter(p => p.team === pitcherFilter);
                    }
                    
                    // 검색 필터
                    if (pitcherSearchQuery) {
                      filtered = filtered.filter(p => 
                        p.name.toLowerCase().includes(pitcherSearchQuery.toLowerCase()) ||
                        p.team.toLowerCase().includes(pitcherSearchQuery.toLowerCase())
                      );
                    }
                    
                    // 정렬
                    const sorted = [...filtered].sort((a, b) => {
                      const aVal = (a as any)[pitcherSortField];
                      const bVal = (b as any)[pitcherSortField];
                      if (pitcherSortOrder === 'desc') {
                        return bVal - aVal;
                      } else {
                        return aVal - bVal;
                      }
                    });
                    
                    return sorted.map((pitcher, index) => {
                      // 이닝을 분수 형태로 표시 (예: 180 2/3)
                      const fullInnings = Math.floor(pitcher.innings);
                      const partialInnings = Math.round((pitcher.innings - fullInnings) * 3);
                      const inningsDisplay = partialInnings > 0 ? `${fullInnings} ${partialInnings}/3` : fullInnings.toString();
                      
                      return (
                        <tr key={pitcher.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-center text-sm text-gray-600">{index + 1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {pitcher.profileImage ? (
                                <img
                                  src={pitcher.profileImage}
                                  alt={`${pitcher.name} 프로필`}
                                  className="w-10 h-10 rounded-full object-cover border border-gray-200"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-bold">
                                  {pitcher.name.charAt(0)}
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="font-medium text-sm text-gray-800">{pitcher.name}</div>
                                <div className="flex items-center gap-2 mt-1">
                                  {teamMap[pitcher.team]?.logo ? (
                                    <img
                                      src={teamMap[pitcher.team].logo}
                                      alt={`${pitcher.team} 로고`}
                                      className="w-5 h-5 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div
                                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                      style={{ backgroundColor: teamMap[pitcher.team]?.color || '#001A35' }}
                                    >
                                      {pitcher.team.charAt(0)}
                                    </div>
                                  )}
                                  <span className="text-xs text-gray-500">{pitcher.team}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-bold text-blue-600">{pitcher.era.toFixed(2)}</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-800">{pitcher.games}</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-800">{pitcher.wins}</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-800">{pitcher.losses}</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-800">{pitcher.saves}</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-800">{pitcher.holds}</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-800">{inningsDisplay}</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-800">{pitcher.strikeouts}</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-800">{pitcher.hitsAllowed}</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-800">{pitcher.homeRunsAllowed}</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-800">{pitcher.runsAllowed}</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-800">{pitcher.earnedRuns}</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-800">{pitcher.walks}</td>
                          <td className="px-4 py-3 text-center text-sm text-gray-800">{pitcher.hitBatters}</td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
          )}
        </main>
      </div>

      {/* 통계 상세 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/20 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">크루 기록</h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <FontAwesomeIcon icon={faTimes} className="text-xl" />
              </button>
            </div>

            {/* 탭 메뉴 */}
            <div className="flex overflow-x-auto scrollbar-hide border-b border-gray-200">
              {['타율', '평균자책', '홈런', '안타', '도루', '득점', '실점', '타점', 'OPS', 'WAR'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => {
                    setModalTab(tab);
                    setModalData(getSortedData(tab));
                  }}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                    modalTab === tab
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* 모달 내용 */}
            <div className="flex-1 overflow-y-auto p-4">
              {modalData.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  데이터가 없습니다.
                </div>
              ) : (
                <div className="space-y-3">
                  {modalData.map((stat, index) => {
                    const statInfo = getStatValue(modalTab, stat);
                    // 타자 기록인지 확인 (name 필드가 있으면 타자 기록)
                    const isBatterRecord = 'name' in stat;
                    return (
                      <div key={isBatterRecord ? stat.id : stat.team} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="text-gray-500 text-sm font-medium w-6">{index + 1}</span>
                          {isBatterRecord ? (
                            // 타자 기록: 프로필 이미지와 이름
                            <>
                              {stat.profileImage ? (
                                <img
                                  src={stat.profileImage}
                                  alt={`${stat.name} 프로필`}
                                  className="w-10 h-10 rounded-full object-cover border border-gray-200"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm font-bold">
                                  {stat.name.charAt(0)}
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="font-medium text-sm">{stat.name}</div>
                                <div className="flex items-center gap-2 mt-1">
                                  {teamMap[stat.team]?.logo ? (
                                    <img
                                      src={teamMap[stat.team].logo}
                                      alt={`${stat.team} 로고`}
                                      className="w-5 h-5 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div
                                      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                      style={{ backgroundColor: teamMap[stat.team]?.color || '#001A35' }}
                                    >
                                      {stat.team.charAt(0)}
                                    </div>
                                  )}
                                  <span className="text-xs text-gray-500">{stat.team}</span>
                                </div>
                              </div>
                            </>
                          ) : (
                            // 크루 기록: 크루 로고와 이름
                            <>
                              {teamMap[stat.team]?.logo ? (
                                <img
                                  src={teamMap[stat.team].logo}
                                  alt={`${stat.team} 로고`}
                                  className="w-10 h-10 rounded-full object-cover border border-gray-200"
                                />
                              ) : (
                                <div
                                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                                  style={{ backgroundColor: teamMap[stat.team]?.color || '#001A35' }}
                                >
                                  {stat.team.charAt(0)}
                                </div>
                              )}
                              <div className="flex-1">
                                <div className="font-medium text-sm">{stat.team}</div>
                                {statInfo.sub && <div className="text-xs text-gray-500">{statInfo.sub}</div>}
                              </div>
                            </>
                          )}
                        </div>
                        <span className="text-blue-600 font-bold text-sm ml-2">{statInfo.value}{statInfo.unit}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
      </div>
        </div>
      )}
    </div>
  );
}
