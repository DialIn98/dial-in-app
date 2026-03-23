const DEFAULT_MOA_PX=28;
let unit='MOA',mag=20,reticleColor='#ff3c00',centerStyle='crosshair';
let camMode='photo',isRecording=false;
let mediaRecorder=null,recordedChunks=[],recTimerInterval=null,recSeconds=0;
let videoStream=null,facingMode='environment',reticleVisible=true;
let calPxPerMOA=DEFAULT_MOA_PX,isCalibrated=false,calSpreadPx=200,calMagAtCalibration=20;

const canvas=document.getElementById('reticle-canvas');
const ctx=canvas.getContext('2d');
const compCanvas=document.getElementById('composite-canvas');
const compCtx=compCanvas.getContext('2d');
const calCanvas=document.getElementById('cal-canvas');
const calCtx=calCanvas.getContext('2d');

function hexToRgba(hex,a){const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return`rgba(${r},${g},${b},${a})`}
function showToast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2500)}
function inchesToMOA(i,y){return i/(y/100)/1.04720}
function inchesToMRAD(i,y){return i/(y/100)/3.6}

function gridPx(){
  const magScale=mag/calMagAtCalibration;
  if(unit==='MOA')return calPxPerMOA*magScale;
  return calPxPerMOA*3.4378*magScale;
}

async function startCamera(){await initCamera();document.getElementById('splash').style.display='none';resizeCanvas();drawReticle()}
async function initCamera(){
  if(videoStream)videoStream.getTracks().forEach(t=>t.stop());
  try{videoStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facingMode},width:{ideal:1920},height:{ideal:1080}},audio:true});}
  catch(e){try{videoStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:facingMode}},audio:false});}catch(e2){document.getElementById('no-camera').style.display='block';return;}}
  document.getElementById('video').srcObject=videoStream;
}

function toggleReticle(){
  reticleVisible=!reticleVisible;
  const btn=document.getElementById('reticle-toggle');
  const icon=document.getElementById('reticle-toggle-icon');
  canvas.style.opacity=reticleVisible?'1':'0';
  document.querySelectorAll('.bracket').forEach(b=>b.style.opacity=reticleVisible?'0.4':'0');
  if(reticleVisible){
    btn.classList.remove('reticle-off');
    icon.innerHTML=`<circle cx="13" cy="13" r="11" stroke="#fff" stroke-width="1.6"/><circle cx="13" cy="13" r="5" stroke="#fff" stroke-width="1.6"/><circle cx="13" cy="13" r="1.8" fill="#fff"/><line x1="13" y1="1" x2="13" y2="25" stroke="#fff" stroke-width="1.2"/><line x1="1" y1="13" x2="25" y2="13" stroke="#fff" stroke-width="1.2"/>`;
    showToast('RETICLE ON');
  } else {
    btn.classList.add('reticle-off');
    icon.innerHTML=`<circle cx="13" cy="13" r="11" stroke="rgba(255,255,255,0.35)" stroke-width="1.6"/><circle cx="13" cy="13" r="5" stroke="rgba(255,255,255,0.35)" stroke-width="1.6"/><line x1="13" y1="1" x2="13" y2="25" stroke="rgba(255,255,255,0.35)" stroke-width="1.2"/><line x1="1" y1="13" x2="25" y2="13" stroke="rgba(255,255,255,0.35)" stroke-width="1.2"/><line x1="3" y1="3" x2="23" y2="23" stroke="#ff3c00" stroke-width="2" stroke-linecap="round"/>`;
    showToast('RETICLE OFF — CLEAN SHOT');
  }
}

function resizeCanvas(){
  canvas.width=window.innerWidth;canvas.height=window.innerHeight;
  compCanvas.width=window.innerWidth;compCanvas.height=window.innerHeight;
  calCanvas.width=window.innerWidth;calCanvas.height=window.innerHeight;
  drawReticle();
  if(document.getElementById('cal-overlay').classList.contains('visible'))drawCalBrackets();
}
window.addEventListener('resize',resizeCanvas);

function drawReticle(){
  const w=canvas.width,h=canvas.height,cx=w/2,cy=h/2,gp=gridPx();
  ctx.clearRect(0,0,w,h);
  const col=reticleColor,thin=hexToRgba(col,0.3),labelCol=hexToRgba(col,0.9);
  const ml=Math.ceil(h/2/gp)+2,mc=Math.ceil(w/2/gp)+2;
  for(let i=-ml;i<=ml;i++){if(i===0)continue;ctx.beginPath();ctx.moveTo(0,cy+i*gp);ctx.lineTo(w,cy+i*gp);ctx.strokeStyle=thin;ctx.lineWidth=0.4;ctx.stroke()}
  for(let i=-mc;i<=mc;i++){if(i===0)continue;ctx.beginPath();ctx.moveTo(cx+i*gp,0);ctx.lineTo(cx+i*gp,h);ctx.strokeStyle=thin;ctx.lineWidth=0.4;ctx.stroke()}
  if(centerStyle!=='swarovski'){
    const gap=gp*1.4;
    [[0,cy,cx-gap,cy],[cx+gap,cy,w,cy],[cx,0,cx,cy-gap],[cx,cy+gap,cx,h]].forEach(([x1,y1,x2,y2])=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=col;ctx.lineWidth=1.8;ctx.stroke()});
  } else {
    [[0,cy,w,cy],[cx,0,cx,h]].forEach(([x1,y1,x2,y2])=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=col;ctx.lineWidth=2.2;ctx.stroke()});
  }
  if(centerStyle==='crosshair'){
    ctx.beginPath();ctx.arc(cx,cy,gp*0.22,0,Math.PI*2);ctx.strokeStyle=col;ctx.lineWidth=1.8;ctx.stroke();
  } else if(centerStyle==='dot'){
    ctx.beginPath();ctx.arc(cx,cy,gp*0.18,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();
  } else if(centerStyle==='swarovski'){
    const lw=2.4;
    const dotR=gp*0.07;
    const dotSpacing=gp;
    const cLen=gp*0.4;
    ctx.beginPath();ctx.moveTo(cx-cLen,cy);ctx.lineTo(cx+cLen,cy);ctx.strokeStyle=col;ctx.lineWidth=1.4;ctx.stroke();
    ctx.beginPath();ctx.moveTo(cx,cy-cLen);ctx.lineTo(cx,cy+cLen);ctx.strokeStyle=col;ctx.lineWidth=1.4;ctx.stroke();
    function drawLadder(topY,dir){
      const bars=[{hw:gp*0.55,lw:2.0},{hw:gp*0.42,lw:1.6},{hw:gp*0.30,lw:1.4}];
      bars.forEach((b,i)=>{
        const y=topY+dir*i*gp*0.38;
        ctx.beginPath();ctx.moveTo(cx-b.hw,y);ctx.lineTo(cx+b.hw,y);ctx.strokeStyle=col;ctx.lineWidth=b.lw;ctx.stroke();
      });
      ctx.beginPath();ctx.moveTo(cx,topY);ctx.lineTo(cx,topY+dir*bars.length*gp*0.38);ctx.strokeStyle=col;ctx.lineWidth=lw;ctx.stroke();
    }
    const ladder5=gp*5,ladder10=gp*10;
    drawLadder(cy-ladder5,-1);
    drawLadder(cy-ladder10,-1);
    drawLadder(cy+ladder5,1);
    drawLadder(cy+ladder10,1);
    const skipMOA=new Set([0,5,10,15,20]);
    const vDotCount=Math.floor((Math.min(w,h)*0.45)/gp);
    for(let i=1;i<=vDotCount;i++){
      if(skipMOA.has(i))continue;
      ctx.beginPath();ctx.arc(cx,cy-i*dotSpacing,dotR,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();
      ctx.beginPath();ctx.arc(cx,cy+i*dotSpacing,dotR,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();
    }
    const hDotCount=Math.floor((w*0.45)/gp);
    for(let i=1;i<=hDotCount;i++){
      if(i===5||i===10||i===15){
        const hw2=gp*0.14;
        ctx.beginPath();ctx.moveTo(cx-i*gp,cy-hw2);ctx.lineTo(cx-i*gp,cy+hw2);ctx.strokeStyle=col;ctx.lineWidth=1.6;ctx.stroke();
        ctx.beginPath();ctx.moveTo(cx+i*gp,cy-hw2);ctx.lineTo(cx+i*gp,cy+hw2);ctx.strokeStyle=col;ctx.lineWidth=1.6;ctx.stroke();
      } else {
        ctx.beginPath();ctx.arc(cx-i*dotSpacing,cy,dotR,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();
        ctx.beginPath();ctx.arc(cx+i*dotSpacing,cy,dotR,0,Math.PI*2);ctx.fillStyle=col;ctx.fill();
      }
    }
  }
  const hc=Math.floor(Math.min(w,h)*0.46/gp),bh=gp*0.28;
  for(let i=1;i<=hc;i++){
    const maj=i%5===0,hl=maj?bh*2.2:bh,lw=maj?1.6:1;
    [[cx+i*gp,cy,true],[cx-i*gp,cy,true],[cx,cy+i*gp,false],[cx,cy-i*gp,false]].forEach(([x,y,horiz])=>{ctx.beginPath();if(horiz){ctx.moveTo(x,y-hl/2);ctx.lineTo(x,y+hl/2)}else{ctx.moveTo(x-hl/2,y);ctx.lineTo(x+hl/2,y)}ctx.strokeStyle=col;ctx.lineWidth=lw;ctx.stroke()});
    if(maj){const fs=Math.max(9,gp*0.2);ctx.fillStyle=labelCol;ctx.font=`600 ${fs}px 'Share Tech Mono',monospace`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(i,cx+i*gp,cy-hl/2-fs*0.9);ctx.fillText('-'+i,cx-i*gp,cy-hl/2-fs*0.9);ctx.textAlign='left';ctx.fillText(i,cx+hl/2+3,cy-i*gp);ctx.fillText('-'+i,cx+hl/2+3,cy+i*gp)}
  }
  for(let i=1;i<=hc*2;i++){if(i%2===0)continue;const p=i*gp*0.5,sl=bh*0.4;ctx.strokeStyle=hexToRgba(col,0.5);ctx.lineWidth=0.8;[[cx+p,cy,true],[cx-p,cy,true],[cx,cy+p,false],[cx,cy-p,false]].forEach(([x,y,horiz])=>{ctx.beginPath();if(horiz){ctx.moveTo(x,y-sl/2);ctx.lineTo(x,y+sl/2)}else{ctx.moveTo(x-sl/2,y);ctx.lineTo(x+sl/2,y)}ctx.stroke()})}
}

function drawCalBrackets(){
  const w=calCanvas.width,h=calCanvas.height,cx=w/2,cy=h/2,half=calSpreadPx/2;
  calCtx.clearRect(0,0,w,h);
  const lineW=Math.min(w*0.5,260),tickH=24,color='#00ff88';
  [[cy-half,1],[cy+half,-1]].forEach(([y,dir])=>{
    calCtx.beginPath();calCtx.moveTo(cx-lineW/2,y);calCtx.lineTo(cx+lineW/2,y);calCtx.strokeStyle=color;calCtx.lineWidth=2.5;calCtx.stroke();
    calCtx.beginPath();calCtx.moveTo(cx-lineW/2,y-tickH/2);calCtx.lineTo(cx-lineW/2,y+tickH/2);calCtx.strokeStyle=color;calCtx.lineWidth=2;calCtx.stroke();
    calCtx.beginPath();calCtx.moveTo(cx+lineW/2,y-tickH/2);calCtx.lineTo(cx+lineW/2,y+tickH/2);calCtx.strokeStyle=color;calCtx.lineWidth=2;calCtx.stroke();
    const arrowY=y+(dir*-1)*4;
    calCtx.beginPath();calCtx.moveTo(cx,arrowY);calCtx.lineTo(cx-5,arrowY+dir*-10);calCtx.lineTo(cx+5,arrowY+dir*-10);calCtx.closePath();calCtx.fillStyle=color;calCtx.fill();
  });
  calCtx.beginPath();calCtx.setLineDash([4,4]);calCtx.moveTo(cx,cy-half);calCtx.lineTo(cx,cy+half);calCtx.strokeStyle='rgba(0,255,136,0.35)';calCtx.lineWidth=1;calCtx.stroke();calCtx.setLineDash([]);
  calCtx.fillStyle='rgba(0,255,136,0.7)';calCtx.font=`600 11px 'Share Tech Mono',monospace`;calCtx.textAlign='center';calCtx.textBaseline='middle';
  calCtx.fillText(calSpreadPx+'px',cx+lineW/2+36,cy);
  calCtx.fillStyle='rgba(255,255,255,0.4)';calCtx.font=`500 12px 'Rajdhani',sans-serif`;calCtx.textAlign='center';
  calCtx.fillText('← align brackets to target edges →',cx,cy);
}

function updateCalBrackets(val){calSpreadPx=parseInt(val);document.getElementById('cal-spread-val').textContent=calSpreadPx+'px';document.getElementById('cal-px-val').textContent=calSpreadPx;drawCalBrackets();updateCalReadout()}
function updateCalReadout(){
  const s=parseFloat(document.getElementById('cal-size').value)||1;
  const d=parseFloat(document.getElementById('cal-dist').value)||100;
  document.getElementById('cal-moa-val').textContent=inchesToMOA(s,d).toFixed(2)+' MOA';
  document.getElementById('cal-mrad-val').textContent=inchesToMRAD(s,d).toFixed(2)+' MRAD';
}
function openCal(){
  const overlay=document.getElementById('cal-overlay');
  overlay.classList.add('visible');
  const maxSpread=Math.floor(Math.min(window.innerWidth,window.innerHeight)*0.75);
  const slider=document.getElementById('cal-spread-slider');
  slider.max=maxSpread;calSpreadPx=Math.min(calSpreadPx,maxSpread);slider.value=calSpreadPx;
  document.getElementById('cal-spread-val').textContent=calSpreadPx+'px';
  calCanvas.width=window.innerWidth;calCanvas.height=window.innerHeight;
  drawCalBrackets();updateCalReadout();
}
function closeCal(){document.getElementById('cal-overlay').classList.remove('visible');calCtx.clearRect(0,0,calCanvas.width,calCanvas.height);}
function confirmCal(){
  const s=parseFloat(document.getElementById('cal-size').value)||1;
  const d=parseFloat(document.getElementById('cal-dist').value)||100;
  const targetMOA=inchesToMOA(s,d);
  calPxPerMOA=calSpreadPx/targetMOA;
  calMagAtCalibration=mag;isCalibrated=true;
  const btn=document.getElementById('cal-btn');btn.classList.add('calibrated');
  document.getElementById('cal-btn-label').textContent='CAL ✓';
  closeCal();drawReticle();
  showToast('✓  RETICLE CALIBRATED  —  '+calPxPerMOA.toFixed(1)+'px/MOA');
}

function drawCompositeFrame(){const v=document.getElementById('video');compCtx.clearRect(0,0,compCanvas.width,compCanvas.height);if(v.readyState>=2)compCtx.drawImage(v,0,0,compCanvas.width,compCanvas.height);if(reticleVisible)compCtx.drawImage(canvas,0,0)}
function handleShutter(){if(camMode==='photo')takePhoto();else toggleRecord()}
function setCamMode(mode){if(isRecording)stopRecording();camMode=mode;document.getElementById('lbl-photo').classList.toggle('active',mode==='photo');document.getElementById('lbl-video').classList.toggle('active',mode==='video');}
function takePhoto(){
  const flash=document.getElementById('flash');flash.classList.add('snap');setTimeout(()=>flash.classList.remove('snap'),120);
  drawCompositeFrame();
  compCanvas.toBlob(blob=>{
    const url=URL.createObjectURL(blob);
    const img=document.getElementById('thumb-img');img.src=url;img.style.display='block';
    document.getElementById('thumb-placeholder').style.display='none';
    const a=document.createElement('a');const ts=new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
    a.href=url;a.download=`DialIn_${ts}.jpg`;a.click();showToast('📸  PHOTO SAVED');
  },'image/jpeg',0.95);
}
function toggleRecord(){if(!isRecording)startRecording();else stopRecording()}
function startRecording(){
  recordedChunks=[];compCanvas.style.display='block';
  let af;function cf(){drawCompositeFrame();af=requestAnimationFrame(cf)}cf();
  const cs=compCanvas.captureStream(30);
  if(videoStream){const at=videoStream.getAudioTracks();if(at.length>0)cs.addTrack(at[0])}
  const mt=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm','video/mp4'].find(m=>MediaRecorder.isTypeSupported(m))||'';
  try{mediaRecorder=new MediaRecorder(cs,mt?{mimeType:mt}:{});}catch(e){mediaRecorder=new MediaRecorder(cs);}
  mediaRecorder.ondataavailable=e=>{if(e.data.size>0)recordedChunks.push(e.data)};
  mediaRecorder.onstop=()=>{
    cancelAnimationFrame(af);compCanvas.style.display='none';
    const blob=new Blob(recordedChunks,{type:mediaRecorder.mimeType||'video/webm'});
    const url=URL.createObjectURL(blob);
    const img=document.getElementById('thumb-img');img.src=url;img.style.display='block';
    document.getElementById('thumb-placeholder').style.display='none';
    const a=document.createElement('a');const ts=new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
    const ext=blob.type.includes('mp4')?'mp4':'webm';
    a.href=url;a.download=`DialIn_${ts}.${ext}`;a.click();URL.revokeObjectURL(url);showToast('🎬  VIDEO SAVED');
  };
  mediaRecorder.start(100);isRecording=true;
  document.getElementById('shutter-btn').classList.add('recording');
  document.getElementById('rec-timer').classList.add('visible');
  recSeconds=0;updateRecTimer();recTimerInterval=setInterval(updateRecTimer,1000);
}
function stopRecording(){if(mediaRecorder&&mediaRecorder.state!=='inactive')mediaRecorder.stop();isRecording=false;document.getElementById('shutter-btn').classList.remove('recording');document.getElementById('rec-timer').classList.remove('visible');clearInterval(recTimerInterval);}
function updateRecTimer(){recSeconds++;const m=String(Math.floor(recSeconds/60)).padStart(2,'0'),s=String(recSeconds%60).padStart(2,'0');document.getElementById('rec-time').textContent=`${m}:${s}`}
function updateZoom(val){mag=parseInt(val);document.getElementById('zoom-label').textContent=mag+'×';document.getElementById('stat-zoom').textContent=mag+'×';drawReticle()}
function setUnit(u){unit=u;document.getElementById('btn-moa').classList.toggle('active',u==='MOA');document.getElementById('btn-mrad').classList.toggle('active',u==='MRAD');document.getElementById('stat-unit').textContent=u;drawReticle()}
function setColor(c,el){reticleColor=c;document.querySelectorAll('.swatch').forEach(s=>s.classList.remove('active'));el.classList.add('active');drawReticle()}
function setCenter(s,el){centerStyle=s;document.querySelectorAll('.center-opt').forEach(o=>o.classList.remove('active'));el.classList.add('active');drawReticle()}

resizeCanvas();