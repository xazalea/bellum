export const runtime = 'edge';

import { NextRequest, NextResponse } from 'next/server';

const GAME_TEMPLATES: Record<string, string> = {
  platformer: `const canvas = document.createElement('canvas');
canvas.width = 800; canvas.height = 600;
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

let player = { x: 100, y: 400, vy: 0, w: 32, h: 32, grounded: false };
let platforms = [
  { x: 0, y: 550, w: 800, h: 50 },
  { x: 200, y: 420, w: 120, h: 16 },
  { x: 400, y: 320, w: 120, h: 16 },
  { x: 150, y: 220, w: 120, h: 16 },
  { x: 500, y: 160, w: 120, h: 16 },
];
let gems = [{x:250,y:380},{x:450,y:280},{x:200,y:180},{x:550,y:120}];
let keys = {}; let score = 0;
window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);

function update() {
  if (keys['ArrowLeft']) player.x -= 4;
  if (keys['ArrowRight']) player.x += 4;
  if (keys[' '] && player.grounded) { player.vy = -12; player.grounded = false; }
  player.vy += 0.5; player.y += player.vy; player.grounded = false;
  platforms.forEach(p => {
    if (player.x+player.w > p.x && player.x < p.x+p.w && player.y+player.h > p.y && player.y+player.h < p.y+p.h+10 && player.vy >= 0) {
      player.y = p.y - player.h; player.vy = 0; player.grounded = true;
    }
  });
  gems = gems.filter(g => { if(Math.abs(player.x-g.x)<24&&Math.abs(player.y-g.y)<24){score++;return false}return true });
}

function draw() {
  ctx.fillStyle = '#1a1a2e'; ctx.fillRect(0, 0, 800, 600);
  platforms.forEach(p => { ctx.fillStyle = '#4a6fa5'; ctx.fillRect(p.x, p.y, p.w, p.h); });
  gems.forEach(g => { ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.arc(g.x+8,g.y+8,8,0,Math.PI*2); ctx.fill(); });
  ctx.fillStyle = '#e74c3c'; ctx.fillRect(player.x, player.y, player.w, player.h);
  ctx.fillStyle = '#fff'; ctx.font = '20px sans-serif'; ctx.fillText('Score: '+score, 20, 30);
  if(gems.length===0){ctx.font='48px sans-serif';ctx.fillText('You Win!',300,300);}
}

function loop() { update(); draw(); requestAnimationFrame(loop); }
loop();`,

  pong: `const canvas = document.createElement('canvas');
canvas.width = 800; canvas.height = 600;
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

let ball = {x:400,y:300,vx:4,vy:3,r:8};
let p1 = {x:30,y:250,w:12,h:80,score:0};
let p2 = {x:758,y:250,w:12,h:80,score:0};
let keys = {};
window.addEventListener('keydown',e=>keys[e.key]=true);
window.addEventListener('keyup',e=>keys[e.key]=false);

function update(){
  if(keys['w']&&p1.y>0)p1.y-=5;
  if(keys['s']&&p1.y<520)p1.y+=5;
  let target=ball.y-p2.h/2;
  p2.y+=(target-p2.y)*0.06;
  p2.y=Math.max(0,Math.min(520,p2.y));
  ball.x+=ball.vx;ball.y+=ball.vy;
  if(ball.y<=ball.r||ball.y>=600-ball.r)ball.vy*=-1;
  if(ball.x<=p1.x+p1.w&&ball.y>p1.y&&ball.y<p1.y+p1.h){ball.vx=Math.abs(ball.vx)*1.05;}
  if(ball.x>=p2.x-ball.r&&ball.y>p2.y&&ball.y<p2.y+p2.h){ball.vx=-Math.abs(ball.vx)*1.05;}
  if(ball.x<0){p2.score++;reset()}
  if(ball.x>800){p1.score++;reset()}
}
function reset(){ball.x=400;ball.y=300;ball.vx=4*(Math.random()>0.5?1:-1);ball.vy=3*(Math.random()>0.5?1:-1);}
function draw(){
  ctx.fillStyle='#0d1117';ctx.fillRect(0,0,800,600);
  ctx.setLineDash([8,8]);ctx.strokeStyle='#333';ctx.beginPath();ctx.moveTo(400,0);ctx.lineTo(400,600);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle='#58a6ff';ctx.fillRect(p1.x,p1.y,p1.w,p1.h);
  ctx.fillStyle='#f97583';ctx.fillRect(p2.x,p2.y,p2.w,p2.h);
  ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(ball.x,ball.y,ball.r,0,Math.PI*2);ctx.fill();
  ctx.font='48px monospace';ctx.textAlign='center';ctx.fillText(p1.score+'',300,60);ctx.fillText(p2.score+'',500,60);
}
function loop(){update();draw();requestAnimationFrame(loop)}
loop();`,

  shooter: `const canvas = document.createElement('canvas');
canvas.width = 800; canvas.height = 600;
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');

let ship = {x:400,y:550,w:32,h:24};
let bullets = []; let enemies = []; let particles = []; let score = 0; let frame = 0;
let keys = {};
window.addEventListener('keydown',e=>{keys[e.key]=true;if(e.key===' ')bullets.push({x:ship.x,y:ship.y-12,vy:-8})});
window.addEventListener('keyup',e=>keys[e.key]=false);

function spawn(){enemies.push({x:Math.random()*760+20,y:-20,vy:1.5+Math.random()*2,w:24,h:24})}
function update(){
  if(keys['ArrowLeft'])ship.x=Math.max(16,ship.x-5);
  if(keys['ArrowRight'])ship.x=Math.min(784,ship.x+5);
  bullets=bullets.filter(b=>{b.y+=b.vy;return b.y>0});
  enemies=enemies.filter(e=>{e.y+=e.vy;return e.y<640});
  if(frame%40===0)spawn();
  for(let i=bullets.length-1;i>=0;i--){
    for(let j=enemies.length-1;j>=0;j--){
      if(Math.abs(bullets[i]?.x-enemies[j]?.x)<20&&Math.abs(bullets[i]?.y-enemies[j]?.y)<20){
        for(let k=0;k<8;k++)particles.push({x:enemies[j].x,y:enemies[j].y,vx:(Math.random()-0.5)*6,vy:(Math.random()-0.5)*6,life:30});
        bullets.splice(i,1);enemies.splice(j,1);score++;break;
      }
    }
  }
  particles=particles.filter(p=>{p.x+=p.vx;p.y+=p.vy;p.life--;return p.life>0});
  frame++;
}
function draw(){
  ctx.fillStyle='#0a0a1a';ctx.fillRect(0,0,800,600);
  for(let i=0;i<50;i++){ctx.fillStyle='rgba(255,255,255,'+(0.3+Math.random()*0.5)+')';ctx.fillRect(Math.random()*800,Math.random()*600,1,1)}
  ctx.fillStyle='#4fc3f7';ctx.beginPath();ctx.moveTo(ship.x,ship.y-12);ctx.lineTo(ship.x-16,ship.y+12);ctx.lineTo(ship.x+16,ship.y+12);ctx.closePath();ctx.fill();
  bullets.forEach(b=>{ctx.fillStyle='#ffd54f';ctx.fillRect(b.x-2,b.y-4,4,8)});
  enemies.forEach(e=>{ctx.fillStyle='#ef5350';ctx.fillRect(e.x-12,e.y-12,24,24)});
  particles.forEach(p=>{ctx.fillStyle='rgba(255,200,50,'+p.life/30+')';ctx.fillRect(p.x-2,p.y-2,4,4)});
  ctx.fillStyle='#fff';ctx.font='20px sans-serif';ctx.fillText('Score: '+score,20,30);
}
function loop(){update();draw();requestAnimationFrame(loop)}
loop();`,

  snake: `const canvas = document.createElement('canvas');
canvas.width = 400; canvas.height = 400;
document.body.appendChild(canvas);
const ctx = canvas.getContext('2d');
const S = 20;
let snake = [{x:10,y:10}]; let dir = {x:1,y:0}; let food = {x:15,y:15}; let score = 0;
window.addEventListener('keydown',e=>{
  if(e.key==='ArrowUp'&&dir.y!==1)dir={x:0,y:-1};
  if(e.key==='ArrowDown'&&dir.y!==-1)dir={x:0,y:1};
  if(e.key==='ArrowLeft'&&dir.x!==1)dir={x:-1,y:0};
  if(e.key==='ArrowRight'&&dir.x!==-1)dir={x:1,y:0};
});
function update(){
  let head = {x:snake[0].x+dir.x, y:snake[0].y+dir.y};
  if(head.x<0||head.x>=20||head.y<0||head.y>=20||snake.some(s=>s.x===head.x&&s.y===head.y)){
    snake=[{x:10,y:10}];dir={x:1,y:0};score=0;return;
  }
  snake.unshift(head);
  if(head.x===food.x&&head.y===food.y){
    score++;food={x:Math.floor(Math.random()*20),y:Math.floor(Math.random()*20)};
  }else{snake.pop()}
}
function draw(){
  ctx.fillStyle='#111';ctx.fillRect(0,0,400,400);
  snake.forEach((s,i)=>{ctx.fillStyle=i===0?'#4caf50':'#66bb6a';ctx.fillRect(s.x*S+1,s.y*S+1,S-2,S-2)});
  ctx.fillStyle='#f44336';ctx.fillRect(food.x*S+2,food.y*S+2,S-4,S-4);
  ctx.fillStyle='#fff';ctx.font='16px sans-serif';ctx.fillText('Score: '+score,10,390);
}
setInterval(()=>{update();draw()},100);`,
};

function classifyPrompt(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (lower.includes('platform') || lower.includes('jump') || lower.includes('collect')) return 'platformer';
  if (lower.includes('pong') || lower.includes('paddle') || lower.includes('tennis')) return 'pong';
  if (lower.includes('shoot') || lower.includes('space') || lower.includes('invader') || lower.includes('bullet')) return 'shooter';
  if (lower.includes('snake') || lower.includes('grow')) return 'snake';
  return 'platformer';
}

export async function POST(request: NextRequest) {
  const { prompt } = await request.json();

  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_AI_API_KEY;

  if (apiKey) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Generate a complete, self-contained HTML5 canvas game in JavaScript based on this description: "${prompt}". The code should create its own canvas element, handle keyboard input, and have a game loop. Only output the JavaScript code, no HTML or markdown.`,
              }],
            }],
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const code = text.replace(/^```\w*\n?/gm, '').replace(/```$/gm, '').trim();
        if (code.length > 50) {
          return NextResponse.json({ code, source: 'ai' });
        }
      }
    } catch {
      // Fall through to template
    }
  }

  const templateKey = classifyPrompt(prompt);
  const code = GAME_TEMPLATES[templateKey];

  return NextResponse.json({ code, source: 'template', template: templateKey });
}
