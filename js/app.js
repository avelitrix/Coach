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
function savePoint(e){ e.preventDefault(); if(!state.activeGame) newGame(); const filled={...state.draft}; const p={ id:uid(), createdAt:new Date().toISOString(), order:state.activeGame.points.length+1, server:filled.server||'athlete', winner:val(filled.winner), ending:val(filled.ending), actor:val(filled.actor), stroke:val(filled.stroke), place:val(filled.place), target:val(filled.target), moment:val(filled.moment), playType:val(filled.playType), note:$('#pointNote').value.trim()}; state.activeGame.points.push(p); state.draft=emptyDraft(p.server||'athlete'); $('#pointNote').value=''; persistActiveGame(); renderChoices(); }
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

function exportPeriod(){ const games=loadGames().filter(inPeriod); download(`treinador-avelitrix-v7-periodo-${$('#periodStart').value}-${$('#periodEnd').value}.json`, JSON.stringify({exportedAt:new Date().toISOString(), version:'v7', period:{start:$('#periodStart').value, end:$('#periodEnd').value}, games}, null, 2)); }
function exportBackup(){ download(`treinador-avelitrix-v7-backup-${todayISO()}.json`, JSON.stringify({exportedAt:new Date().toISOString(), version:'v7', games:loadGames()}, null, 2)); }
function exportGame(){ const g=loadGames().find(x=>x.id===state.selectedGameId); if(g) download(`treinador-avelitrix-v7-jogo-${g.date}-${(g.opponent||'adversario').replace(/\s+/g,'-')}.json`, JSON.stringify({exportedAt:new Date().toISOString(), version:'v7', game:g}, null, 2)); }
function deleteGame(){ if(!state.selectedGameId) return; if(!confirm('Excluir este jogo?')) return; saveGames(loadGames().filter(g=>g.id!==state.selectedGameId)); state.selectedGameId=null; showScreen('home'); }

function bind(){
  $('#newGameBtn').onclick=newGame; $('#homeBtn').onclick=()=>showScreen('home'); $$('.choice').forEach(btn=>btn.onclick=()=>handleChoice(btn)); $('#pointForm').onsubmit=savePoint; $('#undoPointBtn').onclick=undoPoint; $('#finishGameBtn').onclick=()=>openMetaDialog(true); $('#matchMetaForm').addEventListener('submit',e=>{e.preventDefault(); saveMeta(); showScreen('home');}); $('#saveMetaContinueBtn').onclick=saveMetaAndContinue; $('#cancelMetaBtn').onclick=()=>$('#matchMetaDialog').close(); $('#periodStart').onchange=renderPanel; $('#periodEnd').onchange=renderPanel; $('#exportPeriodJsonBtn').onclick=exportPeriod; $('#exportBackupBtn').onclick=exportBackup; $('#exportPdfBtn').onclick=()=>window.print(); $('#closeDetailBtn').onclick=()=>showScreen('home'); $('#continueGameBtn').onclick=()=>continueGame(state.selectedGameId); $('#exportGameJsonBtn').onclick=exportGame; $('#deleteGameBtn').onclick=deleteGame; $('#closeInfoBtn').onclick=()=>$('#infoDialog').close(); $$('.seg-btn').forEach(btn=>btn.onclick=()=>{state.trendGranularity=btn.dataset.granularity; renderPanel();});
}

bind(); monthDefaults(); renderChoices(); renderPanel();
