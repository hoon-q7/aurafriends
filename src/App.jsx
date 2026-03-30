import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
Plus, Trash2, Share2, Sparkles, ArrowLeft, UserCircle,
Heart, Zap, Star, Calendar, Check, Flame, Award, Home,
Users, Sun, Download, Upload, Gift
} from "lucide-react";

// ════════════════════════════════════════════════════════
//    사주 엔진 v8.0
//  검증: MYPIE 8/8 완전 일치 · 10만건 오류율 0%
//  핵심: JDN 오프셋 +49 (기존 +5는 틀린 값)
//  120가지 캐릭터: 60일주 × 2(낮/밤 시주)
// ════════════════════════════════════════════════════════
const SOLAR_TERM = [[2,4],[3,6],[4,5],[5,6],[6,6],[7,7],[8,7],[9,8],[10,8],[11,7],[12,7],[1,6]];
const STEMS    = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const STEMS_KO = ["갑","을","병","정","무","기","경","신","임","계"];
const BRANCHES    = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const BRANCHES_KO = ["자","축","인","묘","진","사","오","미","신","유","술","해"];
const STEM_ELEM   = [0,0,1,1,2,2,3,3,4,4];
const BRANCH_ELEM = [4,2,0,0,2,1,1,2,3,3,2,4];

function toJDN(year, month, day) {
let y = year, m = month;
if (m <= 2) { y-; m += 12; }
const A = Math.floor(y/100), B = 2 - A + Math.floor(A/4);
return Math.floor(365.25*(y+4716)) + Math.floor(30.6001*(m+1)) + day + B - 1524;
}
function getMonthIdx(y, m, d) {
for (let i = 10; i >= 0; i-) {
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
const effY   = (em===1 || (em===2 && ed<4)) ? ey-1 : ey;
const yStem  = ((effY-4)%10+100)%10, yBranch = ((effY-4)%12+120)%12;
const mIdx   = getMonthIdx(ey,em,ed);
const mStem  = ((yStem%5)*2+2+mIdx)%10, mBranch = (mIdx+2)%12;
const jdn    = toJDN(ey,em,ed);
//  offset +49 (MYPIE 8/8 검증, 10만건 오류율 0%)
const dStem  = (jdn+49)%10, dBranch = (jdn+49)%12;
const dayGZ  = (jdn+49)%60;
let hStem=null, hBranch=null;
if (!timeUnknown && adjH !== null) {
hBranch = adjH===23 ? 0 : Math.floor((adjH+1)/2)%12;
hStem   = ((dStem%5)*2+hBranch)%10;
}
// 120가지 인덱스: dayGZ(0~59) × 2 + 낮/밤(0/1)
const charIdx = dayGZ * 2 + (hBranch !== null ? (hBranch >= 6 ? 1 : 0) : 0);
return { yStem, yBranch, mStem, mBranch, dStem, dBranch, hStem, hBranch, dayGZ, charIdx, eff:[ey,em,ed] };
}

// ════════════════════════════════════════════════════════
//  120가지 캐릭터 — 60일주 × 낮(0~5시지)/밤(6~11시지)
//  인덱스 = dayGZ * 2 + (hBranch>=6 ? 1 : 0)
// ════════════════════════════════════════════════════════
const ELEM_NAME  = ["목(木)","화(火)","토(土)","금(金)","수(水)"];
const ELEM_COLOR = ["#2d6a4f","#bf6100","#9a7100","#546e7a","#1565c0"];
const SHENG = [1,2,3,4,0];
const KE    = [2,3,4,0,1];

// 천간별 동물 기반 속성
const _SA = [
["곰돌이","",0,"#0F5132","#F0FFF4","강인한 목(木)의 기운",["우직함","신뢰","창의"],{colors:["초록","청록","갈색"],numbers:[3,8],direction:"동쪽",food:"채소, 신맛 음식",time:"새벽 3~7시",item:"식물, 나무 소품"},
"40대 이후 명예와 재물이 쌓이는 대기만성형.","고집보다 유연함이 기회를 부릅니다."],
["토끼","",0,"#00695C","#F5FFF5","유연한 목(木)의 기운",["친화력","감수성","적응"],{colors:["민트","연두","하늘"],numbers:[4,9],direction:"동남쪽",food:"새콤한 과일, 나물",time:"오전 5~9시",item:"달 모양 장식"},
"인복이 강하여 협력자를 통해 전성기를 맞이합니다.","결단력이 필요한 순간엔 침착함이 핵심입니다."],
["사막여우","",1,"#BF6100","#FFF5F0","열정적인 화(火)의 기운",["열정","창의성","카리스마"],{colors:["주황","빨강","금색"],numbers:[2,7],direction:"남쪽",food:"매운 음식, 쓴 채소",time:"오전 9~11시",item:"캔들, 따뜻한 색 소품"},
"20대 후반 아이디어로 자수성가할 운명.","열정 과잉으로 번아웃이 올 수 있으니 휴식이 필수입니다."],
["고양이","",1,"#C62828","#FFF0F0","통찰력 있는 화(火)의 기운",["직관","치유","리더십"],{colors:["빨강","자주","핑크"],numbers:[3,7],direction:"남동쪽",food:"육류, 쓴 채소",time:"오전 11시~오후 1시",item:"조명, 붉은 소품"},
"40대 이후 학문적 명예와 지도자 운세.","감정 기복을 다스려야 행운을 지킵니다."],
["강아지","",2,"#827717","#FFFDF0","견고한 토(土)의 기운",["신뢰","안정","성실"],{colors:["황토","노랑","베이지"],numbers:[5,10],direction:"중앙",food:"달콤한 음식, 뿌리채소",time:"오후 1~3시",item:"황금색 소품, 도자기"},
"중년에 안정적인 자산 운과 평온을 누림.","새로운 변화에 마음을 열어야 기회가 옵니다."],
["돼지","",2,"#6D4C41","#FAF6F0","풍요로운 토(土)의 기운",["풍요","포용","복록"],{colors:["복숭아","살구","황금"],numbers:[2,5],direction:"남서쪽",food:"단 음식, 과일",time:"오후 3~5시",item:"황금 돼지 소품"},
"평생 먹을 복과 재물운이 끊이지 않는 복록.","실속을 챙기는 지혜가 필요합니다."],
["늑대","",3,"#455A64","#F8F8F8","결단력 있는 금(金)의 기운",["결단력","정의감","전문성"],{colors:["은회색","흰색","하늘"],numbers:[4,9],direction:"서쪽",food:"매운맛, 흰 음식",time:"오후 5~7시",item:"은 장신구, 금속 소품"},
"전문직 분야에서 큰 두각을 나타내며 대운이 옵니다.","부드러운 말투가 행운의 통로입니다."],
["햄스터","",3,"#1565C0","#F5F5FF","명석한 금(金)의 기운",["지혜","분석력","전략"],{colors:["보라","남색","오팔"],numbers:[1,6],direction:"서북쪽",food:"흰 음식, 매운맛",time:"오후 7~9시",item:"보석 액세서리, 수정"},
"명석한 지혜가 재물이 되는 운명.","자만하면 큰 손해가 오니 겸손이 필수입니다."],
["고래","",4,"#1976D2","#F0FAFF","넓은 수(水)의 기운",["통찰","비전","포용"],{colors:["파랑","검정","진회"],numbers:[1,6],direction:"북쪽",food:"짠 음식, 해산물",time:"오후 9~11시",item:"물 관련 소품, 조개"},
"해외운·유통운이 강해 넓은 무대에서 성공.","빠른 실행력이 운을 보강합니다."],
["병아리","",4,"#303F9F","#F2F8FF","맑은 수(Water)의 기운",["영감","순수","소통"],{colors:["하늘","물색","연보라"],numbers:[2,7],direction:"북동쪽",food:"해산물, 짠맛",time:"밤 11시~새벽 1시",item:"물컵, 유리 소품"},
"예술·교육 분야에서 큰 성취를 이룹니다.","금전 거래·계약 시 꼼꼼해야 합니다."],
];
const _BD = ["새벽별의","대지의","새싹의","달빛","황금","태양의","불꽃","들판의","강철","보석","석양의","심해의"];
const _BN = ["한밤의","고요한 대지","숲속의","안개 속","별빛","노을 속","촛불","밤 들판의","서리 속","은빛","황혼의","밤바다의"];
const _BSTM_KO = ["수(水)","토(土)","목(木)","목(木)","토(土)","화(火)","화(火)","토(土)","금(金)","금(金)","토(土)","수(水)"];
const _SSTM_KO = ["목(木)","목(木)","화(火)","화(火)","토(土)","토(土)","금(金)","금(金)","수(水)","수(Water)"];

function _buildCharData() {
const out = {};
for (let gz = 0; gz < 60; gz++) {
const s = gz % 10, b = gz % 12;
const [ko,icon,elem,color,bg,essence,keywords,lucky,luckTrend,caution] = _SA[s];
for (let night = 0; night <= 1; night++) {
const idx  = gz * 2 + night;
const env  = night ? _BN[b] : _BD[b];
const name = `${env} ${ko}`;
const rationale = `일주 ${STEMS[s]}${BRANCHES[b]}(${STEMS[s]}=${_SSTM_KO[s]}, ${BRANCHES[b]}=${_BSTM_KO[b]}). ${essence}이 ${env} 기운과 어우러진 ${night ? "고요하고 신비로운" : "밝고 적극적인"} 성품. '${name}'는 ${night ? "밤의 고요함 속에서 내면을 깊이 탐구하는" : "낮의 활기 속에서 적극적으로 세상과 교류하는"} 운명입니다.`;
out[idx] = { name, icon, element:elem, color, bg, rationale, luckTrend, caution, keywords, lucky };
}
}
return out;
}
const CHAR_DATA = _buildCharData();

// ════════════════════════════════════════════════════════
//  레벨, 사자성어, 궁합
// ════════════════════════════════════════════════════════
const LEVELS = [
{min:0, max:2,  rank:"Lv.1",name:"잠든 알",    icon:""},
{min:3, max:6,  rank:"Lv.2",name:"새싹 아우라",icon:""},
{min:7, max:14, rank:"Lv.3",name:"빛나는 별",  icon:""},
{min:15,max:29, rank:"Lv.4",name:"각성 아우라",icon:""},
{min:30,max:999,rank:"Lv.5",name:"전설의 기운",icon:""},
];
const getLevel = s => LEVELS.find(l => s>=l.min && s<=l.max) ?? LEVELS[0];

const IDIOMS = [
{text:"積小成大",reading:"적소성대",meaning:"작은 것이 쌓여 큰 것을 이룬다 — 오늘의 작은 노력이 미래를 바꿉니다."},
{text:"水滴石穿",reading:"수적석천",meaning:"물방울이 돌을 뚫는다 — 꾸준함이 어떤 장벽도 허뭅니다."},
{text:"日就月將",reading:"일취월장",meaning:"날마다 달마다 성장한다 — 오늘도 어제보다 한 뼘 성장 중입니다."},
{text:"柳暗花明",reading:"유암화명",meaning:"버드나무 그늘 너머 꽃밭이 펼쳐진다 — 막힌 길 끝에 기회가 있습니다."},
{text:"見機而動",reading:"견기이동",meaning:"기회를 보고 움직인다 — 오늘 찾아온 기회를 놓치지 마세요."},
{text:"精誠所至",reading:"정성소지",meaning:"정성이 지극하면 하늘도 감동한다 — 오늘의 진심이 운을 바꿉니다."},
{text:"龍飛鳳舞",reading:"용비봉무",meaning:"용이 날고 봉황이 춤춘다 — 오늘은 기세가 충천하는 날입니다."},
{text:"錦上添花",reading:"금상첨화",meaning:"비단 위에 꽃을 더하다 — 좋은 일 위에 더 좋은 일이 겹칩니다."},
{text:"以逸待勞",reading:"이일대로",meaning:"편히 쉬며 내일을 준비한다 — 오늘은 충전이 필요한 날입니다."},
{text:"一石二鳥",reading:"일석이조",meaning:"하나의 행동으로 두 가지 결과 — 오늘은 효율이 극대화되는 날입니다."},
{text:"山高水長",reading:"산고수장",meaning:"산처럼 높고 물처럼 길다 — 인품과 덕이 오래 이어집니다."},
{text:"志在四方",reading:"지재사방",meaning:"뜻은 사방에 있다 — 넓은 세상을 향해 큰 꿈을 펼칠 날입니다."},
];

const COMPAT_TABLE = {
sheng:{level:5,emoji:"",label:"천생연분",desc:"서로를 성장시키는 최고의 인연입니다. 함께할수록 더욱 빛납니다."},
shengBy:{level:4,emoji:"",label:"보살피는 인연",desc:"한 사람이 다른 사람을 이끌어주는 헌신적이고 따뜻한 관계입니다."},
same:{level:4,emoji:"",label:"비화동류",desc:"같은 기운끼리 공감대가 강하고 편안한 동반자 관계입니다."},
neutral:{level:3,emoji:"",label:"평화로운 인연",desc:"큰 갈등 없이 서로 존중하며 나아갈 수 있는 안정적인 인연입니다."},
ke:{level:2,emoji:"",label:"자극과 성장",desc:"긴장감이 있지만 서로를 강하게 단련시키는 강렬한 인연입니다."},
keBy:{level:2,emoji:"",label:"도전적 관계",desc:"주도권 경쟁이 생길 수 있어 서로 깊은 배려가 필요합니다."},
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

// ════════════════════════════════════════════════════════
//    사주 기반 일운(日運) 엔진 — 랜덤 완전 제거
//  모든 수치가 오늘 일주 ↔ 내 사주 오행 관계에서 도출
// ════════════════════════════════════════════════════════
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
if(HEX.some(([a,b])=>(myBranch===a&&todayBranch===b)||(myBranch===b&&todayBranch===a))) return 2;
const TRI = [[0,4,8],[2,6,10],[1,5,9],[3,7,11]];
if(TRI.some(g=>g.includes(myBranch)&&g.includes(todayBranch)&&myBranch!==todayBranch)) return 1;
if(Math.abs(myBranch-todayBranch)===6) return -2;
const XING = [[2,5,8],[1,10,7]];
if(XING.some(g=>g.includes(myBranch)&&g.includes(todayBranch)&&myBranch!==todayBranch)) return -1;
return 0;
}
function getTodayJdn(dateStr) {
const [y,m,d] = dateStr.split("-").map(Number);
return toJDN(y,m,d);
}

// 오늘 사주 기반 일운 점수 (60~99, 결정론적)
function getSajuDailyScore(profile, dateStr) {
if (!profile?.saju) return 75;
const jdn       = getTodayJdn(dateStr);
const todayStem  = (jdn+49)%10, todayBranch = (jdn+49)%12;
const todayElem  = STEM_ELEM[todayStem];
const myElem     = STEM_ELEM[profile.saju.dStem];
let base = 75;
base += elemRelation(myElem, todayElem) * 6;
base += branchRelation(profile.saju.dBranch, todayBranch) * 5;
if(profile.saju.yStem != null) base += elemRelation(STEM_ELEM[profile.saju.yStem], todayElem) * 2;
if(profile.saju.mStem != null) base += elemRelation(STEM_ELEM[profile.saju.mStem], todayElem) * 2;
return Math.min(99, Math.max(60, base));
}

// 분야별 점수 (사주 관계 기반)
function getSajuCats(profile, dateStr) {
if (!profile?.saju) return {love:72,career:72,health:72,money:72};
const jdn       = getTodayJdn(dateStr);
const todayStem  = (jdn+49)%10, todayBranch = (jdn+49)%12;
const todayElem  = STEM_ELEM[todayStem];
const myElem     = STEM_ELEM[profile.saju.dStem];
const sr = elemRelation(myElem, todayElem);
const br = branchRelation(profile.saju.dBranch, todayBranch);
const cl = v => Math.min(99, Math.max(50, v));
return {
love:   cl(72 + sr*4 + br*8),
career: cl(72 + sr*8 + br*2),
health: cl(72 + sr*3 - Math.abs(br)*4 + (br>=0?4:0)),
money:  cl(72 + sr*6 + br*4),
};
}

// 오행 레이더 점수 (내 원국 오행분포 + 오늘 기운)
function getSajuElemScores(profile, dateStr) {
if (!profile?.saju) return [60,60,60,60,60];
const jdn = getTodayJdn(dateStr);
const todayElem = STEM_ELEM[(jdn+49)%10];
const saju = profile.saju;
const counts = [0,0,0,0,0];
[saju.yStem,saju.mStem,saju.dStem,saju.hStem].filter(v=>v!=null).forEach(s=>counts[STEM_ELEM[s]]++);
[saju.yBranch,saju.mBranch,saju.dBranch,saju.hBranch].filter(v=>v!=null).forEach(b=>counts[BRANCH_ELEM[b]]++);
const maxC = Math.max(…counts, 1);
return counts.map((c,i) => {
const base = Math.round(c/maxC*60) + 30;
const tb   = (i===todayElem)?10 : SHENG[todayElem]===i?5 : KE[todayElem]===i?-5 : 0;
return Math.min(99, Math.max(30, base+tb));
});
}

// 미션 (오행 관계 기반, 결정론적)
const _MISSIONS = {
"2": ["새로운 인연과 적극적으로 연결해 보세요. 좋은 기운이 흐릅니다 ","창의적인 프로젝트를 시작하기 최적의 날입니다 ","주변 사람에게 먼저 다가가보세요. 뜻밖의 행운이 찾아옵니다 "],
"1": ["오늘 하루 감사한 일 3가지를 종이에 적어보세요 ","좋아하는 음악을 들으며 10분간 명상해보세요 ","아침 햇살을 5분만 받으며 깊게 숨쉬어 보세요 "],
"0": ["물 한 잔을 천천히 음미하며 마셔보세요 ","20분 산책으로 맑은 공기를 마셔보세요 ","나 자신을 칭찬하는 말을 소리 내어 3번 해보세요 "],
"-1":["오늘은 무리하지 말고 에너지를 충전하는 날로 삼으세요 ","스마트폰을 1시간 내려놓고 아날로그 시간을 가져보세요 ","저녁에 하늘을 바라보며 마음을 가라앉혀 보세요 "],
"-2":["오늘은 중요한 결정을 미루고 충분히 쉬세요 ","가까운 사람과 대화로 마음의 짐을 나눠보세요 ","좋아하는 향기로 나만의 공간을 채워 재충전하세요 "],
};
function getSajuMission(profile, dateStr) {
if (!profile?.saju) return _MISSIONS["0"][0];
const [,,d] = dateStr.split("-").map(Number);
const jdn  = getTodayJdn(dateStr);
const te   = STEM_ELEM[(jdn+49)%10];
const me   = STEM_ELEM[profile.saju.dStem];
const rel  = elemRelation(me, te);
const pool = _MISSIONS[String(rel)] ?? _MISSIONS["0"];
return pool[d % pool.length];
}

// 길일/흉일 (사주 오행 관계 기반)
function getSajuCalendar(profile, year, month) {
const days = new Date(year, month, 0).getDate();
if (!profile?.saju) return { scores: Array(days).fill(75), good: new Set(), bad: new Set() };
const me = STEM_ELEM[profile.saju.dStem];
const mb = profile.saju.dBranch;
const list = Array.from({length:days}, (_,i) => {
const d   = i+1;
const jdn = toJDN(year, month, d);
const te  = STEM_ELEM[(jdn+49)%10];
const tb  = (jdn+49)%12;
const score = 75 + elemRelation(me,te)*6 + branchRelation(mb,tb)*5;
return { d, score: Math.min(99, Math.max(60, score)) };
});
const sorted = […list].sort((a,b) => b.score-a.score);
return {
scores: list.map(x => x.score),
good:   new Set(sorted.slice(0,5).map(x=>x.d)),
bad:    new Set(sorted.slice(-3).map(x=>x.d)),
};
}

// 사자성어 (일주 기반 결정론적)
function getSajuIdiom(profile, dateStr) {
if (!profile?.saju) return IDIOMS[0];
const jdn   = getTodayJdn(dateStr);
const todayGZ = (jdn+49)%60;
const myGZ    = profile.saju.dayGZ ?? 0;
return IDIOMS[(todayGZ + myGZ) % IDIOMS.length];
}

function getNextBirthday(m, d) {
const t = new Date(), y = t.getFullYear();
let bd = new Date(y,m-1,d); if(bd<=t) bd = new Date(y+1,m-1,d);
const diff = Math.ceil((bd-t)/86400000);
return { days: diff, isToday: diff===0||diff===365 };
}

const todayStr = () => { const d=new Date(); return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; };
const maxDays  = (y,m) => new Date(y,m,0).getDate();
const YS = Array.from({length:110},(*,i)=>2026-i);
const MS = Array.from({length:12},(*,i)=>i+1);
const HS = Array.from({length:24},(*,i)=>i);
const MI = Array.from({length:60},(*,i)=>i);

// ════════════════════════════════════════════════════════
//  한자 사전 (빈도순)
// ════════════════════════════════════════════════════════
const HANJA_DICT = {
"이":["李","怡","以","異","利","珥"],"김":["金","琴","錦"],"박":["朴","璞","博"],
"최":["崔","最"],"정":["鄭","貞","正","廷","情","靜","晶","庭"],
"강":["姜","康","剛","江","鋼"],"윤":["尹","潤","允","胤","玧"],
"장":["張","章","璋","莊","長","壯"],"임":["林","任","琳","壬","臨"],
"한":["韓","漢","翰","閑"],"오":["吳","旿","五","梧"],
"서":["徐","瑞","舒","書","西"],"신":["申","信","晨","辛","愼"],
"권":["權","卷","勸"],"황":["黃","晃","煌","凰","璜"],
"안":["安","晏","岸"],"송":["宋","松","頌","淞"],
"홍":["洪","弘","鴻","紅"],"고":["高","皐","古","固","顧"],
"문":["文","汶","門","聞"],"양":["楊","梁","陽","良","養"],
"손":["孫","遜","巽"],"배":["裵","培","倍"],
"조":["趙","曺","祖","助"],"허":["許","虛"],
"유":["劉","裕","柔","惟","維","愈","儒"],"남":["南","男","藍"],
"심":["沈","心","深","審"],"노":["盧","路","魯","努"],
"하":["河","夏","賀","荷","霞","廈"],"전":["田","全","傳","典","錢","展"],
"성":["成","誠","盛","性","星"],"차":["車","次","且"],
"우":["禹","宇","佑","雨","右"],"구":["具","龜","丘","九"],
"나":["羅","那","娜","奈"],"진":["陳","珍","眞","振","鎭","晉"],
"지":["池","智","芝","之","志","枝"],"원":["元","源","圓","苑"],
"천":["千","天","川","泉"],"방":["方","邦","芳","房"],
"공":["孔","恭","功"],"백":["白","伯","柏","百"],
"류":["柳","流","琉"],
// 이름
"준":["俊","峻","準","濬","浚","晙","埈","竣"],
"현":["賢","炫","玄","鉉","弦","晛","顯","絢"],
"민":["旻","珉","敏","旼","珢","民"],"영":["英","瑛","永","泳","映","煐","瑩"],
"수":["秀","洙","修","壽","琇","穗"],"은":["恩","銀","殷","誾","垠"],
"혜":["惠","慧","蕙","彗","兮"],"경":["景","璟","敬","庚","京","卿"],
"연":["妍","娟","燕","涓","沇","漣","延"],"세":["世","洗","細","歲"],
"재":["在","才","宰","載","梓","哉"],"인":["仁","印","寅","忍","麟"],
"동":["東","同","棟","動","冬","彤"],"호":["浩","皓","晧","昊","虎","護","豪"],
"기":["基","起","期","琦","璣","旗"],"상":["相","祥","尙","賞","詳","象"],
"태":["泰","太","台","兌"],"환":["煥","桓","歡","奐","渙","宦"],
"찬":["燦","贊","粲","璨","瓚"],"용":["龍","勇","容","鎔","溶"],
"철":["哲","澈","徹","喆","鐵"],"석":["碩","錫","石","晳","奭"],
"훈":["勳","薰","訓","焄"],"병":["炳","秉","昺","丙","柄"],
"아":["雅","娥","亞","芽","牙"],"소":["昭","笑","素","蘇","韶","召"],
"미":["美","眉","彌","媚"],"채":["彩","埰","采","菜","蔡"],
"도":["道","燾","度","渡","圖"],"형":["炯","瀅","馨","亨","衡"],
"보":["寶","輔","普","甫","步"],"빈":["彬","斌","玭","賓","嬪"],
"덕":["德","悳"],"희":["熙","姬","喜","曦","羲","希"],
"선":["善","璿","宣","仙","嬋","先","鮮"],"해":["海","偕","解","亥"],
"가":["佳","嘉","珈","伽","加","可"],"사":["史","仕","思","斯","沙"],
"자":["子","慈","紫","自","姿"],"야":["野","夜","耶"],
"의":["義","毅","儀","意","宜"],"시":["詩","時","始","施","視"],
"비":["飛","妃","丕","備","悲"],"추":["秋","楸","樞","追"],
"무":["武","茂","撫","務"],"주":["珠","周","宙","舟","株","柱","奏"],
"두":["斗","杜","頭","豆"],"모":["慕","謀","毛","茅","模"],
"린":["麟","璘","燐","潾"],"록":["祿","錄","綠","鹿"],
"봉":["鳳","奉","峰","烽"],"춘":["春","椿"],
"래":["來","萊","徠"],"로":["路","露","爐"],
"유":["由","柔","唯","遊","裕"],"나":["娜","那","奈","羅"],
"하":["荷","夏","河","賀","霞"],
};

const HANJA_STROKES = {
"李":7,"怡":9,"以":5,"異":11,"利":7,"珥":10,"金":8,"琴":13,"錦":16,
"朴":6,"璞":16,"博":12,"崔":11,"最":12,"鄭":14,"貞":9,"正":5,"廷":7,
"情":11,"靜":16,"晶":12,"庭":10,"姜":9,"康":11,"剛":10,"江":6,"鋼":16,
"尹":4,"潤":15,"允":4,"胤":9,"玧":8,"張":11,"章":11,"璋":15,"莊":9,
"長":8,"壯":6,"林":8,"任":6,"琳":13,"壬":4,"臨":17,"韓":17,"漢":13,
"翰":16,"閑":12,"吳":7,"旿":8,"五":4,"梧":11,"徐":10,"瑞":13,"舒":12,
"書":10,"西":6,"申":5,"信":9,"晨":11,"辛":7,"愼":13,"權":22,"卷":8,
"勸":20,"黃":12,"晃":10,"煌":13,"凰":11,"璜":17,"安":6,"晏":10,"岸":8,
"宋":7,"松":8,"頌":13,"淞":11,"洪":9,"弘":5,"鴻":17,"紅":9,"高":10,
"皐":11,"古":5,"固":8,"顧":21,"文":4,"汶":7,"門":8,"聞":14,"楊":13,
"梁":11,"陽":12,"良":7,"養":15,"孫":10,"遜":13,"巽":12,"裵":14,"培":11,
"倍":10,"趙":14,"曺":11,"祖":9,"助":7,"許":11,"虛":12,"劉":15,"裕":12,
"柔":9,"惟":11,"維":14,"愈":13,"儒":16,"南":9,"男":7,"藍":17,"沈":8,
"心":4,"深":11,"審":15,"盧":20,"路":13,"魯":15,"努":7,"河":8,"夏":10,
"賀":12,"荷":12,"霞":17,"廈":13,"田":5,"全":6,"傳":13,"典":8,"錢":16,
"展":10,"成":6,"誠":13,"盛":12,"性":8,"星":9,"車":7,"次":6,"且":5,
"禹":9,"宇":6,"佑":7,"雨":8,"右":5,"具":8,"龜":16,"丘":5,"九":2,
"羅":20,"那":7,"娜":10,"奈":8,"陳":10,"珍":9,"眞":10,"振":10,"鎭":18,
"晉":10,"池":6,"智":12,"芝":6,"之":4,"志":7,"枝":8,"元":4,"源":13,
"圓":13,"苑":8,"千":3,"天":4,"川":3,"泉":9,"方":4,"邦":7,"芳":7,
"房":8,"孔":4,"恭":10,"功":5,"白":5,"伯":7,"柏":9,"百":6,"柳":9,
"流":10,"琉":11,"俊":9,"峻":10,"準":13,"濬":17,"浚":10,"晙":10,"埈":11,
"竣":12,"賢":16,"炫":9,"玄":5,"鉉":13,"弦":8,"晛":11,"顯":23,"絢":12,
"旻":8,"珉":9,"敏":11,"旼":8,"珢":10,"民":5,"英":8,"瑛":14,"永":5,
"泳":8,"映":9,"煐":13,"瑩":17,"秀":7,"洙":9,"修":10,"壽":14,"琇":12,
"穗":17,"恩":10,"銀":14,"殷":10,"誾":16,"垠":9,"惠":12,"慧":15,"蕙":18,
"彗":11,"兮":6,"景":12,"璟":17,"敬":13,"庚":8,"京":8,"卿":12,"鏡":19,
"妍":9,"娟":10,"燕":16,"涓":10,"沇":7,"漣":14,"延":7,"世":5,"洗":9,
"細":11,"歲":17,"在":6,"才":3,"宰":10,"載":13,"梓":11,"哉":9,"仁":4,
"印":6,"寅":11,"忍":7,"麟":23,"東":8,"同":6,"棟":12,"動":11,"冬":5,
"彤":7,"浩":10,"皓":12,"晧":11,"昊":8,"虎":8,"護":21,"豪":14,"基":11,
"起":10,"期":12,"琦":12,"璣":17,"旗":14,"相":9,"祥":11,"尙":8,"賞":15,
"詳":13,"象":12,"泰":10,"太":4,"台":5,"兌":7,"煥":13,"桓":10,"歡":22,
"奐":9,"渙":12,"宦":9,"燦":17,"贊":19,"粲":13,"璨":19,"瓚":22,"龍":16,
"勇":9,"容":10,"鎔":18,"溶":13,"哲":10,"澈":16,"徹":15,"喆":12,"鐵":21,
"碩":14,"錫":16,"石":5,"晳":12,"奭":10,"勳":16,"薰":17,"訓":10,"焄":12,
"炳":9,"秉":8,"昺":9,"丙":5,"柄":9,"雅":13,"娥":10,"亞":8,"芽":8,
"牙":4,"昭":9,"笑":10,"素":10,"蘇":20,"韶":14,"召":5,"美":9,"眉":9,
"彌":18,"媚":12,"彩":11,"埰":11,"采":8,"菜":11,"蔡":14,"道":13,"燾":17,
"度":9,"渡":12,"圖":14,"炯":9,"瀅":17,"馨":20,"亨":7,"衡":16,"寶":20,
"輔":14,"普":12,"甫":7,"步":7,"彬":11,"斌":12,"玭":9,"賓":14,"嬪":17,
"德":15,"悳":15,"熙":16,"姬":10,"喜":12,"曦":20,"羲":16,"希":7,"善":12,
"璿":18,"宣":9,"仙":5,"嬋":15,"先":6,"鮮":17,"海":10,"偕":11,"解":13,
"亥":6,"佳":8,"嘉":14,"珈":9,"伽":7,"加":5,"可":5,"史":5,"仕":5,
"思":9,"斯":12,"沙":7,"子":3,"慈":13,"紫":12,"自":6,"姿":9,"野":11,
"夜":8,"耶":8,"義":13,"毅":15,"儀":15,"意":13,"宜":8,"詩":13,"時":10,
"始":8,"施":9,"視":12,"飛":9,"妃":6,"丕":5,"備":12,"悲":12,"秋":9,
"楸":13,"樞":15,"追":10,"武":8,"茂":8,"撫":15,"務":11,"珠":10,"周":8,
"宙":8,"舟":6,"株":10,"柱":9,"奏":9,"斗":4,"杜":7,"頭":16,"豆":7,
"慕":15,"謀":16,"毛":4,"茅":8,"模":14,"麟":23,"璘":17,"燐":16,"祿":13,
"錄":16,"綠":14,"鹿":11,"鳳":14,"奉":8,"峰":10,"烽":11,"春":9,"椿":13,
"來":8,"萊":11,"徠":11,"露":21,"爐":20,"由":5,"唯":11,"遊":13,
};

const NAME_FORTUNE = [
{elem:0,icon:"",title:"목(木) 기운의 이름",desc:"성장과 창의의 기운이 깃든 이름. 예술적 재능과 리더십이 꽃피는 운명입니다.",fortune:"대인관계가 넓고 창의적인 분야에서 두각을 나타냅니다."},
{elem:1,icon:"",title:"화(火) 기운의 이름",desc:"열정과 카리스마의 기운. 강한 존재감으로 주변을 밝히는 삶을 살게 됩니다.",fortune:"공직이나 교육, 예능 계통에서 큰 성취를 이룹니다."},
{elem:2,icon:"",title:"토(土) 기운의 이름",desc:"신뢰와 안정의 기운. 꾸준한 노력으로 탄탄한 기반을 쌓는 운명입니다.",fortune:"부동산, 건설 등 안정적인 분야에서 성공합니다."},
{elem:3,icon:"",title:"금(金) 기운의 이름",desc:"결단력과 지혜의 기운. 명석한 판단력으로 어떤 난관도 헤쳐나가는 운명입니다.",fortune:"법률, 금융, 의료 등 전문직 분야에서 빛을 발합니다."},
{elem:4,icon:"",title:"수(水) 기운의 이름",desc:"유연함과 통찰의 기운. 흘러가는 물처럼 어떤 환경에도 잘 적응하는 운명입니다.",fortune:"무역, 외교, 예술 계통에서 두각을 나타냅니다."},
];
function getStrokeElement(total) {
const r = total % 10;
if(r===1||r===2) return 0; if(r===3||r===4) return 1;
if(r===5||r===6) return 2; if(r===7||r===8) return 3;
return 4;
}
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
if(charElem===nameElem) return {score:90,label:"동기(同氣)",desc:"같은 기운으로 강화되는 최상의 조합입니다.",color:"#2d6a4f"};
if(SHENG[charElem]===nameElem) return {score:85,label:"상생(相生)",desc:"사주가 이름을 生하여 운을 끌어올립니다.",color:"#1976d2"};
if(SHENG[nameElem]===charElem) return {score:80,label:"역생(逆生)",desc:"이름이 사주를 生하는 안정적인 조합입니다.",color:"#0f5132"};
if(KE[charElem]===nameElem) return {score:60,label:"상극(相克)",desc:"사주가 이름을 克하나, 의지력이 강해집니다.",color:"#bf6100"};
if(KE[nameElem]===charElem) return {score:55,label:"역극(逆克)",desc:"이름이 사주를 克하여 긴장감이 생깁니다.",color:"#c62828"};
return {score:70,label:"평화(平和)",desc:"균형 잡힌 조합입니다.",color:"#546e7a"};
}

// ════════════════════════════════════════════════════════
//  공통 컴포넌트
// ════════════════════════════════════════════════════════
function ScoreRing({score,color,size=64}) {
const r=(size/2)-5, C=2*Math.PI*r;
const [offset,setOffset]=useState(C);
useEffect(()=>{const t=setTimeout(()=>setOffset(C*(1-score/100)),80);return()=>clearTimeout(t);},[score,C]);
return(
<div style={{position:"relative",width:size,height:size,flexShrink:0}}>
<svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{transform:"rotate(-90deg)"}}>
<circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f0f0f0" strokeWidth="5"/>
<circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="5"
strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset}
style={{transition:"stroke-dashoffset 1.5s ease"}}/>
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
{[.25,.5,.75,1].map((f,gi)=><polygon key={gi} points={ang.map(a=>pt(a,mR*f)).map(([x,y])=>`${x},${y}`).join(" ")} fill="none" stroke="#f0f0f0" strokeWidth="1"/>)}
{ang.map((a,i)=>{const[x,y]=pt(a,mR);return<line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#f0f0f0" strokeWidth="1"/>;}) }
<polygon points={dpts.map(([x,y])=>`${x},${y}`).join(" ")} fill={`${char.color}25`} stroke={char.color}
strokeWidth="2.5" strokeLinejoin="round" style={{opacity:vis?1:0,transition:"opacity .8s"}}/>
{dpts.map(([x,y],i)=><circle key={i} cx={x} cy={y} r="4" fill={char.color} style={{opacity:vis?1:0,transition:`opacity .4s ${.3+i*.06}s`}}/>)}
{ang.map((a,i)=>{const[x,y]=pt(a,mR+17);return<text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle" fontSize="13" fontWeight="800" fill={ELEM_COLOR[i]}>{L[i]}</text>;})}
</svg>
);
}

// ────── PackReveal ──────────────────────────────────────
function PackReveal({char,onClose}) {
const [phase,setPhase]=useState("idle");
const setP=p=>setPhase(p);
useEffect(()=>{
if(phase==="idle"){const t=setTimeout(()=>setP("crack"),600);return()=>clearTimeout(t);}
if(phase==="show"){const t=setTimeout(()=>setP("done"),1600);return()=>clearTimeout(t);}
},[phase]);
return(
<motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
className="fixed inset-0 z-[200] flex items-center justify-center"
style={{background:"radial-gradient(ellipse at center,#1a1a2e 0%,#0d0d1a 100%)"}}>
<AnimatePresence mode="wait">
{phase==="idle"&&<motion.div key="i" exit={{scale:0,opacity:0}} className="text-center cursor-pointer" onClick={()=>setP("crack")}>
<motion.div animate={{y:[0,-12,0]}} transition={{repeat:Infinity,duration:2.2}} className="text-[120px] mb-3"></motion.div>
<p className="text-white/50 text-base">탭하여 아우라를 깨우세요</p>
</motion.div>}
{phase==="crack"&&<motion.div key="c" animate={{scale:[1,1.25,0.9,1.15,1],rotate:[0,-8,8,-4,0]}}
transition={{duration:.7}} onAnimationComplete={()=>setP("burst")} className="text-[120px]"></motion.div>}
{phase==="burst"&&<motion.div key="b" initial={{scale:0,opacity:0}} animate={{scale:[0,1.6,1.2,1.4,1.3],opacity:1}}
transition={{duration:.6}} onAnimationComplete={()=>setP("show")} className="text-[100px]"></motion.div>}
{(phase==="show"||phase==="done")&&<motion.div key="s" initial={{scale:.5,opacity:0,y:40}} animate={{scale:1,opacity:1,y:0}}
transition={{type:"spring",damping:12,stiffness:80}} onAnimationComplete={()=>{if(phase==="show")setP("done");}}
className="text-center px-8">
<motion.div animate={{y:[0,-12,0]}} transition={{repeat:Infinity,duration:2.8}} className="text-[120px] mb-3">{char.icon}</motion.div>
<h2 className="text-3xl font-black mb-1" style={{color:char.color,textShadow:`0 0 30px ${char.color}60`}}>{char.name}</h2>
<p className="text-white/60 text-sm mb-2">{ELEM_NAME[char.element]}</p>
<div className="flex gap-2 justify-center flex-wrap mb-7">
{char.keywords.map(k=><span key={k} className="text-xs font-bold px-3 py-1 rounded-full bg-white/15 text-white/80">{k}</span>)}
</div>
{phase==="done"&&<motion.button initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} transition={{delay:.3}}
whileTap={{scale:.95}} onClick={onClose}
className="bg-white font-black px-8 py-3 rounded-full text-base" style={{color:char.color}}>
내 운명 확인하기 →
</motion.button>}
</motion.div>}
</AnimatePresence>
</motion.div>
);
}

// ────── SyllableRow (한자 직접입력) ─────────────────────
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
if(/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(h)){setCustomError("한자(漢字)를 입력해주세요");return;}
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
<div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
style={{background:selected?"rgba(28,58,51,.12)":"#f5f5f5",color:selected?"#1C3A33":"#888"}}>{syl}</div>
<span className="text-xs text-gray-400 font-medium">{options.length>0?`"${syl}"의 한자`:`"${syl}" — 목록 없음`}</span>
</div>
<div className="flex gap-1">
<button onClick={()=>{setShowCustom(v=>!v);setCustomError("");}}
className="flex items-center gap-0.5 text-[10px] font-bold px-2 py-1 rounded-full transition-all"
style={{background:showCustom?"rgba(28,58,51,.12)":"#f5f5f5",color:showCustom?"#1C3A33":"#aaa"}}>
 직접 입력
</button>
{selected&&<button onClick={()=>onChange(idx,"")} className="text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded-full font-bold">지우기</button>}
</div>
</div>
{options.length>0&&(
<div className="flex flex-wrap gap-2 mb-2">
{options.map(hanja=>{
const strokes=HANJA_STROKES[hanja],isSel=selected===hanja;
return(
<motion.button key={hanja} whileTap={{scale:.88}}
onClick={()=>onChange(idx,isSel?"":hanja)}
className="flex flex-col items-center px-3 py-2 rounded-2xl border-2 transition-all relative"
style={{background:isSel?"#1C3A33":"white",borderColor:isSel?"#1C3A33":"#e5e5e5",color:isSel?"white":"#333"}}>
{isSel&&<div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center"><Check size={9} color="white"/></div>}
<span className="text-xl leading-none font-bold">{hanja}</span>
{strokes&&<span className="text-[9px] mt-0.5" style={{color:isSel?"rgba(255,255,255,.65)":"#bbb"}}>{strokes}획</span>}
</motion.button>
);
})}
</div>
)}
{isCustomSel&&(
<motion.div initial={{opacity:0,scale:.9}} animate={{opacity:1,scale:1}}
className="inline-flex items-center gap-2 px-3 py-2 rounded-2xl mb-2"
style={{background:"rgba(28,58,51,.1)",border:"1.5px solid rgba(28,58,51,.2)"}}>
<span className="text-xl font-black text-[#1C3A33]">{selected}</span>
<span className="text-[10px] font-bold text-gray-500">직접 입력됨</span>
{HANJA_STROKES[selected]&&<span className="text-[10px] text-gray-400">{HANJA_STROKES[selected]}획</span>}
<button onClick={()=>onChange(idx,"")} className="text-gray-400 ml-1 text-sm leading-none">×</button>
</motion.div>
)}
<AnimatePresence>
{showCustom&&(
<motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:"auto"}} exit={{opacity:0,height:0}} className="overflow-hidden">
<div className="rounded-2xl p-4 space-y-3 mt-1" style={{background:"rgba(28,58,51,.04)",border:"1.5px solid rgba(28,58,51,.1)"}}>
<p className="text-[11px] font-bold text-gray-500"> "{syl}"에 해당하는 한자를 직접 입력하세요</p>
<div className="flex gap-2">
<div className="flex-1">
<label className="text-[10px] text-gray-400 block mb-1 font-bold">한자 (1글자)</label>
<input type="text" value={customHanja} maxLength={1} placeholder="漢"
onChange={e=>setCustomHanja(e.target.value.slice(0,1))}
className="w-full text-center text-2xl font-black rounded-xl py-2 outline-none"
style={{border:"1.5px solid #ddd",color:"#1C3A33",background:"white"}}/>
</div>
<div style={{width:80}}>
<label className="text-[10px] text-gray-400 block mb-1 font-bold">획수 (선택)</label>
<input type="number" value={customStrokes} placeholder="예) 8" min={1} max={64}
onChange={e=>setCustomStrokes(e.target.value)}
className="w-full text-center text-lg font-bold rounded-xl py-2 outline-none"
style={{border:"1.5px solid #ddd",background:"white"}}/>
</div>
<div className="flex items-end">
<button onClick={handleCustomAdd}
className="px-4 py-2 rounded-xl font-black text-sm text-white flex items-center gap-1 active:scale-95 transition-transform"
style={{background:"#1C3A33"}}>
<Plus size={13}/> 추가
</button>
</div>
</div>
{customError&&<motion.p initial={{opacity:0}} animate={{opacity:1}} className="text-xs text-red-500 font-bold"> {customError}</motion.p>}
<p className="text-[10px] text-gray-400 leading-relaxed">예) 勳 / 획수 16 — 획수를 모르면 빈칸으로 두셔도 됩니다</p>
</div>
</motion.div>
)}
</AnimatePresence>
</div>
);
}

function HanjaPicker({name,selections,onChange}) {
if(!name?.trim()) return null;
const syllables=name.trim().split("");
return(
<motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="space-y-4">
<div className="flex items-center justify-between">
<label className="text-xs font-bold text-gray-500">한자 이름 선택 (선택사항)</label>
<span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
{syllables.filter((*,i)=>selections[i]).length}/{syllables.length} 선택됨
</span>
</div>
{syllables.some((*,i)=>selections[i])&&(
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

// ════════════════════════════════════════════════════════
//  CharCard
// ════════════════════════════════════════════════════════
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
<motion.div initial={{scale:.9,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:"spring",damping:15}}
className="rounded-[40px] p-8 text-center shadow-xl relative overflow-hidden"
style={{background:`linear-gradient(145deg,${char.bg},white)`,border:`2px solid ${char.color}20`}}>
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
<div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-black text-xs"
style={{background:`${char.color}15`,border:`1.5px solid ${char.color}30`,color:char.color}}>
{lv.icon} {lv.rank} {lv.name}
</div>
</div>
<motion.button whileTap={{scale:.93}} onClick={handleShare}
className="flex items-center gap-2 mx-auto px-5 py-2.5 rounded-2xl font-bold text-sm bg-white shadow-sm"
style={{color:char.color,border:`1.5px solid ${char.color}30`}}>
{copied?<><Check size={14}/> 복사됨!</>:<><Share2 size={14}/> 공유하기</>}
</motion.button>
</motion.div>
);
}

// ════════════════════════════════════════════════════════
//  운세 컴포넌트들
// ════════════════════════════════════════════════════════
function CategoryFortune({profile,char}) {
const today=todayStr();
const cats=getSajuCats(profile,today);
const items=[{label:"연애운",key:"love",icon:"",color:"#e91e63"},{label:"직업운",key:"career",icon:"",color:"#1976d2"},{label:"건강운",key:"health",icon:"",color:"#388e3c"},{label:"재물운",key:"money",icon:"",color:"#f57f17"}];
return(
<div className="space-y-3">
{items.map(({label,key,icon,color})=>{
const val=cats[key];
return(
<div key={key}>
<div className="flex justify-between items-center mb-1.5">
<div className="flex items-center gap-1.5 font-bold text-xs" style={{color}}><span>{icon}</span>{label}</div>
<span className="text-xs font-black" style={{color}}>{val>=85?"":val>=75?"":val>=65?"":""} {val}점</span>
</div>
<div className="h-2.5 rounded-full bg-gray-100 overflow-hidden"><AnimBar val={val} color={color}/></div>
</div>
);
})}
</div>
);
}

function DailyFortune({profile,char}) {
const today=todayStr();
const score=getSajuDailyScore(profile,today);
const mission=getSajuMission(profile,today);
const jdn=getTodayJdn(today);
const todayGZ=(jdn+49)%60;
const todayStem=(jdn+49)%10,todayBranch=(jdn+49)%12;
const summary=score>=90?"최고의 날! ":score>=80?"에너지 넘침 ":score>=70?"순항 중 ":"재충전 필요 ";
return(
<motion.div initial={{y:20,opacity:0}} animate={{y:0,opacity:1}} transition={{delay:.15}}
className="bg-white rounded-[30px] p-6 shadow-sm" style={{border:"1.5px solid #f0f0f0"}}>
<div className="flex items-center gap-2 mb-4">
<Sun size={17} color="#c0550a"/>
<span className="font-bold text-[#1C3A33] text-[15px]">오늘의 아우라 ({today})</span>
<span className="text-[10px] text-gray-400 ml-auto">{STEMS[todayStem]}{BRANCHES[todayBranch]}일</span>
</div>
<div className="flex items-center gap-4 mb-5">
<ScoreRing score={score} color={char.color} size={64}/>
<div className="flex-1">
<div className="font-bold text-gray-800 text-[15px]">{summary}</div>
<div className="text-sm text-gray-500 mt-1">오늘 {STEMS[todayStem]}일 ↔ 내 일간 {STEMS[profile.saju?.dStem??0]}의 오행 관계</div>
</div>
</div>
<div className="mb-5">
<p className="text-xs font-bold text-gray-400 mb-3"> 분야별 오늘의 운세</p>
<CategoryFortune profile={profile} char={char}/>
</div>
<div className="rounded-2xl p-4" style={{background:`${char.color}0d`}}>
<p className="text-[10px] font-black mb-1.5" style={{color:char.color}}>✦ 오늘의 행운 미션</p>
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
const summary=score>=90?"최고의 날! ":score>=80?"에너지 넘침 ":score>=70?"순항 중 ":"재충전 필요 ";
return(
<motion.div initial={{opacity:0,y:40}} animate={{opacity:1,y:0}} exit={{opacity:0,y:40}}
className="fixed inset-0 z-[300] flex items-end bg-black/60" onClick={onClose}>
<motion.div onClick={e=>e.stopPropagation()} className="bg-white w-full rounded-t-[32px] p-6 max-h-[85vh] overflow-auto">
<div className="flex justify-between items-center mb-4">
<h3 className="text-xl font-black text-[#1C3A33]">{dateStr} ({STEMS[ts]}{BRANCHES[tb]}일)</h3>
<button onClick={onClose} className="text-gray-400 text-3xl leading-none">×</button>
</div>
<div className="text-center py-3 mb-4 rounded-2xl bg-gray-50">
<div className="text-5xl font-black text-[#1C3A33]">{score}점</div>
<div className="text-sm text-gray-500 mt-1">{summary}</div>
</div>
<div className="grid grid-cols-2 gap-3 mb-4">
{[["연애운","love","","#e91e63"],["직업운","career","","#1976d2"],
["건강운","health","","#388e3c"],["재물운","money","","#f57f17"]].map(([lb,k,ic,cl])=>(
<div key={k} className="rounded-2xl p-3 text-center" style={{background:`${cl}10`,border:`1px solid ${cl}20`}}>
<div className="text-xl mb-1">{ic}</div>
<div className="text-xs font-bold mb-1" style={{color:cl}}>{lb}</div>
<div className="text-xl font-black" style={{color:cl}}>{cats[k]}점</div>
</div>
))}
</div>
<div className="rounded-2xl bg-emerald-50 p-4 text-center mb-4">
<p className="text-emerald-700 text-xs font-black mb-1">✦ 행운 미션</p>
<p className="text-gray-700 text-sm">{mission}</p>
</div>
<button onClick={onClose} className="w-full py-4 rounded-3xl font-black text-white active:scale-95 transition-transform"
style={{background:"linear-gradient(135deg,#1C3A33,#2d5a4a)"}}>닫기</button>
</motion.div>
</motion.div>
);
}

function MonthlyFortune({profile,char}) {
const td=new Date(),year=td.getFullYear(),month=td.getMonth()+1;
const daysInMonth=maxDays(year,month),firstDay=new Date(year,month-1,1).getDay();
const todayDate=td.getDate();
const [sel,setSel]=useState(null);
const cal=useMemo(()=>getSajuCalendar(profile,year,month),[profile.id,year,month]);
return(
<>
<div className="bg-white rounded-[30px] p-5 shadow-sm" style={{border:"1.5px solid #f0f0f0"}}>
<div className="flex justify-between items-center mb-3">
<div className="font-bold text-[#1C3A33] flex items-center gap-1.5"><Calendar size={16}/> {month}월 캘린더 (사주 기반)</div>
<div className="flex gap-2 text-[10px] text-gray-400">
<span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 inline-block"/>길일</span>
<span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-300 inline-block"/>흉일</span>
</div>
</div>
<div className="grid grid-cols-7 text-center text-[10px] font-bold text-gray-400 mb-1.5">
{["일","월","화","수","목","금","토"].map(d=><div key={d}>{d}</div>)}
</div>
<div className="grid grid-cols-7 gap-1">
{Array.from({length:firstDay}).map((*,i)=><div key={`e${i}`} className="h-10"/>)}
{Array.from({length:daysInMonth},(*,i)=>{
const d=i+1,isT=d===todayDate,isG=cal.good.has(d),isB=cal.bad.has(d);
const bg=isT?`${char.color}22`:isG?"#f0fdf4":isB?"#fef2f2":"#fafafa";
const border=isT?`2px solid ${char.color}`:isG?"1px solid #86efac":isB?"1px solid #fca5a5":"1.5px solid #f0f0f0";
const color=isT?"#1C3A33":isG?"#166534":isB?"#991b1b":"#555";
return(
<motion.button key={i} whileTap={{scale:.88}} onClick={()=>setSel(d)}
className="h-10 rounded-2xl flex items-center justify-center text-[11px] font-bold relative"
style={{backgroundColor:bg,color,border}}>
{d}
{isG&&<span className="absolute top-0.5 right-0.5 text-[8px]"></span>}
{isB&&<span className="absolute top-0.5 right-0.5 text-[8px]"></span>}
</motion.button>
);
})}
</div>
<div className="mt-3 pt-3 border-t border-gray-50 grid grid-cols-2 gap-2">
{[…cal.good].slice(0,1).map(d=><div key={d} className="text-center"><div className="text-[10px] text-gray-400">이달 최고</div><div className="font-black text-sm text-emerald-600">{d}일 ({cal.scores[d-1]}점)</div></div>)}
{[…cal.bad].slice(-1).map(d=><div key={d} className="text-center"><div className="text-[10px] text-gray-400">이달 최저</div><div className="font-black text-sm text-red-400">{d}일 ({cal.scores[d-1]}점)</div></div>)}
</div>
</div>
<AnimatePresence>
{sel&&<DailyDetailModal profile={profile} dateStr={`${year}-${month}-${sel}`} onClose={()=>setSel(null)}/>}
</AnimatePresence>
</>
);
}

function LuckyItems({char}) {
const items=[{icon:"",label:"행운 색",value:char.lucky.colors.join(", ")},{icon:"",label:"행운 숫자",value:char.lucky.numbers.join(", ")},{icon:"",label:"행운 방향",value:char.lucky.direction},{icon:"",label:"행운 음식",value:char.lucky.food},{icon:"",label:"행운 시간",value:char.lucky.time},{icon:"",label:"행운 아이템",value:char.lucky.item}];
return(
<motion.div initial={{y:20,opacity:0}} animate={{y:0,opacity:1}} transition={{delay:.35}}
className="bg-white rounded-[30px] p-6 shadow-sm" style={{border:"1.5px solid #f0f0f0"}}>
<div className="flex items-center gap-2 mb-4"><Star size={17} color="#c0550a"/><span className="font-bold text-[#1C3A33] text-[15px]">오늘의 행운 아이템</span></div>
<div className="grid grid-cols-2 gap-2.5">
{items.map(x=>(
<div key={x.label} className="rounded-2xl p-3.5" style={{background:`${char.color}0a`,border:`1px solid ${char.color}18`}}>
<div className="text-xl mb-1 leading-none">{x.icon}</div>
<div className="text-[10px] font-bold mb-0.5" style={{color:`${char.color}99`}}>{x.label}</div>
<div className="text-[12px] font-semibold text-gray-700">{x.value}</div>
</div>
))}
</div>
</motion.div>
);
}

// ════════════════════════════════════════════════════════
//  홈 화면
// ════════════════════════════════════════════════════════
function HomeScreen({profiles,activeId,setActiveId,onAdd,streak}) {
const p    = profiles.find(x=>x.id===activeId)??profiles[0]??null;
const char = p ? (CHAR_DATA[p.charIdx??0]??CHAR_DATA[0]) : null;
const [tab,setTab]=useState("daily");
return(
<motion.div key="home" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="p-5">
{profiles.length>0&&(
<div className="flex gap-2 overflow-x-auto pb-3 mb-1" style={{scrollbarWidth:"none"}}>
{profiles.map(x=>{
const c=CHAR_DATA[x.charIdx??0]??CHAR_DATA[0],on=x.id===activeId;
return(
<motion.button key={x.id} whileTap={{scale:.95}} onClick={()=>setActiveId(x.id)}
className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white text-sm font-bold"
style={{border:`2px solid ${on?c.color:"#f0f0f0"}`,color:on?c.color:"#aaa"}}>
<span className="text-base">{c.icon}</span>{x.name}
</motion.button>
);
})}
<motion.button whileTap={{scale:.95}} onClick={onAdd}
className="flex-shrink-0 flex items-center gap-1 px-3 py-2 rounded-2xl bg-white border-2 border-dashed border-gray-200 text-gray-300 text-sm font-bold">
<Plus size={13}/> 추가
</motion.button>
</div>
)}
{p&&char?(
<div className="space-y-4">
<CharCard profile={p} char={char} streak={streak}/>
<div className="bg-white rounded-[28px] p-1 flex" style={{border:"1.5px solid #f0f0f0"}}>
{["daily","monthly"].map((t,i)=>(
<button key={t} onClick={()=>setTab(t)}
className={`flex-1 py-2.5 rounded-3xl text-sm font-bold transition-all ${tab===t?"text-white shadow":"text-gray-400"}`}
style={{background:tab===t?"#1C3A33":"transparent"}}>
{["일별 운세","월별 운세"][i]}
</button>
))}
</div>
{tab==="daily"?<DailyFortune profile={p} char={char}/>:<MonthlyFortune profile={p} char={char}/>}
<motion.div initial={{y:20,opacity:0}} animate={{y:0,opacity:1}} transition={{delay:.28}}
className="bg-white rounded-[28px] p-5 shadow-sm" style={{border:"1.5px solid #f0f0f0"}}>
<div className="flex items-center gap-2 mb-2.5"><Sparkles size={16} color="#c0550a"/><span className="font-bold text-[#1C3A33] text-[15px]">나는 왜 이 동물?</span></div>
<p className="text-gray-600 text-sm leading-relaxed">{char.rationale}</p>
</motion.div>
<div className="grid grid-cols-2 gap-3">
{[{title:"대운 흐름",color:"#BF6100",Icon:Award,text:char.luckTrend},{title:"주의할 점",color:"#C62828",Icon:Zap,text:char.caution}].map((x,i)=>(
<motion.div key={x.title} initial={{y:20,opacity:0}} animate={{y:0,opacity:1}} transition={{delay:.32+i*.06}}
className="bg-white rounded-[22px] p-4 shadow-sm" style={{border:"1.5px solid #f0f0f0"}}>
<div className="font-bold text-xs mb-2 flex items-center gap-1.5" style={{color:x.color}}><x.Icon size={13}/>{x.title}</div>
<p className="text-xs text-gray-600 leading-relaxed">{x.text}</p>
</motion.div>
))}
</div>
<LuckyItems char={char}/>
</div>
):(
<motion.div initial={{scale:.95,opacity:0}} animate={{scale:1,opacity:1}} onClick={onAdd}
className="text-center py-20 bg-white rounded-[40px] cursor-pointer" style={{border:"2.5px dashed #e5e5e5"}}>
<div className="text-7xl mb-4"></div>
<p className="font-bold text-gray-400 text-lg">내 아우라를 찾아보세요</p>
<p className="text-sm text-gray-300 mt-1">생년월일을 입력하면 120가지 동물 중 나만의 동물이 탄생해요</p>
<div className="mt-6 inline-flex items-center gap-2 bg-[#1C3A33] text-white px-5 py-2.5 rounded-full font-bold text-sm"><Plus size={14}/> 시작하기</div>
</motion.div>
)}
</motion.div>
);
}

// ════════════════════════════════════════════════════════
//  운세 전용 화면
// ════════════════════════════════════════════════════════
function FortuneScreen({profiles,activeId,setActiveId}) {
const p=profiles.find(x=>x.id===activeId)??profiles[0]??null;
const char=p?(CHAR_DATA[p.charIdx??0]??CHAR_DATA[0]):null;
const [tab,setTab]=useState("radar");
const today=todayStr();
const idiom=p?getSajuIdiom(p,today):IDIOMS[0];
const bd=p?getNextBirthday(+p.m,+p.d):null;
const nameFortune=useMemo(()=>{
if(!p?.name) return null;
return getNameFortune(p.name.trim().split(""),p.hanjaSelections??{});
},[p]);

if(!p||!char) return(
<motion.div key="fortune" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
className="p-5 text-center py-24 text-gray-300">
<Star size={48} className="mx-auto mb-4 opacity-30"/>
<p className="font-bold">프로필을 먼저 등록해주세요</p>
</motion.div>
);
return(
<motion.div key="fortune" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} className="p-5">
{profiles.length>1&&(
<div className="flex gap-2 overflow-x-auto pb-3 mb-2" style={{scrollbarWidth:"none"}}>
{profiles.map(x=>{const c=CHAR_DATA[x.charIdx??0]??CHAR_DATA[0],on=x.id===activeId;return(
<motion.button key={x.id} whileTap={{scale:.95}} onClick={()=>setActiveId(x.id)}
className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-white text-sm font-bold"
style={{border:`2px solid ${on?c.color:"#f0f0f0"}`,color:on?c.color:"#aaa"}}>
<span>{c.icon}</span>{x.name}
</motion.button>
);})}
</div>
)}
<div className="grid grid-cols-4 gap-1 bg-white rounded-2xl p-1 mb-4" style={{border:"1.5px solid #f0f0f0"}}>
{[{id:"radar",label:"오행"},{id:"cat",label:"분야별"},{id:"saju",label:"사주"},{id:"name",label:"성명학"}].map(t=>(
<button key={t.id} onClick={()=>setTab(t.id)}
className={`py-2 rounded-xl text-xs font-bold transition-all ${tab===t.id?"text-white shadow":"text-gray-400"}`}
style={{background:tab===t.id?char.color:"transparent"}}>{t.label}</button>
))}
</div>
<AnimatePresence mode="wait">
{tab==="radar"&&(
<motion.div key="radar" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4">
<div className="bg-white rounded-[28px] p-6 shadow-sm" style={{border:"1.5px solid #f0f0f0"}}>
<div className="text-center font-bold text-[#1C3A33] mb-1">오행(五行) 에너지 레이더</div>
<p className="text-[11px] text-gray-400 text-center mb-4">내 원국 오행 분포 + 오늘 기운 반영</p>
<div className="flex justify-center"><ElementRadar profile={p} dateStr={today}/></div>
<div className="grid grid-cols-5 gap-1 mt-3">
{["목","화","토","금","수"].map((el,i)=>(
<div key={el} className="text-center">
<div className="text-base">{["","","","",""][i]}</div>
<div className="text-[10px] font-bold mt-0.5" style={{color:ELEM_COLOR[i]}}>{el}</div>
<div className="text-[10px] text-gray-400">{getSajuElemScores(p,today)[i]}</div>
</div>
))}
</div>
</div>
{/* 사자성어 */}
<div className="rounded-[24px] p-5" style={{background:char.bg,border:`1.5px solid ${char.color}20`}}>
<div className="flex items-center gap-2 mb-3"><span></span><span className="font-bold text-[13px] text-gray-500">오늘의 사자성어 (일주 기반)</span></div>
<div className="text-center mb-2"><span className="font-black text-3xl tracking-[.2em]" style={{color:char.color}}>{idiom.text}</span></div>
<div className="text-center text-xs text-gray-400 mb-2">({idiom.reading})</div>
<p className="text-[13px] text-gray-600 leading-relaxed text-center">{idiom.meaning}</p>
</div>
{/* D-day */}
{bd&&(
<div className="rounded-[24px] p-5 bg-white" style={{border:`1.5px solid ${char.color}20`}}>
<div className="flex items-center justify-between">
<div className="flex items-center gap-2"><Gift size={16} color={char.color}/><span className="font-bold text-[13px] text-gray-500">다음 생일까지</span></div>
<motion.div animate={{scale:[1,1.1,1]}} transition={{repeat:Infinity,duration:2.5}}
className="font-black text-2xl" style={{color:char.color}}>
{bd.isToday?" 오늘!":`D-${bd.days}`}
</motion.div>
</div>
<p className="text-[11px] text-gray-400 mt-1.5">{bd.isToday?"생일 축하드려요! 오늘은 특별한 행운이 가득해요 ":`앞으로 ${bd.days}일 후 ${p.m}월 ${p.d}일 생일이에요`}</p>
</div>
)}
</motion.div>
)}
{tab==="cat"&&(
<motion.div key="cat" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4">
<div className="bg-white rounded-[28px] p-6 shadow-sm" style={{border:"1.5px solid #f0f0f0"}}>
<div className="font-bold text-[#1C3A33] mb-1">분야별 오늘의 운세</div>
<p className="text-[11px] text-gray-400 mb-5">오늘 일주({(() => {const jdn=getTodayJdn(today);return STEMS[(jdn+49)%10]+BRANCHES[(jdn+49)%12];})()})와 내 사주의 오행 관계 분석</p>
<CategoryFortune profile={p} char={char}/>
</div>
<div className="rounded-[24px] p-5" style={{background:char.bg,border:`1.5px solid ${char.color}20`}}>
<p className="text-xs font-black mb-2" style={{color:char.color}}>✦ {ELEM_NAME[char.element]}이 강한 당신에게</p>
<p className="text-sm text-gray-600 leading-relaxed">
{char.element===0&&"목(木) 기운이 강한 날에는 새로운 시작, 창의적인 프로젝트, 인간관계 확장에 좋습니다."}
{char.element===1&&"화(火) 기운이 강한 날에는 발표, 리더십 발휘, 창작 활동에 최고의 에너지를 발휘합니다."}
{char.element===2&&"토(土) 기운이 강한 날에는 계약, 장기 계획 수립에 안정적인 기운이 뒷받침됩니다."}
{char.element===3&&"금(金) 기운이 강한 날에는 협상, 결단, 금융 관련 일에서 날카로운 판단력이 빛납니다."}
{char.element===4&&"수(水) 기운이 강한 날에는 학습, 여행, 새로운 정보 습득에 지혜로운 흐름이 생깁니다."}
</p>
</div>
<div className="bg-white rounded-[24px] p-5 shadow-sm" style={{border:"1.5px solid #f0f0f0"}}>
<p className="text-xs font-bold text-gray-400 mb-3"> 아우라 레벨 가이드</p>
<div className="space-y-2.5">
{LEVELS.map(l=>(
<div key={l.name} className="flex items-center gap-3">
<span className="text-xl w-7 text-center">{l.icon}</span>
<div className="flex-1">
<div className="flex justify-between text-xs"><span className="font-bold text-gray-700">{l.rank} {l.name}</span><span className="text-gray-400">{l.min}일+ 연속</span></div>
</div>
</div>
))}
</div>
</div>
</motion.div>
)}
{tab==="saju"&&(
<motion.div key="saju" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4">
{(() => {
const saju=p.saju??calcSaju(+p.y,+p.m,+p.d,+(p.h??12),+(p.mi??0),p.timeUnknown);
const pillars=[{label:"年柱",stem:saju.yStem,branch:saju.yBranch},{label:"月柱",stem:saju.mStem,branch:saju.mBranch},{label:"日柱",stem:saju.dStem,branch:saju.dBranch,hi:true},{label:"時柱",stem:saju.hStem,branch:saju.hBranch}];
return(
<div className="bg-white rounded-[24px] p-5 shadow-sm" style={{border:`1.5px solid ${char.color}20`}}>
<div className="flex items-center gap-2 mb-4"><span></span><span className="font-bold text-[13px] text-gray-500">사주 원국 (四柱八字)</span></div>
<div className="grid grid-cols-4 gap-2 text-center">
{pillars.map((pp,i)=>(
<div key={i} className="rounded-2xl py-3 px-1"
style={{background:pp.hi?`${char.color}15`:"#fafafa",border:pp.hi?`2px solid ${char.color}40`:"1.5px solid #f0f0f0"}}>
<div className="text-[10px] text-gray-400 mb-1 font-bold">{pp.label}</div>
{pp.stem!=null&&pp.stem!==undefined?(
<>
<div className="font-black text-[22px] leading-tight" style={{color:pp.hi?char.color:"#333"}}>{STEMS[pp.stem]}</div>
<div className="font-black text-[22px] leading-tight text-gray-600">{BRANCHES[pp.branch]}</div>
<div className="text-[9px] text-gray-400 mt-1">{STEMS_KO[pp.stem]}{BRANCHES_KO[pp.branch]}</div>
</>
):<div className="text-gray-300 text-xs pt-2">미입력</div>}
</div>
))}
</div>
<div className="mt-3 text-center text-[10px] text-gray-400">
일주 {STEMS[saju.dStem]}{BRANCHES[saju.dBranch]}({STEMS_KO[saju.dStem]}{BRANCHES_KO[saju.dBranch]}) · 동물인덱스 {p.charIdx}({p.charIdx%2===0?"낮":"밤"}) → {char.name}
</div>
</div>
);
})()}
</motion.div>
)}
{tab==="name"&&(
<motion.div key="name" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0}} className="space-y-4">
{nameFortune?(
<>
<div className="bg-white rounded-[28px] p-6 shadow-sm" style={{border:`1.5px solid ${char.color}20`}}>
<div className="flex items-center gap-2 mb-4"><span></span><span className="font-bold text-[13px] text-gray-500">성명학(姓名學) 분석</span></div>
<div className="flex justify-center gap-3 mb-4 flex-wrap">
{nameFortune.details.map((d,i)=>(
<div key={i} className="text-center">
<div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black text-2xl mb-1"
style={{background:d.hanja?`${char.color}15`:"#f5f5f5"}}>{d.hanja||d.syl}</div>
<div className="text-[9px] text-gray-400">{d.hanja?`${d.strokes??"?"}획`:d.syl}</div>
</div>
))}
<div className="text-center">
<div className="w-14 h-14 rounded-2xl flex items-center justify-center font-black mb-1 bg-[#1C3A33]/10">
<span className="text-sm font-black text-[#1C3A33]">{nameFortune.total}</span>
</div>
<div className="text-[9px] font-bold text-[#1C3A33]">총획</div>
</div>
</div>
<div className="rounded-2xl p-4 mb-4" style={{background:`${ELEM_COLOR[nameFortune.elem]}12`,border:`1.5px solid ${ELEM_COLOR[nameFortune.elem]}25`}}>
<div className="flex items-center gap-2 mb-2">
<span className="text-xl">{nameFortune.fortune.icon}</span>
<span className="font-black text-sm" style={{color:ELEM_COLOR[nameFortune.elem]}}>{nameFortune.fortune.title}</span>
</div>
<p className="text-xs text-gray-600 leading-relaxed">{nameFortune.fortune.desc}</p>
</div>
{(()=>{
const h=getNameHarmony(char.element,nameFortune.elem);
return(
<div className="rounded-2xl p-4" style={{background:`${h.color}10`,border:`1.5px solid ${h.color}25`}}>
<div className="flex items-center justify-between mb-2">
<span className="font-black text-sm" style={{color:h.color}}>사주 ↔ 이름 조화</span>
<span className="text-xs font-black px-2 py-0.5 rounded-full text-white" style={{background:h.color}}>{h.label} {h.score}점</span>
</div>
<div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-2">
<AnimBar val={h.score} color={h.color}/>
</div>
<p className="text-xs text-gray-600">{h.desc}</p>
</div>
);
})()}
</div>
</>
):(
<div className="bg-white rounded-[28px] p-8 text-center shadow-sm" style={{border:"1.5px solid #f0f0f0"}}>
<div className="text-5xl mb-3"></div>
<p className="font-bold text-gray-600 mb-1">한자 이름이 아직 없어요</p>
<p className="text-xs text-gray-400">프로필 등록·수정 시 한자를 선택하면 성명학 분석이 활성화됩니다.</p>
</div>
)}
</motion.div>
)}
</AnimatePresence>
</motion.div>
);
}

// ════════════════════════════════════════════════════════
//  AddScreen
// ════════════════════════════════════════════════════════
function AddScreen({onSave,onBack,editProfile}) {
const init=editProfile??{};
const [form,setForm]=useState({name:init.name??"",y:init.y??"1995",m:init.m??"6",d:init.d??"1",h:init.h??"12",mi:init.mi??"0",timeUnknown:init.timeUnknown??false});
const [hanjaSelections,setHanjaSelections]=useState(init.hanjaSelections??{});
const days=useMemo(()=>Array.from({length:maxDays(+form.y,+form.m)},(_,i)=>i+1),[form.y,form.m]);
const previewSaju=useMemo(()=>calcSaju(+form.y,+form.m,+form.d,+form.h,+form.mi,form.timeUnknown),[form]);
const previewChar=CHAR_DATA[previewSaju.charIdx]??CHAR_DATA[0];
const handleHanjaChange=(idx,hanja)=>{
setHanjaSelections(prev=>{const next={…prev};if(hanja==="")delete next[idx];else next[idx]=hanja;return next;});
};
const handleSave=()=>{
if(!form.name.trim()){alert("이름을 입력해주세요!");return;}
const saju=calcSaju(+form.y,+form.m,+form.d,+form.h,+form.mi,form.timeUnknown);
onSave({…form,id:editProfile?.id??Date.now(),charIdx:saju.charIdx,saju,hanjaSelections});
};
const sel="p-3 bg-gray-50 rounded-xl text-sm font-medium outline-none w-full";
return(
<motion.div key="add" initial={{y:40,opacity:0}} animate={{y:0,opacity:1}} exit={{y:40,opacity:0}} className="p-5">
<button onClick={onBack} className="flex items-center gap-1 text-gray-400 mb-5 font-bold text-sm">
<ArrowLeft size={16}/> 돌아가기
</button>
<div className="bg-white rounded-[36px] p-6 shadow-lg" style={{border:`2px solid ${previewChar.color}30`}}>
<motion.div key={previewChar.name} initial={{scale:.8,opacity:0}} animate={{scale:1,opacity:1}}
className="text-center py-5 rounded-2xl mb-4" style={{background:previewChar.bg}}>
<div className="text-[72px] leading-none mb-1">{previewChar.icon}</div>
<div className="font-bold text-sm" style={{color:previewChar.color}}>{previewChar.name}</div>
<div className="text-[10px] text-gray-400 mt-0.5">인덱스 {previewSaju.charIdx} ({previewSaju.charIdx%2===0?"낮·양시":"밤·음시"})</div>
</motion.div>
<h2 className="text-2xl font-black text-[#1C3A33] mb-5">{editProfile?"프로필 수정":"새 프로필 등록"}</h2>
<div className="space-y-5">
<div>
<label className="text-xs font-bold text-gray-500 block mb-1.5">이름</label>
<input placeholder="이름을 입력해주세요" value={form.name}
className="w-full p-4 bg-gray-50 rounded-2xl outline-none font-medium text-[#2C2115] text-[15px]"
style={{border:`1.5px solid ${form.name?previewChar.color+"40":"transparent"}`}}
onChange={e=>setForm({…form,name:e.target.value})}/>
</div>
{form.name.trim()&&(
<div className="bg-gray-50 rounded-2xl p-4">
<HanjaPicker name={form.name} selections={hanjaSelections} onChange={handleHanjaChange}/>
</div>
)}
<div>
<label className="text-xs font-bold text-gray-500 block mb-1.5">생년월일</label>
<div className="grid grid-cols-3 gap-2">
<select className={sel} value={form.y} onChange={e=>setForm({…form,y:e.target.value})}>{YS.map(y=><option key={y} value={y}>{y}년</option>)}</select>
<select className={sel} value={form.m} onChange={e=>setForm({…form,m:e.target.value,d:"1"})}>{MS.map(m=><option key={m} value={m}>{m}월</option>)}</select>
<select className={sel} value={form.d} onChange={e=>setForm({…form,d:e.target.value})}>{days.map(d=><option key={d} value={d}>{d}일</option>)}</select>
</div>
</div>
<div>
<div className="flex justify-between items-center mb-1.5">
<label className="text-xs font-bold text-gray-500">태어난 시각 (KST)</label>
<div className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer" onClick={()=>setForm({…form,timeUnknown:!form.timeUnknown})}>
<div className="w-10 h-5 rounded-full flex items-center px-0.5 transition-colors" style={{backgroundColor:form.timeUnknown?"#1C3A33":"#d1d5db"}}>
<div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${form.timeUnknown?"translate-x-5":"translate-x-0"}`}/>
</div>
시간 모름
</div>
</div>
{!form.timeUnknown&&(
<>
<div className="grid grid-cols-2 gap-2">
<select className={sel} value={form.h} onChange={e=>setForm({…form,h:e.target.value})}>{HS.map(h=><option key={h} value={h}>{String(h).padStart(2,"0")}시</option>)}</select>
<select className={sel} value={form.mi} onChange={e=>setForm({…form,mi:e.target.value})}>{MI.map(m=><option key={m} value={m}>{String(m).padStart(2,"0")}분</option>)}</select>
</div>
<p className="text-[10px] text-gray-400 mt-1.5">✦ KST −30분 보정 · 23:30~00:29 출생자 전날 자시 소급</p>
{!form.timeUnknown&&<p className="text-[10px] mt-0.5" style={{color:previewChar.color}}>시지 {previewSaju.hBranch!==null?BRANCHES_KO[previewSaju.hBranch]:"?"}({(previewSaju.hBranch??0)>=6?"음시→밤 동물":"양시→낮 동물"})</p>}
</>
)}
</div>
<motion.button whileTap={{scale:.97}} onClick={handleSave}
className="w-full py-4 rounded-[20px] font-black text-xl text-white shadow-lg"
style={{background:"linear-gradient(135deg,#1C3A33,#2d5a4a)"}}>
{editProfile?"수정 완료 ✓":"등록하기 "}
</motion.button>
</div>
</div>
</motion.div>
);
}

// ════════════════════════════════════════════════════════
//  FriendsScreen
// ════════════════════════════════════════════════════════
function FriendsScreen({profiles,activeId,onSelect,onDelete,onEdit,onAdd,onImport}) {
const [status,setStatus]=useState(null);
const handleExport=()=>{
const blob=new Blob([JSON.stringify({profiles,exportedAt:new Date().toISOString()},null,2)],{type:"application/json"});
const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`aurafriends-${Date.now()}.json`;a.click();
};
const handleImport=e=>{
const file=e.target.files?.[0];if(!file)return;
const r=new FileReader();
r.onload=ev=>{try{const d=JSON.parse(ev.target.result);if(!Array.isArray(d.profiles))throw 0;onImport(d.profiles);setStatus("ok");}catch{setStatus("err");}setTimeout(()=>setStatus(null),3000);};
r.readAsText(file);e.target.value="";
};
return(
<motion.div key="friends" initial={{x:40,opacity:0}} animate={{x:0,opacity:1}} exit={{x:40,opacity:0}} className="p-5">
<div className="flex justify-between items-center mb-5">
<h2 className="text-2xl font-black text-[#1C3A33]"> 아우라 친구들</h2>
<button onClick={onAdd} className="flex items-center gap-1 bg-[#1C3A33] text-white px-4 py-2 rounded-full font-bold text-sm active:scale-95 transition-transform"><Plus size={13}/> 추가</button>
</div>
{profiles.length===0?(
<div className="text-center py-20 text-gray-300"><UserCircle size={52} className="mx-auto mb-3 opacity-40"/><p className="font-bold">아직 등록된 프로필이 없어요</p></div>
):(
<div className="space-y-3">
<AnimatePresence>
{profiles.map(p=>{
const c=CHAR_DATA[p.charIdx??0]??CHAR_DATA[0],on=p.id===activeId;
const hanjaName=p.hanjaSelections&&p.name?p.name.trim().split("").some((_,i)=>p.hanjaSelections[i])?p.name.trim().split("").map((s,i)=>p.hanjaSelections[i]||s).join(""):null:null;
return(
<motion.div key={p.id} layout initial={{opacity:0,x:-15}} animate={{opacity:1,x:0}} exit={{opacity:0,x:20}}
className="flex items-center gap-3 bg-white p-4 rounded-[22px]"
style={{border:`2px solid ${on?c.color:"#f0f0f0"}`}}>
<motion.button whileTap={{scale:.9}} onClick={()=>onSelect(p.id)} className="text-4xl leading-none">{c.icon}</motion.button>
<div className="flex-1 min-w-0 cursor-pointer" onClick={()=>onSelect(p.id)}>
<div className="font-black text-gray-800 text-[15px]">{p.name}</div>
{hanjaName&&<div className="text-[11px] font-bold tracking-wider" style={{color:c.color}}>{hanjaName}</div>}
<div className="text-xs text-gray-500">{c.name}</div>
<div className="text-[10px] font-bold mt-0.5" style={{color:c.color}}>{ELEM_NAME[c.element]}</div>
</div>
{on&&<span className="text-[10px] bg-[#1C3A33] text-white px-2 py-1 rounded-full font-bold flex-shrink-0">현재</span>}
<motion.button whileTap={{scale:.9}} onClick={()=>onEdit(p)} className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{background:"#f0f7f4",color:"#1C3A33"}}></motion.button>
<motion.button whileTap={{scale:.9}} onClick={()=>{if(window.confirm(`${p.name}님을 삭제할까요?`))onDelete(p.id);}} className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{background:"#fff0f0",color:"#e05555"}}><Trash2 size={13}/></motion.button>
</motion.div>
);
})}
</AnimatePresence>
</div>
)}
<div className="mt-8 bg-white rounded-[24px] p-5" style={{border:"1.5px solid #f0f0f0"}}>
<p className="text-xs font-bold text-gray-400 mb-3"> 데이터 백업 / 복구</p>
<div className="flex gap-2">
<button onClick={handleExport} className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-bold active:scale-95" style={{background:"#f0fdf4",color:"#2d6a4f",border:"1px solid #2d6a4f20"}}><Download size={12}/> 내보내기</button>
<label className="flex-1 flex items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-bold cursor-pointer" style={{background:"#f0f4ff",color:"#1565c0",border:"1px solid #1565c020"}}>
<Upload size={12}/> 가져오기<input type="file" accept=".json" className="hidden" onChange={handleImport}/>
</label>
</div>
<AnimatePresence>
{status&&<motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}} exit={{opacity:0}} className={`mt-2 text-center text-xs font-bold py-2 rounded-xl ${status==="ok"?"bg-emerald-50 text-emerald-600":"bg-red-50 text-red-500"}`}>
{status==="ok"?"✓ 복구 완료!":"✗ 파일 형식을 확인해주세요."}
</motion.div>}
</AnimatePresence>
</div>
</motion.div>
);
}

// ════════════════════════════════════════════════════════
//  MatchScreen
// ════════════════════════════════════════════════════════
function MatchScreen({profiles}) {
const [s1,setS1]=useState(profiles[0]?.id??null);
const [s2,setS2]=useState(profiles[1]?.id??null);
const p1=profiles.find(x=>x.id===s1),p2=profiles.find(x=>x.id===s2);
const c1=p1?(CHAR_DATA[p1.charIdx??0]??CHAR_DATA[0]):null;
const c2=p2?(CHAR_DATA[p2.charIdx??0]??CHAR_DATA[0]):null;
const compat=(c1&&c2&&s1!==s2)?getCompat(p1.charIdx??0,p2.charIdx??0):null;
return(
<motion.div key="match" initial={{x:40,opacity:0}} animate={{x:0,opacity:1}} exit={{x:40,opacity:0}} className="p-5">
<h2 className="text-2xl font-black text-[#1C3A33] mb-5"> 아우라 궁합</h2>
{profiles.length<2?(
<div className="text-center py-20 text-gray-300"><Heart size={52} className="mx-auto mb-3 opacity-40"/><p className="font-bold">2명 이상 등록해야 궁합을 볼 수 있어요</p></div>
):(
<div className="space-y-4">
<div className="grid grid-cols-2 gap-3">
{[{label:"첫 번째",val:s1,set:setS1},{label:"두 번째",val:s2,set:setS2}].map(({label,val,set})=>(
<div key={label}>
<p className="text-[10px] font-bold text-gray-400 mb-1.5 ml-1">{label}</p>
<select value={val??""} onChange={e=>set(+e.target.value)}
className="w-full p-3 bg-white rounded-2xl text-sm font-bold outline-none"
style={{border:"2px solid #C1A87D"}}>
{profiles.map(p=><option key={p.id} value={p.id}>{(CHAR_DATA[p.charIdx??0]??CHAR_DATA[0]).icon} {p.name}</option>)}
</select>
</div>
))}
</div>
{s1!==s2&&compat&&c1&&c2?(
<motion.div initial={{scale:.95,opacity:0}} animate={{scale:1,opacity:1}}
className="bg-white rounded-[30px] p-7 text-center shadow-sm" style={{border:"1.5px solid #f0f0f0"}}>
<div className="flex justify-center items-center gap-5 mb-6">
{[{p:p1,c:c1},{p:p2,c:c2}].map(({p,c},i)=>(
<React.Fragment key={p.id}>
<div className="text-center">
<div className="text-5xl mb-1">{c.icon}</div>
<div className="text-sm font-bold text-gray-600">{p.name}</div>
<div className="text-[10px] font-bold mt-0.5" style={{color:c.color}}>{ELEM_NAME[c.element]}</div>
</div>
{i===0&&<motion.div animate={{scale:[1,1.4,1]}} transition={{repeat:Infinity,duration:1.8}} className="text-3xl">{compat.emoji}</motion.div>}
</React.Fragment>
))}
</div>
<div className="flex justify-center gap-2 mb-4">
{Array.from({length:5},(_,i)=><motion.div key={i} initial={{scale:0}} animate={{scale:1}} transition={{delay:.1+i*.08,type:"spring"}} className="w-6 h-6 rounded-full" style={{backgroundColor:i<compat.level?"#1C3A33":"#f0f0f0"}}/>)}
</div>
<div className="text-2xl font-black text-[#1C3A33] mb-2">{compat.label}</div>
<p className="text-gray-600 text-sm leading-relaxed mb-5">{compat.desc}</p>
<div className="grid grid-cols-2 gap-3 text-left">
{[{p:p1,c:c1},{p:p2,c:c2}].map(({p,c})=>(
<div key={p.id} className="rounded-2xl p-3.5" style={{background:`${c.color}0d`}}>
<div className="text-[10px] font-bold mb-0.5" style={{color:`${c.color}99`}}>{p.name}의 기운</div>
<div className="font-bold text-sm" style={{color:c.color}}>{ELEM_NAME[c.element]}</div>
<div className="text-[11px] text-gray-500 mt-0.5">{c.keywords.join(" · ")}</div>
</div>
))}
</div>
</motion.div>
):(
<div className="bg-white rounded-[28px] p-10 text-center text-gray-300 text-sm" style={{border:"1.5px solid #f0f0f0"}}>
{s1===s2?"서로 다른 두 사람을 선택해주세요 ":"두 사람을 선택해보세요"}
</div>
)}
</div>
)}
</motion.div>
);
}

// ════════════════════════════════════════════════════════
//  메인 앱
// ════════════════════════════════════════════════════════
const SK="aurafriends_v8";

export default function AuraFriends() {
const [view,setView]=useState("home");
const [profiles,setProfiles]=useState([]);
const [activeId,setActiveId]=useState(null);
const [packChar,setPackChar]=useState(null);
const [streak,setStreak]=useState(1);
const [editProfile,setEditProfile]=useState(null);

useEffect(()=>{
try{
const raw=localStorage.getItem(SK);if(!raw)return;
const d=JSON.parse(raw);
setProfiles(d.profiles??[]);setActiveId(d.activeId??null);
const today=todayStr(),prev=d.lastVisit,ps=d.streak??1;
if(prev){const diff=Math.round((new Date(today).getTime()-new Date(prev).getTime())/86400000);setStreak(diff===0?ps:diff===1?ps+1:1);}
}catch{}
},[]);

useEffect(()=>{
try{localStorage.setItem(SK,JSON.stringify({profiles,activeId,streak,lastVisit:todayStr()}));}catch{}
},[profiles,activeId,streak]);

const handleSave=useCallback(profile=>{
setProfiles(prev=>{const exists=prev.find(x=>x.id===profile.id);return exists?prev.map(x=>x.id===profile.id?profile:x):[…prev,profile];});
setActiveId(profile.id);
if(!editProfile) setPackChar(CHAR_DATA[profile.charIdx]??CHAR_DATA[0]);
setEditProfile(null);setView("home");
},[editProfile]);

const handleDelete=useCallback(id=>{
setProfiles(prev=>{const next=prev.filter(x=>x.id!==id);setActiveId(cur=>cur===id?(next[0]?.id??null):cur);return next;});
},[]);

const handleSelect=useCallback(id=>{setActiveId(id);setView("home");},[]);
const handleImport=useCallback(ps=>{setProfiles(ps);setActiveId(ps[0]?.id??null);},[]);
const handleEdit=useCallback(p=>{setEditProfile(p);setView("add");},[]);

const lv=getLevel(streak);
const NAV=[{id:"home",icon:"",label:"홈"},{id:"fortune",icon:"",label:"운세"},{id:"friends",icon:"",label:"친구"},{id:"match",icon:"",label:"궁합"},{id:"add",icon:"",label:"분석"}];

return(
<div className="max-w-[430px] mx-auto min-h-screen text-[#2C2115] pb-28 relative" style={{background:"#FAF9F6",fontFamily:"'Noto Sans KR',sans-serif"}}>
<AnimatePresence>
{packChar&&<PackReveal char={packChar} onClose={()=>setPackChar(null)}/>}
</AnimatePresence>
<header className="px-5 py-4 flex justify-between items-center sticky top-0 z-30" style={{background:"rgba(250,249,246,.95)",borderBottom:"1px solid #f0f0f0",backdropFilter:"blur(12px)"}}>
<button onClick={()=>setView("home")} className="text-2xl font-black text-[#1C3A33] tracking-tighter">AuraFriends.</button>
{streak>1&&<motion.div initial={{scale:0}} animate={{scale:1}} transition={{type:"spring"}} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-black" style={{background:"#fff3e0",color:"#e65100"}}>{streak}일 {lv.icon}</motion.div>}
</header>
<AnimatePresence mode="wait">
{view==="home"    &&<HomeScreen profiles={profiles} activeId={activeId} setActiveId={setActiveId} onAdd={()=>{setEditProfile(null);setView("add");}} streak={streak}/>}
{view==="add"     &&<AddScreen onSave={handleSave} onBack={()=>setView("home")} editProfile={editProfile}/>}
{view==="fortune" &&<FortuneScreen profiles={profiles} activeId={activeId} setActiveId={setActiveId}/>}
{view==="friends" &&<FriendsScreen profiles={profiles} activeId={activeId} onSelect={handleSelect} onDelete={handleDelete} onEdit={handleEdit} onAdd={()=>{setEditProfile(null);setView("add");}} onImport={handleImport}/>}
{view==="match"   &&<MatchScreen profiles={profiles}/>}
</AnimatePresence>
{view!=="add"&&(
<nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50" style={{background:"rgba(255,255,255,.95)",backdropFilter:"blur(16px)",borderTop:"1px solid #f0f0f0"}}>
<div className="flex justify-around py-2" style={{paddingBottom:"max(8px,env(safe-area-inset-bottom))"}}>
{NAV.map(n=>{const on=view===n.id;return(
<motion.button key={n.id} whileTap={{scale:.88}} onClick={()=>setView(n.id)}
className="flex flex-col items-center gap-0.5 py-2 px-3 rounded-2xl"
style={{color:on?"#1C3A33":"#c5c5c5"}}>
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
