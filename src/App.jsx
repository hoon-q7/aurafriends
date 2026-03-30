import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, Share2, Sparkles, ArrowLeft, UserCircle,
  Heart, Zap, Star, Calendar, Check, Flame, Award, Home,
  Users, Sun, Download, Upload, Gift
} from "lucide-react";
import { createClient } from '@supabase/supabase-js';

// 🧙 사주 엔진 v8.0 (Supabase hanja 연동 완료)
const SOLAR_TERM = [[2,4],[3,6],[4,5],[5,6],[6,6],[7,7],[8,7],[9,8],[10,8],[11,7]];
const STEMS = ["甲","乙","丙","丁","戊","己","庚","신","壬","癸"];
const STEMS_KO = ["갑","을","병","정","무","기","경","신","임","계"];
const BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const BRANCHES_KO = ["자","축","인","묘","진","사","오","미","신","유","술","해"];
const STEM_ELEM = [0,0,1,1,2,2,3,3,4,4];
const BRANCH_ELEM = [4,2,0,0,2,1,1,2,3,3,2,4];

function toJDN(year, month, day) {
  let y = year, m = month;
  if (m <= 2) { y--; m += 12; }
  const A = Math.floor(y/100), B = 2 - A + Math.floor(A/4);
  return Math.floor(365.25*(y+4716)) + Math.floor(30.6001*(m+1)) + day + B - 1524;
}

function getMonthIdx(y, m, d) {
  for (let i = 10; i >= 0; i--) {
    const [tm,td] = SOLAR_TERM[i];
    if (m > tm || (m===tm && d>=td)) return i;
  }
  return 11;
}

function getPrevDay(y, m, d) {
  const dt = new Date(y, m-1, d); dt.setDate(dt.getDate()-1);
  return [dt.getFullYear(), dt.getMonth()+1, dt.getDate()];
}

function getEffective(year, month, day, hour, minute) {
  let adj = hour*60 + minute - 30, [ey,em,ed] = [year, month, day];
  if (adj < 0) { adj += 1440; [ey,em,ed] = getPrevDay(ey,em,ed); }
  else if (Math.floor(adj/60) === 23) { [ey,em,ed] = getPrevDay(ey,em,ed); }
  return { ey, em, ed, adjH: Math.floor(adj/60) % 24 };
}

function calcSaju(year, month, day, hour=12, minute=0, timeUnknown=false) {
  let ey=year, em=month, ed=day, adjH=null;
  if (!timeUnknown) {
    const e = getEffective(year, month, day, hour, minute);
    [ey,em,ed,adjH] = [e.ey, e.em, e.ed, e.adjH];
  }
  const effY = (em===1 || (em===2 && ed<4)) ? ey-1 : ey;
  const yStem = ((effY-4)%10+100)%10, yBranch = ((effY-4)%12+120)%12;
  const mIdx = getMonthIdx(ey,em,ed);
  const mStem = ((yStem%5)*2+2+mIdx)%10, mBranch = (mIdx+2)%12;
  const jdn = toJDN(ey,em,ed);
  const dStem = (jdn+49)%10, dBranch = (jdn+49)%12;
  const dayGZ = (jdn+49)%60;
  let hStem=null, hBranch=null;
  if (!timeUnknown && adjH !== null) {
    hBranch = adjH===23 ? 0 : Math.floor((adjH+1)/2)%12;
    hStem = ((dStem%5)*2+hBranch)%10;
  }
  const charIdx = dayGZ * 2 + (hBranch !== null ? (hBranch >= 6 ? 1 : 0) : 0);
  return { yStem, yBranch, mStem, mBranch, dStem, dBranch, hStem, hBranch, dayGZ, charIdx };
}

const ELEM_NAME = ["목(木)","화(火)","토(土)","금(金)","수(水)"];
const ELEM_COLOR = ["#2d6a4f","#bf6100","#9a7100","#546e7a","#1565c0"];
const SHENG = [1,2,3,4,0];
const KE = [2,3,4,0,1];

const _SA = [
  ["곰돌이","🐻",0,"#0F5132","#F0FFF4","강한한 목 (木)의 기운",["우직함","신뢰","창의"],"40대 이후 명예와 재물이 쌓이는 대기만성형.","고집보다 유연함이 기회를 부릅니다."],
  ["토끼","🐰",0,"#00695C","#F5FFFF","유연한 목 (木)의 기운",["친화력","감수성","적응"],"인복이 강하여 협력자를 통해 전성기를 맞이합니다.","결단력이 필요한 순간엔 침착함이 핵심입니다."],
  ["사막여우","🦊",1,"#BF6100","#FFF5F0","열정적인 화 (火)의 기운",["열정","창의성","카리스마"],"20대 후반 아이디어로 자수성가할 운명.","열정 과잉으로 번아웃이 올 수 있으니 휴식이 필수입니다."],
  ["고양이","🐱",1,"#C62828","#FFF0F0","통찰력 있는 화 (火)의 기운",["직관","치유","리더십"],"40대 이후 학문적 명예와 지도자 운세.","감정 기복을 다스려야 행운을 지킵니다."],
  ["강아지","🐶",2,"#827717","#FFFDF0","견고한 토 (土)의 기운",["신뢰","안정","성실"],"중년에 안정적인 자산 운과 평온을 누림.","새로운 변화에 마음을 열어야 기회가 옵니다."],
  ["돼지","🐷",2,"#6D4C41","#FAF6F0","풍요로운 토 (土)의 기운",["풍요","포용","복록"],"평생 먹을 복과 재물운이 끊이지 않는 복록.","실속을 챙기는 지혜가 필요합니다."],
  ["늑대","🐺",3,"#455A64","#F8F8F8","결단력 있는 금 (金)의 기운",["결단력","정의감","전문성"],"전문직 분야에서 큰 두각을 나타내며 대운이 옵니다.","부드러운 말투가 행운의 통로입니다."],
  ["햄스터","🐹",3,"#1565C0","#F5F5FF","명석한 금 (金)의 기운",["지혜","분석력","전략"],"명석한 지혜가 재물이 되는 운명.","자만하면 큰 손해가 오니 겸손이 필수입니다."],
  ["고래","🐳",4,"#1976D2","#F0FAFF","넓은 수 (水)의 기운",["통찰","비전","포용"],"해외운·유통운이 강해 넓은 무대에서 성공.","빠른 실행력이 운을 보강합니다."],
  ["병아리","🐥",4,"#303F9F","#F2F8FF","많은 수 (Water)의 기운",["영감","순수","소통"],"예술·교육 분야에서 큰 성취를 이룹니다.","금전 거래·계약 시 꼼꼼해야 합니다."]
];

const _BD = ["새벽별의", "대지의", "새싹의", "달빛", "황금", "태양의", "불꽃", "들판의", "강철", "보석", "한밤의", "고요한 대지", "숲속의", "안개 속", "별빛", "노을 속", "촛불", "밤 들판의", "서리", "눈꽃"];
const _BN = ["한밤의", "고요한 대지", "숲속의", "안개 속", "별빛", "노을 속", "촛불", "밤 들판의", "서리", "눈꽃", "새벽별의", "대지의", "새싹의", "달빛", "황금", "태양의", "불꽃", "들판의", "강철", "보석"];
const _SSTM_KO = ["목 (木)", "목 (木)", "화 (火)", "화 (火)", "토 (土)", "토 (土)", "금 (金)", "금 (金)", "수 (水)", "수 (水)"];

function _buildCharData() {
  const out = {};
  for (let gz = 0; gz < 60; gz++) {
    const s = gz % 10, b = gz % 12;
    const [ko, icon, elem, color, bg, essence, keywords, luckTrend, caution] = _SA[s];
    for (let night = 0; night <= 1; night++) {
      const idx = gz * 2 + night;
      const env = night ? _BN[b] : _BD[b];
      const name = `${env} ${ko}`;
      const rationale = `일주 ${STEMS[s]}${BRANCHES[b]}(${STEMS[s]}=${_SSTM_KO[s]})`;
      out[idx] = { name, icon, element:elem, color, bg, rationale, luckTrend, caution, keywords };
    }
  }
  return out;
}
const CHAR_DATA = _buildCharData();

const LEVELS = [
  {min:0, max:2, rank:"Lv.1",name:"잠든 알", icon:"🥚"},
  {min:3, max:6, rank:"Lv.2",name:"새싹 아우라", icon:"🌱"},
  {min:7, max:14, rank:"Lv.3",name:"빛나는 별", icon:"⭐"},
  {min:15,max:29, rank:"Lv.4",name:"각성 아우라", icon:"⚡"},
  {min:30,max:999, rank:"Lv.5",name:"전설의 기운", icon:"👑"},
];
const getLevel = s => LEVELS.find(l => s>=l.min && s<=l.max) ?? LEVELS[0];

const IDIOMS = [
  {text:"積小成大",reading:"적소성대",meaning:"작은 것이 쌓여 큰 것을 이룬다 — 오늘의 작은 노력"},
  {text:"水滴石穿",reading:"수적석천",meaning:"물방울이 돌을 뚫는다 — 꾸준함이 어떤 장벽도 허물니다"},
  {text:"日Just月將",reading:"일취월장",meaning:"날마다 달마다 성장한다 - 오늘도 어제보다 한 뼘 성장"},
  {text:"柳暗花明",reading:"유암화명",meaning:"버드나무 그늘 너머 꽃밭이 펼쳐진다 - 막힌 길 끝에"},
  {text:"見機而動",reading:"견기이동",meaning:"기회를 보고 움직인다 - 오늘 찾아온 기회를 놓치지 마라"},
  {text:"精誠所至",reading:"정성소지",meaning:"정성이 지극하면 하늘도 감동한다 - 오늘의 진심이 운명을 바꾼다"},
  {text:"龍飛鳳舞",reading:"용비봉무",meaning:"용이 날고 봉황이 춤춘다 - 오늘은 기세가 충천하는 날"},
  {text:"錦上添花",reading:"금상첨화",meaning:"비단 위에 꽃을 더하다 - 좋은 일 위에 더 좋은 일이 생긴다"},
  {text:"以逸待勞",reading:"이일대로",meaning:"편히 쉬며 내일을 준비한다 - 오늘은 충전이 필요한 날"},
  {text:"一石二鳥",reading:"일석이조",meaning:"하나의 행동으로 두 가지 결과 - 오늘은 효율이 극대화된다"},
  {text:"山高水長",reading:"산고수장",meaning:"산처럼 높고 물처럼 길다 - 인품과 덕이 오래 이어진다"},
  {text:"志在四方",reading:"지재사방",meaning:"뜻은 사방에 있다 - 넓은 세상을 향해 큰 꿈을 펼칠 날"}
];

const COMPAT_TABLE = {
  sheng:{level:5,emoji:"💖",label:"천생연분",desc:"서로를 성장시키는 최고의 인연입니다. 함께할 수 있는 인연"},
  shengBy:{level:4,emoji:"🌟",label:"보살피는 인연",desc:"한 사람이 다른 사람을 이끌어주는 흔한 인연"},
  same:{level:4,emoji:"🤝",label:"비화동류",desc:"같은 기운끼리 공감대가 강하고 편안한 동반자"},
  neutral:{level:3,emoji:"🌿",label:"평화로운 인연",desc:"큰 갈등 없이 서로 존중하며 나아갈 수 있는 인연"},
  ke:{level:2,emoji:"⚡",label:"자극과 성장",desc:"긴장감이 있지만 서로를 강하게 단련시키는 강한 인연"},
  keBy:{level:2,emoji:"🔥",label:"도전적 관계",desc:"주도권 경쟁이 생길 수 있어 서로 깊은 배려가 필요한 인연"}
};

function getCompat(i1, i2) {
  const e1 = CHAR_DATA[i1]?.element??0, e2 = CHAR_DATA[i2]?.element??0;
  if(e1===e2) return COMPAT_TABLE.same;
  if(SHENG[e1]===e2) return COMPAT_TABLE.sheng;
  if(SHENG[e2]===e1) return COMPAT_TABLE.shengBy;
  if(KE[e1]===e2) return COMPAT_TABLE.ke;
  if(KE[e2]===e1) return COMPAT_TABLE.keBy;
  return COMPAT_TABLE.neutral;
}

function elemRelation(myElem, todayElem) {
  if(myElem === todayElem) return 1;
  if(SHENG[todayElem] === myElem) return 2;
  if(SHENG[myElem] === todayElem) return 1;
  if(KE[todayElem] === myElem) return -2;
  if(KE[myElem] === todayElem) return -1;
  return 0;
}

function branchRelation(myBranch, todayBranch) {
  const HEX = [[0,1],[2,11],[3,10],[4,9],[5,8],[6,7]];
  if(HEX.some(([a,b])=>(myBranch===a&&todayBranch===b)||(myBranch===b&&todayBranch===a))) return 1;
  const TRI = [[0,4,8],[2,6,10],[1,5,9],[3,7,11]];
  if(TRI.some(g=>g.includes(myBranch)&&g.includes(todayBranch)&&myBranch!==todayBranch)) return 2;
  if(Math.abs(myBranch-todayBranch)===6) return -2;
  const XING = [[2,5,8],[1,10,7]];
  if(XING.some(g=>g.includes(myBranch)&&g.includes(todayBranch)&&myBranch!==todayBranch)) return -1;
  return 0;
}

function getTodayJdn(dateStr) {
  const [y,m,d] = dateStr.split("-").map(Number);
  return toJDN(y,m,d);
}

function getSajuDailyScore(profile, dateStr) {
  if (!profile?.saju) return 75;
  const jdn = getTodayJdn(dateStr);
  const todayStem = (jdn+49)%10, todayBranch = (jdn+49)%12;
  const todayElem = STEM_ELEM[todayStem];
  const myElem = STEM_ELEM[profile.saju.dStem];
  let base = 75;
  base += elemRelation(myElem, todayElem) * 6;
  base += branchRelation(profile.saju.dBranch, todayBranch) * 5;
  if(profile.saju.yStem != null) base += elemRelation(STEM_ELEM[profile.saju.yStem], todayElem) * 2;
  if(profile.saju.mStem != null) base += elemRelation(STEM_ELEM[profile.saju.mStem], todayElem) * 2;
  return Math.min(99, Math.max(60, base));
}

function getSajuCats(profile, dateStr) {
  if (!profile?.saju) return {love:72,career:72,health:72,money:72};
  const jdn = getTodayJdn(dateStr);
  const todayStem = (jdn+49)%10, todayBranch = (jdn+49)%12;
  const todayElem = STEM_ELEM[todayStem];
  const myElem = STEM_ELEM[profile.saju.dStem];
  const sr = elemRelation(myElem, todayElem);
  const br = branchRelation(profile.saju.dBranch, todayBranch);
  const cl = v => Math.min(99, Math.max(50, v));
  return {
    love: cl(72 + sr*4 + br*8),
    career: cl(72 + sr*8 + br*2),
    health: cl(72 + sr*3 - Math.abs(br)*4 + (br>=0?4:0)),
    money: cl(72 + sr*6 + br*4),
  };
}

function getSajuElemScores(profile, dateStr) {
  if (!profile?.saju) return [60,60,60,60,60];
  const jdn = getTodayJdn(dateStr);
  const todayElem = STEM_ELEM[(jdn+49)%10];
  const saju = profile.saju;
  const counts = [0,0,0,0,0];
  [saju.yStem,saju.mStem,saju.dStem,saju.hStem].filter(v=>v!=null).forEach(s=>counts[STEM_ELEM[s]]++);
  [saju.yBranch,saju.mBranch,saju.dBranch,saju.hBranch].filter(v=>v!=null).forEach(c=>counts[BRANCH_ELEM[c]]++);
  const maxC = Math.max(...counts, 1);
  return counts.map((c,i) => {
    const base = Math.round(c/maxC*60) + 30;
    const tb = (i===todayElem)?10 : SHENG[todayElem]===i?5 : KE[todayElem]===i?5 : 0;
    return Math.min(99, Math.max(30, base+tb));
  });
}

const _MISSIONS = {
  "2": ["새로운 인연과 적극적으로 연결해 보세요. 좋은 기운이 흐릅니다 🌸", "창의적인 프로젝트를 시작하기"],
  "1": ["오늘 하루 감사한 일 3가지를 종이에 적어보세요 📝", "좋아하는 음악을 들으며 10분간 명상해보세요"],
  "0": ["물 한 잔을 천천히 음미하며 마셔보세요 💧", "20분 산책으로 많은 공기를 마셔보세요 🌿", "나 자신에게 칭찬 한마디 하기"],
  "-1": ["오늘은 무리하지 말고 에너지를 충전하는 날로 삼으세요 🌙", "스마트폰을 1시간 내려놓고 아날로그 활동"],
  "-2": ["오늘은 중요한 결정을 미루고 충분히 쉬세요 ☁️", "가까운 사람과 대화로 마음의 짐을 나눠보세요 ❤️"]
};

function getSajuMission(profile, dateStr) {
  if (!profile?.saju) return _MISSIONS["0"][0];
  const [,d] = dateStr.split("-").map(Number);
  const jdn = getTodayJdn(dateStr);
  const te = STEM_ELEM[(jdn+49)%10];
  const me = STEM_ELEM[profile.saju.dStem];
  const rel = elemRelation(me, te);
  const pool = _MISSIONS[String(rel)] ?? _MISSIONS["0"];
  return pool[d % pool.length];
}

function getSajuCalendar(profile, year, month) {
  const days = new Date(year, month, 0).getDate();
  if (!profile?.saju) return { scores: Array(days).fill(75), good: new Set(), bad: new Set() };
  const me = STEM_ELEM[profile.saju.dStem];
  const mb = profile.saju.dBranch;
  const list = Array.from({length:days}, (_,i) => {
    const d = i+1;
    const jdn = toJDN(year, month, d);
    const te = STEM_ELEM[(jdn+49)%10];
    const tb = (jdn+49)%12;
    const score = 75 + elemRelation(me,te)*6 + branchRelation(mb,tb)*5;
    return { d, score: Math.min(99, Math.max(60, score)) };
  });
  const sorted = [...list].sort((a,b) => b.score-a.score);
  return {
    scores: list.map(x => x.score),
    good: new Set(sorted.slice(0,5).map(x=>x.d)),
    bad: new Set(sorted.slice(-3).map(x=>x.d)),
  };
}

function getSajuIdiom(profile, dateStr) {
  if (!profile?.saju) return IDIOMS[0];
  const jdn = getTodayJdn(dateStr);
  const todayGZ = (jdn+49)%60;
  const myGZ = profile.saju.dayGZ ?? 0;
  return IDIOMS[(todayGZ + myGZ) % IDIOMS.length];
}

function getNextBirthday(m, d) {
  const t = new Date(), y = t.getFullYear();
  let bd = new Date(y,m-1,d); if(bd<=t) bd = new Date(y+1,m-1,d);
  const diff = Math.ceil((bd-t)/86400000);
  return { days: diff, isToday: diff===0||diff===365 };
}

const todayStr = () => { const d=new Date(); return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; };
const maxDays = (y,m) => new Date(y,m,0).getDate();
const YS = Array.from({length:110},(_,i)=>2026-i);
const MS = Array.from({length:12},(_,i)=>i+1);
const HS = Array.from({length:24},(_,i)=>i);
const MI = Array.from({length:60},(_,i)=>i);

// ========== Supabase 한자 연동 (사용자 테이블 그대로 사용) ==========
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

let HANJA_DICT = {};
let HANJA_STROKES = {}; // strokes 테이블은 아직 없으므로 빈 객체 (나중에 추가 가능)

async function loadHanjaData() {
  const { data, error } = await supabase
    .from('hanja')
    .select('syllable, hanjas');

  if (error) {
    console.error('Supabase hanja 로드 실패:', error);
    return;
  }

  HANJA_DICT = {};
  data.forEach(row => {
    try {
      HANJA_DICT[row.syllable] = JSON.parse(row.hanjas || '[]');
    } catch (e) {
      HANJA_DICT[row.syllable] = [];
    }
  });

  console.log('✅ Supabase HANJA_DICT 로드 완료:', Object.keys(HANJA_DICT).length, '개 음절');
}

function getStrokeElement(total) {
  const r = total % 10;
  if(r===1||r===2) return 0; if(r===3||r===4) return 1;
  if(r===5||r===6) return 2; if(r===7||r===8) return 3;
  return 4;
}

const NAME_FORTUNE = [
  {elem:0,icon:"🌳",title:"목(木) 기운의 이름",desc:"성장과 창의의 기운이 깃든 이름. 예술적 재능"},
  {elem:1,icon:"🔥",title:"화(火) 기운의 이름",desc:"열정과 카리스마의 기운. 강한 존재감으로 주목"},
  {elem:2,icon:"⛰️",title:"토(土) 기운의 이름",desc:"신뢰와 안정의 기운. 꾸준한 노력으로 탄탄한 기반"},
  {elem:3,icon:"⚔️",title:"금(金) 기운의 이름",desc:"결단력과 지혜의 기운. 명석한 판단력으로 어필"},
  {elem:4,icon:"💧",title:"수(水) 기운의 이름",desc:"유연함과 통찰의 기운. 흘러가는 물처럼 어떤 상황도"},
];

function getNameFortune(syllables, selections) {
  if (!syllables?.length) return null;
  const details = syllables.map((syl,i) => {
    const hanja = selections?.[i] || "";
    return { syl, hanja, strokes: hanja ? (HANJA_STROKES[hanja]??null) : null };
  });
  const known = details.filter(d => d.strokes !== null);
  if (!known.length) return null;
  const total = known.reduce((s,d)=>s+d.strokes,0);
  return { details, total, elem: getStrokeElement(total), fortune: NAME_FORTUNE[getStrokeElement(total)] };
}

function getNameHarmony(charElem, nameElem) {
  if(charElem===nameElem) return {score:90,label:"동기(同氣)",desc:"같은 기운으로 강화됩니다",color:"#2d6a4f"};
  if(SHENG[charElem]===nameElem) return {score:85,label:"상생(相生)",desc:"사주가 이름을 강하게 보완합니다",color:"#bf6100"};
  if(SHENG[nameElem]===charElem) return {score:80,label:"역생(逆生)",desc:"이름이 사주를 도와줍니다",color:"#9a7100"};
  if(KE[charElem]===nameElem) return {score:60,label:"상극(相克)",desc:"사주가 이름을 제어합니다",color:"#546e7a"};
  if(KE[nameElem]===charElem) return {score:55,label:"역극(逆克)",desc:"이름이 사주를 제어합니다",color:"#1565c0"};
  return {score:70,label:"평화(平和)",desc:"균형 잡힌 조합입니다.",color:"#546e7a"};
}

function ScoreRing({score,color,size=64}) {
  const r=(size/2)-5, C=2*Math.PI*r;
  const [offset,setOffset]=useState(C);
  useEffect(()=>{const t=setTimeout(()=>setOffset(C*(1-score/100)),80);return ()=>clearTimeout(t);},[score]);
  return(
    <div style={{position:"relative",width:size,height:size,flexShrink:0}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{transform: `rotate(-90deg)`}}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f0f0f0" strokeWidth="10" strokeDasharray={C} strokeDashoffset={0} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset} style={{transition:"stroke-dashoffset 1.5s ease"}}/>
      </svg>
      <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <span style={{fontWeight:900,fontSize:size===64?13:18,color}}>{score}</span>
      </div>
    </div>
  );
}

function AnimBar({val,color}) {
  const [w,setW]=useState(0);
  useEffect(()=>{const t=setTimeout(()=>setW(val),100);return()=>clearTimeout(t);},[val]);
  return <div style={{width:`${w}%`,height:"100%",borderRadius:999,background:color,transition:"width 1.2s ease"}}/>;
}

function ElementRadar({profile,dateStr}) {
  const char=CHAR_DATA[profile.charIdx??0]??CHAR_DATA[0];
  const scores=getSajuElemScores(profile,dateStr);
  const L=["木","火","土","金","水"],sz=200,cx=100,cy=100,mR=72;
  const ang=[0,1,2,3,4].map(i=>(i*72-90)*Math.PI/180);
  const pt=(a,r)=>[cx+r*Math.cos(a),cy+r*Math.sin(a)];
  const dpts=ang.map((a,i)=>pt(a,mR*scores[i]/100));
  const [vis,setVis]=useState(false);
  useEffect(()=>{const t=setTimeout(()=>setVis(true),100);return()=>clearTimeout(t);},[]);
  return(
    <svg width={sz} height={sz} viewBox={`0 0 ${sz} ${sz}`}>
      {[.25,.5,.75,1].map((f,gi) => (
        <polygon 
          key={gi} 
          points={ang.map(a => pt(a, mR * f)).map(([x,y]) => `${x},${y}`).join(" ")} 
          fill="none" 
          stroke="#f0f0f0" 
          strokeWidth="1"
        />
      ))}
      {ang.map((a,i)=>{const[x,y]=pt(a,mR);return<line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#f0f0f0" strokeWidth="1"/>;})}
      <polygon points={dpts.map(([x,y])=>`${x},${y}`).join(" ")} fill={`${char.color}25`} stroke={char.color} strokeWidth="2.5" strokeLinejoin="round" style={{opacity:vis?1:0,transition:"opacity .8s"}}/>
      {dpts.map(([x,y],i)=><circle key={i} cx={x} cy={y} r="4" fill={char.color} style={{opacity:vis?1:0,transition:`opacity .4s ${.3+i*.06}s`}}/>)}
      {ang.map((a,i)=>{const[x,y]=pt(a,mR+17);return<text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="13" fontWeight="800" fill={ELEM_COLOR[i]}>{L[i]}</text>;})}
    </svg>
  );
}

function PackReveal({char,onClose}) {
  const [phase,setPhase]=useState("idle");
  const setP=p=>setPhase(p);
  useEffect(()=>{
    if(phase==="idle"){const t=setTimeout(()=>setP("crack"),600);return()=>clearTimeout(t);}
    if(phase==="show"){const t=setTimeout(()=>setP("done"),1600);return()=>clearTimeout(t);}
  },[phase]);
  return(
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="fixed inset-0 z-[200] flex items-center justify-center" style={{background:"radial-gradient(ellipse at center,#1a1a2e 0%,#0d0d1a 100%)"}}>
      <AnimatePresence mode="wait">
        {phase==="idle"&&<motion.div key="i" exit={{scale:0,opacity:0}} className="text-center">
          <motion.div animate={{y:[0,-12,0]}} transition={{repeat:Infinity,duration:1.2}} className="text-7xl mb-6">🥚</motion.div>
          <p className="text-white/50 text-base">탭하여 아우라를 깨우세요</p>
        </motion.div>}
        {phase==="crack"&&<motion.div key="c" animate={{scale:[1,1.25,0.9,1.15,1]}} transition={{duration:.7}} onAnimationComplete={()=>setP("burst")} className="text-8xl">🥚</motion.div>}
        {phase==="burst"&&<motion.div key="b" initial={{scale:0,opacity:0}} animate={{scale:1,opacity:1}} transition={{duration:.6}} onAnimationComplete={()=>setP("show")} className="text-8xl">💥</motion.div>}
        {(phase==="show"||phase==="done")&&<motion.div key="s" initial={{scale:.5,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:"spring",damping:12,stiffness:80}} onAnimationComplete={()=>setP("done")} className="text-center px-8">
          <motion.div animate={{y:[0,-12,0]}} transition={{repeat:Infinity,duration:1.8}} className="text-[120px] mb-4 leading-none">{char.icon}</motion.div>
          <h2 className="text-3xl font-black mb-1" style={{color:char.color,textShadow:`0 0 20px ${char.color}`}}>{char.name}</h2>
          <p className="text-white/60 text-sm mb-2">{ELEM_NAME[char.element]}</p>
          <div className="flex gap-2 justify-center flex-wrap mb-7">
            {char.keywords.map(k=><span key={k} className="text-xs font-bold px-3 py-1 rounded-full" style={{background:char.color,color:"#fff"}}>{k}</span>)}
          </div>
          {phase==="done"&&<motion.button initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} whileTap={{scale:.95}} onClick={onClose} className="bg-white font-black px-8 py-3 rounded-full text-base" style={{color:char.color}}>내 운명 확인하기 →</motion.button>}
        </motion.div>}
      </AnimatePresence>
    </motion.div>
  );
}

function SyllableRow({syl,idx,selected,onChange}) {
  const options=HANJA_DICT[syl]??[];
  const [showCustom,setShowCustom]=useState(false);
  const [customHanja,setCustomHanja]=useState("");
  const [customStrokes,setCustomStrokes]=useState("");
  const [customError,setCustomError]=useState("");
  const handleCustomAdd=()=>{
    setCustomError("");
    const h=customHanja.trim();
    if(!h){setCustomError("한자를 입력해주세요");return;}
    if(/[\u3131-\uD79D]/.test(h)){setCustomError("한자(漢字)를 입력해주세요");return;}
    const s=customStrokes?parseInt(customStrokes):null;
    if(customStrokes&&(isNaN(s)||s<1||s>64)){setCustomError("획수는 1~64 사이여야 합니다");return;}
    if(s) HANJA_STROKES[h]=s;
    onChange(idx,h);
    setShowCustom(false);setCustomHanja("");setCustomStrokes("");
  };
  const isCustomSel=selected&&!options.includes(selected);
  return(
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xl" style={{background:selected?"rgba(28,58,51,.12)":"#f5f5f5",color:selected?"#1C3A33":"#aaa"}}>{selected||syl}</div>
          <span className="text-xs text-gray-400 font-medium">{options.length>0?`${options.length}개`:"직접입력"}</span>
        </div>
        <div className="flex gap-1">
          <button onClick={()=> {setShowCustom(v=>!v);setCustomError("");}} className="flex items-center gap-0.5 text-[10px] font-bold px-2 py-1 rounded-xl" style={{background:showCustom?"rgba(28,58,51,.12)":"#f5f5f5",color:showCustom?"#1C3A33":"#666"}}>✏️ 직접 입력</button>
          {selected&&<button onClick={()=>onChange(idx,"")} className="text-[10px] px-2 py-1 rounded-xl text-gray-400">✕</button>}
        </div>
      </div>
      {options.length>0&&(
        <div className="flex flex-wrap gap-2 mb-2">
          {options.map(hanja=>{
            const strokes=HANJA_STROKES[hanja],isSel=selected===hanja;
            return(
              <motion.button key={hanja} whileTap={{scale:.88}} onClick={()=>onChange(idx,isSel?"":hanja)} className="flex flex-col items-center px-3 py-2 rounded-2xl border relative" style={{background:isSel?"#1C3A33":"white",borderColor:isSel?"#1C3A33":"#ddd"}}>
                {isSel&&<div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 text-white text-[10px] rounded-full flex items-center justify-center">✓</div>}
                <span className="text-xl leading-none font-bold">{hanja}</span>
                {strokes&&<span className="text-[9px] mt-0.5" style={{color:isSel?"#fff":"#aaa"}}>{strokes}</span>}
              </motion.button>
            );
          })}
        </div>
      )}
      {isCustomSel&&(
        <motion.div initial={{opacity:0,scale:.9}} animate={{opacity:1,scale:1}} className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl mb-2" style={{background:"rgba(28,58,51,.1)",border:"1.5px solid rgba(28,58,51,.3)"}}>
          <span className="text-xl font-black text-[#1C3A33]">{selected}</span>
          <span className="text-[10px] font-bold text-gray-500">직접 입력됨</span>
          {HANJA_STROKES[selected]&&<span className="text-[10px] text-gray-400">({HANJA_STROKES[selected]}획)</span>}
          <button onClick={()=>onChange(idx,"")} className="text-gray-400 ml-1 text-xs">✕</button>
        </motion.div>
      )}
      <AnimatePresence>
        {showCustom&& (
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} className="rounded-2xl p-4 space-y-3 mt-1" style={{background:"rgba(28,58,51,.05)"}}>
            <p className="text-[11px] font-bold text-gray-500">✍️ "{syl}"에 해당하는 한자 직접 입력</p>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-[10px] text-gray-400 block mb-1 font-bold">한자</label>
                <input type="text" value={customHanja} maxLength={1} placeholder="예) 勳" onChange={(e)=>setCustomHanja(e.target.value.slice(0,1))} className="w-full text-center text-2xl font-black rounded-xl py-3" style={{border:"1.5px solid #ddd",color:"#1C3A33",background:"white"}}/>
              </div>
              <div style={{width:80}}>
                <label className="text-[10px] text-gray-400 block mb-1 font-bold">획수</label>
                <input type="number" value={customStrokes} placeholder="예) 8" onChange={(e)=>setCustomStrokes(e.target.value)} className="w-full text-center text-lg font-bold rounded-xl py-3" style={{border:"1.5px solid #ddd",background:"white"}}/>
              </div>
              <div className="flex items-end">
                <button onClick={handleCustomAdd} className="px-4 py-2 rounded-xl font-black text-sm text-white flex items-center gap-1" style={{background:"#1C3A33"}}><Plus size={13}/> 추가</button>
              </div>
            </div>
            {customError&&<motion.p initial={{opacity:0}} animate={{opacity:1}} className="text-[10px] text-red-500">{customError}</motion.p>}
            <p className="text-[10px] text-gray-400 leading-relaxed">예) 勳 / 희 (15획)</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function HanjaPicker({name,selections,onChange}) {
  if(!name?.trim()) return null;
  const syllables=name.trim().split("");
  return (
    <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-gray-500">한자 이름 선택 (선택사항)</label>
        <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded-2xl">{syllables.filter((_,i)=>selections[i]).length}/{syllables.length} 선택됨</span>
      </div>
      {syllables.some((_,i)=>selections[i])&&(
        <div className="text-center py-3 rounded-2xl" style={{background:"rgba(28,58,51,.05)",border:"1px solid rgba(28,58,51,.12)"}}>
          <div className="flex justify-center gap-1 items-baseline">
            {syllables.map((syl,i)=><span key={i} className="font-black text-xl text-[#1C3A33]">{selections[i]||syl}</span>)}
          </div>
          <p className="text-[10px] text-gray-400 mt-1">한자 이름 미리보기</p>
        </div>
      )}
      {syllables.map((syl,idx)=><SyllableRow key={idx} syl={syl} idx={idx} selected={selections[idx]||""} onChange={onChange}/>)}
    </motion.div>
  );
}

function CharCard({profile,char,streak=1}) {
  const [copied,setCopied]=useState(false);
  const lv=getLevel(streak);
  const hanjaDisplay=useMemo(()=>{
    if(!profile.hanjaSelections||!profile.name) return null;
    const syls=profile.name.trim().split("");
    if(!syls.some((_,i)=>profile.hanjaSelections[i])) return null;
    return syls.map((s,i)=>profile.hanjaSelections[i]||s).join("");
  },[profile]);
  const handleShare=async()=>{
    const h=hanjaDisplay?` (${hanjaDisplay})`:"";
    const txt=`✦ ${profile.name}${h}님의 아우라 ✦\n${char.icon} ${char.name} (${ELEM_NAME[char.element]})\n대운: ${char.luckTrend}\n#AuraFriends #사주`;
    try{if(navigator.share){await navigator.share({title:"AuraFriends",text:txt});return;}}catch{}
    try{await navigator.clipboard.writeText(txt);setCopied(true);setTimeout(()=>setCopied(false),2000);}catch{}
  };
  return(
    <motion.div initial={{scale:.9,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:"spring",damping:15}} className="rounded-[40px] p-8 text-center shadow-xl relative overflow-hidden" style={{background:`linear-gradient(145deg,${char.bg},white)`,border:`2px solid ${char.color}20`}}>
      <div className="absolute bottom-3 right-5 text-[80px] opacity-[0.06] pointer-events-none">{char.icon}</div>
      <motion.div animate={{y:[0,-8,0]}} transition={{repeat:Infinity,duration:3.5}} className="text-[96px] mb-4 leading-none">{char.icon}</motion.div>
      <h2 className="text-3xl font-black text-[#1C3A33] mb-0.5">{profile.name}</h2>
      {hanjaDisplay&&<motion.div initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} className="text-lg font-bold mb-1 tracking-widest" style={{color:char.color}}>{hanjaDisplay}</motion.div>}
      <p className="text-base font-bold mb-3" style={{color:char.color}}>{char.name}</p>
      <div className="flex justify-center gap-2 flex-wrap mb-3">
        <span className="text-xs font-black px-3 py-1.5 rounded-full text-white" style={{backgroundColor:char.color}}>{ELEM_NAME[char.element]}</span>
        {char.keywords.map(k=><span key={k} className="text-xs font-bold px-3 py-1.5 rounded-full bg-white/70" style={{color:char.color}}>{k}</span>)}
      </div>
      <div className="flex justify-center mb-4">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-xs" style={{background: `${char.color}15`,border: `1.5px solid ${char.color}30`}}>
          {lv.icon} {lv.rank} {lv.name}
        </div>
      </div>
      <motion.button whileTap={{scale:.93}} onClick={handleShare} className="flex items-center mx-auto gap-2 text-xs font-bold px-5 py-2.5 rounded-2xl font-black text-base" style={{color:char.color,border:"1.5px solid #30"}}>
        {copied?<Check size={14}/>:<Share2 size={14}/>} {copied?"복사됨 ✓":"Share2"} 공유하기
      </motion.button>
    </motion.div>
  );
}

function CategoryFortune({profile,char}) {
  const today=todayStr();
  const cats=getSajuCats(profile,today);
  const items=[{label:"연애운",key:"love",icon:"💖",color:"#e91e63"},{label:"직업운",key:"career",icon:"📈",color:"#1976d2"},{label:"건강운",key:"health",icon:"🌿",color:"#388e3c"},{label:"재물운",key:"money",icon:"💰",color:"#f57f17"}];
  return (
    <div className="space-y-3">
      {items.map(({label,key,icon,color})=>(
        <div key={key} className="flex justify-between items-center mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold" style={{color}}>{icon}</span>
            <span className="text-xs font-bold text-black">{label}</span>
          </div>
          <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden flex-1 mx-3">
            <AnimBar val={cats[key]} color={color}/>
          </div>
          <span className="text-xs font-black" style={{color}}>{cats[key]}점</span>
        </div>
      ))}
    </div>
  );
}

function DailyFortune({profile,char}) {
  const today=todayStr();
  const score=getSajuDailyScore(profile,today);
  const mission=getSajuMission(profile,today);
  const jdn=getTodayJdn(today);
  const todayStem=(jdn+49)%10,todayBranch=(jdn+49)%12;
  const summary=score>=90?"최고의 날! ✨":score>=80?"에너지 넘침 ✨":score>=70?"순항 중":"조심스러운 하루";
  return (
    <motion.div initial={{y:20,opacity:0}} animate={{y:0,opacity:1}} transition={{}} className="bg-white rounded-[30px] p-6 shadow-sm" style={{border:"1.5px solid #1C3A33"}}>
      <div className="flex items-center gap-2 mb-4">
        <Sun size={17} color="#c0550a"/>
        <span className="font-bold text-[#1C3A33] text-[15px]">오늘의 아우라 ({today})</span>
        <span className="text-[10px] text-gray-400 ml-auto">{STEMS[todayStem]} {BRANCHES[todayBranch]}</span>
      </div>
      <div className="flex items-center gap-4 mb-5">
        <ScoreRing score={score} color={char.color} size={64}/>
        <div className="flex-1">
          <div className="font-bold text-gray-800 text-[15px]">{summary}</div>
          <div className="text-sm text-gray-500 mt-1">오늘 {STEMS[todayStem]} 일 ↔ 내 일주</div>
        </div>
      </div>
      <div className="mb-5">
        <p className="text-xs font-bold text-gray-400 mb-3">분야별 오늘의 운세</p>
        <CategoryFortune profile={profile} char={char}/>
      </div>
      <div className="rounded-2xl p-4" style={{background: `${char.color}0d` }}>
        <p className="text-[10px] font-black mb-1.5" style={{color:char.color}}>★ 행운 미션</p>
        <p className="text-[13px] text-gray-700 leading-relaxed">{mission}</p>
      </div>
    </motion.div>
  );
}

function DailyDetailModal({profile,dateStr,onClose}) {
  const score=getSajuDailyScore(profile,dateStr);
  const mission=getSajuMission(profile,dateStr);
  const jdn=getTodayJdn(dateStr);
  const ts=(jdn+49)%10,tb=(jdn+49)%12;
  const cats=getSajuCats(profile,dateStr);
  const summary=score>=90?"최고의 날! ✨":score>=80?"에너지 넘침 ✨":score>=70?"순항 중":"조심스러운 하루";
  return (
    <motion.div initial={{opacity:0,y:40}} animate={{opacity:1,y:0}} exit={{opacity:0,y:40}} className="fixed inset-0 z-[300] flex items-end bg-black/60" onClick={onClose}>
      <motion.div onClick={e=>e.stopPropagation()} className="bg-white w-full rounded-t-3xl max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-4 px-6 pt-6">
          <h3 className="text-xl font-black text-[#1C3A33]">{dateStr} ({STEMS[ts]}{BRANCHES[tb]})</h3>
          <button onClick={onClose} className="text-gray-400 text-3xl leading-none">×</button>
        </div>
        <div className="text-center py-3 mb-4 rounded-2xl bg-gray-50 mx-6">
          <div className="text-5xl font-black text-[#1C3A33]">{score}점</div>
          <div className="text-sm text-gray-500 mt-1">{summary}</div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4 px-6">
          {[["연애운","love","💖","#e91e63"],["직업운","career","📈","#1976d2"],["건강운","health","🌿","#388e3c"],["재물운","money","💰","#f57f17"]].map(([lb,k,ic,cl])=>(
            <div key={k} className="rounded-2xl p-3 text-center" style={{background:"linear-gradient(135deg, #1C3A33, #2d5a4a)"}}>
              <div className="text-xl mb-1">{ic}</div>
              <div className="text-xs font-bold mb-1" style={{color:cl}}>{lb}</div>
              <div className="text-xl font-black" style={{color:cl}}>{cats[k]}점</div>
            </div>
          ))}
        </div>
        <div className="rounded-2xl bg-emerald-50 p-4 text-center mb-4 mx-6">
          <p className="text-emerald-700 text-xs font-black mb-1">✨ 행운 미션</p>
          <p className="text-gray-700 text-sm">{mission}</p>
        </div>
        <button onClick={onClose} className="w-full py-4 rounded-3xl font-black text-center mx-6 mb-6" style={{background: "linear-gradient(135deg, #1C3A33, #2d5a4a)"}}>닫기</button>
      </motion.div>
    </motion.div>
  );
}

function MonthlyFortune({profile, char}) {
  const td=new Date(), year=td.getFullYear(), month=td.getMonth()+1;
  const daysInMonth=maxDays(year, month), firstDay=new Date(year, month-1, 1).getDay();
  const todayDate=td.getDate();
  const [sel, setSel]=useState(null);
  const cal=useMemo(() => getSajuCalendar(profile, year, month), [profile.id, year, month]);
  return (
    <>
      <div className="bg-white rounded-[30px] p-5 shadow-sm" style={{border: "1.5px solid #1C3A33"}}>
        <div className="flex justify-between items-center mb-3">
          <div className="font-bold text-[#1C3A33] flex items-center gap-1.5"><Calendar size={16}/> {year}년 {month}월</div>
          <div className="flex gap-2 text-[10px] text-gray-400">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span>길일</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400"></span>흉일</span>
          </div>
        </div>
        <div className="grid grid-cols-7 text-center text-[10px] font-bold text-gray-700">
          {["일", "월", "화", "수", "목", "금", "토"].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({length: firstDay}).map((_, i) => <div key={`e${i}`} className="text-center text-gray-400"> </div>)}
          {Array.from({length: daysInMonth}, (_, i) => {
            const d=i+1, isT=d===todayDate, isG=cal.good.has(d), isB=cal.bad.has(d);
            const bg=isT? `${char.color}22`: isG? "#f0fdf4": isB? "#fef2f2": "#fafafa";
            const border=isT? `2px solid ${char.color}`: isG? "1px solid #86efac": isB? "1px solid #f87171": "1px solid #e2e8f0";
            const color=isT? "#1C3A33": isG? "#166534": isB? "#991b1b": "#555";
            return (
              <motion.button key={i} whileTap={{scale: .88}} onClick={() => setSel(d)} className="h-10 rounded-2xl flex items-center justify-center text-xs relative" style={{backgroundColor:bg,color,border}}>
                {d}
                {isG&&<span className="absolute top-0.5 right-0.5 text-[8px]">✨</span>}
                {isB&&<span className="absolute top-0.5 right-0.5 text-[8px]">△</span>}
              </motion.button>
            );
          })}
        </div>
      </div>
      <AnimatePresence>
        {sel&&<DailyDetailModal profile={profile} dateStr={`${year}-${month}-${sel}`} onClose={()=>setSel(null)}/>}
      </AnimatePresence>
    </>
  );
}

function LuckyItems({char}) {
  const items=[{icon:"🎨",label:"행운 색",value:char.lucky.colors.join(", ")},{icon:"🌟",label:"행운 숫자",value:char.lucky.numbers.join(", ")}];
  return (
    <motion.div initial={{y:20,opacity:0}} animate={{y:0,opacity:1}} transition={{}} className="bg-white rounded-[30px] p-6 shadow-sm" style={{border:"1.5px solid #1C3A33"}}>
      <div className="flex items-center gap-2 mb-4"><Star size={17} color="#c0550a"/><span className="font-bold text-[#1C3A33] text-[15px]">행운 아이템</span></div>
      <div className="grid grid-cols-2 gap-2.5">
        {items.map(x=>(
          <div key={x.label} className="rounded-2xl p-3.5" style={{background:`${char.color}10`}}>
            <div className="text-xl mb-1 leading-none">{x.icon}</div>
            <div className="text-[10px] font-bold mb-0.5" style={{color:`${char.color}`}}>{x.label}</div>
            <div className="text-[12px] font-semibold text-gray-700">{x.value}</div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function HomeScreen({profiles,activeId,setActiveId,onAdd,streak}) {
  const p = profiles.find(x=>x.id===activeId)??profiles[0]??null;
  const char = p ? (CHAR_DATA[p.charIdx??0]??CHAR_DATA[0]) : null;
  const [tab,setTab]=useState("daily");
  return(
    <motion.div key="home" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="p-5">
      {profiles.length>0&&(
        <div className="flex gap-2 overflow-x-auto pb-3 mb-1" style={{scrollbarWidth:"none"}}>
          {profiles.map(x=>{
            const c=CHAR_DATA[x.charIdx??0]??CHAR_DATA[0],on=x.id===activeId;
            return(
              <motion.button key={x.id} whileTap={{scale:.95}} onClick={()=>setActiveId(x.id)} className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white text-sm font-bold" style={{border:`2px solid ${on?c.color:"#f0f0f0"}`,color:on?c.color:"#aaa"}}>
                <span className="text-base">{c.icon}</span>{x.name}
              </motion.button>
            );
          })}
          <motion.button whileTap={{scale:.95}} onClick={onAdd} className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-2xl bg-white border-2 border-dashed border-gray-200 text-gray-300 text-sm font-bold">
            <Plus size={13}/> 추가
          </motion.button>
        </div>
      )}
      {p&&char?(
        <div className="space-y-4">
          <CharCard profile={p} char={char} streak={streak}/>
          <div className="bg-white rounded-[28px] p-1 flex" style={{border:"1.5px solid #f0f0f0"}}>
            {["daily","monthly"].map((t,i)=>(
              <button key={t} onClick={()=>setTab(t)} className={`flex-1 py-2.5 rounded-3xl text-sm font-bold transition-all ${tab===t?"text-white shadow":"text-gray-400"}`} style={{background:tab===t?"#1C3A33":"transparent"}}>
                {["일별 운세","월별 운세"][i]}
              </button>
            ))}
          </div>
          {tab==="daily"?<DailyFortune profile={p} char={char}/>:<MonthlyFortune profile={p} char={char}/>}
          <motion.div initial={{y:20,opacity:0}} animate={{y:0,opacity:1}} transition={{delay:.28}} className="bg-white rounded-[28px] p-5 shadow-sm" style={{border:"1.5px solid #f0f0f0"}}>
            <div className="flex items-center gap-2 mb-2.5"><Sparkles size={16} color="#c0550a"/><span className="font-bold text-[#1C3A33] text-[15px]">나는 왜 이 동물?</span></div>
            <p className="text-gray-600 text-sm leading-relaxed">{char.rationale}</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-3">
            {[{title:"대운 흐름",color:"#BF6100",Icon:Award,text:char.luckTrend},{title:"주의할 점",color:"#C62828",Icon:Zap,text:char.caution}].map((x,i)=>(
              <motion.div key={x.title} initial={{y:20,opacity:0}} animate={{y:0,opacity:1}} transition={{delay:.32+i*.06}} className="bg-white rounded-[22px] p-4 shadow-sm" style={{border:"1.5px solid #f0f0f0"}}>
                <div className="font-bold text-xs mb-2 flex items-center gap-1.5" style={{color:x.color}}><x.Icon size={13}/>{x.title}</div>
                <p className="text-xs text-gray-600 leading-relaxed">{x.text}</p>
              </motion.div>
            ))}
          </div>
          <LuckyItems char={char}/>
        </div>
      ):(
        <motion.div initial={{scale:.95,opacity:0}} animate={{scale:1,opacity:1}} className="text-center py-20 bg-white rounded-[40px] cursor-pointer" style={{border:"2px dashed #ddd"}} onClick={onAdd}>
          <div className="text-7xl mb-4">⚪</div>
          <p className="font-bold text-gray-400 text-lg">내 아우라를 찾아보세요</p>
          <p className="text-sm text-gray-300 mt-1">생년월일을 입력하면 120가지 동물 중 하나를 골라드려요</p>
          <div className="mt-6 inline-flex items-center gap-2 bg-[#1C3A33] text-white text-sm font-black px-6 py-3 rounded-3xl">지금 시작하기 ✨</div>
        </motion.div>
      )}
    </motion.div>
  );
}

function FortuneScreen({profiles,activeId,setActiveId}) {
  const p=profiles.find(x=>x.id===activeId)??profiles[0]??null;
  const char=p?(CHAR_DATA[p.charIdx??0]??CHAR_DATA[0]):null;
  const [tab,setTab]=useState("radar");
  const today=todayStr();
  const nameFortune=useMemo(()=> {
    if(!p?.name) return null;
    return getNameFortune(p.name.trim().split(""),p.hanjaSelections??{});
  },[p]);
  if(!p||!char) return(
    <motion.div key="fortune" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="p-5 text-center py-24 text-gray-300">
      <Star size={48} className="mx-auto mb-4 opacity-30"/>
      <p className="font-bold">프로필을 먼저 등록해주세요</p>
    </motion.div>
  );
  return(
    <motion.div key="fortune" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="p-5">
      {profiles.length>1&&(
        <div className="flex gap-2 overflow-x-auto pb-3 mb-2" style={{scrollbarWidth:"none"}}>
          {profiles.map(x=>{const c=CHAR_DATA[x.charIdx??0]??CHAR_DATA[0],on=x.id===activeId;
            return(
              <motion.button key={x.id} whileTap={{scale:.95}} onClick={()=>setActiveId(x.id)} className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white text-sm font-bold" style={{border:`2px solid ${on?c.color:"#f0f0f0"}`,color:on?c.color:"#aaa"}}>
                <span>{c.icon}</span>{x.name}
              </motion.button>
            );
          })}
        </div>
      )}
      <div className="grid grid-cols-4 gap-1 bg-white rounded-2xl p-1 mb-4" style={{border:"1.5px solid #f0f0f0"}}>
        {[{id:"radar",label:"오행"},{id:"cat",label:"분야별"},{id:"saju",label:"사주"},{id:"name",label:"이름"}].map(t=>(
          <button key={t.id} onClick={() => setTab(t.id)} className={`py-2 rounded-xl text-xs font-bold transition-all ${tab===t.id?`text-white`:"text-gray-400"}`} style={{background:tab===t.id?char.color:"transparent"}}>{t.label}</button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        {tab==="radar"&&(
          <motion.div key="radar" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:12}}>
            <div className="bg-white rounded-[28px] p-6 shadow-sm" style={{border:"1.5px solid #f0f0f0"}}>
              <div className="text-center font-bold text-[#1C3A33] mb-1">오행 (五行) 균형</div>
              <p className="text-[11px] text-gray-400 text-center mb-4">내 원국 오행 + 오늘 기운</p>
              <div className="flex justify-center"><ElementRadar profile={p} dateStr={today}/></div>
              <div className="grid grid-cols-5 gap-1 mt-3">
                {["목","화","토","금","수"].map((el,i)=>(
                  <div key={el} className="text-center">
                    <div className="text-base">{["🌳","🔥","⛰️","⚔️","💧"][i]}</div>
                    <div className="text-[10px] font-bold mt-0.5" style={{color:ELEM_COLOR[i]}}>{el}</div>
                    <div className="text-[10px] text-gray-400">{getSajuElemScores(p,today)[i]}점</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
        {tab==="cat"&&(
          <motion.div key="cat" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:12}}>
            <div className="bg-white rounded-[28px] p-6 shadow-sm" style={{border:"1.5px solid #f0f0f0"}}>
              <div className="font-bold text-[#1C3A33] mb-1">분야별 오늘의 운세</div>
              <p className="text-[11px] text-gray-400 mb-5">오늘 일주 ({STEMS[(getTodayJdn(today)+49)%10]} {BRANCHES[(getTodayJdn(today)+49)%12]})</p>
              <CategoryFortune profile={p} char={char}/>
            </div>
          </motion.div>
        )}
        {tab==="saju"&&(
          <motion.div key="saju" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:12}}>
            {(() => {
              const saju=p.saju?calcSaju(+p.y,+p.m,+p.d,(p.h??12),+(p.mi??0),p.timeUnknown):null;
              const pillars=[{label:"年柱",stem:saju?.yStem,branch:saju?.yBranch},{label:"月柱",stem:saju?.mStem,branch:saju?.mBranch},{label:"日柱",stem:saju?.dStem,branch:saju?.dBranch},{label:"時柱",stem:saju?.hStem,branch:saju?.hBranch}];
              return(
                <div className="bg-white rounded-[24px] p-5 shadow-sm" style={{border:"1.5px solid #f0f0f0"}}>
                  <div className="flex items-center gap-2 mb-4"><span className="text-xs font-black px-2 py-0.5 rounded bg-[#1C3A33] text-white">사주팔자</span></div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {pillars.map((pp,i)=>(
                      <div key={i} className="rounded-2xl py-3 px-1" style={{background:pp.stem!=null?`${char.color}15`:"#fafafa"}}>
                        <div className="text-[10px] text-gray-400 mb-1 font-bold">{pp.label}</div>
                        <div className="text-[14px] font-bold">{STEMS[pp.stem]||"-"} {BRANCHES[pp.branch]||"-"}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </motion.div>
        )}
        {tab==="name"&&(
          <motion.div key="name" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:12}}>
            {nameFortune?(
              <div className="bg-white rounded-[28px] p-6 shadow-sm" style={{border:"1.5px solid #f0f0f0"}}>
                <div className="flex justify-center gap-3 mb-3">
                  {nameFortune.details.map((d,i)=>(
                    <div key={i} className="text-center">
                      <div className="text-3xl font-black" style={{color:char.color}}>{d.hanja||d.syl}</div>
                      <div className="text-[10px] text-gray-400">{d.strokes}획</div>
                    </div>
                  ))}
                </div>
                <div className="text-center">
                  <div className="font-black text-xl mb-1" style={{color:NAME_FORTUNE[nameFortune.elem].icon}}>{NAME_FORTUNE[nameFortune.elem].title}</div>
                  <p className="text-xs text-gray-500">{nameFortune.fortune.desc}</p>
                </div>
                <div className="mt-6">
                  {(() => {
                    const h=getNameHarmony(char.element,nameFortune.elem);
                    return(
                      <div className="rounded-2xl p-4" style={{background: `${h.color}10`}}>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-black text-sm" style={{color:h.color}}>{h.label}</span>
                          <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{background:h.color,color:"#fff"}}>{h.score}점</span>
                        </div>
                        <div className="h-2 rounded-full bg-gray-100 overflow-hidden"><AnimBar val={h.score} color={h.color}/></div>
                        <p className="text-xs text-gray-600 mt-3">{h.desc}</p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ):(
              <div className="bg-white rounded-[28px] p-8 text-center shadow-sm">
                <div className="text-5xl mb-3">✍️</div>
                <p className="font-bold text-gray-600 mb-1">한자 이름이 아직 없어요</p>
                <p className="text-xs text-gray-400">프로필 등록 · 수정 시 한자를 선택하면 더 정확한 운세를 볼 수 있습니다</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AddScreen({onSave,onBack,editProfile}) {
  const init=editProfile??{};
  const [form,setForm]=useState({name:init.name??"",y:init.y??1995,m:init.m??6,d:init.d??1,h:init.h??12,mi:init.mi??0,timeUnknown:init.timeUnknown??false});
  const [hanjaSelections,setHanjaSelections]=useState(init.hanjaSelections??{});
  const days=useMemo(()=>Array.from({length:maxDays(+form.y,+form.m)},(_,i)=>i+1),[form.y,form.m]);
  const previewSaju=useMemo(()=>calcSaju(+form.y,+form.m,+form.d,+form.h,+form.mi,form.timeUnknown),[form]);
  const previewChar=CHAR_DATA[previewSaju.charIdx]??CHAR_DATA[0];
  const handleHanjaChange=(idx,hanja)=>{
    setHanjaSelections(prev=>{const next={...prev};if(hanja==="")delete next[idx];else next[idx]=hanja;return next;});
  };
  const handleSave=()=>{
    if(!form.name.trim()){alert("이름을 입력해주세요!");return;}
    const saju=calcSaju(+form.y,+form.m,+form.d,+form.h,+form.mi,form.timeUnknown);
    onSave({...form,id:editProfile?.id??Date.now(),charIdx:saju.charIdx,saju,hanjaSelections});
  };
  const sel="p-3 bg-gray-50 rounded-xl text-sm font-medium outline-none w-full";
  return(
    <motion.div key="add" initial={{y:40,opacity:0}} animate={{y:0,opacity:1}} exit={{y:40,opacity:0}} className="p-5">
      <button onClick={onBack} className="flex items-center gap-1 text-gray-400 mb-5 font-bold text-sm">
        <ArrowLeft size={16}/> 돌아가기
      </button>
      <div className="bg-white rounded-[36px] p-6 shadow-lg" style={{border:`2px solid ${previewChar.color}30`}}>
        <motion.div key={previewChar.name} initial={{scale:.8,opacity:0}} animate={{scale:1,opacity:1}} className="text-center py-5 rounded-2xl mb-4" style={{background:previewChar.bg}}>
          <div className="text-[72px] leading-none mb-1">{previewChar.icon}</div>
          <div className="font-bold text-sm" style={{color:previewChar.color}}>{previewChar.name}</div>
          <div className="text-[10px] text-gray-400 mt-0.5">인덱스 {previewSaju.charIdx} ({previewSaju.charIdx%2===0?"낮·양시":"밤·음시"})</div>
        </motion.div>
        <h2 className="text-2xl font-black text-[#1C3A33] mb-5">{editProfile?"프로필 수정":"새 프로필 등록"}</h2>
        <div className="space-y-5">
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1.5">이름</label>
            <input placeholder="이름을 입력해주세요" value={form.name} className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-medium text-[#2C2115] text-[15px]" style={{border:`1.5px solid ${form.name?previewChar.color+"40":"transparent"}`}} onChange={e=>setForm({...form,name:e.target.value})}/>
          </div>
          {form.name.trim()&&(
            <div className="bg-gray-50 rounded-2xl p-4">
              <HanjaPicker name={form.name} selections={hanjaSelections} onChange={handleHanjaChange}/>
            </div>
          )}
          <div>
            <label className="text-xs font-bold text-gray-500 block mb-1.5">생년월일</label>
            <div className="grid grid-cols-3 gap-2">
              <select className={sel} value={form.y} onChange={e=>setForm({...form,y:e.target.value})}>{YS.map(y=><option key={y} value={y}>{y}년</option>)}</select>
              <select className={sel} value={form.m} onChange={e=>setForm({...form,m:e.target.value,d:"1"})}>{MS.map(m=><option key={m} value={m}>{m}월</option>)}</select>
              <select className={sel} value={form.d} onChange={e=>setForm({...form,d:e.target.value})}>{days.map(d=><option key={d} value={d}>{d}일</option>)}</select>
            </div>
          </div>
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-gray-500">태어난 시각 (KST)</label>
              <div className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer" onClick={()=>setForm({...form,timeUnknown:!form.timeUnknown})}>
                <div className="w-10 h-5 rounded-full flex items-center px-0.5 transition-colors" style={{backgroundColor:form.timeUnknown?"#1C3A33":"#d1d5db"}}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${form.timeUnknown?"translate-x-5":"translate-x-0"}`}/>
                </div>
                시간 모름
              </div>
            </div>
            {!form.timeUnknown&&(
              <div className="grid grid-cols-2 gap-2">
                <select className={sel} value={form.h} onChange={e=>setForm({...form,h:e.target.value})}>{HS.map(h=><option key={h} value={h}>{h}시</option>)}</select>
                <select className={sel} value={form.mi} onChange={e=>setForm({...form,mi:e.target.value})}>{MI.map(mi=><option key={mi} value={mi}>{mi}분</option>)}</select>
              </div>
            )}
            <p className="text-[10px] text-gray-400 mt-1.5">♦ KST -30분 보정 · 자정 23:30~23:59은 전날로 계산</p>
          </div>
          <motion.button whileTap={{scale:.97}} onClick={handleSave} className="w-full py-4 rounded-[20px] font-black text-xl text-white shadow-xl" style={{background:"linear-gradient(135deg,#1C3A33,#2d5a4a)"}}>
            {editProfile?"수정 완료 ✓":"등록하기 ✨"}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}

function FriendsScreen({profiles,activeId,onSelect,onDelete,onEdit,onAdd,onImport}) {
  const [status,setStatus]=useState(null);
  const handleExport=()=>{
    const blob=new Blob([JSON.stringify({profiles,exportedAt:new Date().toISOString()})],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="aurafriends_backup.json";a.click();
  };
  const handleImport=e=>{
    const file=e.target.files?.[0];if(!file)return;
    const r=new FileReader();
    r.onload=ev=>{try{const d=JSON.parse(ev.target.result);if(!Array.isArray(d.profiles)) throw new Error();onImport(d.profiles);setStatus("ok");}catch{setStatus("err");} setTimeout(()=>setStatus(null),2000);};
    r.readAsText(file);e.target.value="";
  };
  return(
    <motion.div key="friends" initial={{x:40,opacity:0}} animate={{x:0,opacity:1}} exit={{x:40,opacity:0}} className="p-5">
      <div className="flex justify-between items-center mb-5">
        <h2 className="text-2xl font-black text-[#1C3A33]">👥 아우라 친구들</h2>
        <button onClick={onAdd} className="flex items-center gap-1 bg-[#1C3A33] text-white text-sm font-black px-4 py-2 rounded-2xl"><Plus size={13}/> 추가</button>
      </div>
      {profiles.length===0?(
        <div className="text-center py-20 text-gray-300"><UserCircle size={52} className="mx-auto mb-4 opacity-30"/><p className="font-bold">아직 친구가 없어요</p></div>
      ):(
        <div className="space-y-3">
          <AnimatePresence>
            {profiles.map(p=>{
              const c=CHAR_DATA[p.charIdx??0]??CHAR_DATA[0],on=p.id===activeId;
              const hanjaName=p.hanjaSelections&&p.name?p.name.trim().split("").map((s,i)=>p.hanjaSelections[i]||s).join(""):null;
              return(
                <motion.div key={p.id} layout initial={{opacity:0,x:-15}} animate={{opacity:1,x:0}} exit={{opacity:0,x:15}} className="flex items-center gap-3 bg-white p-4 rounded-[22px]" style={{border:`2px solid ${on?c.color:"#f0f0f0"}`}}>
                  <motion.button 
                    whileTap={{scale:.9}} 
                    onClick={()=>onSelect(p.id)} 
                    className="flex-1 min-w-0 cursor-pointer flex items-center gap-3"
                  >
                    <div className="text-4xl flex-shrink-0">{c.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-gray-800 text-[15px]">{p.name}</div>
                      {hanjaName&&<div className="text-[11px] font-bold tracking-widest text-gray-500">{hanjaName}</div>}
                      <div className="text-xs text-gray-500">{c.name}</div>
                      <div className="text-[10px] font-bold mt-0.5" style={{color:c.color}}>{ELEM_NAME[c.element]}</div>
                    </div>
                  </motion.button>
                  {on&&<span className="text-[10px] bg-[#1C3A33] text-white px-2 py-0.5 rounded-full text-xs">현재</span>}
                  <motion.button whileTap={{scale:.9}} onClick={()=>onEdit(p)} className="text-xs px-3 py-2 rounded-2xl bg-gray-100">편집</motion.button>
                  <motion.button whileTap={{scale:.9}} onClick={()=>{if(window.confirm("삭제할까요?")) onDelete(p.id);}} className="text-xs px-3 py-2 rounded-2xl text-red-500">삭제</motion.button>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
      <div className="mt-8 bg-white rounded-[24px] p-5" style={{border:"1.5px solid #f0f0f0"}}>
        <p className="text-xs font-bold text-gray-400 mb-3">📦 데이터 백업 / 복구</p>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-2xl bg-gray-100 text-xs font-bold"><Download size={12}/> 내보내기</button>
          <label className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-2xl bg-gray-100 text-xs font-bold cursor-pointer"><Upload size={12}/> 가져오기<input type="file" accept=".json" className="hidden" onChange={handleImport}/></label>
        </div>
        <AnimatePresence>
          {status&&<motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} className="mt-3 text-xs font-bold text-center">{status==="ok"?"✓ 복구 완료!":"❌ 파일 형식을 확인해주세요."}</motion.div>}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function MatchScreen({profiles}) {
  const [s1,setS1]=useState(profiles[0]?.id??null);
  const [s2,setS2]=useState(profiles[1]?.id??null);
  const p1=profiles.find(x=>x.id===s1),p2=profiles.find(x=>x.id===s2);
  const c1=p1?(CHAR_DATA[p1.charIdx??0]??CHAR_DATA[0]):null;
  const c2=p2?(CHAR_DATA[p2.charIdx??0]??CHAR_DATA[0]):null;
  const compat=(c1&&c2&&s1!==s2)?getCompat(p1.charIdx??0,p2.charIdx??0):null;
  return(
    <motion.div key="match" initial={{x:40,opacity:0}} animate={{x:0,opacity:1}} exit={{x:40,opacity:0}} className="p-5">
      <h2 className="text-2xl font-black text-[#1C3A33] mb-5">💖 아우라 궁합</h2>
      {profiles.length<2?(
        <div className="text-center py-20 text-gray-300"><Heart size={52} className="mx-auto mb-4 opacity-30"/><p className="font-bold">두 명 이상 등록해주세요</p></div>
      ):(
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[{label:"첫 번째",val:s1,set:setS1},{label:"두 번째",val:s2,set:setS2}].map(({label,val,set})=>(
              <div key={label}>
                <p className="text-[10px] font-bold text-gray-400 mb-1.5 ml-1">{label}</p>
                <select value={val??""} onChange={e=>set(+e.target.value)} className="w-full p-3 bg-white rounded-2xl text-sm font-bold outline-none" style={{border:"2px solid #C1A87D"}}>
                  {profiles.map(p=><option key={p.id} value={p.id}>{(CHAR_DATA[p.charIdx??0]??CHAR_DATA[0]).icon} {p.name}</option>)}
                </select>
              </div>
            ))}
          </div>
          {s1!==s2&&compat&&c1&&c2?(
            <motion.div initial={{scale:.95,opacity:0}} animate={{scale:1,opacity:1}} className="bg-white rounded-[30px] p-7 text-center shadow-sm" style={{border:"2px solid #C1A87D"}}>
              <div className="flex justify-center items-center gap-5 mb-6">
                {[{p:p1,c:c1},{p:p2,c:c2}].map(({p,c},i)=>(
                  <React.Fragment key={p.id}>
                    <div className="text-center">
                      <div className="text-5xl mb-1">{c.icon}</div>
                      <div className="text-sm font-bold text-gray-600">{p.name}</div>
                    </div>
                    {i===0&&<div className="text-4xl text-[#C1A87D]">💖</div>}
                  </React.Fragment>
                ))}
              </div>
              <div className="flex justify-center gap-2 mb-4">
                {Array.from({length:compat.level},(_,i)=><span key={i} className="text-2xl">💖</span>)}
              </div>
              <div className="text-2xl font-black text-[#1C3A33] mb-2">{compat.label}</div>
              <p className="text-gray-600 text-sm leading-relaxed mb-5">{compat.desc}</p>
              <div className="grid grid-cols-2 gap-3 text-left">
                {[{p:p1,c:c1},{p:p2,c:c2}].map(({p,c})=>(
                  <div key={p.id} className="rounded-2xl p-3.5" style={{background:`${c.color}10`}}>
                    <div className="font-bold text-sm" style={{color:c.color}}>{ELEM_NAME[c.element]}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{c.keywords.join(" · ")}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          ):(
            <div className="bg-white rounded-[28px] p-10 text-center text-gray-300">
              {s1===s2?"서로 다른 두 사람을 선택해주세요 😊":"두 사람을 선택해보세요"}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

const SK="aurafriends_v8";

export default function AuraFriends () {
  const [view,setView]=useState("home");
  const [profiles,setProfiles]=useState([]);
  const [activeId,setActiveId]=useState(null);
  const [packChar,setPackChar]=useState(null);
  const [streak,setStreak]=useState(1);
  const [editProfile,setEditProfile]=useState(null);

  // Supabase 한자 데이터 로드
  useEffect(() => {
    loadHanjaData();
  }, []);

  useEffect (()=>{
    try{
      const raw=localStorage.getItem(SK);if(!raw)return;
      const d=JSON.parse(raw);
      setProfiles(d.profiles??[]);setActiveId(d.activeId??null);
      const today=todayStr(),prev=d.lastVisit,ps=d.streak??1;
      if(prev){const diff=Math.round((new Date(today).getTime()-new Date(prev).getTime())/(1000*60*60*24));if(diff===1)setStreak(ps+1);else if(diff>1)setStreak(1);}
    }catch{}
  },[]);

  useEffect (()=>{
    try{localStorage.setItem(SK,JSON.stringify({profiles,activeId,streak,lastVisit:todayStr()}));}catch{}
  },[profiles,activeId,streak]);

  const handleSave=useCallback (profile=>{
    setProfiles (prev=>{const exists=prev.find(x=>x.id===profile.id);return exists?prev.map(x=>x.id===profile.id?profile:x):[...prev,profile];});
    setActiveId(profile.id);
    if(!editProfile) setPackChar(CHAR_DATA[profile.charIdx]??CHAR_DATA[0]);
    setEditProfile(null);setView("home");
  }, [editProfile]);

  const handleDelete=useCallback(id=>{
    setProfiles(prev=>{const next=prev.filter(x=>x.id!==id);if(activeId===id)setActiveId(next[0]?.id??null);return next;});
  }, [activeId]);

  const handleSelect=useCallback(id=>{setActiveId(id);setView("home");}, []);
  const handleImport=useCallback(ps=>{setProfiles(ps);setActiveId(ps[0]?.id??null);}, []);
  const handleEdit=useCallback(p=>{setEditProfile(p);setView("add");}, []);

  const lv=getLevel (streak);
  const NAV=[{id:"home",icon:"🏠",label:"홈"},{id:"fortune",icon:"⭐",label:"운세"},{id:"friends",icon:"👥",label:"친구"},{id:"match",icon:"💖",label:"궁합"}];

  return (
    <div className="max-w-[430px] mx-auto min-h-screen text-[#2C2115] pb-28 relative bg-white">
      <AnimatePresence>
        {packChar&&<PackReveal char={packChar} onClose={()=>setPackChar(null)}/>}
      </AnimatePresence>
      <header className="px-5 py-4 flex justify-between items-center sticky top-0 bg-white z-50 border-b">
        <button onClick={()=>setView("home")} className="text-2xl font-black text-[#1C3A33]">Aura</button>
        {streak>1&&<motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:"spring"}} className="flex items-center gap-1 text-xs font-black px-3 py-1 bg-amber-100 text-amber-600 rounded-2xl">{lv.icon} {streak}일 연속</motion.div>}
      </header>
      <AnimatePresence mode="wait">
        {view==="home" &&<HomeScreen profiles={profiles} activeId={activeId} setActiveId={setActiveId} onAdd={()=>setView("add")} streak={streak}/>}
        {view==="add" &&<AddScreen onSave={handleSave} onBack={()=> {setView("home");setEditProfile(null);}} editProfile={editProfile}/>}
        {view==="fortune" &&<FortuneScreen profiles={profiles} activeId={activeId} setActiveId={setActiveId}/>}
        {view==="friends" &&<FriendsScreen profiles={profiles} activeId={activeId} onSelect={handleSelect} onDelete={handleDelete} onEdit={handleEdit} onAdd={()=>setView("add")} onImport={handleImport}/>}
        {view==="match" &&<MatchScreen profiles={profiles}/>}
      </AnimatePresence>
      {view!=="add"&&(
        <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t">
          <div className="flex justify-around py-2" style={{paddingBottom:"max(8px, env(safe-area-inset-bottom))"}}>
            {NAV.map(n=>{const on=view===n.id;return(
              <motion.button key={n.id} whileTap={{scale:.88}} onClick={()=>setView(n.id)} className="flex flex-col items-center gap-0.5 py-2 px-3 rounded-2xl" style={{color:on?"#1C3A33":"#c5c5c5"}}>
                <span className="text-xl">{n.icon}</span>
                <span className="text-[10px] font-bold">{n.label}</span>
                {on&&<motion.div layoutId="dot" className="w-1 h-1 rounded-full bg-[#1C3A33]"/>}
              </motion.button>
            );})}
          </div>
        </nav>
      )}
    </div>
  );
}
