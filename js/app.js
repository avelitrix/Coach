const $ = (s, r=document) => r.querySelector(s);
const $$ = (s, r=document) => [...r.querySelectorAll(s)];
const STORAGE_KEY = 'treinador_avelitrix_jogos_v2';

const state = {
  activeGame: null,
  selectedGameId: null,
  draft: emptyDraft('athlete'),
  trendMetric: 'saque',
  trendGranularity: 'mes',
  gameTrendMetric: 'pontos_vencidos'
};

function emptyDraft(server='athlete'){
  return {server, winner:null, ending:null, actor:null, stroke:null, place:null, target:null, moment:null, playType:null};
}
function val(v){ return v || 'nao_informado'; }

const labels = {
  athlete: 'Atleta', opponent: 'Adversário', nao_informado: 'Não informado',
  erro: 'Erro', winner: 'winner (bola vencedora)', passada: 'Passada (passou o voleador)', saque_direto: 'Ace', dupla_falta: 'Dupla falta', ponto_construido: 'Ponto construído',
  forehand: 'Forehand', backhand: 'Backhand', saque: 'Saque', devolucao: 'Devolução', voleio: 'Voleio', smash: 'Smash', corrida: 'Corrida', bola_alta: 'Bola alta',
  rede: 'Rede', fora_fundo: 'Fora fundo', fora_lado: 'Fora lado', corpo: 'Corpo', curta: 'Curta', outro: 'Outro',
  fundo: 'Fundo', cruzada: 'Cruzada', paralela: 'Paralela', lob: 'Lob', aberta: 'Aberta',
  normal: 'Normal', pressao: 'Pressão', break_point: 'Break point', game_point: 'Game point', tie_break: 'Tie-break', set_point: 'Set point', match_point: 'Match point',
  saque_mais_um: 'Saque +1', troca: 'Troca', defesa: 'Defesa'
};

const raw = String.raw;
const infoTexts = {
  jogos: {title:'Jogos registrados', html: raw`<p>Quantidade de partidas com registro dentro do período filtrado.</p><div class="formula">\(\text{Jogos registrados} = \sum 1\)</div><p>Leitura direta: quanto maior o número, maior a base de observação para interpretar tendências.</p>`},
  pontos: {title:'Pontos ligados ao atleta', html: raw`<p>Soma dos pontos em que o atleta aparece como vencedor, autor da jogada, autor do erro ou sacador.</p><div class="formula">\(\text{Pontos ligados ao atleta} = N(\text{winner atleta}) + N(\text{actor atleta}) + N(\text{server atleta})\)</div><p>É uma base operacional do app, usada como denominador em algumas métricas.</p>`},
  aproveitamento: {title:'Pontos vencidos', html: raw`<p>Mostra o quanto o jogador venceu em relação ao total de pontos com vencedor identificado.</p><div class="formula">\(\text{Pontos vencidos \%} = \frac{\text{Pontos vencidos}}{\text{Pontos com vencedor informado}} \times 100\)</div><p>Uso prático: oferece uma leitura rápida da competitividade geral do jogo ou do período.</p>`},
  errosAtleta: {title:'Pontos entregues por erro', html: raw`<p>Conta os pontos que o jogador cedeu por <strong>erro</strong> ou <strong>dupla falta</strong>.</p><div class="formula">\(\text{Erros \%} = \frac{\text{Erros + duplas faltas}}{\text{Pontos ligados ao jogador}} \times 100\)</div><p>Quanto menor esse valor, melhor. Ele ajuda a enxergar o custo de pontos dados ao adversário sem construção positiva.</p>`},
  saque: {title:'Pontos no saque', html: raw`<p>Percentual de pontos vencidos quando o jogador iniciou o ponto sacando.</p><div class="formula">\(\text{Aproveitamento no saque} = \frac{\text{Pontos vencidos sacando}}{\text{Total de pontos sacando}} \times 100\)</div><p>Leitura prática: indica o quanto o saque está sustentando o ponto, seja com vantagem inicial, seja com confirmação do game.</p>`},
  devolucao: {title:'Pontos na devolução', html: raw`<p>Percentual de pontos vencidos quando o adversário começou sacando.</p><div class="formula">\(\text{Aproveitamento na devolução} = \frac{\text{Pontos vencidos devolvendo}}{\text{Total de pontos devolvendo}} \times 100\)</div><p>Leitura prática: mostra a capacidade de incomodar o saque adversário e roubar pontos fora do próprio serviço.</p>`},
  pressao: {title:'Pontos de pressão', html: raw`<p>Reúne pontos marcados como <em>pressão</em>, <em>break point</em>, <em>game point</em>, <em>tie-break</em>, <em>set point</em> ou <em>match point</em>.</p><div class="formula">\(\text{Aproveitamento sob pressão} = \frac{\text{Pontos de pressão vencidos}}{\text{Total de pontos de pressão}} \times 100\)</div><p>Essa métrica ajuda a enxergar desempenho emocional e tomada de decisão em momentos sensíveis.</p>`},
  agressividade: {title:'Agressividade controlada', html: raw`<p>Índice sintético que tenta equilibrar iniciativa ofensiva com controle do erro.</p><div class="formula">\(\text{Agressividade controlada} \approx \frac{(1{,}4\times \text{pontos positivos}) - (0{,}8\times \text{erros}) + (0{,}2\times \text{pontos vencidos})}{\text{pontos ligados ao jogador}}\times 100\)</div><p><strong>Pontos positivos</strong> incluem <em>winner</em>, passada, ace e ponto construído. Quanto maior o índice, melhor a relação entre iniciativa e controle.</p>`},
  consistencia: {title:'Consistência', html: raw`<p>Índice que estima a capacidade de sustentar trocas e evitar entregar pontos.</p><div class="formula">\(\text{Consistência} = 100 - \left(\frac{\text{Erros}}{\text{Pontos ligados ao jogador}}\times 100\right)\)</div><p>Quanto maior, mais o jogo ficou limpo do ponto de vista de doação de erros.</p>`},
  construcao: {title:'Construção', html: raw`<p>Mede o peso de pontos em que o registro indicou <em>ponto construído</em> ou contexto de <em>troca</em>.</p><div class="formula">\(\text{Construção \%} = \frac{\text{Pontos construídos ou de troca}}{\text{Pontos ligados ao jogador}}\times 100\)</div><p>Ajuda a separar o jogador que apenas espera o erro daquele que realmente organiza o ponto antes de finalizar.</p>`},
  erroTecnico: {title:'Erro forçado e erro não forçado', html: raw`<p><strong>Erro forçado</strong> é o erro provocado por pressão real do adversário: bola difícil, corrida, defesa, aperto de tempo ou ação que empurra o jogador para fora do conforto.</p><p><strong>Erro não forçado</strong> é o erro cometido em situação relativamente controlada, quando o jogador ainda tinha condições razoáveis de manter a bola em jogo ou escolher melhor.</p><div class="formula">\(\text{Erro forçado estimado \%} = \frac{\text{Erros marcados em contexto de pressão/defesa/corrida}}{\text{Erros totais do lado}}\times 100\)</div><div class="formula">\(\text{Erro não forçado estimado \%} = \frac{\text{Erros marcados fora desse contexto}}{\text{Erros totais do lado}}\times 100\)</div><p>Neste módulo, a classificação é <strong>estimada pelo contexto registrado</strong>. Ela não substitui uma revisão técnica posterior do treinador.</p>`},
  comp_pontos_vencidos: {title:'Pontos vencidos', html: raw`<p>Compara quantos pontos cada lado venceu.</p><div class="formula">\(\text{Pontos vencidos \%} = \frac{\text{Pontos vencidos do lado}}{\text{Pontos com vencedor informado}}\times 100\)</div><p>É a leitura mais direta do domínio do jogo.</p>`},
  comp_pontos_saque: {title:'Pontos no saque', html: raw`<p>Compara o rendimento de cada lado nos próprios games de saque.</p><div class="formula">\(\text{Aproveitamento no saque} = \frac{\text{Pontos vencidos sacando}}{\text{Total de pontos sacando}}\times 100\)</div><p>No tênis, costuma ser um eixo central de controle da partida.</p>`},
  comp_pontos_devolucao: {title:'Pontos na devolução', html: raw`<p>Compara o rendimento de cada lado quando está devolvendo.</p><div class="formula">\(\text{Aproveitamento na devolução} = \frac{\text{Pontos vencidos devolvendo}}{\text{Total de pontos devolvendo}}\times 100\)</div><p>Ajuda a enxergar a pressão sobre o saque adversário.</p>`},
  comp_pontos_pressao: {title:'Pontos de pressão', html: raw`<p>Compara o desempenho de cada lado nos pontos de maior peso mental.</p><div class="formula">\(\text{Aproveitamento sob pressão} = \frac{\text{Pontos de pressão vencidos}}{\text{Total de pontos de pressão}}\times 100\)</div><p>Importante para leitura de maturidade competitiva.</p>`},
  comp_pontos_positivos: {title:'Pontos positivos', html: raw`<p>Reúne os pontos vencidos por ações ofensivas registradas: <em>winner</em>, passada, ace e ponto construído.</p><div class="formula">\(\text{Pontos positivos \%} = \frac{\text{winner + passada + ace + ponto construído}}{\text{Pontos ligados ao lado}}\times 100\)</div><p>Quanto maior, maior o protagonismo do lado na produção do ponto.</p>`},
  comp_pontos_erro: {title:'Erros', html: raw`<p>Conta os pontos cedidos por erro ou dupla falta.</p><div class="formula">\(\text{Erros \%} = \frac{\text{Erros + duplas faltas}}{\text{Pontos ligados ao lado}}\times 100\)</div><p>Referência orientada por <strong>valor baixo</strong>.</p>`},
  comp_erro_forcado: {title:'Erros forçados', html: raw`<p>Estimativa da parcela de erros gerada sob pressão real.</p><div class="formula">\(\text{Erros forçados estimados \%} = \frac{\text{Erros em contexto de defesa/corrida/pressão}}{\text{Erros totais do lado}}\times 100\)</div><p>Serve como pista do quanto o adversário empurrou o jogador para errar.</p>`},
  comp_erro_nao_forcado: {title:'Erros não forçados', html: raw`<p>Estimativa da parcela de erros cometida em situação mais controlada.</p><div class="formula">\(\text{Erros não forçados estimados \%} = \frac{\text{Erros fora do contexto de pressão}}{\text{Erros totais do lado}}\times 100\)</div><p>Em regra, valores menores são desejáveis.</p>`},
  comp_agressividade: {title:'Agressividade controlada', html: raw`<p>Índice de iniciativa com controle.</p><div class="formula">\(\text{Agressividade controlada} \approx \frac{(1{,}4\times \text{pontos positivos}) - (0{,}8\times \text{erros}) + (0{,}2\times \text{pontos vencidos})}{\text{pontos ligados ao lado}}\times 100\)</div><p>Ajuda a distinguir atacar com propósito de apenas acelerar sem critério.</p>`},
  comp_consistencia: {title:'Consistência', html: raw`<p>Índice de solidez.</p><div class="formula">\(\text{Consistência} = 100 - \left(\frac{\text{Erros}}{\text{Pontos ligados ao lado}}\times 100\right)\)</div><p>Quanto maior, menor a taxa de doação de pontos.</p>`},
  comp_construcao: {title:'Construção', html: raw`<p>Peso de pontos construídos ou de troca longa no conjunto do lado analisado.</p><div class="formula">\(\text{Construção \%} = \frac{\text{Pontos construídos/troca}}{\text{Pontos ligados ao lado}}\times 100\)</div><p>Reforça a leitura de organização do ponto.</p>`},
  comp_dupla_falta: {title:'Duplas faltas', html: raw`<p>Percentual de pontos cedidos em dupla falta.</p><div class="formula">\(\text{Duplas faltas \%} = \frac{\text{Duplas faltas}}{\text{Pontos ligados ao lado}}\times 100\)</div><p>É uma métrica clássica de custo no saque. Quanto menor, melhor.</p>`},
  comp_saque_direto: {title:'Aces', html: raw`<p>Percentual de pontos resolvidos diretamente no saque, sem devolução efetiva do adversário.</p><div class="formula">\(\text{Aces \%} = \frac{\text{Aces}}{\text{Pontos ligados ao lado}}\times 100\)</div><p>No comparativo, valores maiores indicam mais dano imediato com o serviço.</p>`}
};

const cosatBenchmarks = {
  saque: 62,
  devolucao: 42,
  pressao: 58,
  agressividade: 38,
  consistencia: 74,
  construcao: 24,
  pontos_vencidos: 55,
  pontos_positivos: 22,
  pontos_erro: 18,
  duplas_faltas: 4,
  saques_diretos: 6,
  erros_forcados: 10,
  erros_nao_forcados: 14
};

const trendMetricDefs = {
  saque: { label: 'pontos no saque', info:'saque', benchmark: cosatBenchmarks.saque, get: a => ({pct: pct(a.serveWon, a.serveTotal), display: absPct(a.serveWon, a.serveTotal)}) },
  devolucao: { label: 'pontos na devolução', info:'devolucao', benchmark: cosatBenchmarks.devolucao, get: a => ({pct: pct(a.returnWon, a.returnTotal), display: absPct(a.returnWon, a.returnTotal)}) },
  pressao: { label: 'pontos de pressão', info:'pressao', benchmark: cosatBenchmarks.pressao, get: a => ({pct: pct(a.pressureWon, a.pressureCount), display: absPct(a.pressureWon, a.pressureCount)}) },
  agressividade: { label: 'agressividade controlada', info:'agressividade', benchmark: cosatBenchmarks.agressividade, get: a => ({pct: a.aggression, display: `${a.aggression} (${a.aggression}%)`}) },
  consistencia: { label: 'consistência', info:'consistencia', benchmark: cosatBenchmarks.consistencia, get: a => ({pct: a.consistency, display: `${a.consistency} (${a.consistency}%)`}) },
  construcao: { label: 'construção', info:'construcao', benchmark: cosatBenchmarks.construcao, get: a => ({pct: pct(a.constructionCount, a.athleteRelated.length), display: absPct(a.constructionCount, a.athleteRelated.length)}) }
};

const comparisonMetricDefs = {
  pontos_vencidos: { label:'Pontos vencidos', info:'comp_pontos_vencidos', benchmark:55, ref:'≥ 55%', refSub:'Meta COSAT U14', player:a=>metricObj(a.won, pct(a.won, a.knownWinnerPoints.length)), opp:a=>metricObj(a.lost, pct(a.lost, a.knownWinnerPoints.length)) },
  saque: { label:'Pontos no saque', info:'comp_pontos_saque', benchmark:62, ref:'≥ 62%', refSub:'Meta COSAT U14', player:a=>metricObj(a.serveWon, pct(a.serveWon, a.serveTotal)), opp:a=>metricObj(a.returnLost, pct(a.returnLost, a.returnTotal)) },
  devolucao: { label:'Pontos na devolução', info:'comp_pontos_devolucao', benchmark:42, ref:'≥ 42%', refSub:'Meta COSAT U14', player:a=>metricObj(a.returnWon, pct(a.returnWon, a.returnTotal)), opp:a=>metricObj(a.serveLost, pct(a.serveLost, a.serveTotal)) },
  pressao: { label:'Pontos de pressão', info:'comp_pontos_pressao', benchmark:58, ref:'≥ 58%', refSub:'Meta COSAT U14', player:a=>metricObj(a.pressureWon, pct(a.pressureWon, a.pressureCount)), opp:a=>metricObj(a.pressureLost, pct(a.pressureLost, a.pressureCount)) },
  pontos_positivos: { label:'Pontos positivos', info:'comp_pontos_positivos', benchmark:22, ref:'≥ 22%', refSub:'Meta COSAT U14', player:a=>metricObj(a.positiveAthlete.length, pct(a.positiveAthlete.length, a.athleteRelated.length)), opp:a=>metricObj(a.positiveOpponent.length, pct(a.positiveOpponent.length, a.opponentRelated.length)) },
  pontos_erro: { label:'Erros', info:'comp_pontos_erro', benchmark:18, ref:'≤ 18%', refSub:'Quanto menor, melhor', player:a=>metricObj(a.athleteErrors.length, pct(a.athleteErrors.length, a.athleteRelated.length || a.total)), opp:a=>metricObj(a.opponentErrors.length, pct(a.opponentErrors.length, a.opponentRelated.length || a.total)) },
  erros_forcados: { label:'Erros forçados', info:'comp_erro_forcado', benchmark:10, ref:'≤ 10%', refSub:'Faixa de controle', player:a=>metricObj(a.athleteForcedErrors.length, pct(a.athleteForcedErrors.length, a.athleteErrors.length)), opp:a=>metricObj(a.opponentForcedErrors.length, pct(a.opponentForcedErrors.length, a.opponentErrors.length)) },
  erros_nao_forcados: { label:'Erros não forçados', info:'comp_erro_nao_forcado', benchmark:14, ref:'≤ 14%', refSub:'Quanto menor, melhor', player:a=>metricObj(a.athleteUnforcedErrors.length, pct(a.athleteUnforcedErrors.length, a.athleteErrors.length)), opp:a=>metricObj(a.opponentUnforcedErrors.length, pct(a.opponentUnforcedErrors.length, a.opponentErrors.length)) },
  agressividade: { label:'Agressividade controlada', info:'comp_agressividade', benchmark:38, ref:'≥ 38%', refSub:'Meta COSAT U14', player:a=>metricObj(a.aggression, a.aggression), opp:a=>metricObj(a.aggressionOpp, a.aggressionOpp) },
  consistencia: { label:'Consistência', info:'comp_consistencia', benchmark:74, ref:'≥ 74%', refSub:'Meta COSAT U14', player:a=>metricObj(a.consistency, a.consistency), opp:a=>metricObj(a.consistencyOpp, a.consistencyOpp) },
  construcao: { label:'Construção', info:'comp_construcao', benchmark:24, ref:'≥ 24%', refSub:'Meta COSAT U14', player:a=>metricObj(a.constructionCount, pct(a.constructionCount, a.athleteRelated.length)), opp:a=>metricObj(a.constructionOppCount, pct(a.constructionOppCount, a.opponentRelated.length)) },
  dupla_falta: { label:'Duplas faltas', info:'comp_dupla_falta', benchmark:4, ref:'≤ 4%', refSub:'Quanto menor, melhor', player:a=>metricObj(a.athleteDoubleFaults.length, pct(a.athleteDoubleFaults.length, a.athleteRelated.length)), opp:a=>metricObj(a.opponentDoubleFaults.length, pct(a.opponentDoubleFaults.length, a.opponentRelated.length)) },
  aces: { label:'Aces', info:'comp_saque_direto', benchmark:6, ref:'≥ 6%', refSub:'Meta COSAT U14', player:a=>metricObj(a.athleteAces.length, pct(a.athleteAces.length, a.athleteRelated.length)), opp:a=>metricObj(a.opponentAces.length, pct(a.opponentAces.length, a.opponentRelated.length)) }
};

function metricObj(count,pctValue){ return {count, pct:pctValue, display:`${count} (${pctValue}%)`}; }
function todayISO(){ return new Date().toISOString().slice(0,10); }
function nowHM(){ return new Date().toTimeString().slice(0,5); }
function localDateISO(d=new Date()){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function localTimeHMS(d=new Date()){
  return d.toTimeString().slice(0,8);
}
function localDateTimeISO(d=new Date()){
  const offset = -d.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const hh = String(Math.floor(Math.abs(offset)/60)).padStart(2,'0');
  const mm = String(Math.abs(offset)%60).padStart(2,'0');
  return `${localDateISO(d)}T${localTimeHMS(d)}${sign}${hh}:${mm}`;
}
function uid(){ return 'jg_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2,7); }
function escapeHtml(v){ return String(v ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function loadGames(){ try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } }
function saveGames(games){ localStorage.setItem(STORAGE_KEY, JSON.stringify(games)); }
function download(name, data, type='application/json'){
  const blob = new Blob([data], {type});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}
function pct(n,d){ return d ? Math.round((n/d)*100) : 0; }
function absPct(n,d){ return `${n} (${pct(n,d)}%)`; }
function countBy(arr, key){ return arr.reduce((m,x) => { const k = typeof key === 'function' ? key(x) : x[key]; m[k] = (m[k] || 0) + 1; return m; }, {}); }
function parseISODate(d){ if(!d) return null; const [y,m,day] = d.split('-').map(Number); return (y && m && day) ? new Date(y,m-1,day) : null; }
function formatShortDate(d){ const dt = parseISODate(d); return dt ? `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}` : d; }

function showScreen(name){
  $$('.screen').forEach(s => s.classList.remove('active'));
  $('#' + name + 'Screen').classList.add('active');
  $('#homeBtn').classList.toggle('hidden', name === 'home');
  if(name === 'home') renderPanel();
  window.scrollTo({top:0, behavior:'smooth'});
}

function monthDefaults(){ const t=todayISO(); $('#periodEnd').value=t; $('#periodStart').value=t.slice(0,8)+'01'; }

function newGame(){
  state.activeGame = { id: uid(), date: todayISO(), startTime: nowHM(), endTime:'', opponent:'Adversário', tournament:'', generalNote:'', points:[], createdAt:new Date().toISOString(), updatedAt:new Date().toISOString(), closed:false };
  state.draft = emptyDraft('athlete');
  renderChoices(); renderScore(); showScreen('register'); openMetaDialog(false);
}

function openMetaDialog(forceEnd){
  const g=state.activeGame; if(!g) return;
  $('#matchDate').value=g.date||todayISO(); $('#matchStart').value=g.startTime||nowHM(); $('#matchEnd').value=forceEnd?nowHM():(g.endTime||'');
  $('#matchOpponent').value=g.opponent==='Adversário'?'':(g.opponent||''); $('#matchTournament').value=g.tournament||''; $('#matchGeneralNote').value=g.generalNote||'';
  $('#matchMetaDialog').showModal();
}
function saveMeta(){
  const g=state.activeGame; if(!g) return;
  g.date=$('#matchDate').value||todayISO(); g.startTime=$('#matchStart').value||g.startTime||nowHM(); g.endTime=$('#matchEnd').value||g.endTime||'';
  g.opponent=$('#matchOpponent').value.trim()||'Adversário'; g.tournament=$('#matchTournament').value.trim(); g.generalNote=$('#matchGeneralNote').value.trim();
  if(g.endTime) g.closed=true; persistActiveGame(); $('#matchMetaDialog').close();
}
function saveMetaAndContinue(){ saveMeta(); if(state.activeGame){ state.activeGame.closed=false; state.activeGame.endTime=''; persistActiveGame(); } showScreen('register'); }
function persistActiveGame(){ const g=state.activeGame; if(!g) return; g.updatedAt=new Date().toISOString(); const games=loadGames(); const idx=games.findIndex(x=>x.id===g.id); if(idx>=0) games[idx]=g; else games.push(g); saveGames(games); }

function tennisPointLabel(score){
  const a=score.pointIndex.athlete, o=score.pointIndex.opponent;
  if(a>=3 && o>=3){ if(a===o) return {athlete:'40', opponent:'40'}; if(a===o+1) return {athlete:'AD', opponent:'40'}; if(o===a+1) return {athlete:'40', opponent:'AD'}; }
  const map=['0','15','30','40']; return {athlete:map[Math.min(a,3)], opponent:map[Math.min(o,3)]};
}
function recalcScore(points){
  const score={sets:{athlete:0,opponent:0},games:{athlete:0,opponent:0},totalGames:{athlete:0,opponent:0},pointIndex:{athlete:0,opponent:0},scoredPoints:{athlete:0,opponent:0}};
  for(const p of points){
    if(!['athlete','opponent'].includes(p.winner)) continue;
    score.scoredPoints[p.winner]+=1; score.pointIndex[p.winner]+=1;
    const a=score.pointIndex.athlete, o=score.pointIndex.opponent;
    if((a>=4||o>=4)&&Math.abs(a-o)>=2){
      const gw=a>o?'athlete':'opponent'; score.games[gw]+=1; score.totalGames[gw]+=1; score.pointIndex={athlete:0,opponent:0};
      const ga=score.games.athlete, go=score.games.opponent;
      if(((ga>=6||go>=6)&&Math.abs(ga-go)>=2)||ga===7||go===7){ const sw=ga>go?'athlete':'opponent'; score.sets[sw]+=1; score.games={athlete:0,opponent:0}; }
    }
  }
  return score;
}
function renderScore(){
  const g=state.activeGame; const score=recalcScore(g?.points||[]); const pl=tennisPointLabel(score);
  $('#compactPointScore').textContent=`Pontos: ${pl.athlete}–${pl.opponent}`; $('#compactGameScore').textContent=`Games: ${score.games.athlete}–${score.games.opponent}`; $('#compactSetScore').textContent=`Set: ${score.sets.athlete}–${score.sets.opponent}`; $('#compactServer').textContent=`Saca: ${labels[state.draft.server]}`; $('#compactOpponent').textContent=g?`vs ${g.opponent||'Adversário'}`:'Adversário';
}
function renderChoices(){ $$('.choice').forEach(btn=>btn.classList.toggle('selected', state.draft[btn.dataset.field]===btn.dataset.value)); const isError=state.draft.ending==='erro'||state.draft.ending==='dupla_falta'||!state.draft.ending; $$('.error-only').forEach(el=>el.classList.toggle('hidden',!isError)); $$('.not-error-only').forEach(el=>el.classList.toggle('hidden',isError)); renderScore(); }
function handleChoice(btn){ state.draft[btn.dataset.field]=btn.dataset.value; renderChoices(); }
function savePoint(e){
  e.preventDefault();
  if(!state.activeGame) newGame();
  const filled = {...state.draft};
  const savedAt = new Date();
  const p = {
    id: uid(),
    order: state.activeGame.points.length + 1,

    // Instante real do registro do ponto.
    // createdAt fica em UTC para ordenação e integração futura.
    createdAt: savedAt.toISOString(),
    savedAt: savedAt.toISOString(),

    // Campos locais explícitos para leitura humana e análise da dinâmica do jogo.
    savedAtLocal: localDateTimeISO(savedAt),
    savedDate: localDateISO(savedAt),
    savedTime: localTimeHMS(savedAt),
    savedTimestampMs: savedAt.getTime(),

    // Cópia da data do jogo, para cruzar ponto x partida mesmo em jogos registrados depois.
    matchDate: state.activeGame.date || localDateISO(savedAt),

    server: filled.server || 'athlete',
    winner: val(filled.winner),
    ending: val(filled.ending),
    actor: val(filled.actor),
    stroke: val(filled.stroke),
    place: val(filled.place),
    target: val(filled.target),
    moment: val(filled.moment),
    playType: val(filled.playType),
    note: $('#pointNote').value.trim()
  };

  state.activeGame.points.push(p);
  state.activeGame.lastPointSavedAt = p.savedAt;
  state.activeGame.lastPointSavedAtLocal = p.savedAtLocal;
  state.activeGame.lastPointSavedTimestampMs = p.savedTimestampMs;

  state.draft = emptyDraft(p.server || 'athlete');
  $('#pointNote').value = '';
  persistActiveGame();
  renderChoices();
}
function undoPoint(){ if(state.activeGame?.points?.length){ state.activeGame.points.pop(); persistActiveGame(); renderScore(); } }
function inPeriod(game){ const s=$('#periodStart').value, e=$('#periodEnd').value; return (!s||game.date>=s)&&(!e||game.date<=e); }
function isPressure(p){ return ['pressao','break_point','game_point','tie_break','set_point','match_point'].includes(p.moment)||p.playType==='pressao'; }

function analyze(games){
  const points=games.flatMap(g=>(g.points||[]).map(p=>({...p,gameId:g.id,gameDate:g.date})));
  const total=points.length;
  const knownWinnerPoints=points.filter(p=>['athlete','opponent'].includes(p.winner));
  const won=knownWinnerPoints.filter(p=>p.winner==='athlete').length;
  const lost=knownWinnerPoints.filter(p=>p.winner==='opponent').length;
  const athleteRelated=points.filter(p=>p.winner==='athlete'||p.actor==='athlete'||p.server==='athlete');
  const opponentRelated=points.filter(p=>p.winner==='opponent'||p.actor==='opponent'||p.server==='opponent');
  const athleteErrors=points.filter(p=>(p.ending==='erro'||p.ending==='dupla_falta')&&p.actor==='athlete');
  const opponentErrors=points.filter(p=>(p.ending==='erro'||p.ending==='dupla_falta')&&p.actor==='opponent');
  const positiveAthlete=points.filter(p=>p.actor==='athlete'&&['winner','passada','saque_direto','ponto_construido'].includes(p.ending));
  const positiveOpponent=points.filter(p=>p.actor==='opponent'&&['winner','passada','saque_direto','ponto_construido'].includes(p.ending));
  const athleteEndings=points.filter(p=>p.actor==='athlete'||p.winner==='athlete');
  const opponentEndings=points.filter(p=>p.actor==='opponent'||p.winner==='opponent');
  const serve=points.filter(p=>p.server==='athlete'&&['athlete','opponent'].includes(p.winner));
  const ret=points.filter(p=>p.server==='opponent'&&['athlete','opponent'].includes(p.winner));
  const pressure=points.filter(p=>isPressure(p)&&['athlete','opponent'].includes(p.winner));
  const pressureWon=pressure.filter(p=>p.winner==='athlete').length;
  const construction=points.filter(p=>p.actor==='athlete'&&(p.ending==='ponto_construido'||p.playType==='troca'));
  const constructionOpp=points.filter(p=>p.actor==='opponent'&&(p.ending==='ponto_construido'||p.playType==='troca'));
  const athleteDoubleFaults=points.filter(p=>p.ending==='dupla_falta'&&p.actor==='athlete');
  const opponentDoubleFaults=points.filter(p=>p.ending==='dupla_falta'&&p.actor==='opponent');
  const athleteAces=points.filter(p=>p.ending==='saque_direto'&&p.actor==='athlete');
  const opponentAces=points.filter(p=>p.ending==='saque_direto'&&p.actor==='opponent');
  const athleteForcedErrors=athleteErrors.filter(p=>['defesa','corrida'].includes(p.playType)||p.stroke==='corrida');
  const athleteUnforcedErrors=athleteErrors.filter(p=>!(['defesa','corrida'].includes(p.playType)||p.stroke==='corrida'));
  const opponentForcedErrors=opponentErrors.filter(p=>['defesa','corrida'].includes(p.playType)||p.stroke==='corrida');
  const opponentUnforcedErrors=opponentErrors.filter(p=>!(['defesa','corrida'].includes(p.playType)||p.stroke==='corrida'));
  const consistency=athleteRelated.length ? Math.max(0, Math.round(100 - athleteErrors.length/athleteRelated.length*100)) : 0;
  const aggression=athleteRelated.length ? Math.max(0, Math.min(100, Math.round((positiveAthlete.length*1.4 - athleteErrors.length*.8 + won*.2) / athleteRelated.length * 100))) : 0;
  const consistencyOpp=opponentRelated.length ? Math.max(0, Math.round(100 - opponentErrors.length/opponentRelated.length*100)) : 0;
  const aggressionOpp=opponentRelated.length ? Math.max(0, Math.min(100, Math.round((positiveOpponent.length*1.4 - opponentErrors.length*.8 + lost*.2) / opponentRelated.length * 100))) : 0;
  return { games, points, total, knownWinnerPoints, won, lost, winPct:pct(won, knownWinnerPoints.length), athleteRelated, opponentRelated, athleteErrors, opponentErrors, positiveAthlete, positiveOpponent, athleteEndings, opponentEndings,
    serveWon:serve.filter(p=>p.winner==='athlete').length, serveLost:serve.filter(p=>p.winner==='opponent').length, serveTotal:serve.length,
    returnWon:ret.filter(p=>p.winner==='athlete').length, returnLost:ret.filter(p=>p.winner==='opponent').length, returnTotal:ret.length,
    pressureWon, pressureLost: pressure.length-pressureWon, pressureCount: pressure.length,
    consistency, aggression, consistencyOpp, aggressionOpp, constructionCount:construction.length, constructionOppCount:constructionOpp.length,
    athleteDoubleFaults, opponentDoubleFaults, athleteAces, opponentAces, athleteForcedErrors, athleteUnforcedErrors, opponentForcedErrors, opponentUnforcedErrors };
}

function metricCard(value,label,infoKey,trendKey){ return `<article class="metric-card ${trendKey?'clickable':''} ${state.trendMetric===trendKey?'active':''}" ${trendKey?`data-trend="${escapeHtml(trendKey)}"`:''}><button class="info-btn" data-info="${escapeHtml(infoKey)}" type="button">i</button><b>${escapeHtml(value)}</b><span>${escapeHtml(label)}</span></article>`; }
function renderMetricCards(target,cards){ target.innerHTML=cards.map(c=>metricCard(c.value,c.label,c.info,c.trend)).join(''); bindInfoButtons(target); bindTrendCards(target); }
function renderBars(target,data,denominator=null){ const entries=Object.entries(data).filter(([k,v])=>k&&v>0).sort((a,b)=>b[1]-a[1]); const max=Math.max(1,...entries.map(([,v])=>v)); const total=denominator ?? entries.reduce((s,[,v])=>s+v,0); target.innerHTML=entries.length?entries.map(([k,v])=>`<div class="bar-row"><span>${escapeHtml(labels[k]||k)}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.max(4, v/max*100)}%"></div></div><b>${v} (${pct(v,total)}%)</b></div>`).join(''):'<p class="muted">Sem dados suficientes.</p>'; }
function bindInfoButtons(root=document){ $$('.info-btn',root).forEach(btn=>btn.onclick=(e)=>{ e.stopPropagation(); showInfo(btn.dataset.info); }); }
function bindComparisonInfo(root=document){ $$('.comparison-info',root).forEach(btn=>btn.onclick=(e)=>{ e.stopPropagation(); showInfo(btn.dataset.info); }); }
function bindTrendCards(root=document){ $$('[data-trend]',root).forEach(card=>card.onclick=(e)=>{ if(e.target.closest('.info-btn')) return; state.trendMetric=card.dataset.trend; renderPanel(); }); }
function showInfo(key){ const item=infoTexts[key] || {title:'Informação', html:'<p>Explicação ainda não cadastrada.</p>'}; $('#infoTitle').textContent=item.title; $('#infoText').innerHTML=item.html; $('#infoDialog').showModal(); if(window.MathJax?.typesetPromise){ window.MathJax.typesetPromise([$('#infoText')]).catch(()=>{}); } }

function renderRadar(target,a){
  const vals=[a.winPct,a.consistency,a.aggression,pct(a.serveWon,a.serveTotal),pct(a.returnWon,a.returnTotal),pct(a.pressureWon,a.pressureCount)];
  const names=['Pontos','Consist.','Agress.','Saque','Devol.','Pressão']; const cx=150, cy=130, R=92;
  const poly=vals.map((v,i)=>{ const ang=(-90+i*360/vals.length)*Math.PI/180; const r=R*v/100; return `${cx+Math.cos(ang)*r},${cy+Math.sin(ang)*r}`; }).join(' ');
  const axes=names.map((n,i)=>{ const ang=(-90+i*360/names.length)*Math.PI/180; const x=cx+Math.cos(ang)*R, y=cy+Math.sin(ang)*R; const tx=cx+Math.cos(ang)*(R+31), ty=cy+Math.sin(ang)*(R+31); return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="rgba(255,255,255,.2)"/><text x="${tx}" y="${ty}" text-anchor="middle" fill="#9fb5c8" font-size="10">${n}</text>`; }).join('');
  target.innerHTML=`<svg viewBox="0 0 300 275" role="img" aria-label="Radar técnico"><polygon points="${poly}" fill="rgba(97,213,255,.28)" stroke="#61d5ff" stroke-width="3"/>${[.25,.5,.75,1].map(f=>`<circle cx="${cx}" cy="${cy}" r="${R*f}" fill="none" stroke="rgba(255,255,255,.12)"/>`).join('')}${axes}</svg>`;
}

function simplePhrase(a){ if(!a.total) return 'Ainda não há pontos suficientes. Registre alguns pontos para o Avelitrix começar a enxergar padrões.'; const worstStroke=Object.entries(countBy(a.athleteErrors,'stroke')).sort((x,y)=>y[1]-x[1])[0]; const best=Object.entries(countBy(a.positiveAthlete,'ending')).sort((x,y)=>y[1]-x[1])[0]; const good=a.winPct>=55?'Você venceu mais pontos do que perdeu.':'O placar de pontos ainda mostra mais coisa para corrigir.'; const problem=worstStroke?`O principal vazamento apareceu no ${labels[worstStroke[0]]||worstStroke[0]}.`:'Você não entregou muitos pontos por erro registrado.'; const weapon=best?`Sua melhor fonte positiva foi ${labels[best[0]]||best[0]}.`:'Ainda falta aparecer uma arma clara de pontos positivos.'; return `${good} ${weapon} ${problem}`; }

function coachNotes(a){ const worstStroke=Object.entries(countBy(a.athleteErrors,'stroke')).sort((x,y)=>y[1]-x[1])[0]; const worstPlace=Object.entries(countBy(a.athleteErrors,'place')).sort((x,y)=>y[1]-x[1])[0]; return [ {title:'Saque', text:a.total?`${pct(a.serveWon,a.serveTotal)}% dos pontos vencidos quando o atleta sacou.`:'Sem dados de saque.'}, {title:'Devolução', text:a.total?`${pct(a.returnWon,a.returnTotal)}% dos pontos vencidos quando o adversário sacou.`:'Sem dados de devolução.'}, {title:'Pressão', text:a.pressureCount?`${pct(a.pressureWon,a.pressureCount)}% de aproveitamento em ${a.pressureCount} ponto(s) de pressão.`:'Poucos pontos marcados como pressão.'}, {title:'Erro mais caro', text:worstStroke?`${labels[worstStroke[0]]} concentrou ${worstStroke[1]} erro(s) do atleta.`:'Nenhum padrão forte de erro do atleta.'}, {title:'Lugar do erro', text:worstPlace?`${labels[worstPlace[0]]} apareceu ${worstPlace[1]} vez(es).`:'Sem local dominante de erro.'}, {title:'Erro forçado/não forçado', text:`${a.athleteForcedErrors.length} possível(is) erro(s) forçado(s) e ${a.athleteUnforcedErrors.length} possível(is) erro(s) não forçado(s), estimados pelo contexto registrado.`, info:'erroTecnico'} ]; }
function opponentNotes(a){ const worstStroke=Object.entries(countBy(a.opponentErrors,'stroke')).sort((x,y)=>y[1]-x[1])[0]; const worstPlace=Object.entries(countBy(a.opponentErrors,'place')).sort((x,y)=>y[1]-x[1])[0]; return [ {title:'Saque', text:a.total?`${pct(a.serveLost,a.serveTotal)}% dos pontos vencidos quando o adversário sacou.`:'Sem dados de saque do adversário.'}, {title:'Devolução', text:a.total?`${pct(a.returnLost,a.returnTotal)}% dos pontos vencidos quando o adversário devolveu.`:'Sem dados de devolução do adversário.'}, {title:'Pressão', text:a.pressureCount?`${pct(a.pressureLost,a.pressureCount)}% de aproveitamento do adversário em ${a.pressureCount} ponto(s) de pressão.`:'Poucos pontos marcados como pressão.'}, {title:'Erro mais caro', text:worstStroke?`${labels[worstStroke[0]]} concentrou ${worstStroke[1]} erro(s) do adversário.`:'Nenhum padrão forte de erro do adversário.'}, {title:'Lugar do erro', text:worstPlace?`${labels[worstPlace[0]]} apareceu ${worstPlace[1]} vez(es) no adversário.`:'Sem local dominante de erro do adversário.'}, {title:'Erro forçado/não forçado', text:`${a.opponentForcedErrors.length} possível(is) erro(s) forçado(s) e ${a.opponentUnforcedErrors.length} possível(is) erro(s) não forçado(s), estimados pelo contexto registrado.`, info:'erroTecnico'} ]; }
function renderCoachNotes(target,a,mode='player'){ const notes=mode==='opponent'?opponentNotes(a):coachNotes(a); target.innerHTML=notes.map(note=>`<div class="coach-note">${note.info?`<button class="info-btn note-info-btn" data-info="${escapeHtml(note.info)}" type="button">i</button>`:''}<strong>${escapeHtml(note.title)}</strong><p>${escapeHtml(note.text)}</p></div>`).join(''); bindInfoButtons(target); }

function periodKey(dateStr,granularity){ const dt=parseISODate(dateStr); if(!dt) return 'sem_data'; const y=dt.getFullYear(); const m=dt.getMonth()+1; if(granularity==='ano') return `${y}`; if(granularity==='semestre') return `${y}-S${m<=6?1:2}`; return `${y}-${String(m).padStart(2,'0')}`; }
function periodLabel(key,granularity){ if(granularity==='ano') return key; if(granularity==='semestre'){ const [y,s]=key.split('-'); return `${y} ${s.replace('S','Sem.')}`; } const [y,m]=key.split('-'); return `${m}/${y}`; }
function sortPeriodKeys(keys,granularity){ return [...keys].sort((a,b)=>{ if(granularity==='ano'||granularity==='mes') return a.localeCompare(b); const [ya,sa]=a.split('-S').map(Number), [yb,sb]=b.split('-S').map(Number); return ya-yb || sa-sb; }); }
function trendSeries(games){ const def=trendMetricDefs[state.trendMetric]||trendMetricDefs.saque; const grouped={}; games.forEach(g=>{ const key=periodKey(g.date,state.trendGranularity); grouped[key] ||= []; grouped[key].push(g); }); return sortPeriodKeys(Object.keys(grouped),state.trendGranularity).map(key=>{ const a=analyze(grouped[key]); const metric=def.get(a); return {key, label:periodLabel(key,state.trendGranularity), value:metric.pct, display:metric.display}; }); }
function renderTrendChart(target,games){ const def=trendMetricDefs[state.trendMetric]||trendMetricDefs.saque; const series=trendSeries(games); $('#trendTitle').textContent=`Evolução: ${def.label}`; $('#trendSubtitle').textContent=`Sequência temporal por ${state.trendGranularity}. Linha tracejada = referência editável de jogador competitivo COSAT U14 (${def.benchmark}%).`; $$('.seg-btn').forEach(btn=>btn.classList.toggle('selected', btn.dataset.granularity===state.trendGranularity)); if(!series.length){ target.innerHTML='<p class="line-chart-empty">Sem dados suficientes para montar a evolução do índice no período selecionado.</p>'; return; } renderLineChart(target, {title:def.label, benchmark:def.benchmark, pointsA:series.map(s=>({label:s.label, value:s.value, display:s.display})), colorA:'#61d5ff', nameA:'Jogador'}); }

function renderLineChart(target, cfg){
  const pointsA = cfg.pointsA || [];
  const pointsB = cfg.pointsB || [];
  const pointCount = Math.max(pointsA.length, pointsB.length);
  if(!pointCount){ target.innerHTML='<p class="line-chart-empty">Sem dados suficientes.</p>'; return; }
  const W=920,H=290,m={top:28,right:28,bottom:46,left:48}; const innerW=W-m.left-m.right, innerH=H-m.top-m.bottom, maxVal=100;
  const yTicks=[0,25,50,75,100];
  const coords = arr => arr.map((s,i)=>({ ...s, x:m.left + (pointCount===1?innerW/2:i*(innerW/(pointCount-1))), y:m.top + innerH - (Math.max(0,Math.min(100,s.value))/maxVal)*innerH }));
  const A=coords(pointsA), B=coords(pointsB); const benchY=m.top+innerH-(cfg.benchmark/maxVal)*innerH;
  const poly = arr => arr.map(p=>`${p.x},${p.y}`).join(' ');
  target.innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico temporal">
    ${yTicks.map(v=>{const y=m.top+innerH-(v/maxVal)*innerH; return `<line x1="${m.left}" y1="${y}" x2="${W-m.right}" y2="${y}" stroke="rgba(255,255,255,.10)"/><text x="${m.left-10}" y="${y+4}" text-anchor="end" fill="#9fb5c8" font-size="11">${v}%</text>`;}).join('')}
    <line x1="${m.left}" y1="${m.top+innerH}" x2="${W-m.right}" y2="${m.top+innerH}" stroke="rgba(255,255,255,.22)"/>
    <line x1="${m.left}" y1="${m.top}" x2="${m.left}" y2="${m.top+innerH}" stroke="rgba(255,255,255,.22)"/>
    <line x1="${m.left}" y1="${benchY}" x2="${W-m.right}" y2="${benchY}" stroke="#ffd166" stroke-width="2" stroke-dasharray="8 6"/>
    <text x="${W-m.right}" y="${benchY-8}" text-anchor="end" fill="#ffd166" font-size="11">Referência COSAT U14: ${cfg.benchmark}%</text>
    ${A.length?`<polyline points="${poly(A)}" fill="none" stroke="${cfg.colorA||'#61d5ff'}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`:''}
    ${B.length?`<polyline points="${poly(B)}" fill="none" stroke="${cfg.colorB||'#ffd166'}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`:''}
    ${A.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="4.8" fill="${cfg.colorA||'#61d5ff'}" stroke="#07131f" stroke-width="2"/>`).join('')}
    ${B.map(p=>`<circle cx="${p.x}" cy="${p.y}" r="4.8" fill="${cfg.colorB||'#ffd166'}" stroke="#07131f" stroke-width="2"/>`).join('')}
    ${A.map(p=>`<text x="${p.x}" y="${p.y-12}" text-anchor="middle" fill="#f5fbff" font-size="11">${escapeHtml(p.display || `${p.value}%`)}</text>`).join('')}
    ${pointsA.map((p,i)=>`<text x="${A[i]?.x ?? (m.left+innerW/2)}" y="${H-14}" text-anchor="middle" fill="#9fb5c8" font-size="11">${escapeHtml(p.label)}</text>`).join('')}
    <g transform="translate(${m.left},${m.top-18})"><circle cx="0" cy="0" r="5" fill="${cfg.colorA||'#61d5ff'}"></circle><text x="10" y="4" fill="#dff6ff" font-size="11">${escapeHtml(cfg.nameA||'Jogador')}</text>${cfg.pointsB?.length?`<circle cx="112" cy="0" r="5" fill="${cfg.colorB||'#ffd166'}"></circle><text x="122" y="4" fill="#dff6ff" font-size="11">${escapeHtml(cfg.nameB||'Adversário')}</text>`:''}</g>
  </svg>`;
}

function comparisonRows(a){
  return [
    {key:'pontos_vencidos', leftSub:'Jogador', midSub:'Adversário'},
    {key:'saque', leftSub:'Jogador sacando', midSub:'Adversário sacando'},
    {key:'devolucao', leftSub:'Jogador devolvendo', midSub:'Adversário devolvendo'},
    {key:'pressao', leftSub:'Jogador', midSub:'Adversário'},
    {key:'pontos_positivos', leftSub:'winner/passada/ace/construído', midSub:'winner/passada/ace/construído'},
    {key:'pontos_erro', leftSub:'Do lado do jogador', midSub:'Do lado do adversário'},
    {key:'erros_forcados', leftSub:'Entre os erros do lado', midSub:'Entre os erros do lado'},
    {key:'erros_nao_forcados', leftSub:'Entre os erros do lado', midSub:'Entre os erros do lado'},
    {key:'agressividade', leftSub:'Índice', midSub:'Índice'},
    {key:'consistencia', leftSub:'Índice', midSub:'Índice'},
    {key:'construcao', leftSub:'Jogador', midSub:'Adversário'},
    {key:'dupla_falta', leftSub:'Erro de saque', midSub:'Erro de saque'},
    {key:'aces', leftSub:'Ponto direto no saque', midSub:'Ponto direto no saque'}
  ].map(item => {
    const def = comparisonMetricDefs[item.key];
    const left = def.player(a); const mid = def.opp(a);
    return {...item, label:def.label, info:def.info, ref:def.ref, refSub:def.refSub, left:left.display, mid:mid.display};
  });
}

function renderComparisonTable(target,a){
  const rows = comparisonRows(a);
  target.innerHTML = `<div class="comparison-table-head"><div>Jogador</div><div>Adversário</div><div>Referência COSAT U14</div></div>${rows.map(r => `<div class="comparison-row ${state.gameTrendMetric===r.key?'active':''}" data-metric="${escapeHtml(r.key)}"><div class="comparison-label"><button class="comparison-info" data-info="${escapeHtml(r.info)}" type="button">i</button><span>${escapeHtml(r.label)}</span></div><div class="comparison-values"><div class="comparison-cell left"><div class="comparison-value-row"><b>${escapeHtml(r.left)}</b></div><span class="comparison-side">${escapeHtml(r.leftSub)}</span></div><div class="comparison-cell mid"><div class="comparison-value-row"><b>${escapeHtml(r.mid)}</b></div><span class="comparison-side">${escapeHtml(r.midSub)}</span></div><div class="comparison-cell ref"><div class="comparison-value-row"><b>${escapeHtml(r.ref)}</b></div><span class="comparison-side">${escapeHtml(r.refSub)}</span></div></div></div>`).join('')}`;
  bindComparisonInfo(target);
  $$('.comparison-row', target).forEach(row => row.onclick = (e) => {
    if(e.target.closest('.comparison-info')) return;
    state.gameTrendMetric = row.dataset.metric;
    const g = loadGames().find(x => x.id === state.selectedGameId);
    if(g){ renderComparisonTable(target, analyze([g])); renderGameParameterTrend(g); $('#gameParamTrendChart')?.scrollIntoView({behavior:'smooth', block:'center'}); }
  });
}

function getGamesLastYearFor(targetGame){
  const end = parseISODate(targetGame.date); if(!end) return [targetGame];
  const start = new Date(end); start.setFullYear(start.getFullYear()-1);
  return loadGames().filter(g => { const dt=parseISODate(g.date); return dt && dt>=start && dt<=end; }).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
}

function renderGameParameterTrend(game){
  const def = comparisonMetricDefs[state.gameTrendMetric] || comparisonMetricDefs.pontos_vencidos;
  const games = getGamesLastYearFor(game);
  const playerSeries = games.map(g => { const a=analyze([g]); const m=def.player(a); return {label:formatShortDate(g.date), value:m.pct, display:m.display}; });
  const oppSeries = games.map(g => { const a=analyze([g]); const m=def.opp(a); return {label:formatShortDate(g.date), value:m.pct, display:m.display}; });
  $('#gameParamTrendTitle').textContent = `Evolução do parâmetro: ${def.label}`;
  $('#gameParamTrendSubtitle').textContent = `Últimos 12 meses até ${game.date}. Azul claro = jogador. Dourado = adversário. Linha tracejada = referência COSAT U14.`;
  renderLineChart($('#gameParamTrendChart'), {benchmark:def.benchmark, pointsA:playerSeries, pointsB:oppSeries, colorA:'#61d5ff', colorB:'#ffd166', nameA:'Jogador', nameB:'Adversário'});
}

function renderPanel(){
  const games=loadGames().filter(inPeriod).sort((a,b)=>(a.date||'').localeCompare(b.date||''));
  const a=analyze(games);
  renderMetricCards($('#monthSimpleCards'), [
    {value:`${games.length}`, label:'jogos registrados', info:'jogos'},
    {value:absPct(a.athleteRelated.length, a.total), label:'pontos ligados ao atleta', info:'pontos'},
    {value:absPct(a.won, a.knownWinnerPoints.length), label:'pontos vencidos pelo atleta', info:'aproveitamento'},
    {value:absPct(a.athleteErrors.length, a.athleteRelated.length || a.total), label:'pontos entregues por erro', info:'errosAtleta'}
  ]);
  $('#monthSimpleText').textContent = simplePhrase(a);
  $('#gamesTimeline').innerHTML = games.length ? games.slice().reverse().map(g => { const ga=analyze([g]); const sc=recalcScore(g.points||[]); const placar=`Pontos ${ga.won}–${ga.lost} • Games ${sc.totalGames.athlete}–${sc.totalGames.opponent} • Set ${sc.sets.athlete}–${sc.sets.opponent}`; return `<button class="game-pill" data-game-id="${escapeHtml(g.id)}" type="button"><span><strong>${escapeHtml(g.date)} • vs ${escapeHtml(g.opponent || 'Adversário')}</strong><br><small>${escapeHtml(g.tournament || 'sem campeonato')} • ${escapeHtml(placar)}</small></span><b>${ga.winPct}%</b></button>`; }).join('') : '<p class="muted">Nenhum jogo no período.</p>';
  $$('.game-pill').forEach(btn => btn.onclick = () => openGameDetail(btn.dataset.gameId));
  renderBars($('#endingChart'), countBy(a.athleteEndings,'ending'), a.athleteEndings.length);
  renderBars($('#strokeErrorChart'), countBy(a.athleteErrors,'stroke'), a.athleteErrors.length);
  renderMetricCards($('#coachMetricCards'), [
    {value:absPct(a.serveWon, a.serveTotal), label:'pontos no saque', info:'saque', trend:'saque'},
    {value:absPct(a.returnWon, a.returnTotal), label:'pontos na devolução', info:'devolucao', trend:'devolucao'},
    {value:absPct(a.pressureWon, a.pressureCount), label:'pontos de pressão', info:'pressao', trend:'pressao'},
    {value:`${a.aggression} (${a.aggression}%)`, label:'agressividade controlada', info:'agressividade', trend:'agressividade'},
    {value:`${a.consistency} (${a.consistency}%)`, label:'consistência', info:'consistencia', trend:'consistencia'},
    {value:absPct(a.constructionCount, a.athleteRelated.length), label:'construção', info:'construcao', trend:'construcao'}
  ]);
  renderTrendChart($('#coachTrendChart'), games);
  renderRadar($('#coachRadar'), a);
  renderCoachNotes($('#coachNotes'), a, 'player');
}

function continueGame(id){ const g=loadGames().find(x=>x.id===id); if(!g) return; state.activeGame=JSON.parse(JSON.stringify(g)); state.activeGame.closed=false; state.activeGame.endTime=''; const lastServer=[...(state.activeGame.points||[])].reverse().find(p=>p.server==='athlete'||p.server==='opponent')?.server || 'athlete'; state.draft=emptyDraft(lastServer); renderChoices(); renderScore(); showScreen('register'); }

function openGameDetail(id){
  const g=loadGames().find(x=>x.id===id); if(!g) return;
  state.selectedGameId=id; state.gameTrendMetric='pontos_vencidos';
  const a=analyze([g]); const sc=recalcScore(g.points||[]);
  $('#detailTitle').textContent=`${g.date} • vs ${g.opponent || 'Adversário'}`; $('#detailSubtitle').textContent=`${g.tournament || 'Sem campeonato'} • ${g.startTime || ''}${g.endTime ? ' às ' + g.endTime : ''}`;
  $('#bannerSetScore').textContent=`${sc.sets.athlete}–${sc.sets.opponent}`; $('#bannerGameScore').textContent=`${sc.totalGames.athlete}–${sc.totalGames.opponent}`; $('#bannerPointScore').textContent=`${a.won}–${a.lost}`; $('#bannerScoreText').textContent=`Placar registrado: ${sc.sets.athlete}–${sc.sets.opponent} sets • ${sc.totalGames.athlete}–${sc.totalGames.opponent} games • ${a.won}–${a.lost} pontos.`;
  renderMetricCards($('#gameSimpleCards'), [
    {value:absPct(a.won, a.knownWinnerPoints.length), label:'pontos vencidos pelo atleta', info:'aproveitamento'},
    {value:absPct(a.positiveAthlete.length, a.athleteRelated.length), label:'pontos positivos do atleta', info:'agressividade'},
    {value:absPct(a.athleteErrors.length, a.athleteRelated.length || a.total), label:'pontos entregues por erro', info:'errosAtleta'},
    {value:absPct(a.pressureWon, a.pressureCount), label:'pontos de pressão', info:'pressao'}
  ]);
  $('#gameSimpleText').textContent=simplePhrase(a);
  renderMetricCards($('#gameMatchCards'), [
    {value:absPct(a.total, a.total), label:'pontos registrados no jogo', info:'pontos'},
    {value:`${a.won}–${a.lost} (${a.winPct}% atleta)`, label:'placar de pontos', info:'aproveitamento'},
    {value:`${sc.totalGames.athlete}–${sc.totalGames.opponent} (${pct(sc.totalGames.athlete, sc.totalGames.athlete + sc.totalGames.opponent)}% atleta)`, label:'placar de games', info:'jogos'},
    {value:`${sc.sets.athlete}–${sc.sets.opponent} (${pct(sc.sets.athlete, sc.sets.athlete + sc.sets.opponent)}% atleta)`, label:'placar de sets', info:'jogos'}
  ]);
  renderComparisonTable($('#gameComparisonTable'), a);
  renderGameParameterTrend(g);
  renderBars($('#gameEndingChart'), countBy(a.athleteEndings,'ending'), a.athleteEndings.length);
  renderBars($('#gameStrokeChart'), countBy(a.athleteErrors,'stroke'), a.athleteErrors.length);
  renderBars($('#gamePlaceChart'), countBy(a.athleteErrors,'place'), a.athleteErrors.length);
  renderBars($('#gameOpponentEndingChart'), countBy(a.opponentEndings,'ending'), a.opponentEndings.length);
  renderBars($('#gameOpponentStrokeChart'), countBy(a.opponentErrors,'stroke'), a.opponentErrors.length);
  renderBars($('#gameOpponentPlaceChart'), countBy(a.opponentErrors,'place'), a.opponentErrors.length);
  renderCoachNotes($('#gameCoachNotes'), a, 'player'); renderCoachNotes($('#gameOpponentNotes'), a, 'opponent');
  showScreen('gameDetail');
}



function pdfSafe(v){ return String(v ?? '').replace(/[\u2013\u2014]/g, '-'); }
function pdfFileSafe(v){ return String(v || 'jogo').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/-+/g,'-').replace(/^-|-$/g,'').toLowerCase(); }
function pdfLabel(v){ return pdfSafe(labels[v] || v || 'Não informado'); }
function addWrappedText(doc, text, x, y, maxW, opts={}){
  const lines = doc.splitTextToSize(pdfSafe(text), maxW);
  doc.text(lines, x, y, opts);
  return y + lines.length * (opts.lineHeight || 5);
}
function pdfCheckLib(){
  if(!window.jspdf?.jsPDF){
    alert('Biblioteca de PDF ainda não carregou. Verifique a internet, aguarde alguns segundos e tente novamente.');
    return null;
  }
  return window.jspdf.jsPDF;
}
function pdfTheme(){
  return { ink:[31,41,55], muted:[107,114,128], line:[225,229,235], soft:[248,250,252], accent:[0,128,96], cyan:[66,185,214], yellow:[245,181,54], danger:[190,70,70] };
}
function pdfMaybePage(doc, y, needed=40){
  if(y + needed <= 286) return y;
  doc.addPage();
  return 18;
}
function pdfHeader(doc, title, subtitle){
  const t=pdfTheme();
  doc.setTextColor(...t.accent); doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.text('AVELICOACH - RELATÓRIO DO JOGO', 14, 15);
  doc.setTextColor(...t.ink); doc.setFontSize(18); doc.text(pdfSafe(title), 14, 25);
  doc.setFont('helvetica','bold'); doc.setFontSize(9); doc.text(pdfSafe(subtitle), 14, 33);
  doc.setDrawColor(...t.line); doc.line(14, 40, 196, 40);
  return 50;
}
function pdfSectionTitle(doc, title, x, y){
  const t=pdfTheme(); doc.setTextColor(...t.accent); doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.text(pdfSafe(title).toUpperCase(), x, y); return y+8;
}
function pdfCard(doc, x, y, w, h, drawFn){
  const t=pdfTheme(); doc.setDrawColor(...t.line); doc.setFillColor(255,255,255); doc.roundedRect(x,y,w,h,3,3,'FD'); if(drawFn) drawFn(x,y,w,h); return y+h;
}
function pdfMetricGrid(doc, y, cards, cols=4){
  const gap=4, x0=14, totalW=182, w=(totalW-gap*(cols-1))/cols, h=18;
  const t=pdfTheme();
  cards.forEach((c,i)=>{
    const row=Math.floor(i/cols), col=i%cols; const x=x0+col*(w+gap), yy=y+row*(h+gap);
    pdfCard(doc,x,yy,w,h,()=>{
      doc.setTextColor(...t.muted); doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.text(pdfSafe(c.label), x+3, yy+6);
      doc.setTextColor(...t.ink); doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.text(pdfSafe(c.value), x+3, yy+14);
    });
  });
  return y + Math.ceil(cards.length/cols)*(h+gap) - gap;
}
function pdfSmallRows(doc, x, y, w, title, rows){
  const t=pdfTheme(); const h=12 + rows.length*7.2;
  pdfCard(doc,x,y,w,h,()=>{
    pdfSectionTitle(doc,title,x+3,y+7);
    let yy=y+18;
    rows.forEach(r=>{
      doc.setDrawColor(235,238,242); doc.line(x+3, yy+1, x+w-3, yy+1);
      doc.setTextColor(...t.muted); doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.text(pdfSafe(r[0]), x+3, yy+6);
      doc.setTextColor(...t.ink); doc.setFont('helvetica','bold'); doc.text(pdfSafe(r[1]), x+w-3, yy+6, {align:'right'});
      yy += 7.2;
    });
  });
  return y+h;
}
function pdfBarChart(doc, x, y, w, h, title, entries, denominator){
  const t=pdfTheme();
  pdfCard(doc,x,y,w,h,()=>{
    pdfSectionTitle(doc,title,x+3,y+7);
    const data = Object.entries(entries || {}).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,8);
    const max = Math.max(1, ...data.map(([,v])=>v));
    const total = denominator || data.reduce((s,[,v])=>s+v,0) || 1;
    let yy=y+18;
    if(!data.length){ doc.setTextColor(...t.muted); doc.setFontSize(8); doc.text('Sem dados suficientes.', x+3, yy); return; }
    data.forEach(([k,v])=>{
      const label = pdfLabel(k); const pctv = pct(v,total);
      doc.setTextColor(...t.ink); doc.setFont('helvetica','normal'); doc.setFontSize(7.4); doc.text(label, x+3, yy);
      const bx=x+3, by=yy+2.2, bw=w-27, bh=2.7;
      doc.setFillColor(238,241,245); doc.roundedRect(bx,by,bw,bh,1.2,1.2,'F');
      doc.setFillColor(...t.cyan); doc.roundedRect(bx,by,Math.max(2,bw*v/max),bh,1.2,1.2,'F');
      doc.setTextColor(...t.ink); doc.setFont('helvetica','bold'); doc.text(`${v} (${pctv}%)`, x+w-3, yy+4.2, {align:'right'});
      yy += 8.1;
    });
  });
  return y+h;
}
function pdfComparisonTable(doc, y, rows){
  const t=pdfTheme();
  y = pdfMaybePage(doc, y, 95);
  pdfSectionTitle(doc,'Comparativo jogador x adversário',14,y); y += 3;
  const x=14, w=182, labelW=44, colW=(w-labelW)/3, rowH=8.8;
  doc.setFillColor(...t.soft); doc.setDrawColor(...t.line); doc.roundedRect(x,y,w,9,2,2,'FD');
  doc.setTextColor(...t.ink); doc.setFont('helvetica','bold'); doc.setFontSize(7.5);
  doc.text('Parâmetro', x+3, y+6); doc.text('Jogador', x+labelW+colW/2, y+6, {align:'center'}); doc.text('Adversário', x+labelW+colW*1.5, y+6, {align:'center'}); doc.text('Ref. COSAT U14', x+labelW+colW*2.5, y+6, {align:'center'});
  y += 9;
  rows.forEach((r,idx)=>{
    y = pdfMaybePage(doc, y, rowH+8);
    doc.setDrawColor(235,238,242); doc.setFillColor(idx%2?252:248, idx%2?253:250, idx%2?255:252); doc.rect(x,y,w,rowH,'FD');
    doc.setTextColor(...t.accent); doc.setFont('helvetica','bold'); doc.setFontSize(6.8); doc.text(pdfSafe(r.label), x+2.5, y+5.7);
    doc.setTextColor(...t.ink); doc.setFontSize(7.8); doc.text(pdfSafe(r.left), x+labelW+colW/2, y+5.7, {align:'center'}); doc.text(pdfSafe(r.mid), x+labelW+colW*1.5, y+5.7, {align:'center'}); doc.text(pdfSafe(r.ref), x+labelW+colW*2.5, y+5.7, {align:'center'});
    y += rowH;
  });
  return y+8;
}
function pdfLineChart(doc, x, y, w, h, title, cfg){
  const t=pdfTheme();
  pdfCard(doc,x,y,w,h,()=>{
    pdfSectionTitle(doc,title,x+3,y+7);
    const plotX=x+12, plotY=y+18, plotW=w-20, plotH=h-33;
    const a=cfg.pointsA||[], b=cfg.pointsB||[]; const n=Math.max(a.length,b.length,1);
    doc.setDrawColor(235,238,242); doc.setLineWidth(.2);
    [0,25,50,75,100].forEach(v=>{ const yy=plotY+plotH-(v/100)*plotH; doc.line(plotX,yy,plotX+plotW,yy); doc.setTextColor(...t.muted); doc.setFontSize(6.2); doc.text(`${v}%`, plotX-2, yy+1.5, {align:'right'}); });
    const refY = plotY+plotH-(cfg.benchmark/100)*plotH; doc.setDrawColor(...t.yellow); doc.setLineDashPattern([2,2],0); doc.line(plotX,refY,plotX+plotW,refY); doc.setLineDashPattern([],0); doc.setTextColor(...t.yellow); doc.setFont('helvetica','bold'); doc.setFontSize(6.2); doc.text(`Ref. ${cfg.benchmark}%`, plotX+plotW, refY-1.5, {align:'right'});
    const pts = arr => arr.map((p,i)=>({ ...p, x:plotX+(n===1?plotW/2:i*plotW/(n-1)), y:plotY+plotH-(Math.max(0,Math.min(100,p.value))/100)*plotH }));
    const drawSeries=(arr,color)=>{ const P=pts(arr); if(P.length>1){ doc.setDrawColor(...color); doc.setLineWidth(.8); for(let i=0;i<P.length-1;i++) doc.line(P[i].x,P[i].y,P[i+1].x,P[i+1].y); } P.forEach(p=>{ doc.setFillColor(...color); doc.circle(p.x,p.y,1.3,'F'); }); return P; };
    const A=drawSeries(a,t.cyan), B=drawSeries(b,t.yellow);
    doc.setTextColor(...t.ink); doc.setFont('helvetica','normal'); doc.setFontSize(6.2);
    (A.length?A:B).forEach((p,i)=>{ if(i%Math.ceil(n/8 || 1)===0) doc.text(pdfSafe((a[i]||b[i]||{}).label || ''), p.x, y+h-7, {align:'center'}); });
    doc.setFillColor(...t.cyan); doc.circle(x+w-54,y+8,1.3,'F'); doc.setTextColor(...t.muted); doc.text('Jogador', x+w-51, y+9);
    doc.setFillColor(...t.yellow); doc.circle(x+w-28,y+8,1.3,'F'); doc.text('Adversário', x+w-25, y+9);
  });
  return y+h;
}
function pdfNotes(doc, y, title, notes){
  const t=pdfTheme();
  y=pdfMaybePage(doc,y,40);
  pdfSectionTitle(doc,title,14,y); y += 2;
  const cols=2, gap=4, w=(182-gap)/cols; let x=14; let rowY=y; let maxH=0;
  notes.forEach((n,i)=>{
    const textLines = doc.splitTextToSize(pdfSafe(n.text), w-6);
    const h = 13 + textLines.length*4.2;
    if(i%cols===0 && i>0){ rowY += maxH + gap; x=14; maxH=0; }
    rowY = pdfMaybePage(doc,rowY,h+4);
    pdfCard(doc,x,rowY,w,h,()=>{ doc.setTextColor(...t.accent); doc.setFont('helvetica','bold'); doc.setFontSize(7.2); doc.text(pdfSafe(n.title), x+3, rowY+6); doc.setTextColor(...t.ink); doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.text(textLines, x+3, rowY+12); });
    maxH=Math.max(maxH,h); x += w+gap;
  });
  return rowY+maxH+8;
}
function exportGamePdf(){
  const JS = pdfCheckLib(); if(!JS) return;
  const g = loadGames().find(x => x.id === state.selectedGameId); if(!g) return;
  const doc = new JS({orientation:'portrait', unit:'mm', format:'a4'});
  const a = analyze([g]); const sc = recalcScore(g.points || []);
  let y = pdfHeader(doc, `Jogo vs ${g.opponent || 'Adversário'}`, `${g.date || ''} - ${g.tournament || 'Sem campeonato'} - ${g.startTime || ''}${g.endTime ? ' às ' + g.endTime : ''}`);
  y = pdfMetricGrid(doc, y, [
    {label:'Sets', value:`${sc.sets.athlete}-${sc.sets.opponent}`},
    {label:'Games', value:`${sc.totalGames.athlete}-${sc.totalGames.opponent}`},
    {label:'Pontos', value:`${a.won}-${a.lost}`},
    {label:'Aproveitamento', value:`${a.winPct}%`},
    {label:'Pontos registrados', value:String(a.total)},
    {label:'Pontos positivos', value:absPct(a.positiveAthlete.length, a.athleteRelated.length)},
    {label:'Erros do jogador', value:absPct(a.athleteErrors.length, a.athleteRelated.length || a.total)},
    {label:'Pressão', value:absPct(a.pressureWon, a.pressureCount)}
  ], 4) + 8;
  pdfCard(doc,14,y,182,20,()=>{ const t=pdfTheme(); doc.setTextColor(...t.accent); doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.text('LEITURA RESUMIDA',17,y+7); doc.setTextColor(...t.ink); doc.setFont('helvetica','normal'); doc.setFontSize(8.5); addWrappedText(doc, simplePhrase(a), 17, y+14, 176, {lineHeight:4.5}); }); y += 28;
  y = pdfComparisonTable(doc, y, comparisonRows(a));
  const def = comparisonMetricDefs[state.gameTrendMetric] || comparisonMetricDefs.pontos_vencidos;
  const games = getGamesLastYearFor(g);
  const playerSeries = games.map(gg => { const aa=analyze([gg]); const m=def.player(aa); return {label:formatShortDate(gg.date), value:m.pct, display:m.display}; });
  const oppSeries = games.map(gg => { const aa=analyze([gg]); const m=def.opp(aa); return {label:formatShortDate(gg.date), value:m.pct, display:m.display}; });
  y = pdfMaybePage(doc, y, 85);
  y = pdfLineChart(doc,14,y,182,75,`Evolução - ${def.label}`, {benchmark:def.benchmark, pointsA:playerSeries, pointsB:oppSeries}) + 8;
  y = pdfMaybePage(doc,y,78);
  pdfSectionTitle(doc,'Gráficos do jogador',14,y); y += 4;
  const chartW=58, chartH=60, gap=4;
  pdfBarChart(doc,14,y,chartW,chartH,'Como terminou',countBy(a.athleteEndings,'ending'),a.athleteEndings.length);
  pdfBarChart(doc,14+chartW+gap,y,chartW,chartH,'Erros por golpe',countBy(a.athleteErrors,'stroke'),a.athleteErrors.length);
  pdfBarChart(doc,14+(chartW+gap)*2,y,chartW,chartH,'Erros por lugar',countBy(a.athleteErrors,'place'),a.athleteErrors.length);
  y += chartH + 10;
  y = pdfMaybePage(doc,y,78);
  pdfSectionTitle(doc,'Gráficos do adversário',14,y); y += 4;
  pdfBarChart(doc,14,y,chartW,chartH,'Como terminou',countBy(a.opponentEndings,'ending'),a.opponentEndings.length);
  pdfBarChart(doc,14+chartW+gap,y,chartW,chartH,'Erros por golpe',countBy(a.opponentErrors,'stroke'),a.opponentErrors.length);
  pdfBarChart(doc,14+(chartW+gap)*2,y,chartW,chartH,'Erros por lugar',countBy(a.opponentErrors,'place'),a.opponentErrors.length);
  y += chartH + 8;
  y = pdfNotes(doc,y,'Leitura técnica do jogador',coachNotes(a));
  y = pdfNotes(doc,y,'Leitura técnica do adversário',opponentNotes(a));
  const pageCount = doc.internal.getNumberOfPages();
  for(let i=1;i<=pageCount;i++){ doc.setPage(i); doc.setFont('helvetica','normal'); doc.setFontSize(7); doc.setTextColor(130,140,150); doc.text(`AveliCoach - página ${i}/${pageCount}`, 196, 291, {align:'right'}); }
  doc.save(`avelicoach-jogo-${g.date || 'sem-data'}-${pdfFileSafe(g.opponent || 'adversario')}.pdf`);
}

function exportPeriod(){ const games=loadGames().filter(inPeriod); download(`avelicoach-timestamp-periodo-${$('#periodStart').value}-${$('#periodEnd').value}.json`, JSON.stringify({exportedAt:new Date().toISOString(), version:'v7-timestamp', period:{start:$('#periodStart').value, end:$('#periodEnd').value}, games}, null, 2)); }
function exportBackup(){ download(`avelicoach-timestamp-backup-${todayISO()}.json`, JSON.stringify({exportedAt:new Date().toISOString(), version:'v7-timestamp', games:loadGames()}, null, 2)); }
function exportGame(){ const g=loadGames().find(x=>x.id===state.selectedGameId); if(g) download(`avelicoach-timestamp-jogo-${g.date}-${(g.opponent||'adversario').replace(/\s+/g,'-')}.json`, JSON.stringify({exportedAt:new Date().toISOString(), version:'v7-timestamp', game:g}, null, 2)); }
function deleteGame(){ if(!state.selectedGameId) return; if(!confirm('Excluir este jogo?')) return; saveGames(loadGames().filter(g=>g.id!==state.selectedGameId)); state.selectedGameId=null; showScreen('home'); }

function bind(){
  $('#newGameBtn').onclick=newGame; $('#homeBtn').onclick=()=>showScreen('home'); $$('.choice').forEach(btn=>btn.onclick=()=>handleChoice(btn)); $('#pointForm').onsubmit=savePoint; $('#undoPointBtn').onclick=undoPoint; $('#finishGameBtn').onclick=()=>openMetaDialog(true); $('#matchMetaForm').addEventListener('submit',e=>{e.preventDefault(); saveMeta(); showScreen('home');}); $('#saveMetaContinueBtn').onclick=saveMetaAndContinue; $('#cancelMetaBtn').onclick=()=>$('#matchMetaDialog').close(); $('#periodStart').onchange=renderPanel; $('#periodEnd').onchange=renderPanel; $('#exportPeriodJsonBtn').onclick=exportPeriod; $('#exportBackupBtn').onclick=exportBackup; $('#exportPdfBtn').onclick=()=>window.print(); $('#closeDetailBtn').onclick=()=>showScreen('home'); $('#continueGameBtn').onclick=()=>continueGame(state.selectedGameId); $('#exportGameJsonBtn').onclick=exportGame; const pdfBtn=$('#exportGamePdfBtn'); if(pdfBtn) pdfBtn.onclick=exportGamePdf; $('#deleteGameBtn').onclick=deleteGame; $('#closeInfoBtn').onclick=()=>$('#infoDialog').close(); $$('.seg-btn').forEach(btn=>btn.onclick=()=>{state.trendGranularity=btn.dataset.granularity; renderPanel();});
}

/* inicialização movida para o final da versão consolidada */

/* AveliCoach consolidated updates */
const U14_META = {saque:{text:'Meta U14: ≥ 62%',target:62,mode:'min'},devolucao:{text:'Meta U14: ≥ 42%',target:42,mode:'min'},pressao:{text:'Meta U14: ≥ 58%',target:58,mode:'min'},agressividade:{text:'Meta U14: ≥ 38%',target:38,mode:'min'},consistencia:{text:'Meta U14: ≥ 74%',target:74,mode:'min'},construcao:{text:'Meta U14: ≥ 24%',target:24,mode:'min'},erros:{text:'Limite U14: ≤ 18%',target:18,mode:'max'},dupla_falta:{text:'Limite U14: ≤ 4%',target:4,mode:'max'},erro_nao_forcado:{text:'Limite U14: ≤ 14%',target:14,mode:'max'}};
infoTexts.presenca_jogo={title:'Presença no jogo',html:raw`<p>O gráfico calcula uma <strong>presença relativa</strong> a partir dos pontos registrados ao longo do tempo.</p><p>Pontos positivos, como <strong>winner</strong>, <strong>ace</strong>, <strong>passada</strong> e <strong>ponto construído</strong>, aumentam a presença do lado que realizou a ação. Erros, dupla falta e pontos sofridos reduzem a presença.</p><p>O sistema calcula o saldo de presença entre jogador e adversário, suaviza a sequência por média móvel dos últimos 5 pontos e mostra as duas linhas em lados opostos da linha central. O eixo X usa o horário salvo em cada ponto.</p>`};
infoTexts.pressao={title:'Pontos de pressão',html:raw`<p>Na tela de registro, o treinador marca apenas <strong>Normal</strong> ou <strong>Pressão</strong>. O sistema também pode inferir momentos automáticos pelo placar: break point, game point, set point, match point e tie-break.</p><div class="formula">\(\text{Aproveitamento sob pressão} = \frac{\text{Pontos de pressão vencidos}}{\text{Total de pontos de pressão}} \times 100\)</div><p>A marca manual mostra a percepção do treinador. A marca automática mostra o peso objetivo do placar.</p>`};
function metaForTrend(trendKey,pctValue){const m=U14_META[trendKey];if(!m)return null;const ok=m.mode==='max'?pctValue<=m.target:pctValue>=m.target;return {text:m.text,status:ok?'dentro da meta':(m.mode==='max'?'acima do limite':'abaixo da meta'),ok};}
function extractPctFromDisplay(v){const m=String(v||'').match(/\((\d+)%\)|^(\d+)%$/);return m?Number(m[1]||m[2]):0;}
function metricCard(value,label,infoKey,trendKey){const m=trendKey?metaForTrend(trendKey,extractPctFromDisplay(value)):null;return `<article class="metric-card ${trendKey?'clickable':''} ${state.trendMetric===trendKey?'active':''}" ${trendKey?`data-trend="${escapeHtml(trendKey)}"`:''}><button class="info-btn" data-info="${escapeHtml(infoKey)}" type="button">i</button><b>${escapeHtml(value)}</b><span>${escapeHtml(label)}</span>${m?`<small class="metric-meta">${escapeHtml(m.text)}</small><small class="metric-status ${m.ok?'':'warn'}">${escapeHtml(m.status)}</small>`:''}</article>`;}
function scoreBeforePoint(game,point){return recalcScore((game.points||[]).filter(p=>(p.order||0)<(point.order||0)));}
function autoMomentForPoint(game,point){const sc=scoreBeforePoint(game,point),server=point.server||'athlete',receiver=server==='athlete'?'opponent':'athlete';if(sc.games.athlete===6&&sc.games.opponent===6)return 'tie_break';const sg=sc.pointIndex[server]>=3&&sc.pointIndex[server]>=sc.pointIndex[receiver]+1,rg=sc.pointIndex[receiver]>=3&&sc.pointIndex[receiver]>=sc.pointIndex[server]+1;if(rg)return 'break_point';if(sg)return 'game_point';const spa=sc.games.athlete>=5&&sc.pointIndex.athlete>=3&&sc.pointIndex.athlete>=sc.pointIndex.opponent+1;const spo=sc.games.opponent>=5&&sc.pointIndex.opponent>=3&&sc.pointIndex.opponent>=sc.pointIndex.athlete+1;if((sc.sets.athlete>=1&&spa)||(sc.sets.opponent>=1&&spo))return 'match_point';if(spa||spo)return 'set_point';return 'normal';}
function isPressure(p){return ['pressao','break_point','game_point','tie_break','set_point','match_point'].includes(p.moment)||['break_point','game_point','tie_break','set_point','match_point'].includes(p.momentAuto)||p.playType==='pressao';}
function savePoint(e){e.preventDefault();if(!state.activeGame)newGame();const filled={...state.draft};const savedAt=new Date();const p={id:uid(),order:state.activeGame.points.length+1,createdAt:savedAt.toISOString(),savedAt:savedAt.toISOString(),savedAtLocal:localDateTimeISO(savedAt),savedDate:localDateISO(savedAt),savedTime:localTimeHMS(savedAt),savedTimestampMs:savedAt.getTime(),matchDate:state.activeGame.date||localDateISO(savedAt),server:filled.server||'athlete',winner:val(filled.winner),ending:val(filled.ending),actor:val(filled.actor),stroke:val(filled.stroke),place:val(filled.place),target:val(filled.target),moment:val(filled.moment||'normal'),momentManual:val(filled.moment||'normal'),momentAuto:'normal',playType:val(filled.playType),note:$('#pointNote').value.trim()};p.momentAuto=autoMomentForPoint(state.activeGame,p);state.activeGame.points.push(p);state.activeGame.lastPointSavedAt=p.savedAt;state.activeGame.lastPointSavedAtLocal=p.savedAtLocal;state.activeGame.lastPointSavedTimestampMs=p.savedTimestampMs;state.draft=emptyDraft(p.server||'athlete');$('#pointNote').value='';persistActiveGame();renderChoices();}
function presenceScoreForPoint(p,side){const other=side==='athlete'?'opponent':'athlete';let v=0;const strong=['winner','passada','saque_direto'];if(p.actor===side&&strong.includes(p.ending))v+=3;else if(p.actor===side&&p.ending==='ponto_construido')v+=2;else if(p.winner===side&&p.actor===other&&['erro','dupla_falta'].includes(p.ending))v+=1;else if(p.winner===side)v+=1;if(p.actor===side&&p.ending==='erro')v-=2;if(p.actor===side&&p.ending==='dupla_falta')v-=3;if(p.actor===other&&strong.includes(p.ending))v-=2;if(p.winner===other&&!v)v-=1;if(isPressure(p))v*=1.25;return Math.max(-5,Math.min(5,v));}
function movingAvg(values,i,win=5){const start=Math.max(0,i-win+1),part=values.slice(start,i+1);return part.reduce((s,x)=>s+x,0)/part.length;}
function presenceData(game){const pts=(game.points||[]).filter(p=>p.savedTimestampMs||p.savedTime||p.createdAt);const rawSaldo=pts.map(p=>presenceScoreForPoint(p,'athlete')-presenceScoreForPoint(p,'opponent'));return pts.map((p,i)=>{const saldo=Math.max(-100,Math.min(100,Math.round(movingAvg(rawSaldo,i)*14)));return {label:((p.savedTime||(p.savedAtLocal||'').slice(11,19)||(p.createdAt||'').slice(11,19)||String(i+1)).slice(0,5)),athlete:saldo,opponent:-saldo};});}
function renderPresenceChart(target,game){const data=presenceData(game);if(!data.length){target.innerHTML='<p class="muted">Sem pontos suficientes para mostrar presença no tempo.</p>';return;}const W=900,H=300,m={l:52,r:18,t:24,b:44},pw=W-m.l-m.r,ph=H-m.t-m.b;const x=i=>m.l+(data.length===1?pw/2:i*pw/(data.length-1));const y=v=>m.t+ph-((v+100)/200)*ph;const path=key=>data.map((d,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(d[key]).toFixed(1)).join(' ');const ticks=[-100,-50,0,50,100],step=Math.max(1,Math.ceil(data.length/6));target.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Presença no jogo">${ticks.map(t=>`<line class="${t===0?'presence-line-zero':'presence-grid'}" x1="${m.l}" x2="${W-m.r}" y1="${y(t)}" y2="${y(t)}"></line><text class="presence-axis-label" x="${m.l-8}" y="${y(t)+4}" text-anchor="end">${t}</text>`).join('')}<path class="presence-player" d="${path('athlete')}"></path><path class="presence-opponent" d="${path('opponent')}"></path>${data.map((d,i)=>`<circle class="presence-dot-player" cx="${x(i)}" cy="${y(d.athlete)}" r="3"></circle><circle class="presence-dot-opponent" cx="${x(i)}" cy="${y(d.opponent)}" r="3"></circle>`).join('')}${data.map((d,i)=>i%step===0||i===data.length-1?`<text class="presence-axis-label" x="${x(i)}" y="${H-16}" text-anchor="middle">${escapeHtml(d.label)}</text>`:'').join('')}<circle class="presence-dot-player" cx="${m.l}" cy="14" r="5"></circle><text class="presence-axis-label" x="${m.l+10}" y="18">Jogador</text><circle class="presence-dot-opponent" cx="${m.l+82}" cy="14" r="5"></circle><text class="presence-axis-label" x="${m.l+92}" y="18">Adversário</text></svg>`;}
function renderRadar(target,a){const vals=[a.winPct,a.consistency,a.aggression,pct(a.serveWon,a.serveTotal),pct(a.returnWon,a.returnTotal),pct(a.pressureWon,a.pressureCount)];const names=['Pontos','Consist.','Agress.','Saque','Devol.','Pressão'];const W=520,H=340,cx=W/2,cy=170,R=105,n=vals.length;const pt=(i,r)=>{const ang=-Math.PI/2+i*2*Math.PI/n;return[cx+Math.cos(ang)*R*r,cy+Math.sin(ang)*R*r];};const poly=r=>names.map((_,i)=>pt(i,r).join(',')).join(' ');const dataPoly=vals.map((v,i)=>pt(i,Math.max(0,Math.min(100,v))/100).join(',')).join(' ');target.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Radar técnico">${[.2,.4,.6,.8,1].map(r=>`<polygon points="${poly(r)}" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="1"/>`).join('')}${names.map((_,i)=>{const [x,y]=pt(i,1);return`<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="rgba(255,255,255,.10)"/>`;}).join('')}<polygon points="${dataPoly}" fill="rgba(140,240,179,.24)" stroke="var(--accent2)" stroke-width="4"/>${vals.map((v,i)=>{const[x,y]=pt(i,Math.max(0,Math.min(100,v))/100);return`<circle cx="${x}" cy="${y}" r="5" fill="var(--accent2)"/>`;}).join('')}${names.map((name,i)=>{const[x,y]=pt(i,1.22);return`<text x="${x}" y="${y+4}" fill="var(--muted)" font-size="16" font-weight="800" text-anchor="middle">${name}</text>`;}).join('')}</svg>`;}
function openGameDetail(id){const g=loadGames().find(x=>x.id===id);if(!g)return;state.selectedGameId=id;state.gameTrendMetric='pontos_vencidos';const a=analyze([g]),sc=recalcScore(g.points||[]);$('#detailTitle').textContent=`${g.date} • vs ${g.opponent||'Adversário'}`;$('#detailSubtitle').textContent=`${g.tournament||'Sem campeonato'} • ${g.startTime||''}${g.endTime?' às '+g.endTime:''}`;$('#bannerSetScore').textContent=`${sc.sets.athlete}–${sc.sets.opponent}`;$('#bannerGameScore').textContent=`${sc.totalGames.athlete}–${sc.totalGames.opponent}`;$('#bannerPointScore').textContent=`${a.won}–${a.lost}`;$('#bannerScoreText').textContent=`Placar registrado: ${sc.sets.athlete}–${sc.sets.opponent} sets • ${sc.totalGames.athlete}–${sc.totalGames.opponent} games • ${a.won}–${a.lost} pontos.`;renderMetricCards($('#gameSimpleCards'),[{value:absPct(a.won,a.knownWinnerPoints.length),label:'pontos vencidos pelo atleta',info:'aproveitamento'},{value:absPct(a.positiveAthlete.length,a.athleteRelated.length),label:'pontos positivos do atleta',info:'agressividade'},{value:absPct(a.athleteErrors.length,a.athleteRelated.length||a.total),label:'pontos entregues por erro',info:'errosAtleta'},{value:absPct(a.pressureWon,a.pressureCount),label:'pontos de pressão',info:'pressao',trend:'pressao'}]);$('#gameSimpleText').textContent=simplePhrase(a);renderMetricCards($('#gameMatchCards'),[{value:absPct(a.total,a.total),label:'pontos registrados no jogo',info:'pontos'},{value:`${a.won}–${a.lost} (${a.winPct}% atleta)`,label:'placar de pontos',info:'aproveitamento'},{value:`${sc.totalGames.athlete}–${sc.totalGames.opponent} (${pct(sc.totalGames.athlete,sc.totalGames.athlete+sc.totalGames.opponent)}% atleta)`,label:'placar de games',info:'jogos'},{value:`${sc.sets.athlete}–${sc.sets.opponent} (${pct(sc.sets.athlete,sc.sets.athlete+sc.sets.opponent)}% atleta)`,label:'placar de sets',info:'jogos'}]);renderComparisonTable($('#gameComparisonTable'),a);renderGameParameterTrend(g);renderBars($('#gameEndingChart'),countBy(a.athleteEndings,'ending'),a.athleteEndings.length);renderBars($('#gameStrokeChart'),countBy(a.athleteErrors,'stroke'),a.athleteErrors.length);renderBars($('#gamePlaceChart'),countBy(a.athleteErrors,'place'),a.athleteErrors.length);renderPresenceChart($('#gamePresenceChart'),g);bindComparisonInfo($('#gamePresenceChart').closest('.detail-group'));renderBars($('#gameOpponentEndingChart'),countBy(a.opponentEndings,'ending'),a.opponentEndings.length);renderBars($('#gameOpponentStrokeChart'),countBy(a.opponentErrors,'stroke'),a.opponentErrors.length);renderBars($('#gameOpponentPlaceChart'),countBy(a.opponentErrors,'place'),a.opponentErrors.length);renderCoachNotes($('#gameCoachNotes'),a,'player');renderCoachNotes($('#gameOpponentNotes'),a,'opponent');showScreen('gameDetail');}
function pdocText(doc,txt,x,y,size=7,col=[31,41,55],bold=false,opt={}){doc.setTextColor(...col);doc.setFont('helvetica',bold?'bold':'normal');doc.setFontSize(size);doc.text(pdfSafe(txt),x,y,opt)}
function pdocCard(doc,x,y,w,h){const t=pdfTheme();doc.setDrawColor(...t.line);doc.setFillColor(255,255,255);doc.roundedRect(x,y,w,h,3,3,'FD')}
function pdocLine(doc,x1,y1,x2,y2,col,w=.4){doc.setDrawColor(...col);doc.setLineWidth(w);doc.line(x1,y1,x2,y2)}
function onePageHeader(doc,sub,title,period){const t=pdfTheme();pdocText(doc,sub.toUpperCase(),14,14,6.8,t.accent,true);pdocText(doc,title,14,24,15,t.ink,true);pdocText(doc,period,14,31,7.5,t.ink,true);pdocLine(doc,14,37,196,37,t.line,.5)}
function oneKpi(doc,x,y,w,label,value,sub){const t=pdfTheme();pdocCard(doc,x,y,w,18);pdocText(doc,label,x+3,y+5.5,5.8,t.muted,true);pdocText(doc,value,x+3,y+13.3,9.2,t.ink,true);if(sub)pdocText(doc,sub,x+w-3,y+13.2,5.2,t.muted,false,{align:'right'})}
function oneBar(doc,x,y,w,h,title,obj,den){const t=pdfTheme();pdocCard(doc,x,y,w,h);pdocText(doc,title.toUpperCase(),x+3,y+6,6.1,t.accent,true);const entries=Object.entries(obj||{}).filter(([,v])=>v>0).sort((a,b)=>b[1]-a[1]).slice(0,5),max=Math.max(1,...entries.map(([,v])=>v));let yy=y+14;if(!entries.length){pdocText(doc,'Sem dados.',x+3,yy,6.5,t.muted);return}entries.forEach(([k,v])=>{const bw=w-28,total=den||entries.reduce((s,[,vv])=>s+vv,0)||1;pdocText(doc,pdfLabel(k),x+3,yy,5.7,t.ink);doc.setFillColor(238,241,245);doc.roundedRect(x+3,yy+2,bw,2.3,1,1,'F');doc.setFillColor(...t.cyan);doc.roundedRect(x+3,yy+2,Math.max(1,bw*v/max),2.3,1,1,'F');pdocText(doc,`${v} (${pct(v,total)}%)`,x+w-3,yy+3.5,5.5,t.ink,true,{align:'right'});yy+=8})}
function oneLine(doc,x,y,w,h,title,vals,ref){const t=pdfTheme();pdocCard(doc,x,y,w,h);pdocText(doc,title.toUpperCase(),x+3,y+6,5.8,t.accent,true);const px=x+12,py=y+14,pw=w-19,ph=h-26;[0,25,50,75,100].forEach(v=>{const yy=py+ph-(v/100)*ph;pdocLine(doc,px,yy,px+pw,yy,t.line,.25);pdocText(doc,`${v}%`,px-2,yy+1.5,4.8,t.muted,false,{align:'right'})});if(ref){const yy=py+ph-(ref/100)*ph;doc.setLineDashPattern([2,2],0);pdocLine(doc,px,yy,px+pw,yy,t.yellow,.45);doc.setLineDashPattern([],0);pdocText(doc,`Ref. ${ref}%`,px+pw,yy-1.2,4.8,t.yellow,true,{align:'right'})}const n=vals.length||1,pts=vals.map((d,i)=>({x:px+(n===1?pw/2:i*pw/(n-1)),y:py+ph-(Math.max(0,Math.min(100,d.value))/100)*ph,label:d.label}));doc.setDrawColor(...t.cyan);doc.setLineWidth(.9);for(let i=0;i<pts.length-1;i++)doc.line(pts[i].x,pts[i].y,pts[i+1].x,pts[i+1].y);pts.forEach((p,i)=>{doc.setFillColor(...t.cyan);doc.circle(p.x,p.y,1.3,'F');if(i===0||i===pts.length-1||i%Math.ceil(n/4)===0)pdocText(doc,p.label,p.x,y+h-4,4.7,t.muted,false,{align:'center'})})}
function onePresence(doc,x,y,w,h,game){const t=pdfTheme();pdocCard(doc,x,y,w,h);pdocText(doc,'PRESENÇA NO JOGO',x+3,y+6,5.8,t.accent,true);const data=presenceData(game),px=x+13,py=y+14,pw=w-20,ph=h-31;[-100,-50,0,50,100].forEach(v=>{const yy=py+ph-((v+100)/200)*ph;pdocLine(doc,px,yy,px+pw,yy,v===0?[160,170,180]:t.line,v===0?.6:.25);pdocText(doc,String(v),px-2,yy+1.5,4.7,t.muted,false,{align:'right'})});const n=data.length||1;const draw=(key,col)=>{const pts=data.map((d,i)=>({x:px+(n===1?pw/2:i*pw/(n-1)),y:py+ph-((d[key]+100)/200)*ph,label:d.label}));doc.setDrawColor(...col);doc.setLineWidth(.9);for(let i=0;i<pts.length-1;i++)doc.line(pts[i].x,pts[i].y,pts[i+1].x,pts[i+1].y);pts.forEach(p=>{doc.setFillColor(...col);doc.circle(p.x,p.y,1,'F')})};draw('athlete',t.cyan);draw('opponent',[49,139,190]);if(data.length){[0,Math.floor((data.length-1)/2),data.length-1].forEach(i=>pdocText(doc,data[i].label,px+(n===1?pw/2:i*pw/(n-1)),y+h-5,4.5,t.muted,false,{align:'center'}))}pdocText(doc,'Linha acima de zero indica quem está mais presente; cruzamentos indicam mudança de domínio.',x+3,y+h-1.5,4.4,t.muted)}
function oneRadar(doc,x,y,w,h,a,title='RADAR TÉCNICO'){const t=pdfTheme();pdocCard(doc,x,y,w,h);pdocText(doc,title.toUpperCase(),x+3,y+6,5.8,t.accent,true);const vals=[a.winPct,a.consistency,a.aggression,pct(a.serveWon,a.serveTotal),pct(a.returnWon,a.returnTotal),pct(a.pressureWon,a.pressureCount)],names=['Pontos','Cons.','Agr.','Saq.','Dev.','Pres.'],cx=x+w/2,cy=y+h/2+3,R=Math.min(w,h)*.27,n=6;const point=(i,r)=>{const ang=-Math.PI/2+i*2*Math.PI/n;return[cx+Math.cos(ang)*R*r,cy+Math.sin(ang)*R*r]};for(const r of [.25,.5,.75,1]){const pts=names.map((_,i)=>point(i,r));doc.setDrawColor(225,229,235);doc.setLineWidth(.25);for(let i=0;i<pts.length;i++){const a1=pts[i],b=pts[(i+1)%pts.length];doc.line(a1[0],a1[1],b[0],b[1])}}const pts=vals.map((v,i)=>point(i,Math.max(0,Math.min(100,v))/100));doc.setDrawColor(...t.cyan);doc.setLineWidth(1);for(let i=0;i<pts.length;i++){const a1=pts[i],b=pts[(i+1)%pts.length];doc.line(a1[0],a1[1],b[0],b[1])}pts.forEach(pt=>{doc.setFillColor(...t.cyan);doc.circle(pt[0],pt[1],1.4,'F')});names.forEach((nm,i)=>{const[lx,ly]=point(i,1.25);pdocText(doc,nm,lx,ly,4.7,t.muted,true,{align:'center'})})}
function exportPeriodPdf(){const JS=pdfCheckLib();if(!JS)return;const games=loadGames().filter(inPeriod),a=analyze(games),doc=new JS({orientation:'portrait',unit:'mm',format:'a4'}),t=pdfTheme();onePageHeader(doc,'AveliCoach - Painel do treinador','Métricas do mês',`${$('#periodStart').value||''} a ${$('#periodEnd').value||''}`);const kw=(182-4*3)/5;[['Jogos',String(games.length),'período'],['Pontos',String(a.total),'registrados'],['Vencidos',absPct(a.won,a.knownWinnerPoints.length),'atleta'],['Erros',absPct(a.athleteErrors.length,a.athleteRelated.length||a.total),'atleta'],['Melhor fonte',pdfLabel(Object.entries(countBy(a.positiveAthlete,'ending')).sort((x,y)=>y[1]-x[1])[0]?.[0]||'—'),'']].forEach((k,i)=>oneKpi(doc,14+i*(kw+3),44,kw,k[0],k[1],k[2]));pdocCard(doc,14,68,78,42);pdocText(doc,'LEITURA RESUMIDA',17,75,6.1,t.accent,true);addWrappedText(doc,simplePhrase(a),17,84,72,{lineHeight:3.8});oneBar(doc,96,68,50,42,'Pontos terminaram',countBy(a.points,'ending'),a.total);oneBar(doc,150,68,46,42,'Erros por golpe',countBy(a.athleteErrors,'stroke'),a.athleteErrors.length);const cw=(182-5*3)/6;[['Saque',absPct(a.serveWon,a.serveTotal),'≥62%'],['Devol.',absPct(a.returnWon,a.returnTotal),'≥42%'],['Pressão',absPct(a.pressureWon,a.pressureCount),'≥58%'],['Agress.',`${a.aggression}%`,'≥38%'],['Consist.',`${a.consistency}%`,'≥74%'],['Constr.',absPct(a.constructionCount,a.athleteRelated.length),'≥24%']].forEach((c,i)=>oneKpi(doc,14+i*(cw+3),118,cw,c[0],c[1],c[2]));const trendGames=games.slice(-6);const vals=(trendGames.length?trendGames:games).map(g=>{const aa=analyze([g]);return{label:formatShortDate(g.date),value:pct(aa.serveWon,aa.serveTotal)}});oneLine(doc,14,144,84,61,'Evolução: saque',vals,62);oneRadar(doc,102,144,47,61,a);pdfSmallRows(doc,153,144,43,61,'Notas', [['Saque',`${pct(a.serveWon,a.serveTotal)}%`],['Devol.',`${pct(a.returnWon,a.returnTotal)}%`],['Erro caro',pdfLabel(Object.entries(countBy(a.athleteErrors,'stroke')).sort((x,y)=>y[1]-x[1])[0]?.[0]||'—')],['Lugar',pdfLabel(Object.entries(countBy(a.athleteErrors,'place')).sort((x,y)=>y[1]-x[1])[0]?.[0]||'—')]]);pdocCard(doc,14,212,182,54);pdocText(doc,'DISTRIBUIÇÃO E LEITURA FINAL',17,219,6.1,t.accent,true);addWrappedText(doc,`Síntese: ${simplePhrase(a)} Prioridade: reduzir vazamentos por erro, melhorar devolução e acompanhar presença nos momentos de pressão.`,17,229,176,{lineHeight:4});pdocText(doc,'AVELICOACH',14,288,6,t.accent,true);doc.save(`avelicoach-metricas-mes-${$('#periodStart').value||'inicio'}-${$('#periodEnd').value||'fim'}.pdf`)}
function exportGamePdf(){const JS=pdfCheckLib();if(!JS)return;const g=loadGames().find(x=>x.id===state.selectedGameId);if(!g)return;const a=analyze([g]),sc=recalcScore(g.points||[]),doc=new JS({orientation:'portrait',unit:'mm',format:'a4'}),t=pdfTheme();onePageHeader(doc,'AveliCoach - Relatório do jogo','Registro e leitura de jogo',`${g.date||''} - vs ${g.opponent||'Adversário'}`);const kw=(182-5*3)/6;[['Pontos',`${a.won}-${a.lost}`,`${a.winPct}%`],['Games',`${sc.totalGames.athlete}-${sc.totalGames.opponent}`,'total'],['Sets',`${sc.sets.athlete}-${sc.sets.opponent}`,'placar'],['Saque',`${pct(a.serveWon,a.serveTotal)}%`,'≥62%'],['Devol.',`${pct(a.returnWon,a.returnTotal)}%`,'≥42%'],['Erros',String(a.athleteErrors.length),'atleta']].forEach((k,i)=>oneKpi(doc,14+i*(kw+3),44,kw,k[0],k[1],k[2]));oneBar(doc,14,68,54,54,'Como terminou',countBy(a.athleteEndings,'ending'),a.athleteEndings.length);oneBar(doc,72,68,54,54,'Erros jogador',countBy(a.athleteErrors,'stroke'),a.athleteErrors.length);onePresence(doc,130,68,66,54,g);const rows=comparisonRows(a).slice(0,6);pdocCard(doc,14,130,182,48);pdocText(doc,'COMPARATIVO TÉCNICO',17,137,6.1,t.accent,true);pdocText(doc,'Métrica',17,146,5.8,t.muted,true);pdocText(doc,'Jogador',82,146,5.8,t.muted,true);pdocText(doc,'Adversário',120,146,5.8,t.muted,true);pdocText(doc,'Ref.',166,146,5.8,t.muted,true);rows.forEach((r,i)=>{const yy=154+i*6;pdocText(doc,r.label,17,yy,5.5,t.muted);pdocText(doc,r.left,85,yy,5.7,t.ink,true,{align:'center'});pdocText(doc,r.mid,126,yy,5.7,t.ink,true,{align:'center'});pdocText(doc,r.ref,176,yy,5.7,t.ink,true,{align:'center'})});const games=getGamesLastYearFor(g),def=comparisonMetricDefs[state.gameTrendMetric]||comparisonMetricDefs.pontos_vencidos,vals=games.map(gg=>{const aa=analyze([gg]);return{label:formatShortDate(gg.date),value:def.player(aa).pct}});oneLine(doc,14,186,74,58,`Evolução - ${def.label}`,vals,def.benchmark);oneRadar(doc,92,186,48,58,a,'Radar do jogo');pdfSmallRows(doc,144,186,52,58,'Notas rápidas', [['Fonte +',pdfLabel(Object.entries(countBy(a.positiveAthlete,'ending')).sort((x,y)=>y[1]-x[1])[0]?.[0]||'—')],['Erro caro',pdfLabel(Object.entries(countBy(a.athleteErrors,'stroke')).sort((x,y)=>y[1]-x[1])[0]?.[0]||'—')],['Pressão',`${pct(a.pressureWon,a.pressureCount)}%`],['Tipo',pdfLabel(Object.entries(countBy(a.points,'playType')).sort((x,y)=>y[1]-x[1])[0]?.[0]||'—')]]);pdocCard(doc,14,252,182,25);pdocText(doc,'LEITURA DO TREINADOR',17,259,6.1,t.accent,true);addWrappedText(doc,`${simplePhrase(a)} O gráfico de presença ajuda a localizar quedas, retomadas e inversões de domínio durante o jogo.`,17,267,176,{lineHeight:3.8});pdocText(doc,'AVELICOACH',14,288,6,t.accent,true);doc.save(`avelicoach-jogo-${g.date||'sem-data'}-${pdfFileSafe(g.opponent||'adversario')}.pdf`)}
function bind(){$('#newGameBtn').onclick=newGame;$('#homeBtn').onclick=()=>showScreen('home');$$('.choice').forEach(btn=>btn.onclick=()=>handleChoice(btn));$('#pointForm').onsubmit=savePoint;$('#undoPointBtn').onclick=undoPoint;$('#finishGameBtn').onclick=()=>openMetaDialog(true);$('#matchMetaForm').addEventListener('submit',e=>{e.preventDefault();saveMeta();showScreen('home')});$('#saveMetaContinueBtn').onclick=saveMetaAndContinue;$('#cancelMetaBtn').onclick=()=>$('#matchMetaDialog').close();$('#periodStart').onchange=renderPanel;$('#periodEnd').onchange=renderPanel;$('#exportPeriodJsonBtn').onclick=exportPeriod;$('#exportBackupBtn').onclick=exportBackup;$('#exportPdfBtn').onclick=exportPeriodPdf;$('#closeDetailBtn').onclick=()=>showScreen('home');$('#continueGameBtn').onclick=()=>continueGame(state.selectedGameId);$('#exportGameJsonBtn').onclick=exportGame;const pdfBtn=$('#exportGamePdfBtn');if(pdfBtn)pdfBtn.onclick=exportGamePdf;$('#deleteGameBtn').onclick=deleteGame;$('#closeInfoBtn').onclick=()=>$('#infoDialog').close();$$('.seg-btn').forEach(btn=>btn.onclick=()=>{state.trendGranularity=btn.dataset.granularity;renderPanel()})}


bind(); monthDefaults(); renderChoices(); renderPanel();


/* === AveliCoach 2.2.1 — ajustes de relatório, placar e nomenclatura === */
function metricObj221(count,total){ const den = Number(total)||0; const pctValue = den ? pct(count, den) : 0; return {count, total:den, pct:pctValue, display:`${count}/${den} (${pctValue}%)`}; }
function metricIdx221(value){ const v = Number(value)||0; return {count:v,total:100,pct:v,display:`${v}%`}; }
Object.assign(infoTexts, {
  comp_pontos_vencidos: {title:'Total points won (Pontos vencidos)', html: raw`<p>Percentual de pontos vencidos em relação ao total de pontos com vencedor identificado.</p><div class="formula">\(\text{Total points won \%} = \frac{\text{pontos vencidos}}{\text{pontos com vencedor informado}}\times 100\)</div><p>Serve como leitura geral de domínio no placar de pontos.</p>`},
  comp_pontos_saque: {title:'Service points won (Pontos vencidos no saque)', html: raw`<p>Percentual de pontos vencidos quando o lado analisado estava sacando.</p><div class="formula">\(\text{Service points won \%} = \frac{\text{pontos vencidos sacando}}{\text{total de pontos sacando}}\times 100\)</div><p>Mostra se o saque está sustentando os games de serviço.</p>`},
  comp_pontos_devolucao: {title:'Return points won (Pontos vencidos na devolução)', html: raw`<p>Percentual de pontos vencidos quando o lado analisado estava devolvendo.</p><div class="formula">\(\text{Return points won \%} = \frac{\text{pontos vencidos devolvendo}}{\text{total de pontos devolvendo}}\times 100\)</div><p>Mostra a capacidade de pressionar o saque adversário.</p>`},
  comp_pontos_pressao: {title:'Pressure points won (Pontos vencidos sob pressão)', html: raw`<p>Percentual de pontos vencidos em pontos marcados como pressão ou identificados automaticamente como break point, game point, set point, match point ou tie-break.</p><div class="formula">\(\text{Pressure points won \%} = \frac{\text{pontos de pressão vencidos}}{\text{total de pontos de pressão}}\times 100\)</div><p>Ajuda a avaliar tomada de decisão e controle nos pontos de maior peso.</p>`},
  comp_pontos_positivos: {title:'Positive points (Pontos positivos)', html: raw`<p>Pontos vencidos por ação positiva: winner, passada, ace/saque direto ou ponto construído.</p><div class="formula">\(\text{Positive points \%} = \frac{\text{winner + passada + ace + ponto construído}}{\text{pontos ligados ao lado}}\times 100\)</div><p>Quanto maior, mais o lado produziu pontos por iniciativa própria.</p>`},
  comp_pontos_erro: {title:'Errors (Erros)', html: raw`<p>Pontos perdidos por erro ou dupla falta.</p><div class="formula">\(\text{Errors \%} = \frac{\text{erros + duplas faltas}}{\text{pontos ligados ao lado}}\times 100\)</div><p>Indicador de vazamento técnico. Quanto menor, melhor.</p>`},
  comp_erro_forcado: {title:'Forced errors (Erros forçados)', html: raw`<p>Estimativa dos erros ocorridos em contexto de pressão real, defesa, corrida ou aperto de tempo.</p><div class="formula">\(\text{Forced errors \%} = \frac{\text{erros forçados estimados}}{\text{erros totais do lado}}\times 100\)</div><p>Como o registro é rápido, a classificação é estimada pelo contexto marcado.</p>`},
  comp_erro_nao_forcado: {title:'Unforced errors (Erros não forçados)', html: raw`<p>Estimativa dos erros em situação mais controlada, sem pressão suficiente registrada para classificar como erro forçado.</p><div class="formula">\(\text{Unforced errors \%} = \frac{\text{erros não forçados estimados}}{\text{erros totais do lado}}\times 100\)</div><p>Quanto menor, melhor.</p>`},
  comp_agressividade: {title:'Controlled aggression (Agressividade controlada)', html: raw`<p>Índice sintético de iniciativa com controle.</p><div class="formula">\(\text{Controlled aggression} \approx \frac{1{,}4\times\text{pontos positivos}-0{,}8\times\text{erros}+0{,}2\times\text{pontos vencidos}}{\text{pontos ligados ao lado}}\times 100\)</div><p>Distingue atacar com critério de acelerar sem controle.</p>`},
  comp_consistencia: {title:'Rally consistency (Consistência de troca)', html: raw`<p>Índice de solidez e permanência no ponto.</p><div class="formula">\(\text{Rally consistency} = 100 - \left(\frac{\text{erros}}{\text{pontos ligados ao lado}}\times 100\right)\)</div><p>Quanto maior, menor a taxa de pontos entregues.</p>`},
  comp_construcao: {title:'Point construction (Construção do ponto)', html: raw`<p>Percentual de pontos com construção tática, troca ou ponto construído.</p><div class="formula">\(\text{Point construction \%} = \frac{\text{pontos construídos ou de troca}}{\text{pontos ligados ao lado}}\times 100\)</div><p>Ajuda a ver se o jogador organiza o ponto antes da definição.</p>`},
  comp_dupla_falta: {title:'Double faults (Duplas faltas)', html: raw`<p>Quantidade e percentual de duplas faltas sobre os pontos de saque.</p><div class="formula">\(\text{Double faults \%} = \frac{\text{duplas faltas}}{\text{total de pontos sacando}}\times 100\)</div><p>Indicador crítico de custo no serviço. Quanto menor, melhor.</p>`},
  comp_saque_direto: {title:'Aces / service winners (Aces / saques diretos)', html: raw`<p>Pontos diretos de saque ou saques que geraram ponto imediato.</p><div class="formula">\(\text{Aces / service winners \%} = \frac{\text{aces ou saques diretos}}{\text{total de pontos sacando}}\times 100\)</div><p>Se o registro não distinguir ace puro de saque direto, o app agrupa ambos.</p>`}
});
Object.assign(comparisonMetricDefs, {
  pontos_vencidos: { label:'Total points won (Pontos vencidos)', info:'comp_pontos_vencidos', benchmark:55, ref:'≥ 55%', refSub:'Meta COSAT U14', player:a=>metricObj221(a.won,a.knownWinnerPoints.length), opp:a=>metricObj221(a.lost,a.knownWinnerPoints.length) },
  saque: { label:'Service points won (Pontos vencidos no saque)', info:'comp_pontos_saque', benchmark:62, ref:'≥ 62%', refSub:'Meta COSAT U14', player:a=>metricObj221(a.serveWon,a.serveTotal), opp:a=>metricObj221(a.returnLost,a.returnTotal) },
  devolucao: { label:'Return points won (Pontos vencidos na devolução)', info:'comp_pontos_devolucao', benchmark:42, ref:'≥ 42%', refSub:'Meta COSAT U14', player:a=>metricObj221(a.returnWon,a.returnTotal), opp:a=>metricObj221(a.serveLost,a.serveTotal) },
  pressao: { label:'Pressure points won (Pontos vencidos sob pressão)', info:'comp_pontos_pressao', benchmark:58, ref:'≥ 58%', refSub:'Meta COSAT U14', player:a=>metricObj221(a.pressureWon,a.pressureCount), opp:a=>metricObj221(a.pressureLost,a.pressureCount) },
  pontos_positivos: { label:'Positive points (Pontos positivos)', info:'comp_pontos_positivos', benchmark:22, ref:'≥ 22%', refSub:'Meta COSAT U14', player:a=>metricObj221(a.positiveAthlete.length,a.athleteRelated.length), opp:a=>metricObj221(a.positiveOpponent.length,a.opponentRelated.length) },
  pontos_erro: { label:'Errors (Erros)', info:'comp_pontos_erro', benchmark:18, ref:'≤ 18%', refSub:'Quanto menor, melhor', player:a=>metricObj221(a.athleteErrors.length,a.athleteRelated.length||a.total), opp:a=>metricObj221(a.opponentErrors.length,a.opponentRelated.length||a.total) },
  erros_forcados: { label:'Forced errors (Erros forçados)', info:'comp_erro_forcado', benchmark:10, ref:'≤ 10%', refSub:'Faixa de controle', player:a=>metricObj221(a.athleteForcedErrors.length,a.athleteErrors.length), opp:a=>metricObj221(a.opponentForcedErrors.length,a.opponentErrors.length) },
  erros_nao_forcados: { label:'Unforced errors (Erros não forçados)', info:'comp_erro_nao_forcado', benchmark:14, ref:'≤ 14%', refSub:'Quanto menor, melhor', player:a=>metricObj221(a.athleteUnforcedErrors.length,a.athleteErrors.length), opp:a=>metricObj221(a.opponentUnforcedErrors.length,a.opponentErrors.length) },
  agressividade: { label:'Controlled aggression (Agressividade controlada)', info:'comp_agressividade', benchmark:38, ref:'≥ 38%', refSub:'Meta COSAT U14', player:a=>metricIdx221(a.aggression), opp:a=>metricIdx221(a.aggressionOpp) },
  consistencia: { label:'Rally consistency (Consistência de troca)', info:'comp_consistencia', benchmark:74, ref:'≥ 74%', refSub:'Meta COSAT U14', player:a=>metricIdx221(a.consistency), opp:a=>metricIdx221(a.consistencyOpp) },
  construcao: { label:'Point construction (Construção do ponto)', info:'comp_construcao', benchmark:24, ref:'≥ 24%', refSub:'Meta COSAT U14', player:a=>metricObj221(a.constructionCount,a.athleteRelated.length), opp:a=>metricObj221(a.constructionOppCount,a.opponentRelated.length) },
  dupla_falta: { label:'Double faults (Duplas faltas)', info:'comp_dupla_falta', benchmark:4, ref:'≤ 4%', refSub:'Quanto menor, melhor', player:a=>metricObj221(a.athleteDoubleFaults.length,a.serveTotal), opp:a=>metricObj221(a.opponentDoubleFaults.length,a.returnTotal) },
  aces: { label:'Aces / service winners (Aces / saques diretos)', info:'comp_saque_direto', benchmark:6, ref:'≥ 6%', refSub:'Meta COSAT U14', player:a=>metricObj221(a.athleteAces.length,a.serveTotal), opp:a=>metricObj221(a.opponentAces.length,a.returnTotal) }
});
function comparisonRows(a){
  return [
    {key:'pontos_vencidos', leftSub:'pontos vencidos pelo jogador', midSub:'pontos vencidos pelo adversário'},
    {key:'saque', leftSub:'pontos vencidos sacando', midSub:'pontos vencidos sacando'},
    {key:'devolucao', leftSub:'pontos vencidos devolvendo', midSub:'pontos vencidos devolvendo'},
    {key:'pressao', leftSub:'pontos vencidos sob pressão', midSub:'pontos vencidos sob pressão'},
    {key:'pontos_positivos', leftSub:'winner/passada/ace/construído', midSub:'winner/passada/ace/construído'},
    {key:'pontos_erro', leftSub:'pontos perdidos por erro', midSub:'pontos perdidos por erro'},
    {key:'erros_forcados', leftSub:'entre os erros do jogador', midSub:'entre os erros do adversário'},
    {key:'erros_nao_forcados', leftSub:'entre os erros do jogador', midSub:'entre os erros do adversário'},
    {key:'agressividade', leftSub:'índice técnico', midSub:'índice técnico'},
    {key:'consistencia', leftSub:'índice de solidez', midSub:'índice de solidez'},
    {key:'construcao', leftSub:'pontos com construção', midSub:'pontos com construção'},
    {key:'dupla_falta', leftSub:'sobre pontos de saque', midSub:'sobre pontos de saque'},
    {key:'aces', leftSub:'sobre pontos de saque', midSub:'sobre pontos de saque'}
  ].map(item => {
    const def = comparisonMetricDefs[item.key];
    const left = def.player(a); const mid = def.opp(a);
    return {...item, label:def.label, info:def.info, ref:def.ref, refSub:def.refSub, left:left.display, mid:mid.display};
  });
}
function scoreTimeline(game){
  const score={sets:{athlete:0,opponent:0},games:{athlete:0,opponent:0},points:{athlete:0,opponent:0},totalGames:{athlete:0,opponent:0},scoredPoints:{athlete:0,opponent:0}};
  const setScores=[]; const gameEvents=[]; let currentSet=1;
  (game.points||[]).filter(p=>['athlete','opponent'].includes(p.winner)).forEach((p,i)=>{
    score.scoredPoints[p.winner]++; score.points[p.winner]++;
    const a=score.points.athlete,o=score.points.opponent;
    if((a>=4||o>=4) && Math.abs(a-o)>=2){
      const gw=a>o?'athlete':'opponent'; score.games[gw]++; score.totalGames[gw]++;
      gameEvents.push({index:i,time:(p.savedTime||(p.savedAtLocal||'').slice(11,19)||(p.createdAt||'').slice(11,19)||''),set:currentSet,games:{athlete:score.games.athlete,opponent:score.games.opponent},winner:gw});
      score.points={athlete:0,opponent:0};
      const ga=score.games.athlete,go=score.games.opponent;
      if(((ga>=6||go>=6)&&Math.abs(ga-go)>=2)||ga===7||go===7){
        const sw=ga>go?'athlete':'opponent'; score.sets[sw]++;
        setScores.push({set:currentSet,athlete:ga,opponent:go,winner:sw});
        currentSet++; score.games={athlete:0,opponent:0};
      }
    }
  });
  if(score.games.athlete||score.games.opponent){ setScores.push({set:currentSet,athlete:score.games.athlete,opponent:score.games.opponent,winner:null,current:true}); }
  return {...score,setScores,gameEvents};
}
function setScoreText(sc){ return sc.setScores.length ? sc.setScores.map(s=>`${s.athlete}–${s.opponent}${s.current?'*':''}`).join(' | ') : '0–0'; }
function setScoreLong(sc){ return sc.setScores.length ? sc.setScores.map(s=>`Set ${s.set}: ${s.athlete}–${s.opponent}${s.current?'*':''}`).join(' · ') : 'Set atual: 0–0'; }
function gameEvolutionText(game){ const sc=scoreTimeline(game); if(!sc.gameEvents.length) return 'Evolução dos games: ainda sem games fechados.'; const bySet={}; sc.gameEvents.forEach(ev=>{bySet[ev.set] ||= []; bySet[ev.set].push(`${ev.games.athlete}–${ev.games.opponent}`);}); return 'Evolução dos games: '+Object.keys(bySet).map(k=>`Set ${k}: ${bySet[k].join(' · ')}`).join(' | '); }
function openGameDetail(id){
  const g=loadGames().find(x=>x.id===id);if(!g)return;state.selectedGameId=id;state.gameTrendMetric='pontos_vencidos';
  const a=analyze([g]),sc=recalcScore(g.points||[]),tl=scoreTimeline(g);
  $('#detailTitle').textContent=`${g.date} • vs ${g.opponent||'Adversário'}`;$('#detailSubtitle').textContent=`${g.tournament||'Sem campeonato'} • ${g.startTime||''}${g.endTime?' às '+g.endTime:''}`;
  $('#bannerSetScore').textContent=`${tl.sets.athlete}–${tl.sets.opponent}`; $('#bannerGameScore').textContent=setScoreText(tl); $('#bannerPointScore').textContent=`${a.won}–${a.lost}`; $('#bannerScoreText').textContent=`Placar por set: ${setScoreLong(tl)}. Games totais: ${tl.totalGames.athlete}–${tl.totalGames.opponent} • Pontos totais: ${a.won}–${a.lost}.`;
  renderMetricCards($('#gameSimpleCards'),[{value:absPct(a.won,a.knownWinnerPoints.length),label:'pontos vencidos pelo atleta',info:'aproveitamento'},{value:absPct(a.positiveAthlete.length,a.athleteRelated.length),label:'pontos positivos do atleta',info:'agressividade'},{value:absPct(a.athleteErrors.length,a.athleteRelated.length||a.total),label:'pontos entregues por erro',info:'errosAtleta'},{value:absPct(a.pressureWon,a.pressureCount),label:'pontos de pressão',info:'pressao',trend:'pressao'}]);
  $('#gameSimpleText').textContent=simplePhrase(a);renderMetricCards($('#gameMatchCards'),[{value:absPct(a.total,a.total),label:'pontos registrados no jogo',info:'pontos'},{value:`${a.won}–${a.lost} (${a.winPct}% atleta)`,label:'placar de pontos',info:'aproveitamento'},{value:setScoreText(tl),label:'placar por set',info:'jogos'},{value:`${tl.totalGames.athlete}–${tl.totalGames.opponent} (${pct(tl.totalGames.athlete,tl.totalGames.athlete+tl.totalGames.opponent)}% atleta)`,label:'games totais',info:'jogos'}]);
  renderComparisonTable($('#gameComparisonTable'),a);renderGameParameterTrend(g);renderBars($('#gameEndingChart'),countBy(a.athleteEndings,'ending'),a.athleteEndings.length);renderBars($('#gameStrokeChart'),countBy(a.athleteErrors,'stroke'),a.athleteErrors.length);renderBars($('#gamePlaceChart'),countBy(a.athleteErrors,'place'),a.athleteErrors.length);renderPresenceChart($('#gamePresenceChart'),g);bindComparisonInfo($('#gamePresenceChart').closest('.detail-group'));renderBars($('#gameOpponentEndingChart'),countBy(a.opponentEndings,'ending'),a.opponentEndings.length);renderBars($('#gameOpponentStrokeChart'),countBy(a.opponentErrors,'stroke'),a.opponentErrors.length);renderBars($('#gameOpponentPlaceChart'),countBy(a.opponentErrors,'place'),a.opponentErrors.length);renderCoachNotes($('#gameCoachNotes'),a,'player');renderCoachNotes($('#gameOpponentNotes'),a,'opponent');showScreen('gameDetail');
}
function renderPresenceChart(target,game){
  const data=presenceData(game);if(!data.length){target.innerHTML='<p class="muted">Sem pontos suficientes para mostrar presença no tempo.</p>';return;}
  const W=900,H=300,m={l:52,r:18,t:24,b:44},pw=W-m.l-m.r,ph=H-m.t-m.b;const x=i=>m.l+(data.length===1?pw/2:i*pw/(data.length-1));const y=v=>m.t+ph-((v+100)/200)*ph;const path=key=>data.map((d,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(d[key]).toFixed(1)).join(' ');const ticks=[-100,-50,0,50,100],step=Math.max(1,Math.ceil(data.length/6));
  const evs=scoreTimeline(game).gameEvents; const vlines=evs.map(ev=>`<line class="presence-game-line" x1="${x(Math.min(ev.index,data.length-1)).toFixed(1)}" x2="${x(Math.min(ev.index,data.length-1)).toFixed(1)}" y1="${m.t}" y2="${H-m.b}"></line>`).join('');
  target.innerHTML=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Presença no jogo">${ticks.map(t=>`<line class="${t===0?'presence-line-zero':'presence-grid'}" x1="${m.l}" x2="${W-m.r}" y1="${y(t)}" y2="${y(t)}"></line><text class="presence-axis-label" x="${m.l-8}" y="${y(t)+4}" text-anchor="end">${t}</text>`).join('')}${vlines}<path class="presence-player" d="${path('athlete')}"></path><path class="presence-opponent" d="${path('opponent')}"></path>${data.map((d,i)=>`<circle class="presence-dot-player" cx="${x(i)}" cy="${y(d.athlete)}" r="2.5"></circle><circle class="presence-dot-opponent" cx="${x(i)}" cy="${y(d.opponent)}" r="2.5"></circle>`).join('')}${data.map((d,i)=>i%step===0||i===data.length-1?`<text class="presence-axis-label" x="${x(i)}" y="${H-16}" text-anchor="middle">${escapeHtml(d.label)}</text>`:'').join('')}<circle class="presence-dot-player" cx="${m.l}" cy="14" r="5"></circle><text class="presence-axis-label" x="${m.l+10}" y="18">Jogador</text><circle class="presence-dot-opponent" cx="${m.l+82}" cy="14" r="5"></circle><text class="presence-axis-label" x="${m.l+92}" y="18">Adversário</text><line class="presence-game-line" x1="${W-180}" x2="${W-162}" y1="14" y2="14"></line><text class="presence-axis-label" x="${W-156}" y="18">fim de game</text></svg><div class="game-evolution-text">${escapeHtml(gameEvolutionText(game))}</div>`;
}
function makeReportHtml(title,subtitle,body){return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>:root{--ink:#142023;--muted:#637879;--green:#51e0a4;--blue:#55b8ff;--yellow:#ffc85a;--line:#31515a;--panel:#f3f8f6}*{box-sizing:border-box}body{margin:0;background:#fff;color:var(--ink);font-family:Inter,Segoe UI,Arial,sans-serif}.page{width:1120px;min-height:790px;margin:0 auto;padding:22px}header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #a8b7b6;padding-bottom:10px;margin-bottom:10px}h1{font-size:27px;margin:0}header p{margin:4px 0 0;color:#91aaa9}.date{font-weight:800;font-size:18px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.card{border:1.5px solid #9fb3b1;background:#f7fbfa;border-radius:10px;padding:10px;min-height:80px}h2{font-size:15px;margin:0 0 4px}.kpis{display:grid;grid-template-columns:repeat(6,1fr);gap:8px}.kpi{border:1.5px solid #31515a;border-radius:9px;background:#f1f7f5;text-align:center;padding:8px}.kpi b{font-size:22px;color:#088466;display:block}.muted{color:#718987;font-size:12px}.bar{display:grid;grid-template-columns:100px 1fr 48px;gap:7px;align-items:center;font-size:12px;margin:6px 0}.track{height:8px;background:#dbe7e4;border-radius:99px;overflow:hidden}.fill{height:100%;background:linear-gradient(90deg,#51e0a4,#55b8ff)}table{width:100%;border-collapse:collapse;font-size:11px}td,th{border-bottom:1px solid #d7e1df;padding:4px;text-align:left}.mini{font-size:11px}.full{grid-column:1/-1}</style></head><body><main class="page"><header><div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(subtitle)}</p></div><div class="date">${new Date().toLocaleDateString('pt-BR')}</div></header>${body}</main></body></html>`}
function barsHtml(title,obj,total){const entries=Object.entries(obj||{}).sort((a,b)=>b[1]-a[1]).slice(0,5);return `<div class="card"><h2>${escapeHtml(title)}</h2>${entries.length?entries.map(([k,v])=>`<div class="bar"><span>${escapeHtml(pdfLabel(k))}</span><div class="track"><div class="fill" style="width:${pct(v,total)}%"></div></div><b>${v} (${pct(v,total)}%)</b></div>`).join(''):'<p class="muted">Sem dados suficientes.</p>'}</div>`}
function gameHtmlReport(g){const a=analyze([g]),tl=scoreTimeline(g),rows=comparisonRows(a).slice(0,8);const body=`<section class="kpis"><div class="kpi"><b>${tl.sets.athlete}–${tl.sets.opponent}</b><span>Sets</span></div><div class="kpi"><b>${setScoreText(tl)}</b><span>Placar por set</span></div><div class="kpi"><b>${a.won}–${a.lost}</b><span>Pontos</span></div><div class="kpi"><b>${pct(a.serveWon,a.serveTotal)}%</b><span>Saque</span></div><div class="kpi"><b>${pct(a.returnWon,a.returnTotal)}%</b><span>Devolução</span></div><div class="kpi"><b>${a.athleteErrors.length}</b><span>Erros</span></div></section><section class="grid" style="margin-top:10px"><div class="card full"><h2>Placar</h2><p>${escapeHtml(setScoreLong(tl))}. Games totais: ${tl.totalGames.athlete}–${tl.totalGames.opponent}. Pontos totais: ${a.won}–${a.lost}.</p><p class="muted">${escapeHtml(gameEvolutionText(g))}</p></div><div class="card full"><h2>Comparativo técnico</h2><table><thead><tr><th>Parâmetro</th><th>Jogador</th><th>Adversário</th><th>Referência</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${escapeHtml(r.label)}</td><td>${escapeHtml(r.left)}</td><td>${escapeHtml(r.mid)}</td><td>${escapeHtml(r.ref)}</td></tr>`).join('')}</tbody></table></div>${barsHtml('Como o jogador terminou',countBy(a.athleteEndings,'ending'),a.athleteEndings.length)}${barsHtml('Erros por golpe',countBy(a.athleteErrors,'stroke'),a.athleteErrors.length)}<div class="card full"><h2>Leitura do treinador</h2><p>${escapeHtml(simplePhrase(a))}</p></div></section>`;return makeReportHtml('AveliCoach — Registro e leitura de jogo',`${g.date||''} · vs ${g.opponent||'Adversário'} · ${g.tournament||'Sem campeonato'}`,body)}
function periodHtmlReport(){const games=loadGames().filter(inPeriod),a=analyze(games),rows=comparisonRows(a).slice(0,8);const body=`<section class="kpis"><div class="kpi"><b>${games.length}</b><span>Jogos</span></div><div class="kpi"><b>${a.total}</b><span>Pontos</span></div><div class="kpi"><b>${a.won}–${a.lost}</b><span>Placar de pontos</span></div><div class="kpi"><b>${pct(a.serveWon,a.serveTotal)}%</b><span>Saque</span></div><div class="kpi"><b>${pct(a.returnWon,a.returnTotal)}%</b><span>Devolução</span></div><div class="kpi"><b>${a.athleteErrors.length}</b><span>Erros</span></div></section><section class="grid" style="margin-top:10px"><div class="card full"><h2>Comparativo técnico do período</h2><table><thead><tr><th>Parâmetro</th><th>Jogador</th><th>Adversário</th><th>Referência</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${escapeHtml(r.label)}</td><td>${escapeHtml(r.left)}</td><td>${escapeHtml(r.mid)}</td><td>${escapeHtml(r.ref)}</td></tr>`).join('')}</tbody></table></div>${barsHtml('Como os pontos terminaram',countBy(a.athleteEndings,'ending'),a.athleteEndings.length)}${barsHtml('Erros por golpe',countBy(a.athleteErrors,'stroke'),a.athleteErrors.length)}<div class="card full"><h2>Notas do treinador</h2><p>${escapeHtml(simplePhrase(a))}</p></div></section>`;return makeReportHtml('AveliCoach — Métricas do mês',`${$('#periodStart').value||''} a ${$('#periodEnd').value||''}`,body)}
function exportGameHtml(){const g=loadGames().find(x=>x.id===state.selectedGameId); if(!g)return; download(`avelicoach-jogo-${g.date||'sem-data'}-${pdfFileSafe(g.opponent||'adversario')}.html`, gameHtmlReport(g));}
function exportPeriodHtml(){download(`avelicoach-metricas-${$('#periodStart').value||'inicio'}-${$('#periodEnd').value||'fim'}.html`, periodHtmlReport());}
function drawScoreBySetPdf(doc,x,y,w,h,tl){const t=pdfTheme();pdocCard(doc,x,y,w,h);pdocText(doc,'PLACAR POR SET',x+3,y+6,5.8,t.accent,true);const sets=tl.setScores.length?tl.setScores:[{set:1,athlete:0,opponent:0,current:true}];const cell=(w-8)/Math.max(1,sets.length);sets.slice(0,4).forEach((s,i)=>{const xx=x+4+i*cell;pdocText(doc,`SET ${s.set}`,xx+cell/2,y+16,5,t.muted,true,{align:'center'});pdocText(doc,`${s.athlete}–${s.opponent}${s.current?'*':''}`,xx+cell/2,y+27,12,t.ink,true,{align:'center'});});pdocText(doc,`Games totais: ${tl.totalGames.athlete}–${tl.totalGames.opponent} · ${tl.scoredPoints.athlete}–${tl.scoredPoints.opponent} pontos`,x+4,y+h-5,5.2,t.muted)}
function exportPeriodPdf(){const JS=pdfCheckLib();if(!JS)return;const games=loadGames().filter(inPeriod),a=analyze(games),doc=new JS({orientation:'landscape',unit:'mm',format:'a4'}),t=pdfTheme();onePageHeader(doc,'AveliCoach - Métricas do mês','Relatório técnico em uma página',`${$('#periodStart').value||''} a ${$('#periodEnd').value||''}`);const kw=(269-5*4)/6;[['Jogos',String(games.length),'período'],['Pontos',String(a.total),'registrados'],['Total points',metricObj221(a.won,a.knownWinnerPoints.length).display,'jogador'],['Service points',metricObj221(a.serveWon,a.serveTotal).display,'jogador'],['Return points',metricObj221(a.returnWon,a.returnTotal).display,'jogador'],['Errors',metricObj221(a.athleteErrors.length,a.athleteRelated.length||a.total).display,'jogador']].forEach((k,i)=>oneKpi(doc,14+i*(kw+4),36,kw,k[0],k[1],k[2]));oneBar(doc,14,62,62,45,'Como terminou',countBy(a.athleteEndings,'ending'),a.athleteEndings.length);oneBar(doc,80,62,62,45,'Erros por golpe',countBy(a.athleteErrors,'stroke'),a.athleteErrors.length);oneLine(doc,146,62,68,45,'Evolução: service points',games.slice(-6).map(g=>{const aa=analyze([g]);return{label:formatShortDate(g.date),value:pct(aa.serveWon,aa.serveTotal)}}),62);oneRadar(doc,218,62,65,45,a,'Radar técnico');const rows=comparisonRows(a).slice(0,8);pdocCard(doc,14,114,173,58);pdocText(doc,'COMPARATIVO TÉCNICO',17,121,6.1,t.accent,true);pdocText(doc,'Parâmetro',17,130,5.2,t.muted,true);pdocText(doc,'Jogador',92,130,5.2,t.muted,true);pdocText(doc,'Adversário',127,130,5.2,t.muted,true);pdocText(doc,'Ref.',164,130,5.2,t.muted,true);rows.forEach((r,i)=>{const yy=138+i*4.4;pdocText(doc,r.label.replace(/ \(.+?\)/g,''),17,yy,4.6,t.muted);pdocText(doc,r.left,96,yy,4.8,t.ink,true,{align:'center'});pdocText(doc,r.mid,132,yy,4.8,t.ink,true,{align:'center'});pdocText(doc,r.ref,170,yy,4.8,t.ink,true,{align:'center'})});pdfSmallRows(doc,192,114,91,58,'Notas do treinador', [['Saque',metricObj221(a.serveWon,a.serveTotal).display],['Devolução',metricObj221(a.returnWon,a.returnTotal).display],['Pressão',metricObj221(a.pressureWon,a.pressureCount).display],['Erro caro',pdfLabel(Object.entries(countBy(a.athleteErrors,'stroke')).sort((x,y)=>y[1]-x[1])[0]?.[0]||'—')]]);pdocText(doc,'AVELICOACH 2.2.1',14,199,6,t.accent,true);doc.save(`avelicoach-metricas-${$('#periodStart').value||'inicio'}-${$('#periodEnd').value||'fim'}.pdf`)}
function exportGamePdf(){const JS=pdfCheckLib();if(!JS)return;const g=loadGames().find(x=>x.id===state.selectedGameId);if(!g)return;const a=analyze([g]),tl=scoreTimeline(g),doc=new JS({orientation:'landscape',unit:'mm',format:'a4'}),t=pdfTheme();onePageHeader(doc,'AveliCoach - Registro e leitura de jogo','Relatório técnico em uma página',`${g.date||''} - vs ${g.opponent||'Adversário'}`);const kw=(269-5*4)/6;[['Sets',`${tl.sets.athlete}–${tl.sets.opponent}`,'placar'],['Pontos',`${a.won}–${a.lost}`,`${a.winPct}%`],['Service points',metricObj221(a.serveWon,a.serveTotal).display,'jogador'],['Return points',metricObj221(a.returnWon,a.returnTotal).display,'jogador'],['Pressure',metricObj221(a.pressureWon,a.pressureCount).display,'jogador'],['Errors',metricObj221(a.athleteErrors.length,a.athleteRelated.length||a.total).display,'jogador']].forEach((k,i)=>oneKpi(doc,14+i*(kw+4),36,kw,k[0],k[1],k[2]));drawScoreBySetPdf(doc,14,62,58,45,tl);oneBar(doc,76,62,50,45,'Como terminou',countBy(a.athleteEndings,'ending'),a.athleteEndings.length);oneBar(doc,130,62,50,45,'Erros por golpe',countBy(a.athleteErrors,'stroke'),a.athleteErrors.length);onePresence(doc,184,62,99,45,g);pdocText(doc,gameEvolutionText(g),187,104,4.2,t.muted);const rows=comparisonRows(a).slice(0,7);pdocCard(doc,14,114,154,58);pdocText(doc,'COMPARATIVO TÉCNICO',17,121,6.1,t.accent,true);pdocText(doc,'Parâmetro',17,130,5.2,t.muted,true);pdocText(doc,'Jogador',85,130,5.2,t.muted,true);pdocText(doc,'Adversário',120,130,5.2,t.muted,true);pdocText(doc,'Ref.',151,130,5.2,t.muted,true);rows.forEach((r,i)=>{const yy=138+i*4.8;pdocText(doc,r.label.replace(/ \(.+?\)/g,''),17,yy,4.6,t.muted);pdocText(doc,r.left,88,yy,4.8,t.ink,true,{align:'center'});pdocText(doc,r.mid,123,yy,4.8,t.ink,true,{align:'center'});pdocText(doc,r.ref,154,yy,4.8,t.ink,true,{align:'center'})});oneLine(doc,172,114,52,58,'Evolução',getGamesLastYearFor(g).map(gg=>{const aa=analyze([gg]);const def=comparisonMetricDefs[state.gameTrendMetric]||comparisonMetricDefs.pontos_vencidos;return{label:formatShortDate(gg.date),value:def.player(aa).pct}}),(comparisonMetricDefs[state.gameTrendMetric]||comparisonMetricDefs.pontos_vencidos).benchmark);oneRadar(doc,228,114,55,58,a,'Radar técnico');pdocCard(doc,14,178,269,18);pdocText(doc,'LEITURA DO TREINADOR',17,185,6.1,t.accent,true);addWrappedText(doc,`${setScoreLong(tl)}. ${simplePhrase(a)} A presença no jogo mostra inversões de domínio e deve ser lida junto da evolução dos games.`,17,192,260,{lineHeight:3.6});pdocText(doc,'AVELICOACH 2.2.1',14,199,6,t.accent,true);doc.save(`avelicoach-jogo-${g.date||'sem-data'}-${pdfFileSafe(g.opponent||'adversario')}.pdf`)}
function setup221(){
  const periodActions=$('#exportPdfBtn')?.parentElement; if(periodActions && !$('#exportHtmlBtn')){ const b=document.createElement('button'); b.id='exportHtmlBtn'; b.className='ghost-btn'; b.type='button'; b.textContent='Exportar HTML'; periodActions.appendChild(b); }
  const gameActions=$('#exportGamePdfBtn')?.parentElement; if(gameActions && !$('#exportGameHtmlBtn')){ const b=document.createElement('button'); b.id='exportGameHtmlBtn'; b.className='ghost-btn'; b.type='button'; b.textContent='Exportar HTML do jogo'; gameActions.insertBefore(b,$('#deleteGameBtn')); }
  const p=$('#exportPdfBtn'); if(p) p.onclick=exportPeriodPdf; const ph=$('#exportHtmlBtn'); if(ph) ph.onclick=exportPeriodHtml;
  const gp=$('#exportGamePdfBtn'); if(gp) gp.onclick=exportGamePdf; const gh=$('#exportGameHtmlBtn'); if(gh) gh.onclick=exportGameHtml;
  if(state.selectedGameId){ const g=loadGames().find(x=>x.id===state.selectedGameId); if(g) openGameDetail(g.id); }
}
setup221();
