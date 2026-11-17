/* Content shared by the renderer and deterministic simulation. */
(function(root,factory){const api=factory();if(typeof module==='object')module.exports=api;else root.LabWorld=api;})(typeof window==='object'?window:globalThis,()=>{
const WEAPONS={
 spray:{name:'灭火器',range:145,cooldown:.26,damage:7,tag:'fire',icon:0,desc:'扇形喷射 · 击退近敌',modules:{wide:['扩展喷口','扇面加宽，射程 +45'],pressure:['加压喷流','伤害 +45%，击退更强']}},
 pipette:{name:'移液枪',range:360,cooldown:.43,damage:11,tag:'electric',icon:1,desc:'直线射击 · 远程游走',modules:{double:['双发枪管','每次射出两枚弹丸'],pierce:['贯穿枪管','每枚最多命中三个敌人']}},
 flask:{name:'试剂瓶',range:310,cooldown:1.05,damage:26,tag:'chemical',icon:2,desc:'延迟落点 · 范围溅射',modules:{cluster:['分裂瓶弹','主爆后两侧再溅射'],concentrate:['浓缩冲击','伤害 +70%，半径略小']}},
 lamp:{name:'酒精灯',range:130,cooldown:.8,damage:11,tag:'fire',icon:3,desc:'近身火花 · 持续灼烧',modules:{orbit:['环绕火花','攻击环绕一周的近敌'],lasting:['余烬灯芯','灼烧持续更久，伤害提高']}},
 coil:{name:'电磁线圈',range:270,cooldown:.85,damage:22,tag:'electric',icon:4,desc:'电弧连锁 · 密集清群',modules:{chain:['连锁绕组','最多跳跃六个目标'],focus:['聚能绕组','仅击一个目标，伤害翻倍']}},
 caliper:{name:'游标卡尺',range:100,cooldown:.24,damage:14,tag:'general',icon:5,desc:'快速夹击 · 近身高伤',modules:{twin:['双重夹击','一次打击附近两个目标'],precision:['精密刻度','每第三次攻击造成三倍伤害']}},
 hammer:{name:'砝码锤',range:125,cooldown:1.1,damage:48,tag:'general',icon:6,desc:'重型扇击 · 高额击退',modules:{shock:['冲击锤面','扇面更宽，范围 +60'],heavy:['集中重击','伤害 +80%，击退翻倍']}},
 dish:{name:'培养皿',range:160,cooldown:.66,damage:17,tag:'bio',icon:7,desc:'环绕守卫 · 近身防线',modules:{guards:['增殖守卫','守卫数量从三枚增至五枚'],reach:['延展培养基','守卫半径增加至 115']}}
};
const ENEMIES={
 board:{name:'电路板爬虫',hp:15,speed:48,r:9,damage:3,asset:'combat',row:1,ai:'chase',tip:'匀速追击，绕行时顺路收集光球。'},
 weight:{name:'砝码团',hp:32,speed:28,r:12,damage:5,asset:'combat',row:0,ai:'chase',tip:'移动慢、生命厚，别被它堵住狭窄路口。'},
 spring:{name:'弹簧跳虫',hp:22,speed:39,r:10,damage:4,asset:'combat',row:2,ai:'dash',tip:'红线预警后冲刺，横向移动避开。'},
 capacitor:{name:'电容炮台',hp:28,speed:23,r:11,damage:4,asset:'bosses',row:0,ai:'shoot',tip:'停下充能后发射慢弹，实验台可以挡弹。'},
 flask:{name:'烧瓶蹦蹦',hp:27,speed:42,r:11,damage:4,asset:'chemical',row:0,ai:'chase',tip:'持续接近，利用远程或范围攻击清理。'},
 thermo:{name:'温度计长足怪',hp:26,speed:41,r:10,damage:5,asset:'chemical',row:1,ai:'dash',tip:'蓄力后沿红线冲锋，不会中途转弯。'},
 tubes:{name:'试管小队',hp:15,speed:58,r:8,damage:3,asset:'chemical',row:2,ai:'chase',tip:'成群而来，单体脆弱，范围攻击有效。'},
 dropper:{name:'滴管投射怪',hp:33,speed:23,r:11,damage:5,asset:'chemical',row:3,ai:'zone',tip:'标记你之前的位置，离开橙色圆圈。'},
 sprout:{name:'芽苗射手',hp:30,speed:24,r:10,damage:4,asset:'biology',row:0,ai:'shoot',tip:'扎根后发射三枚慢速种子，穿过间隙。'},
 slime:{name:'培养皿软团',hp:43,speed:31,r:13,damage:5,asset:'biology',row:1,ai:'split',tip:'击败分裂为两只弱小软团，注意补刀。'},
 mouse:{name:'模型小鼠',hp:19,speed:73,r:8,damage:4,asset:'biology',row:2,ai:'flank',tip:'快速侧向靠近，保持走位，不要停留。'},
 moth:{name:'标本飞蛾',hp:28,speed:43,r:10,damage:5,asset:'biology',row:3,ai:'dash',tip:'扑跃前有红线预警，避免沿直线后退。'},
 elite:{name:'线圈装甲体',hp:650,speed:27,r:24,damage:8,asset:'bosses',row:1,ai:'boss',tip:'冲锋与电弧交替，预警时横移。'},
 chemBoss:{name:'琥珀巨瓶',hp:1050,speed:23,r:26,damage:9,asset:'bosses',row:2,ai:'boss',tip:'环形慢弹与落点轮换，优先找弹幕空隙。'},
 bioBoss:{name:'培养基巨蕈',hp:2200,speed:21,r:28,damage:10,asset:'bosses',row:3,ai:'boss',tip:'孢子环与召唤交替；清理小怪并持续输出。'}
};
const MAPS=[
 {id:'physics',name:'物理实验室',subtitle:'电流初醒',english:'PHYSICS LAB',tag:'electric',enemies:['board','weight','spring','capacitor'],boss:'elite',color:'#d6c6a1',floor:['#c2bda2','#b8b49a','#beb99f'],seam:'#d0c9ac',wallBand:'#b4a789',trim:'#5d5e49',edge:'#74674e',edgeLight:'#998662',floorStyle:'tiles',intro:'熟悉走位与收集。实验台能替你挡住弹丸，留意蓄力冲锋。'},
 {id:'chemistry',name:'化学实验室',subtitle:'琥珀回响',english:'CHEMISTRY LAB',tag:'chemical',enemies:['flask','thermo','tubes','dropper'],boss:'chemBoss',color:'#d4e6e8',floor:['#8eafbd','#81a3b3','#9bb9c5'],seam:'#b9d2db',wallBand:'#719eaa',trim:'#3f697b',edge:'#385969',edgeLight:'#638b9e',floorStyle:'largeTiles',intro:'绕过成组的中央实验台，沿侧面通路移动。怪群更密集，及时离开橙色落点预警。'},
 {id:'biology',name:'生物实验室',subtitle:'微光生长',english:'BIOLOGY LAB',tag:'bio',enemies:['sprout','slime','mouse','moth'],boss:'bioBoss',color:'#a5c293',floor:['#89654b','#805e47','#967052'],seam:'#654d3c',wallBand:'#739066',trim:'#405b46',edge:'#344b3d',edgeLight:'#668062',floorStyle:'planks',intro:'培养台沿两侧错落排布，中央区域更开阔。留意种子慢弹、分裂软团和侧翼追击。'}
];
const LAYOUTS=[
 [{x:213,y:186,w:114,h:44},{x:633,y:186,w:114,h:44},{x:213,y:364,w:114,h:44},{x:633,y:364,w:114,h:44}],
 [{x:185,y:256,w:114,h:44},{x:661,y:256,w:114,h:44},{x:423,y:147,w:114,h:44},{x:423,y:393,w:114,h:44}],
 [{x:187,y:192,w:114,h:44},{x:659,y:192,w:114,h:44},{x:187,y:370,w:114,h:44},{x:659,y:370,w:114,h:44}],
 // Chemistry: joined central islands, wide side passages and a clear middle aisle.
 [{x:300,y:194,w:114,h:44},{x:414,y:194,w:114,h:44},{x:528,y:194,w:114,h:44},{x:300,y:382,w:114,h:44},{x:414,y:382,w:114,h:44},{x:528,y:382,w:114,h:44}],
 [{x:250,y:190,w:114,h:44},{x:364,y:190,w:114,h:44},{x:475,y:390,w:114,h:44},{x:589,y:390,w:114,h:44}],
 [{x:270,y:215,w:114,h:44},{x:384,y:215,w:114,h:44},{x:498,y:215,w:114,h:44},{x:390,y:405,w:114,h:44},{x:504,y:405,w:114,h:44},{x:618,y:405,w:114,h:44}],
 // Biology: asymmetric perimeter workstations and an open central clearing.
 [{x:95,y:160,w:114,h:44},{x:95,y:280,w:114,h:44},{x:95,y:400,w:114,h:44},{x:750,y:190,w:114,h:44},{x:750,y:390,w:114,h:44},{x:480,y:150,w:114,h:44}],
 [{x:110,y:190,w:114,h:44},{x:110,y:380,w:114,h:44},{x:650,y:160,w:114,h:44},{x:764,y:160,w:114,h:44},{x:435,y:430,w:114,h:44},{x:770,y:340,w:114,h:44}],
 [{x:125,y:165,w:114,h:44},{x:125,y:285,w:114,h:44},{x:125,y:405,w:114,h:44},{x:650,y:165,w:114,h:44},{x:720,y:410,w:114,h:44}]
];
const DURATIONS=[30,35,40,45,45,50,50,55,55,60,60,90];
return {WEAPONS,ENEMIES,MAPS,LAYOUTS,DURATIONS};
});
