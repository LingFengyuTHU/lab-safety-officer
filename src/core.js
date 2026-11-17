/* Deterministic simulation; content in world.js, no browser dependencies. */
(function(root,factory){const api=factory(typeof module==='object'?require('./world.js'):root.LabWorld);if(typeof module==='object')module.exports=api;else root.LabGame=api;})(typeof window==='object'?window:globalThis,world=>{
'use strict';
const {WEAPONS,ENEMIES,MAPS,LAYOUTS,DURATIONS}=world,W=960,H=540,TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
// Wave 1 keeps its exact starter prices. Later camps rise smoothly to hundreds.
const SHOP_SCALE=[1,1.15,1.4,1.8,2.3,3,3.9,5,6.4,8,10];
function shopPrice(base,wave){const scale=SHOP_SCALE[clamp(wave-1,0,10)];return wave<=1?base:Math.max(base,Math.round(base*scale/5)*5);}
function blocked(x,y,r,rects){return rects.some(b=>Math.hypot(x-clamp(x,b.x,b.x+b.w),y-clamp(y,b.y,b.y+b.h))<r);}
function lineClear(a,b,rects){let n=Math.ceil(dist(a,b)/9);for(let i=1;i<n;i++)if(blocked(a.x+(b.x-a.x)*i/n,a.y+(b.y-a.y)*i/n,2,rects))return false;return true;}
const weapon=type=>({type,tier:1,cd:0,module:null,angle:0,shots:0});
class Run{
 constructor(seed=Date.now(),starter='pipette',difficulty='standard'){
  this.seed=seed>>>0||1;this.rng=this.seed;this.state='ready';this.wave=0;this.time=0;this.durations=DURATIONS.slice();this.difficulty=difficulty==='relaxed'?'relaxed':'standard';
  this.player={x:480,y:300,r:10,hp:44,maxHp:44,speed:139,inv:0,dir:0,moving:false};this.weapons=[weapon(WEAPONS[starter]?starter:'pipette')];
  this.coins=0;this.kills=0;this.collected=0;this.damage=0;this.armor=0;this.magnet=0;this.attack=0;
  this.enemies=[];this.bullets=[];this.hostiles=[];this.zones=[];this.bombs=[];this.drops=[];this.effects=[];this.events=[];this.obstacles=LAYOUTS[0];this.nextId=1;this.spawnTimer=0;this.buff=null;
  this.attempts=0;this.offers=[];this.failCards=new Set();this.correct=0;this.answers=0;this.usedQuestions=[];this.wrongQuestions=[];this.eliteSpawned=false;this.eliteKilled=false;this.recovered=0;this.history=[];
  this.layoutSchedule=Array.from({length:12},(_,i)=>Math.floor(i/4)*3+(i===0?0:Math.floor(this.random()*3)));
 }
 random(){let t=this.rng+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;}
 get mapIndex(){return Math.min(2,Math.floor((Math.max(1,this.wave)-1)/4));}
 get map(){return MAPS[this.mapIndex];}
 get isBossWave(){return this.wave%4===0&&this.wave>0;}
 emit(kind,data={}){this.events.push({kind,...data});}
 startWave(correct){
  if(!['ready','shop'].includes(this.state)||this.wave>=12)return false;
  this.wave++;this.state='playing';this.time=0;this.spawnTimer=.3;this.enemies=[];this.bullets=[];this.hostiles=[];this.zones=[];this.bombs=[];this.effects=[];this.drops=[];
  this.obstacles=LAYOUTS[this.layoutSchedule[this.wave-1]];Object.assign(this.player,{x:480,y:300,inv:1,moving:false});
  this.buff={kind:['attack','speed','damage'][(this.wave-1)%3],value:correct?.10:-.05,good:correct};this.eliteSpawned=false;this.eliteKilled=false;this.startCoins=this.coins;this.startKills=this.kills;
  this.weapons.forEach(w=>w.cd=.15);this.emit('wave',{wave:this.wave});return true;
 }
 move(o,dx,dy){const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/5));for(let i=0;i<steps;i++){const x=clamp(o.x+dx/steps,34+o.r,W-34-o.r);if(!blocked(x,o.y,o.r,this.obstacles))o.x=x;const y=clamp(o.y+dy/steps,83+o.r,H-28-o.r);if(!blocked(o.x,y,o.r,this.obstacles))o.y=y;}}
 spawn(type=null,at=null,child=false){
  if(this.enemies.length>=90)return null;
  type??=this.map.enemies[Math.floor(this.random()*(this.wave<3?this.wave+1:4))];const cfg=ENEMIES[type];if(!cfg)return null;
  let x,y,valid=false;for(let t=0;t<60;t++){if(at){x=clamp(at.x+(this.random()-.5)*38,52,908);y=clamp(at.y+(this.random()-.5)*38,110,488);}else{const side=Math.floor(this.random()*4);x=side===0?62:side===1?898:62+this.random()*836;y=side===2?114:side===3?482:114+this.random()*368;}if((at||dist({x,y},this.player)>170)&&!blocked(x,y,cfg.r,this.obstacles)){valid=true;break;}}if(!valid)return null;
  const boss=cfg.ai==='boss',factor=this.difficulty==='relaxed'?.8:1,scale=boss?1:(1+(this.wave-1)*.22+this.mapIndex*.12),hp=cfg.hp*scale*factor*(child?.24:1);
  const e={id:this.nextId++,type,x,y,r:child?7:cfg.r,hp,maxHp:hp,speed:cfg.speed*(1+this.mapIndex*.08)*(child?1.3:1),damage:cfg.damage+this.mapIndex,age:0,warn:at?.5:.8,hit:0,kx:0,ky:0,charge:0,cool:1+this.random()*2,dx:0,dy:0,boss,child,burn:0,burnDmg:0,burnTick:0,cast:0,castAngle:0,phase:0};this.enemies.push(e);return e;
 }
 nearest(range,origin=this.player,excluded=[]){let best=null,dd=range;for(const e of this.enemies){if(e.warn>0||e.hp<=0||excluded.includes(e.id))continue;const d=dist(e,origin);if(d<dd&&lineClear(origin,e,this.obstacles)){dd=d;best=e;}}return best;}
 hit(e,dmg,angle,knock=0){if(e.hp<=0)return;e.hp-=dmg;e.hit=.09;e.kx+=Math.cos(angle)*knock*(e.boss?.35:1);e.ky+=Math.sin(angle)*knock*(e.boss?.35:1);this.effects.push({kind:'hit',x:e.x,y:e.y-10,t:.15,max:.15});
  if(e.hp<=0){this.kills++;if(e.boss)this.eliteKilled=true;const value=e.boss?35:e.child?1:e.type==='weight'||e.type==='slime'?3:2;this.drops.push({x:e.x,y:e.y,r:4,value,age:0});if(this.random()<.045)this.drops.push({x:e.x+9,y:e.y+7,r:5,value:0,heal:5,age:0});if(e.type==='slime'&&!e.child){this.spawn('slime',e,true);this.spawn('slime',e,true);}this.effects.push({kind:'death',x:e.x,y:e.y,t:.3,max:.3});this.emit('kill');}
 }
 hurt(amount){const p=this.player;if(p.inv>0||this.state!=='playing')return;p.hp=Math.max(0,p.hp-Math.max(1,amount*(this.difficulty==='relaxed'?.75:1)-this.armor));p.inv=.8;this.emit('hurt');if(p.hp<=0){this.state='lost';this.emit('end');}}
 enemyShot(e,angle,speed=110){if(this.hostiles.length>=180)return;this.hostiles.push({x:e.x,y:e.y,dx:Math.cos(angle)*speed,dy:Math.sin(angle)*speed,r:5,life:6,damage:e.damage,angle});}
 blast(x,y,radius,damage){this.effects.push({kind:'blast',x,y,radius,t:.35,max:.35});for(const e of this.enemies)if(e.warn<=0&&e.hp>0&&dist(e,{x,y})<radius+e.r&&lineClear({x,y},e,this.obstacles))this.hit(e,damage,Math.atan2(e.y-y,e.x-x),35);}
 attackWeapon(w,dt){
  const p=this.player,base=WEAPONS[w.type],range=base.range+(['wide','shock'].includes(w.module)?(w.module==='wide'?45:60):0);w.cd-=dt;const target=this.nearest(range);if(target)w.angle=Math.atan2(target.y-p.y,target.x-p.x);if(w.cd>0||(!target&&w.type!=='dish'))return;
  w.cd=base.cooldown/(1+this.attack+(this.buff.kind==='attack'?this.buff.value:0));w.shots++;let dmg=base.damage*(1+.4*(w.tier-1))*(1+this.damage)*(1+(this.buff.kind==='damage'?this.buff.value:0));
  if(w.type==='pipette'){for(const off of(w.module==='double'?[-.07,.07]:[0]))this.bullets.push({x:p.x,y:p.y-8,dx:Math.cos(w.angle+off)*460,dy:Math.sin(w.angle+off)*460,life:.82,damage:dmg,angle:w.angle+off,pierce:w.module==='pierce'?2:0,hitIds:[]});this.emit('shot');}
  else if(w.type==='flask'){this.bombs.push({x:p.x,y:p.y,tx:target.x,ty:target.y,t:.45,max:.45,damage:dmg*(w.module==='concentrate'?1.7:1),radius:w.module==='concentrate'?48:70,cluster:w.module==='cluster'});this.emit('shot');}
  else if(w.type==='coil'){let origin=p,t=target,ids=[],points=[{x:p.x,y:p.y-8}],count=w.module==='focus'?1:w.module==='chain'?6:3;for(let i=0;i<count&&t;i++){ids.push(t.id);points.push({x:t.x,y:t.y-8});this.hit(t,dmg*(w.module==='focus'?2:1)*(1-i*.08),0,0);origin=t;t=this.nearest(135,origin,ids);}this.effects.push({kind:'arc',points,t:.22,max:.22});this.emit('shot');}
  else if(w.type==='dish'){const count=w.module==='guards'?5:3,r=w.module==='reach'?115:83;for(let i=0;i<count;i++){const a=this.time*2+i*TAU/count,x=p.x+Math.cos(a)*r,y=p.y+Math.sin(a)*r;this.effects.push({kind:'guard',x,y,t:.65,max:.65});for(const e of this.enemies)if(e.hp>0&&e.warn<=0&&dist(e,{x,y})<40+e.r&&lineClear(p,e,this.obstacles))this.hit(e,dmg,a,22);}this.emit('spray');}
  else if(w.type==='caliper'){this.hit(target,dmg*(w.module==='precision'&&w.shots%3===0?3:1),w.angle,22);if(w.module==='twin'){const t=this.nearest(range,p,[target.id]);if(t)this.hit(t,dmg,w.angle,22);}this.effects.push({kind:'slash',x:p.x,y:p.y,angle:w.angle,range,spread:.38,t:.15,max:.15});this.emit('shot');}
  else{const lamp=w.type==='lamp',hammer=w.type==='hammer',spread=lamp?(w.module==='orbit'?Math.PI:.95):hammer?(w.module==='shock'?1.25:.8):w.module==='wide'?.8:.53;
   for(const e of this.enemies){if(e.hp<=0||e.warn>0)continue;const a=Math.atan2(e.y-p.y,e.x-p.x),diff=Math.atan2(Math.sin(a-w.angle),Math.cos(a-w.angle));if(dist(p,e)<range&&Math.abs(diff)<=spread&&lineClear(p,e,this.obstacles)){this.hit(e,dmg*(w.module==='pressure'?1.45:w.module==='heavy'?1.8:1),a,hammer?(w.module==='heavy'?170:85):lamp?5:w.module==='pressure'?70:42);if(lamp&&e.hp>0){e.burn=w.module==='lasting'?4:2;e.burnDmg=dmg*(w.module==='lasting'?.5:.3);}}}this.effects.push({kind:lamp?'flame':hammer?'slash':'spray',x:p.x,y:p.y-8,angle:w.angle,range,spread,t:.24,max:.24});this.emit('spray');}
 }
 step(dt,input={}){
  if(this.state!=='playing')return;dt=clamp(dt,0,.05);this.time+=dt;const p=this.player;p.inv=Math.max(0,p.inv-dt);let ix=input.x||0,iy=input.y||0,len=Math.hypot(ix,iy);if(len>1){ix/=len;iy/=len;}p.moving=len>.1;if(p.moving){p.dir=Math.abs(ix)>Math.abs(iy)?(ix>0?2:1):(iy>0?0:3);let sp=p.speed*(1+(this.buff.kind==='speed'?this.buff.value:0));this.move(p,ix*sp*dt,iy*sp*dt);}
  this.spawnTimer-=dt;if(this.spawnTimer<=0){this.spawn();if(this.wave>3&&this.random()<.24+this.mapIndex*.10)this.spawn();this.spawnTimer=Math.max(.26,.95-this.wave*.045-this.time*.002)*(this.isBossWave&&this.eliteSpawned&&!this.eliteKilled?1.55:1)*(this.difficulty==='relaxed'?1.15:1);}
  if(this.isBossWave&&this.time>12&&!this.eliteSpawned){if(this.spawn(this.map.boss)){this.eliteSpawned=true;this.emit('elite');}}
  for(const e of this.enemies.slice()){e.age+=dt;e.hit=Math.max(0,e.hit-dt);e.warn-=dt;if(e.warn>0||e.hp<=0)continue;const cfg=ENEMIES[e.type];let ai=cfg.ai,angle=Math.atan2(p.y-e.y,p.x-e.x);e.cool-=dt;
   if(e.burn>0){e.burn-=dt;e.burnTick-=dt;if(e.burnTick<=0){this.hit(e,e.burnDmg,0);e.burnTick=.5;}if(e.hp<=0)continue;}
   if(e.cast>0){e.cast-=dt;if(e.cast<=0){if(ai==='zone'||e.type==='chemBoss'&&e.phase%2===0){this.zones.push({x:e.aimX,y:e.aimY,r:e.boss?47:33,warn:.85,t:2.6,damage:e.damage});}else{let count=e.boss?12:e.type==='sprout'?3:1;for(let i=0;i<count;i++)this.enemyShot(e,e.boss?i*TAU/count+e.phase*.2:e.castAngle+(i-(count-1)/2)*.25,e.boss?85:105);if(e.type==='bioBoss'){this.spawn('mouse',e);this.spawn('slime',e,true);}}}}
   if(e.cool<=0&&e.charge===0&&e.cast<=0){e.phase++;if(ai==='dash'||e.type==='elite'&&e.phase%2){e.charge=.8;e.dx=Math.cos(angle);e.dy=Math.sin(angle);e.cool=e.boss?3.7:3.2;}else if(['shoot','zone','boss'].includes(ai)){e.cast=.65;e.castAngle=angle;e.aimX=p.x;e.aimY=p.y;e.cool=e.boss?3.8:3.2;}}
   let speed=e.speed;if(['shoot','zone'].includes(ai)&&dist(e,p)<260)speed=0;if(e.cast>0)speed=0;if(e.charge>0){e.charge-=dt;speed=e.charge>.34?0:(e.boss?205:220);angle=Math.atan2(e.dy,e.dx);if(e.charge<=0)e.charge=0;}else if(ai==='flank')angle+=Math.sin(e.age*1.4+e.id)*.65;
   let vx=Math.cos(angle)*speed,vy=Math.sin(angle)*speed;if(e.charge===0){for(const n of this.enemies){if(n===e||n.warn>0||n.hp<=0)continue;let d=dist(e,n),min=e.r+n.r;if(d>0&&d<min){vx+=(e.x-n.x)/d*(min-d)*3;vy+=(e.y-n.y)/d*(min-d)*3;}}}let oldx=e.x,oldy=e.y;this.move(e,(vx+e.kx)*dt,(vy+e.ky)*dt);e.kx*=Math.exp(-dt*9);e.ky*=Math.exp(-dt*9);if(e.charge===0&&Math.hypot(e.x-oldx,e.y-oldy)<speed*dt*.35){const turn=(e.id%2?1:-1)*Math.PI/2;this.move(e,Math.cos(angle+turn)*speed*dt,Math.sin(angle+turn)*speed*dt);}if(dist(p,e)<p.r+e.r)this.hurt(e.damage);
  }
  if(this.state!=='playing')return;for(const w of this.weapons)this.attackWeapon(w,dt);
  for(const b of this.bullets){b.life-=dt;const n=Math.ceil(460*dt/6);for(let i=0;i<n&&b.life>0;i++){b.x+=b.dx*dt/n;b.y+=b.dy*dt/n;if(blocked(b.x,b.y,2,this.obstacles)){b.life=0;break;}for(const e of this.enemies)if(e.warn<=0&&e.hp>0&&!b.hitIds.includes(e.id)&&dist(e,b)<e.r+3){this.hit(e,b.damage,b.angle,12);b.hitIds.push(e.id);if(b.pierce--<=0)b.life=0;break;}}}
  for(const b of this.bombs){b.t-=dt;if(b.t<=0){this.blast(b.tx,b.ty,b.radius,b.damage);if(b.cluster){this.blast(b.tx-48,b.ty,40,b.damage*.6);this.blast(b.tx+48,b.ty,40,b.damage*.6);}}}this.bombs=this.bombs.filter(b=>b.t>0);
  for(const b of this.hostiles){b.life-=dt;b.x+=b.dx*dt;b.y+=b.dy*dt;if(blocked(b.x,b.y,4,this.obstacles)||b.x<28||b.x>932||b.y<76||b.y>515)b.life=0;if(b.life>0&&dist(b,p)<p.r+b.r){this.hurt(b.damage);b.life=0;}}this.hostiles=this.hostiles.filter(b=>b.life>0);for(const z of this.zones){z.warn-=dt;z.t-=dt;if(z.warn<=0&&dist(z,p)<z.r+p.r)this.hurt(z.damage);}this.zones=this.zones.filter(z=>z.t>0);
  for(const g of this.drops){g.age+=dt;const d=dist(g,p),range=57+this.magnet;if(d<range){const v=290*dt;g.x+=(p.x-g.x)/Math.max(1,d)*Math.min(v,d);g.y+=(p.y-g.y)/Math.max(1,d)*Math.min(v,d);}if(d<15){if(g.heal){p.hp=Math.min(p.maxHp,p.hp+g.heal);this.emit('heal');}else{this.coins+=g.value;this.collected+=g.value;this.emit('pickup');}g.taken=true;}}
  this.enemies=this.enemies.filter(e=>e.hp>0);this.bullets=this.bullets.filter(b=>b.life>0);this.drops=this.drops.filter(g=>!g.taken);if(this.drops.length>220){const a=this.drops.find(d=>!d.heal),b=this.drops.find(d=>d!==a&&!d.heal);if(a&&b){a.value+=b.value;this.drops.splice(this.drops.indexOf(b),1);}}for(const fx of this.effects)fx.t-=dt;this.effects=this.effects.filter(f=>f.t>0).slice(-240);
  if(this.state!=='playing')return;if(this.wave===12&&this.eliteKilled){this.state='won';this.emit('end');return;}if(this.time>=this.durations[this.wave-1])this.finishWave();
 }
 finishWave(){if(this.state!=='playing')return;if(this.wave===12){this.state=this.eliteKilled?'won':'lost';this.reason=this.eliteKilled?'':'时间结束，培养基巨蕈尚未清除';this.emit('end');return;}
  this.recovered=Math.floor(this.drops.reduce((s,d)=>s+(d.heal?0:d.value),0)*.5);this.reward=10+this.mapIndex*3;this.coins+=this.recovered+this.reward;this.healed=Math.min(this.player.maxHp-this.player.hp,7+this.mapIndex*2);this.player.hp+=this.healed;this.history.push({wave:this.wave,kills:this.kills-this.startKills,income:this.coins-this.startCoins,hp:this.player.hp,weapons:this.weapons.map(w=>w.type+':'+w.tier)});this.state='shop';this.attempts=0;this.failCards.clear();this.makeOffers();this.emit('shop');}
 makeOffers(){
  const pool=Object.keys(WEAPONS).filter(t=>this.wave>=3||['spray','pipette','caliper','hammer','coil'].includes(t)),fresh=pool.filter(t=>!this.weapons.some(w=>w.type===t)),type=(fresh.length?fresh:pool)[Math.floor(this.random()*(fresh.length||pool.length))];
  const tierable=this.weapons.map((w,i)=>({w,i})).filter(({w})=>w.tier<4),tw=tierable[Math.floor(this.random()*tierable.length)],mw=this.weapons[Math.floor(this.random()*this.weapons.length)],mods=Object.keys(WEAPONS[mw.type].modules).filter(m=>m!==mw.module),mod=mods[Math.floor(this.random()*mods.length)];
  const stats=[{stat:'magnet',value:32,name:'磁力收集器',desc:'光球吸附范围 +32',cost:21,icon:'orb'},{stat:'attack',value:.16,name:'轻量握柄',desc:'所有武器攻击速度 +16%',cost:29,icon:'speed'},{stat:'health',value:12,name:'防护补给',desc:'最大生命 +12，恢复 12 生命',cost:25,icon:'heart'},{stat:'damage',value:.16,name:'校准组件',desc:'全部武器伤害 +16%',cost:29,icon:'coil'},{stat:'armor',value:1,name:'加固实验服',desc:'每次受伤减少 1，最低伤害为 1',cost:30,icon:'heart'}].map(o=>({...o,kind:'stat',tag:'general'}));
  const pickStat=()=>stats.splice(Math.floor(this.random()*stats.length),1)[0];let all=[];
  if(this.weapons.length<6)all.push({kind:'new',type,name:'增配 · '+WEAPONS[type].name,desc:WEAPONS[type].desc,cost:24,tag:WEAPONS[type].tag,icon:type});else all.push(pickStat());
  if(tw)all.push({kind:'tier',index:tw.i,name:WEAPONS[tw.w.type].name+' · 升至 '+['I','II','III','IV'][tw.w.tier],desc:'基础伤害加成再提高 40 个百分点',cost:25+tw.w.tier*7,tag:WEAPONS[tw.w.type].tag,icon:tw.w.type});else all.push(pickStat());
  all.push({kind:'module',index:this.weapons.indexOf(mw),module:mod,name:WEAPONS[mw.type].modules[mod][0],desc:WEAPONS[mw.type].modules[mod][1]+(mw.module?'；替换现有模块':''),cost:34,tag:WEAPONS[mw.type].tag,icon:mw.type},pickStat());this.offers=all.map(o=>({...o,baseCost:o.cost,cost:shopPrice(o.cost,this.wave),id:this.nextId++}));this.rerolled=false;
 }
 available(card){return !!card&&this.state==='shop'&&this.attempts<2&&!this.failCards.has(card.id)&&this.coins>=card.cost&&!(card.kind==='new'&&this.weapons.length>=6)&&!(card.kind==='tier'&&(!this.weapons[card.index]||this.weapons[card.index].tier>=4))&&!(card.kind==='module'&&(!this.weapons[card.index]||this.weapons[card.index].module===card.module));}
 trial(id,correct){const c=this.offers.find(o=>o.id===id);if(!this.available(c))return false;this.attempts++;this.failCards.add(id);if(!correct)return true;this.coins-=c.cost;if(c.kind==='new')this.weapons.push(weapon(c.type));if(c.kind==='tier')this.weapons[c.index].tier++;if(c.kind==='module')this.weapons[c.index].module=c.module;if(c.kind==='stat'){if(c.stat==='health'){this.player.maxHp+=c.value;this.player.hp+=c.value;}else this[c.stat]+=c.value;}return true;}
 reroll(){if(this.state!=='shop'||this.rerolled||this.attempts>=2)return false;this.makeOffers();this.rerolled=true;return true;}
 snapshot(){if(!['ready','shop'].includes(this.state))return null;return {version:2,data:{...this,failCards:[...this.failCards],events:[],effects:[],enemies:[],hostiles:[],bullets:[],bombs:[],zones:[],drops:[]}};}
 static restore(saved){if(saved?.version!==2||!saved.data||!['ready','shop'].includes(saved.data.state))return null;const d=saved.data;if(!Number.isInteger(d.wave)||d.wave<0||d.wave>11||!Array.isArray(d.weapons)||d.weapons.length<1||d.weapons.length>6||d.weapons.some(w=>!WEAPONS[w.type]||w.tier<1||w.tier>4))return null;const r=new Run(d.seed);Object.assign(r,d);r.failCards=new Set(d.failCards);r.offers=r.offers.map(c=>{const baseCost=c.baseCost??c.cost-r.mapIndex*(c.kind==='new'?8:5);return {...c,baseCost,cost:shopPrice(baseCost,r.wave)};});r.obstacles=LAYOUTS[r.layoutSchedule[Math.max(0,r.wave-1)]];return r;}
}
return {Run,WEAPONS,ENEMIES,MAPS,W,H,LAYOUTS,blocked,lineClear,clamp,dist,shopPrice};
});
