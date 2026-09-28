import { Chess } from 'https://esm.run/chess.js@1.4.0';

const PIECES={w:{k:'♔',q:'♕',r:'♖',b:'♗',n:'♘',p:'♙'},b:{k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'}};
const PIECE_NAMES={k:'king',q:'queen',r:'rook',b:'bishop',n:'knight',p:'pawn'};
const FILES=['a','b','c','d','e','f','g','h'];
const boardEl=document.getElementById('board'),turnEl=document.getElementById('turn-label'),stateEl=document.getElementById('game-state'),noteEl=document.getElementById('board-note'),logEl=document.getElementById('move-log'),countEl=document.getElementById('move-count'),lessonTitle=document.getElementById('lesson-title'),lessonCopy=document.getElementById('lesson-copy'),lessonTags=document.getElementById('lesson-tags'),modeEl=document.getElementById('mode'),difficultyEl=document.getElementById('difficulty'),promotionModal=document.getElementById('promotion-modal');
let game=new Chess(),selected=null,legalMoves=[],flipped=false,pendingPromotion=null,thinking=false,aiTicket=0,worker=null;

const lessons={
 opening:{title:'Develop before you chase.',copy:'Early chess rewards development, center influence, and king safety. Customer Success works similarly: establish goals, stakeholder paths, and operating cadence before reacting to every tactical request.',tags:['Development','Goals','Cadence']},
 center:{title:'The center creates options.',copy:'Central control lets more pieces participate. In Customer Success, shared goals and clear decision paths create the same effect across Sales, Support, Product, and the customer team.',tags:['Alignment','Options','Visibility']},
 capture:{title:'A local win changes the whole position.',copy:'Before taking material, ask what becomes exposed afterward. The CS equivalent is solving the immediate request without creating a larger expectation, ownership gap, or renewal risk.',tags:['Trade-off','Risk','Consequence']},
 check:{title:'Urgency narrows the board.',copy:'Check demands a response, but you still compare every legal response. Escalations work the same way: urgency matters, yet the best move protects the broader relationship and outcome.',tags:['Escalation','Response','Outcome']},
 castle:{title:'Protect the outcome and connect the system.',copy:'Castling protects the king while activating a rook. Strong CS motions also reduce risk while improving cross-functional operating leverage.',tags:['Protection','Operations','Leverage']},
 endgame:{title:'Convert advantage into an outcome.',copy:'Endgames reward precision and disciplined follow-through. Late-stage Customer Success is similar: value evidence, owners, dates, and renewal decisions matter more than activity volume.',tags:['Execution','Evidence','Renewal']},
 default:{title:'Start with the whole board.',copy:'Before moving, scan threats, objectives, and options. In Customer Success, the same habit prevents a loud ticket or one stakeholder from becoming the entire account story.',tags:['Position','Outcome','Options']}
};
function setLesson(key){const l=lessons[key]||lessons.default;lessonTitle.textContent=l.title;lessonCopy.textContent=l.copy;lessonTags.innerHTML=l.tags.map(t=>`<span>${t}</span>`).join('')}
function squareOrder(){const ranks=flipped?[1,2,3,4,5,6,7,8]:[8,7,6,5,4,3,2,1],files=flipped?[...FILES].reverse():FILES;return ranks.flatMap(r=>files.map(f=>`${f}${r}`))}
function isLight(square){return (FILES.indexOf(square[0])+(Number(square[1])-1))%2===1}
function currentPlayerHuman(){return modeEl.value==='local'||game.turn()==='w'}
function kingSquare(color){for(const sq of squareOrder()){const p=game.get(sq);if(p&&p.color===color&&p.type==='k')return sq}return null}
function render(){
 const last=game.history({verbose:true}).at(-1);const checkSq=game.inCheck()?kingSquare(game.turn()):null;boardEl.innerHTML='';
 for(const sq of squareOrder()){
  const p=game.get(sq),btn=document.createElement('button');btn.type='button';btn.className=`square ${isLight(sq)?'light':'dark'}`;btn.dataset.square=sq;btn.setAttribute('role','gridcell');btn.setAttribute('aria-label',p?`${sq}: ${p.color==='w'?'white':'black'} ${PIECE_NAMES[p.type]}`:`${sq}: empty`);
  if(selected===sq)btn.classList.add('selected');const legal=legalMoves.find(m=>m.to===sq);if(legal)btn.classList.add(game.get(sq)?'capture':'legal');if(last&&(sq===last.from||sq===last.to))btn.classList.add('last');if(checkSq===sq)btn.classList.add('in-check');
  if(p){const span=document.createElement('span');span.textContent=PIECES[p.color][p.type];span.className=p.color==='w'?'piece-white':'piece-black';span.setAttribute('aria-hidden','true');btn.appendChild(span)}
  const showFile=(flipped?sq[1]==='8':sq[1]==='1'),showRank=(flipped?sq[0]==='h':sq[0]==='a');if(showFile){const c=document.createElement('span');c.className='coord file';c.textContent=sq[0];btn.appendChild(c)}if(showRank){const c=document.createElement('span');c.className='coord rank';c.textContent=sq[1];btn.appendChild(c)}
  btn.addEventListener('click',()=>handleSquare(sq));boardEl.appendChild(btn);
 }
 updateStatus();renderHistory();
}
function updateStatus(){
 const turn=game.turn()==='w'?'White':'Black';turnEl.textContent=thinking?'Browser AI thinking…':`${turn} to move`;
 let state='Position active';if(game.isCheckmate())state=`Checkmate · ${turn==='White'?'Black':'White'} wins`;else if(game.isStalemate())state='Draw · stalemate';else if(game.isThreefoldRepetition())state='Draw · threefold repetition';else if(game.isInsufficientMaterial())state='Draw · insufficient material';else if(game.isDraw())state='Draw';else if(game.inCheck())state='Check';stateEl.textContent=state;
 if(game.isGameOver())noteEl.textContent=state+'. Start a new game or undo to continue learning.';else if(thinking)noteEl.textContent='The browser AI is evaluating candidate moves locally in your tab.';else if(selected)noteEl.textContent=`${selected.toUpperCase()} selected · ${legalMoves.length} legal move${legalMoves.length===1?'':'s'}.`;else noteEl.textContent='Select a piece to see legal moves. Learn mode explains the position as you play.';
}
function renderHistory(){const hist=game.history();logEl.innerHTML='';for(let i=0;i<hist.length;i+=2){for(let j=0;j<2;j++){if(!hist[i+j])continue;const li=document.createElement('li');li.innerHTML=`<b>${Math.floor((i+j)/2)+1}${j?'…':'.'}</b><span>${hist[i+j]}</span>`;logEl.appendChild(li)}}countEl.textContent=`${hist.length} move${hist.length===1?'':'s'}`}
function selectSquare(sq){const p=game.get(sq);if(!p||p.color!==game.turn()||!currentPlayerHuman()||thinking){selected=null;legalMoves=[];render();return}selected=sq;legalMoves=game.moves({square:sq,verbose:true});render()}
function handleSquare(sq){if(game.isGameOver()||thinking||!currentPlayerHuman())return;if(!selected){selectSquare(sq);return}const move=legalMoves.find(m=>m.to===sq);if(!move){selectSquare(sq);return}if(move.flags.includes('p')){pendingPromotion={from:selected,to:sq};promotionModal.hidden=false;return}playMove({from:selected,to:sq,promotion:'q'})}
function lessonForMove(move){if(move.san.includes('O-O'))return'castle';if(move.captured)return'capture';if(game.inCheck())return'check';if(game.history().length<12)return move.to[0]>='c'&&move.to[0]<='f'&&move.to[1]>='3'&&move.to[1]<='6'?'center':'opening';if(game.history().length>40)return'endgame';return'default'}
function playMove(spec){
 let move;try{move=game.move(spec)}catch(_e){return false}selected=null;legalMoves=[];pendingPromotion=null;promotionModal.hidden=true;setLesson(lessonForMove(move));render();
 if(!game.isGameOver()&&modeEl.value==='ai'&&game.turn()==='b')scheduleAI();return true;
}
promotionModal.querySelectorAll('[data-promote]').forEach(btn=>btn.addEventListener('click',()=>{if(!pendingPromotion)return;playMove({...pendingPromotion,promotion:btn.dataset.promote})}));
function ensureWorker(){if(worker)return worker;try{worker=new Worker('./ai-worker.js',{type:'module'});return worker}catch(_e){return null}}
function scheduleAI(){const ticket=++aiTicket;thinking=true;render();const fen=game.fen(),depth=Number(difficultyEl.value);setTimeout(()=>{if(ticket!==aiTicket)return;const w=ensureWorker();if(!w){fallbackAI(ticket);return}const handler=(event)=>{if(event.data.ticket!==ticket)return;w.removeEventListener('message',handler);if(ticket!==aiTicket)return;thinking=false;if(event.data.move)playMove(event.data.move);else{render()}};w.addEventListener('message',handler);w.postMessage({ticket,fen,depth})},120)}
function fallbackAI(ticket){if(ticket!==aiTicket)return;const moves=game.moves({verbose:true});thinking=false;if(moves.length){const captures=moves.filter(m=>m.captured);const pool=captures.length?captures:moves;const m=pool[Math.floor(Math.random()*pool.length)];playMove({from:m.from,to:m.to,promotion:m.promotion||'q'})}else render()}
function cancelAI(){aiTicket++;thinking=false}
function newGame(){cancelAI();game=new Chess();selected=null;legalMoves=[];setLesson('default');render()}
document.getElementById('new-game').addEventListener('click',newGame);
document.getElementById('flip').addEventListener('click',()=>{flipped=!flipped;render()});
document.getElementById('undo').addEventListener('click',()=>{cancelAI();if(modeEl.value==='ai'){if(game.turn()==='w'){game.undo();game.undo()}else game.undo()}else game.undo();selected=null;legalMoves=[];setLesson('default');render()});
document.getElementById('hint').addEventListener('click',()=>{if(game.isGameOver()||thinking||!currentPlayerHuman())return;const moves=game.moves({verbose:true});if(!moves.length)return;const center=['d4','d5','e4','e5'];const scored=moves.map(m=>({m,s:(m.captured?5:0)+(m.san.includes('+')?3:0)+(center.includes(m.to)?2:0)+(m.piece!=='p'&&game.history().length<12?1:0)})).sort((a,b)=>b.s-a.s);const best=scored[0].m;selected=best.from;legalMoves=game.moves({square:best.from,verbose:true});render();noteEl.textContent=`Hint: consider ${best.from.toUpperCase()} → ${best.to.toUpperCase()}. Ask what it develops, protects, or threatens.`});
modeEl.addEventListener('change',()=>{cancelAI();newGame()});difficultyEl.addEventListener('change',()=>{if(modeEl.value==='ai'&&game.turn()==='b'&&!game.isGameOver()){cancelAI();scheduleAI()}});
window.addEventListener('pagehide',()=>{cancelAI();worker?.terminate()},{once:true});
render();