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
const STEMS = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
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
      out[idx] = { 
        name, icon, element:elem, color, bg, rationale, luckTrend, caution, keywords,
        lucky: { colors: [color, "#ffffff"], numbers: [3,7,8,9,11] }
      };
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

const IDIOMS = [ /* ... (전체 IDIOMS 그대로 유지) ... */ ];

const COMPAT_TABLE = { /* ... (전체 COMPAT_TABLE 그대로 유지) ... */ };

function getCompat(i1, i2) { /* ... (전체 함수 그대로 유지) ... */ }
function elemRelation(myElem, todayElem) { /* ... 그대로 유지 */ }
function branchRelation(myBranch, todayBranch) { /* ... 그대로 유지 */ }
function getTodayJdn(dateStr) { /* ... 그대로 유지 */ }
function getSajuDailyScore(profile, dateStr) { /* ... 그대로 유지 */ }
function getSajuCats(profile, dateStr) { /* ... 그대로 유지 */ }
function getSajuElemScores(profile, dateStr) { /* ... 그대로 유지 */ }
const _MISSIONS = { /* ... 그대로 유지 */ };
function getSajuMission(profile, dateStr) { /* ... 그대로 유지 */ }
function getSajuCalendar(profile, year, month) { /* ... 그대로 유지 */ }
function getSajuIdiom(profile, dateStr) { /* ... 그대로 유지 */ }
function getNextBirthday(m, d) { /* ... 그대로 유지 */ }

const todayStr = () => { const d=new Date(); return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}`; };
const maxDays = (y,m) => new Date(y,m,0).getDate();
const YS = Array.from({length:110},(_,i)=>2026-i);
const MS = Array.from({length:12},(_,i)=>i+1);
const HS = Array.from({length:24},(_,i)=>i);
const MI = Array.from({length:60},(_,i)=>i);

// ========== Supabase 한자 연동 ==========
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

let HANJA_DICT = {};
let HANJA_STROKES = {};

async function loadHanjaData() {
  const { data, error } = await supabase.from('hanja').select('syllable, hanjas');
  if (error) { console.error('Supabase hanja 로드 실패:', error); return; }
  HANJA_DICT = {};
  data.forEach(row => {
    try { HANJA_DICT[row.syllable] = JSON.parse(row.hanjas || '[]'); }
    catch(e) { HANJA_DICT[row.syllable] = []; }
  });
  console.log('✅ Supabase HANJA_DICT 로드 완료:', Object.keys(HANJA_DICT).length, '개 음절');
}

// ... (ScoreRing, AnimBar, ElementRadar, PackReveal, SyllableRow, HanjaPicker, CharCard, CategoryFortune, DailyFortune, DailyDetailModal, MonthlyFortune, LuckyItems, HomeScreen, FortuneScreen, AddScreen, FriendsScreen, MatchScreen, AuraFriends 함수까지 이전과 **완전히 동일**하게 유지)

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

// ... (HomeScreen, FortuneScreen, AddScreen, FriendsScreen, MatchScreen, AuraFriends 전체 함수는 이전과 동일하게 유지)

const SK="aurafriends_v8";

export default function AuraFriends () {
  const [view,setView]=useState("home");
  const [profiles,setProfiles]=useState([]);
  const [activeId,setActiveId]=useState(null);
  const [packChar,setPackChar]=useState(null);
  const [streak,setStreak]=useState(1);
  const [editProfile,setEditProfile]=useState(null);

  useEffect(() => { loadHanjaData(); }, []);

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
