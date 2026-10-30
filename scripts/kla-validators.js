/* KLA Practice Lab: local, fail-closed validation of milestone submissions.
 * No network uploads. Source PDFs remain authoritative; results state their scope.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.KLAValidators=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const TOL=1e-5;
function finite(v){return typeof v==='number'&&Number.isFinite(v)}
function fail(errors,code,message,where=''){if(errors.length<120)errors.push({code,message,where});}
function report(problem,milestone,errors,warnings,checks,scope){
 return {problem,milestone,verdict:errors.length?'FAIL':scope==='complete'?'PASS':'PARTIAL',errors,warnings,checks,scope,disclaimer:scope==='complete'?'Checks cover specified feasibility constraints, not global optimality or official acceptance.':'Only the listed rules were checked. Unchecked requirements prevent a full PASS.'};
}
function xy(p){return Array.isArray(p)&&p.length===2&&p.every(finite)}
function dist(a,b){return Math.hypot(a[0]-b[0],a[1]-b[1])}
function near(a,b,eps=TOL){return dist(a,b)<=eps}
function motion(s,v,a){if(s<1e-9)return 0;if(!(v>0))throw Error('Velocity must be positive');if(!(a>0))return s/v;const d=v*v/a;return s<=d?2*Math.sqrt(s/a):2*v/a+(s-d)/v}
function angle(d){const [a,b]=d.Corners;return ((Math.atan2(b[1]-a[1],b[0]-a[0])*180/Math.PI)%180+180)%180}
function angleDistance(a,b){let best=Infinity;for(let k=-4;k<=4;k++)best=Math.min(best,Math.abs(b-a+90*k));return best}
function center(d){const c=d.Corners;return [c.reduce((s,p)=>s+p[0],0)/c.length,c.reduce((s,p)=>s+p[1],0)/c.length]}
function crosses(a,b,z){const [x1,y1]=z.BottomLeft,[x2,y2]=z.TopRight;let lo=0,hi=1;const dx=b[0]-a[0],dy=b[1]-a[1];for(const [p,q] of [[-dx,a[0]-x1],[dx,x2-a[0]],[-dy,a[1]-y1],[dy,y2-a[1]]]){if(Math.abs(p)<1e-12){if(q<0)return false;continue}const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return false}return lo<=hi&&hi>=0&&lo<=1}
function route(input,output,milestone){
 const e=[],w=[],checks=[];let m=Number(milestone);
 if(![1,2,3,4].includes(m)){fail(e,'MILESTONE','Milestone must be 1–4');return report('route',m,e,w,checks,'complete')}
 if(!input||!output||!Array.isArray(input.Dies)||!Array.isArray(output.Path)){fail(e,'SCHEMA','Input must contain Dies and output must contain Path');return report('route',m,e,w,checks,'complete')}
 if(!xy(input.InitialPosition)||!input.Dies.length||!input.Dies.every(d=>Array.isArray(d.Corners)&&d.Corners.length===4&&d.Corners.every(xy))){fail(e,'INPUT','Invalid die corners or initial position');return report('route',m,e,w,checks,'complete')}
 const path=output.Path;if(!path.length||!path.every(xy)){fail(e,'PATH','Path must contain finite [x,y] pairs');return report('route',m,e,w,checks,'complete')}
 if(!finite(output.TotalTime)||output.TotalTime<0)fail(e,'TOTAL_TIME','TotalTime must be finite and nonnegative');
 if(!near(path[0],input.InitialPosition))fail(e,'START','Path must begin at InitialPosition');
 const centers=input.Dies.map(center),angles=input.Dies.map(angle),used=new Set(),visitIndices=[];
 for(let j=1;j<path.length;j++){let hits=[];for(let i=0;i<centers.length;i++)if(near(path[j],centers[i]))hits.push(i);if(hits.length){let free=hits.find(i=>!used.has(i));if(free===undefined){fail(e,'DUPLICATE_DIE','Die center visited more than once','Path['+j+']');continue}used.add(free);visitIndices.push([j,free]);}}
 if(used.size!==centers.length)fail(e,'MISSING_DIES','Missing '+(centers.length-used.size)+' of '+centers.length+' required die centers');
 checks.push({name:'Required die centers',passed:used.size===centers.length,detail:used.size+'/'+centers.length+' visited'});
 if(!finite(input.StageVelocity)||input.StageVelocity<=0)fail(e,'STAGE_SPEED','StageVelocity must be positive');
 if(m>=2&&(!finite(input.CameraVelocity)||input.CameraVelocity<=0))fail(e,'CAMERA_SPEED','CameraVelocity must be positive');
 if(m>=3&&(!finite(input.StageAcceleration)||input.StageAcceleration<=0||!finite(input.CameraAcceleration)||input.CameraAcceleration<=0))fail(e,'ACCELERATION','Both accelerations must be positive');
 const obstacles=m===4?(input.ForbiddenZones||[]):[];
 if(m===4&&!Array.isArray(obstacles))fail(e,'ZONES','ForbiddenZones must be an array');
 if(Array.isArray(obstacles)){
 for(let k=0;k<obstacles.length;k++){let z=obstacles[k];if(!z||!xy(z.BottomLeft)||!xy(z.TopRight)||z.BottomLeft.some((v,i)=>v>=z.TopRight[i])){fail(e,'ZONE_FORMAT','Invalid forbidden rectangle','ForbiddenZones['+k+']');continue}
 for(let j=0;j+1<path.length;j++)if(crosses(path[j],path[j+1],z))fail(e,'COLLISION','Path segment touches or enters forbidden zone '+k,'Path['+j+']→['+(j+1)+']');
 }}
 checks.push({name:'Forbidden-zone clearance',passed:!e.some(x=>x.code==='COLLISION'),detail:m===4?obstacles.length+' zones checked':'Not applicable'});
 // Recompute time by consecutive visits. Stage time is summed over straight segments,
 // while camera rotation overlaps with stage travel between die centers.
 if(!e.some(x=>['STAGE_SPEED','CAMERA_SPEED','ACCELERATION','INPUT','PATH'].includes(x.code))){
 let total=0,last=0,prevAngle=finite(input.InitialAngle)?input.InitialAngle:0;
 for(const [idx,die] of visitIndices){
   let stage=0;for(let j=last;j<idx;j++)stage+=motion(dist(path[j],path[j+1]),input.StageVelocity,m>=3?input.StageAcceleration:0);
   let camera=m>=2?motion(angleDistance(prevAngle,angles[die]),input.CameraVelocity,m>=3?input.CameraAcceleration:0):0;
   total+=Math.max(stage,camera);last=idx;prevAngle=angles[die];
 }
 if(last<path.length-1)fail(e,'TRAILING_WAYPOINTS','Path continues after the last inspected die');
 if(visitIndices.length&&finite(output.TotalTime)){
   const eps=Math.max(1e-4,Math.abs(total)*1e-5);
   if(Math.abs(total-output.TotalTime)>eps)fail(e,'TIME_MISMATCH','Reported TotalTime '+output.TotalTime+' differs from recomputed '+total.toFixed(8));
 }
 checks.push({name:'Independent time calculation',passed:!e.some(x=>x.code==='TIME_MISMATCH'),detail:'Recomputed '+total.toFixed(8)});
 }
 if(path.length>100000)fail(e,'PATH_LENGTH','Path exceeds 100,000 waypoints');
 return report('route',m,e,w,checks,'complete');
}
function csv(text){if(typeof text!=='string')throw Error('CSV text required');return text.replace(/^\uFEFF/,'').split(/\r?\n/).map(l=>l.trim()).filter(l=>l&&!l.startsWith('#')).map(l=>l.split(',').map(x=>x.trim().replace(/^"|"$/g,'')))}
function rectangles(text,columns,errors,label){let rows=csv(text),out=[],ids=new Set();for(let i=0;i<rows.length;i++){const r=rows[i];if(i===0&&/^(id|index)$/i.test(r[0]))continue;if(r.length!==columns){fail(errors,'CSV_COLUMNS',label+' row '+(i+1)+' needs '+columns+' columns');continue}const id=r[0],nums=r.slice(1,5).map(Number);if(!id||ids.has(id))fail(errors,'DUPLICATE_ID',label+' duplicate/empty ID '+id);ids.add(id);if(nums.some(v=>!Number.isFinite(v))||nums[0]>=nums[1]||nums[2]>=nums[3]){fail(errors,'RECTANGLE',label+' invalid rectangle at row '+(i+1));continue}out.push({id,x1:nums[0],x2:nums[1],y1:nums[2],y2:nums[3],parent:r[5]})}return out}
function overlap(a,b){return Math.min(a.x2,b.x2)-Math.max(a.x1,b.x1)>TOL&&Math.min(a.y2,b.y2)-Math.max(a.y1,b.y1)>TOL}
function inside(a,b){return a.x1>=b.x1-TOL&&a.x2<=b.x2+TOL&&a.y1>=b.y1-TOL&&a.y2<=b.y2+TOL}
function covered(care,fields){
 const fs=fields.filter(f=>overlap(care,f));const xs=[care.x1,care.x2];
 for(let f of fs){xs.push(Math.max(care.x1,f.x1),Math.min(care.x2,f.x2))}
 xs.sort((a,b)=>a-b);let last=xs[0],count=0;
 for(let k=1;k<xs.length;k++){const x=xs[k];if(x-last<=TOL)continue;const mid=(last+x)/2;const ranges=fs.filter(f=>f.x1<=mid&&f.x2>=mid).map(f=>[Math.max(f.y1,care.y1),Math.min(f.y2,care.y2)]).filter(a=>a[1]-a[0]>TOL).sort((a,b)=>a[0]-b[0]);let top=care.y1;for(let [lo,hi] of ranges){if(lo>top+TOL)return false;top=Math.max(top,hi);if(top>=care.y2-TOL)break}if(top<care.y2-TOL)return false;last=x;count++;if(count>20000)throw Error('Coverage geometry too complex')}
 return true;
}
function sem(input,output,milestone){
 const e=[],w=[],checks=[],m=Number(milestone);
 if(!Number.isInteger(m)||m<1||m>6)fail(e,'MILESTONE','Dataset must be 1–6');
 if(!input||!output||typeof input.careareas!=='string'||typeof input.metadata!=='string'||typeof output.mainfields!=='string'||typeof output.subfields!=='string'){fail(e,'FILES','Supply CareAreas.csv, metadata.csv, mainfields.csv and subfields.csv');return report('sem',m,e,w,checks,'complete')}
 let care=[],main=[],sub=[];try{care=rectangles(input.careareas,5,e,'CareAreas');main=rectangles(output.mainfields,5,e,'mainfields');sub=rectangles(output.subfields,6,e,'subfields')}catch(ex){fail(e,'CSV',ex.message)}
 if(!care.length||!main.length||!sub.length)fail(e,'EMPTY','Care areas, mainfields and subfields must be nonempty');
 const meta=csv(input.metadata),rows=meta.filter(r=>r.length>=2&&Number.isFinite(Number(r[0]))&&Number.isFinite(Number(r[1]))&&Number(r[0])>0&&Number(r[1])>0);
 const mainSizes=[...new Set(rows.map(r=>Number(r[0])))],subSizes=[...new Set(rows.map(r=>Number(r[1])))];
 if(!mainSizes.length)fail(e,'METADATA','No valid main-field size found');
 const mainSize=mainSizes[0];
 if(mainSizes.length>1)w.push({code:'MULTIPLE_MAIN_SIZES',message:'Metadata lists multiple main-field sizes; each listed size is accepted.'});
 if(!subSizes.length)fail(e,'METADATA','No subfield size found');
 for(let f of main){if(mainSizes.length&&!mainSizes.some(s=>close(f.x2-f.x1,s)&&close(f.y2-f.y1,s)))fail(e,'MAIN_SIZE','Mainfield '+f.id+' must match a permitted metadata size')}
 const lookup=new Map(main.map(f=>[f.id,f]));
 for(let f of sub){const parent=lookup.get(f.parent);if(!parent)fail(e,'PARENT','Subfield '+f.id+' references nonexistent mainfield '+f.parent);else if(!inside(f,parent))fail(e,'CONTAINMENT','Subfield '+f.id+' extends beyond mainfield '+f.parent);if(subSizes.length&&!subSizes.some(s=>close(f.x2-f.x1,s)&&close(f.y2-f.y1,s)))fail(e,'SUB_SIZE','Subfield '+f.id+' has a size not allowed by metadata')}
 // Sweep on x to detect strictly positive-area subfield overlaps, including cross-mainfield overlaps.
 const ordered=sub.slice().sort((a,b)=>a.x1-b.x1);let active=[];
 for(let f of ordered){active=active.filter(g=>g.x2>f.x1+TOL);for(let g of active)if(overlap(f,g))fail(e,'SUB_OVERLAP','Subfields '+g.id+' and '+f.id+' overlap');active.push(f)}
 checks.push({name:'Subfield overlap and containment',passed:!e.some(x=>['SUB_OVERLAP','PARENT','CONTAINMENT'].includes(x.code)),detail:sub.length+' subfields'});
 let ok=0;for(let f of care){try{if(covered(f,sub))ok++;else fail(e,'UNCOVERED','Care area '+f.id+' not completely covered')}catch(ex){fail(e,'COVERAGE_COMPLEXITY',ex.message)}}
 checks.push({name:'Care area coverage',passed:ok===care.length,detail:ok+'/'+care.length+' care areas'});
 const area=sub.reduce((s,f)=>s+(f.x2-f.x1)*(f.y2-f.y1),0);checks.push({name:'Layout size',passed:true,detail:main.length+' mainfields, '+sub.length+' subfields, scanned area '+area.toFixed(4)});
 w.push({code:'OPTIMALITY',message:'No claim of minimum scanned area or minimum field count; objective is not independently graded.'});
 return report('sem',m,e,w,checks,'complete');
}
function close(a,b){return Math.abs(a-b)<=Math.max(TOL,Math.abs(b)*1e-6)}
function schedule(input,output,milestone){
 const e=[],w=[],checks=[];const m=String(milestone??'');
 if(!input||!output||!Array.isArray(input.steps)||!Array.isArray(input.machines)||!Array.isArray(input.wafers)||!Array.isArray(output.schedule)){fail(e,'SCHEMA','Expected steps, machines, wafers, schedule arrays');return report('schedule',m,e,w,checks,'partial')}
 const steps=new Map(input.steps.map(s=>[s.id,s])),machines=new Map(input.machines.map(x=>[x.machine_id,x])),expected=new Map();
 for(let wafer of input.wafers){if(!Number.isInteger(wafer.quantity)||wafer.quantity<1){fail(e,'QUANTITY','Invalid wafer quantity');continue}for(let i=1;i<=wafer.quantity;i++)for(let [step,dur] of Object.entries(wafer.processing_times||{})){let id=wafer.type+'-'+i+'|'+step;if(expected.has(id))fail(e,'DUPLICATE_INPUT','Duplicate input task '+id);expected.set(id,dur)}}
 const seen=new Map(),perMachine=new Map(),perWafer=new Map();
 for(let [idx,r] of output.schedule.entries()){
 const id=r.wafer_id+'|'+r.step,loc='schedule['+idx+']',mac=machines.get(r.machine),duration=expected.get(id);
 if(!expected.has(id))fail(e,'UNKNOWN_TASK','Unexpected wafer/step '+id,loc);
 if(seen.has(id))fail(e,'DUPLICATE_TASK','Repeated task '+id,loc);else seen.set(id,r);
 if(!mac||mac.step_id!==r.step)fail(e,'MACHINE_STEP','Wrong or missing machine for '+id,loc);
 if(!finite(r.start_time)||!finite(r.end_time)||r.start_time<0||r.end_time<=r.start_time)fail(e,'TIME_RANGE','Invalid time interval',loc);
 if(finite(duration)&&finite(r.start_time)&&finite(r.end_time)&&!close(r.end_time-r.start_time,duration))fail(e,'DURATION','Wrong processing duration for '+id,loc);
 if(!perMachine.has(r.machine))perMachine.set(r.machine,[]);perMachine.get(r.machine).push(r);
 if(!perWafer.has(r.wafer_id))perWafer.set(r.wafer_id,[]);perWafer.get(r.wafer_id).push(r);
 }
 for(let id of expected.keys())if(!seen.has(id))fail(e,'MISSING_TASK','Missing '+id);
 checks.push({name:'Task completeness',passed:!e.some(x=>['MISSING_TASK','UNKNOWN_TASK','DUPLICATE_TASK'].includes(x.code)),detail:seen.size+'/'+expected.size+' distinct tasks'});
 for(let [mac,rows] of perMachine){
 rows.sort((a,b)=>a.start_time-b.start_time);
 const machine=machines.get(mac);if(!machine)continue;
 const initial=machine.initial_parameters||{},fluct=machine.fluctuation||{};
 const params={...initial};let sinceReset=0,lastEnd=null;
 const cooldown=machine.cooldown_time??0,n=machine.n??0;
 if((Object.keys(fluct).length||Object.keys(initial).length)&&(!Number.isInteger(n)||n<=0))fail(e,'MACHINE_N','Invalid n for machine '+mac);
 if(!finite(cooldown)||cooldown<0)fail(e,'COOLDOWN_CONFIG','Invalid cooldown time for '+mac);
 for(let i=0;i<rows.length;i++){
   const r=rows[i],step=steps.get(r.step),requirements=step?.parameters||{};
   if(lastEnd!==null){
     if(r.start_time<lastEnd-TOL)fail(e,'MACHINE_OVERLAP','Machine '+mac+' has overlapping jobs');
     const gap=r.start_time-lastEnd;
     if(gap>=cooldown-TOL&&cooldown>0){Object.assign(params,initial);sinceReset=0}
   }
   for(let [key,range] of Object.entries(requirements)){
     if(!Array.isArray(range)||range.length!==2||!range.every(finite)||range[0]>range[1]){fail(e,'PARAMETER_RANGE','Invalid parameter range '+key+' for '+r.step);continue}
     const value=params[key];
     if(!finite(value)){fail(e,'PARAMETER_MISSING','Machine '+mac+' lacks parameter '+key);continue}
     if(value<range[0]-TOL||value>range[1]+TOL){
       fail(e,'PARAMETER_OUT_OF_RANGE','Machine '+mac+' parameter '+key+' = '+value+' outside ['+range.join(', ')+'] before '+r.wafer_id+' / '+r.step);
       if(lastEnd!==null&&r.start_time-lastEnd<cooldown-TOL)fail(e,'COOLDOWN','Machine '+mac+' must cool for '+cooldown+' before the next wafer');
     }
   }
   sinceReset++;
   if(Number.isInteger(n)&&n>0&&sinceReset%n===0){
     for(let [key,delta] of Object.entries(fluct)){
       if(!finite(delta)||!finite(params[key]))fail(e,'FLUCTUATION','Invalid machine fluctuation '+key+' for '+mac);
       else params[key]+=delta;
     }
   }
   lastEnd=r.end_time;
 }
 }
 for(let [wafer,rows] of perWafer){rows.sort((a,b)=>a.start_time-b.start_time);for(let i=1;i<rows.length;i++)if(rows[i].start_time<rows[i-1].end_time-TOL)fail(e,'WAFER_OVERLAP','Wafer '+wafer+' processed on two machines at once')}
 for(let [id,r] of seen){let dep=steps.get(r.step)?.dependency;if(!dep)continue;let list=Array.isArray(dep)?dep:[dep];for(let d of list){const prior=seen.get(r.wafer_id+'|'+d);if(!prior)fail(e,'DEPENDENCY_MISSING','Dependency '+d+' missing for '+id);else if(prior.end_time>r.start_time+TOL)fail(e,'DEPENDENCY_ORDER','Step '+r.step+' starts before '+d+' completes on '+r.wafer_id)}}
 checks.push({name:'Machine/wafer concurrency and dependencies',passed:!e.some(x=>['MACHINE_OVERLAP','WAFER_OVERLAP','DEPENDENCY_MISSING','DEPENDENCY_ORDER'].includes(x.code)),detail:output.schedule.length+' operations'});
 checks.push({name:'Machine parameter and cooldown simulation',passed:!e.some(x=>['COOLDOWN','PARAMETER_OUT_OF_RANGE','PARAMETER_MISSING','PARAMETER_RANGE','FLUCTUATION','MACHINE_N','COOLDOWN_CONFIG'].includes(x.code)),detail:'Replayed job order, per-n drift and idle-time resets'});
 w.push({code:'OPTIMALITY',message:'Makespan is not proven globally optimal.'});
 return report('schedule',m,e,w,checks,'complete');
}
function mapping(input,output,milestone){
 const e=[],w=[],checks=[],m=Number(milestone);
 if(![1,2,3,4,5].includes(m)){fail(e,'MILESTONE','Mapping milestone must be 1–5');return report('mapping',m,e,w,checks,'partial')}
 if(!input||!output||typeof input!=='object'||typeof output!=='object'){fail(e,'SCHEMA','Supply normalized input and output JSON objects');return report('mapping',m,e,w,checks,'partial')}
 const diameter=input.WaferDiameter??input.waferDiameter??input.diameter;
 if(!finite(diameter)||diameter<=0)fail(e,'DIAMETER','WaferDiameter must be positive');
 const radius=diameter/2;
 const pts=m===1?(output.points||output.Points||[]):(output.dies||output.Dies||output.measurements||output.Measurements||[]);
 if(!Array.isArray(pts)){fail(e,'OUTPUT','Expected points, dies or measurements array');return report('mapping',m,e,w,checks,'partial')}
 if(!pts.length)fail(e,'EMPTY','Output has no coordinates');
 if(m===1){
  const n=input.N??input.n??input.NumberOfPoints;
  if(!Number.isInteger(n)||n<=0)fail(e,'N','N must be a positive integer');
  if(Number.isInteger(n)&&pts.length!==n)fail(e,'COUNT','Expected '+n+' points, found '+pts.length);
  for(let i=0;i<pts.length;i++){let p=pts[i];if(!xy(p)){fail(e,'POINT','Invalid [x,y] at index '+i);continue}if(finite(radius)&&dist(p,[0,0])>radius+TOL)fail(e,'OUTSIDE_WAFER','Point '+i+' outside wafer boundary')}
  const unique=new Set(pts.filter(xy).map(p=>p.map(x=>x.toFixed(6)).join(',')));
  if(unique.size!==pts.length)fail(e,'DUPLICATE','Duplicate measurement points');
  checks.push({name:'Point count and wafer boundary',passed:!e.length,detail:pts.length+' points'});
  w.push({code:'SPACING',message:'Equal-spacing and orientation interpretation depends on the official milestone reference examples; no exact spacing certification is claimed.'});
 }else{
  const indices=new Set();let valid=0;
  for(let i=0;i<pts.length;i++){
   const item=pts[i],pos=Array.isArray(item)?item:(item?.llc||item?.LLC||item?.wafer||item?.position||item?.coordinate);
   if(!xy(pos)){fail(e,'POINT','Missing valid wafer-coordinate [x,y] for entry '+i);continue}
   valid++;
   const index=item?.index||item?.dieIndex;
   if(index!==undefined){if(!xy(index)){fail(e,'INDEX','Die index must be [row,column] at entry '+i)}else{let key=index.join(',');if(m<=3&&indices.has(key))fail(e,'DUPLICATE_DIE','Repeated die index '+key);indices.add(key)}}
   if(m<=3&&finite(radius)){
    const size=input.DieSize||input.dieSize;
    if(xy(size)&&size.every(x=>x>0)){
     const nearestX=Math.max(pos[0],Math.min(0,pos[0]+size[0])),nearestY=Math.max(pos[1],Math.min(0,pos[1]+size[1]));
     if(Math.hypot(nearestX,nearestY)>radius+TOL)fail(e,'OUTSIDE_WAFER','Die '+i+' does not intersect wafer');
    }else w.push({code:'DIE_SIZE',message:'Provide DieSize:[width,height] to verify die/wafer intersection.'});
   }
   if(m>=4&&finite(radius)){
     const rr=m===4?(input.Radius??input.radius):radius-(input.EdgeExclusion??input.edgeExclusion??0);
     if(!finite(rr)||rr<0)fail(e,'RADIUS','Invalid target radius/edge exclusion');
     else if(dist(pos,[0,0])>rr+TOL)fail(e,'RADIUS_EXCEEDED','Measurement '+i+' outside allowed radius');
   }
  }
  checks.push({name:'Coordinates and wafer region',passed:!e.length,detail:valid+'/'+pts.length+' valid coordinate entries'});
  w.push({code:'GEOMETRY_COMPLETENESS',message:'Reticle indexing, all partial dies, street spacing, measurement offsets and gripper masking are not fully independently enumerated.'});
 }
 w.push({code:'FORMAT',message:'This is a normalized JSON checker. The original PDF shows coordinate-pair output rather than a canonical JSON submission schema.'});
 return report('mapping',m,e,w,checks,'partial');
}
function workflow(input,output,milestone){
 const e=[],w=[],checks=[],m=String(milestone??'');
 if(!['1A','1B','2A','2B','3A1'].includes(m))fail(e,'MILESTONE','Expected workflow milestone 1A, 1B, 2A, 2B or 3A1');
 if(m==='3A1')return binning(input,output,m);
 const yaml=input?.yaml,log=output?.log;
 if(typeof yaml!=='string'||typeof log!=='string'){fail(e,'FILES','Supply workflow YAML and execution log TXT');return report('workflow',m,e,w,checks,'partial')}
 if(!yaml.trim()||!log.trim())fail(e,'EMPTY','YAML and log must be nonempty');
 const lines=log.split(/\r?\n/).filter(x=>x.trim()),opened=new Map(),skipped=new Set(),executed=new Set();let previous=-Infinity;
 for(let i=0;i<lines.length;i++){
   const line=lines[i].trim(),match=line.match(/^(\d{4}-\d\d-\d\d[ T]\d\d:\d\d:\d\d(?:\.\d+)?)[;:]\s*(.+?)\s+(Entry|Exit|Skipped|Executing\b.*)$/);
   if(!match){fail(e,'LOG_FORMAT','Invalid timestamp/path/event format on line '+(i+1));continue}
   const time=Date.parse(match[1].replace(' ','T')+'Z'),path=match[2].trim(),event=match[3];
   if(!Number.isFinite(time))fail(e,'TIMESTAMP','Unparseable timestamp on line '+(i+1));
   if(time<previous)unsorted++;previous=Math.max(previous,time);
   if(event==='Entry'){if(opened.has(path))fail(e,'DUPLICATE_ENTRY','Duplicate Entry without Exit for '+path);const parent=path.includes('.')?path.slice(0,path.lastIndexOf('.')):null;if(parent&&!opened.has(parent))fail(e,'PARENT_NOT_OPEN','Nested task '+path+' entered before parent '+parent);opened.set(path,{line:i+1,time});}
   else if(event==='Exit'){if(!opened.has(path))fail(e,'EXIT_WITHOUT_ENTRY','Exit without Entry for '+path);else{const entered=opened.get(path);if(time<entered.time)fail(e,'NEGATIVE_DURATION','Exit before Entry timestamp for '+path);for(let child of opened.keys())if(child.startsWith(path+'.'))fail(e,'PARENT_EARLY_EXIT','Parent '+path+' exited while '+child+' was active');opened.delete(path);}}
   else if(event==='Skipped'){if(!opened.has(path))fail(e,'SKIP_WITHOUT_ENTRY','Skipped without Entry for '+path);if(executed.has(path))fail(e,'SKIPPED_EXECUTED','Skipped task also executed '+path);skipped.add(path)}
   else if(event.startsWith('Executing')){if(!opened.has(path))fail(e,'EXECUTE_WITHOUT_ENTRY','Executing before Entry for '+path);if(skipped.has(path))fail(e,'SKIPPED_EXECUTED','Skipped task executed '+path);executed.add(path)}
 }
 if(unsorted)w.push({code:'CONCURRENT_LOG_ORDER',message:unsorted+' timestamp reversals in log order; concurrent threads may interleave, so global monotonicity is not required.'});
 for(let name of opened.keys())fail(e,'MISSING_EXIT','No Exit for '+name);
 if(!lines.length)fail(e,'NO_EVENTS','No log events');
 checks.push({name:'Timestamp and log event format',passed:!e.some(x=>['LOG_FORMAT','TIMESTAMP','NEGATIVE_DURATION'].includes(x.code)),detail:lines.length+' lines'});
 checks.push({name:'Entry / Exit / Skipped consistency',passed:!e.some(x=>['DUPLICATE_ENTRY','EXIT_WITHOUT_ENTRY','MISSING_EXIT','SKIP_WITHOUT_ENTRY','SKIPPED_EXECUTED','EXECUTE_WITHOUT_ENTRY','PARENT_NOT_OPEN','PARENT_EARLY_EXIT'].includes(x.code)),detail:executed.size+' executing task paths'});
 w.push({code:'YAML_SEMANTICS',message:'YAML task/flow graph, sequential/concurrent timing, nested execution, variable references and conditions are not fully replayed.'});
 if(m.startsWith('2'))w.push({code:'CONDITIONS',message:'Conditions and data-passing values need execution-level verification against the actual YAML and datasets.'});
 return report('workflow',m,e,w,checks,'partial');
}
function unsupported(problem,milestone){
 return report(problem,milestone,[],[{code:'UNSUPPORTED',message:'No trustworthy executable milestone rules have been established for this problem. Uploads cannot be certified as correct.'}],[],'partial');
}
function validate(problem,milestone,input,output){try{switch(problem){case 'route':return route(input,output,milestone);case 'sem':return sem(input,output,milestone);case 'schedule':return schedule(input,output,milestone);case 'mapping':return mapping(input,output,milestone);case 'workflow':return workflow(input,output,milestone);default:return report(problem,milestone,[{code:'UNKNOWN_PROBLEM',message:'Unknown problem',where:''}],[],[],'partial')}}catch(ex){return report(problem,milestone,[{code:'EXCEPTION',message:String(ex.message||ex),where:''}],[],[],'partial')}}
return {validate,route,sem,schedule,mapping,workflow,unsupported,version:'1.1.0'};
});
