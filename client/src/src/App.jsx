import { useState, useEffect, useCallback } from "react";

const generateCode = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${seg()}-${seg()}-${seg()}`;
};

const C = {
  bg: '#0f1117', sid: '#0d1018', card: '#151921', bdr: '#1e2330',
  txt: '#e2e8f0', mut: '#4a5568', acc: '#3b82f6', grn: '#22c55e',
  red: '#ef4444', mono: "'DM Mono',monospace"
};

const CheckIco = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><path d="M20 6 9 17l-5-5"/></svg>;
const TrashIco = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6m4-6v6"/><path d="M9 6V4h6v2"/></svg>;
const PencilIco = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const CopyIco = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
const RefreshIco = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
const BackIco = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><path d="M19 12H5M12 5l-7 7 7 7"/></svg>;
const FolderIco = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:15,height:15}}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>;
const SpinIco = () => <svg style={{width:15,height:15,animation:'spin 1s linear infinite'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" strokeOpacity=".2"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg>;

export default function App() {
  const [screen, setScreen] = useState('home');
  const [adminPw, setAdminPw] = useState('');
  const [clientProj, setClientProj] = useState(null);
  return (
    <>
      {screen === 'home' && <HomeView onAdmin={p=>{setAdminPw(p);setScreen('admin');}} onClient={proj=>{setClientProj(proj);setScreen('client');}} />}
      {screen === 'admin' && <AdminView adminPw={adminPw} onLogout={()=>{setAdminPw('');setScreen('home');}} />}
      {screen === 'client' && <ClientView project={clientProj} onLogout={()=>{setClientProj(null);setScreen('home');}} />}
    </>
  );
}

function HomeView({ onAdmin, onClient }) {
  const [tab, setTab] = useState('client');
  const [ap, setAp] = useState('');
  const [cc, setCc] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const trigErr = msg => { setErr(msg); setShake(true); setTimeout(()=>setShake(false),500); };

  const doAdmin = async () => {
    if (!ap) return;
    setLoading(true);
    const r = await fetch('/api/auth/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:ap})}).then(x=>x.json());
    setLoading(false);
    if (r.ok) onAdmin(ap); else trigErr('Pogrešna lozinka.');
  };

  const doClient = async () => {
    if (!cc) return;
    setLoading(true);
    const r = await fetch('/api/auth/client',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:cc})}).then(x=>x.json());
    setLoading(false);
    if (r.ok) onClient(r.project); else trigErr('Pristupni kod nije ispravan.');
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{width:'100%',maxWidth:380}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <img src="https://prplus.hr/logo.png" alt="PR Plus" style={{height:30,filter:'brightness(0) invert(1)',marginBottom:8}} />
          <p style={{fontSize:13,color:C.mut}}>Praćenje projekata</p>
        </div>
        <div style={{animation:shake?'shake 0.4s ease':'none',background:C.card,border:`1px solid ${C.bdr}`,borderRadius:18,overflow:'hidden'}}>
          <div style={{display:'flex',borderBottom:`1px solid ${C.bdr}`}}>
            {[['client','Klijentski pristup'],['admin','Admin']].map(([t,label])=>(
              <button key={t} onClick={()=>{setTab(t);setErr('');}}
                style={{flex:1,padding:'14px 0',fontSize:13,fontWeight:500,border:'none',cursor:'pointer',background:tab===t?'#1e2330':'transparent',color:tab===t?C.txt:C.mut,borderBottom:tab===t?`2px solid ${C.acc}`:'2px solid transparent'}}>
                {label}
              </button>
            ))}
          </div>
          <div style={{padding:24}}>
            {tab==='client'?<>
              <p style={{fontSize:13,color:C.mut,marginBottom:16}}>Unesite pristupni kod koji ste dobili od webmastera.</p>
              <input type="text" placeholder="Pristupni kod" value={cc} onChange={e=>{setCc(e.target.value);setErr('');}} onKeyDown={e=>e.key==='Enter'&&doClient()}
                style={{width:'100%',background:'#1e2330',border:`1px solid ${C.bdr}`,borderRadius:10,padding:'12px 14px',fontSize:14,color:C.txt,fontFamily:C.mono,letterSpacing:'0.06em',marginBottom:6}} />
              {err&&<p style={{fontSize:12,color:'#f87171',marginBottom:10}}>{err}</p>}
              {!err&&<div style={{height:16}}/>}
              <button onClick={doClient} disabled={loading} style={{width:'100%',padding:'13px 0',borderRadius:10,border:'none',cursor:'pointer',background:'linear-gradient(135deg,#3b82f6,#6366f1)',color:'white',fontSize:14,fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                {loading&&<SpinIco/>} Otvori projekt
              </button>
            </>:<>
              <p style={{fontSize:13,color:C.mut,marginBottom:16}}>Admin pristup za upravljanje projektima.</p>
              <input type="password" placeholder="Lozinka" value={ap} onChange={e=>{setAp(e.target.value);setErr('');}} onKeyDown={e=>e.key==='Enter'&&doAdmin()}
                style={{width:'100%',background:'#1e2330',border:`1px solid ${C.bdr}`,borderRadius:10,padding:'12px 14px',fontSize:14,color:C.txt,marginBottom:6}} />
              {err&&<p style={{fontSize:12,color:'#f87171',marginBottom:10}}>{err}</p>}
              {!err&&<div style={{height:16}}/>}
              <button onClick={doAdmin} disabled={loading} style={{width:'100%',padding:'13px 0',borderRadius:10,border:'none',cursor:'pointer',background:'#1e2330',color:C.txt,fontSize:14,fontWeight:600,display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                {loading&&<SpinIco/>} Prijavi se
              </button>
              <p style={{fontSize:11,color:'#252d3d',textAlign:'center',marginTop:14}}>zadana lozinka: admin2024</p>
            </>}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminView({ adminPw, onLogout }) {
  const [projects, setProjects] = useState([]);
  const [selId, setSelId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [nf, setNf] = useState({name:'',clientName:'',accessCode:generateCode(),description:''});
  const [newTask, setNewTask] = useState('');
  const [editNote, setEditNote] = useState(null);
  const [editProj, setEditProj] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [pf, setPf] = useState({current:'',next:''});
  const [pfErr, setPfErr] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [apiErr, setApiErr] = useState('');

  const proj = projects.find(p=>p.id===selId);
  const done = proj ? proj.tasks.filter(t=>t.done).length : 0;
  const total = proj ? proj.tasks.length : 0;
  const pct = total>0 ? Math.round((done/total)*100) : 0;
  const hdr = {'Content-Type':'application/json','x-admin-password':adminPw};

  const load = useCallback(async()=>{
    setLoading(true);
    const d = await fetch('/api/projects',{headers:{'x-admin-password':adminPw}}).then(r=>r.json());
    if (Array.isArray(d)) setProjects(d);
    setLoading(false);
  },[adminPw]);

  useEffect(()=>{load();},[load]);

  const createProj = async()=>{
    if (!nf.name.trim()||!nf.accessCode.trim()) return;
    const d = await fetch('/api/projects',{method:'POST',headers:hdr,body:JSON.stringify(nf)}).then(r=>r.json());
    if (d.error){setApiErr(d.error);return;}
    setProjects(ps=>[d,...ps]); setSelId(d.id); setShowNew(false);
    setNf({name:'',clientName:'',accessCode:generateCode(),description:''});
  };

  const saveEdit = async()=>{
    if (!editProj) return;
    const d = await fetch(`/api/projects/${selId}`,{method:'PUT',headers:hdr,body:JSON.stringify(editProj)}).then(r=>r.json());
    if (d.error){setApiErr(d.error);return;}
    setProjects(ps=>ps.map(p=>p.id===d.id?d:p)); setEditProj(null);
  };

  const delProj = async()=>{
    if (!proj||!confirm(`Obrisati "${proj.name}"?`)) return;
    await fetch(`/api/projects/${selId}`,{method:'DELETE',headers:{'x-admin-password':adminPw}});
    setProjects(ps=>ps.filter(p=>p.id!==selId)); setSelId(null);
  };

  const addTask = async()=>{
    if (!newTask.trim()||!proj) return;
    const t = await fetch(`/api/projects/${selId}/tasks`,{method:'POST',headers:hdr,body:JSON.stringify({text:newTask})}).then(r=>r.json());
    if (!t.error){setProjects(ps=>ps.map(p=>p.id===selId?{...p,tasks:[...p.tasks,t]}:p));setNewTask('');}
  };

  const toggleTask = async(tid,cur)=>{
    const t = await fetch(`/api/tasks/${tid}`,{method:'PUT',headers:hdr,body:JSON.stringify({done:!cur})}).then(r=>r.json());
    if (!t.error) setProjects(ps=>ps.map(p=>p.id===selId?{...p,tasks:p.tasks.map(x=>x.id===tid?t:x)}:p));
  };

  const saveNote = async(tid)=>{
    const t = await fetch(`/api/tasks/${tid}`,{method:'PUT',headers:hdr,body:JSON.stringify({note:editNote.text})}).then(r=>r.json());
    if (!t.error) setProjects(ps=>ps.map(p=>p.id===selId?{...p,tasks:p.tasks.map(x=>x.id===tid?t:x)}:p));
    setEditNote(null);
  };

  const delTask = async(tid)=>{
    await fetch(`/api/tasks/${tid}`,{method:'DELETE',headers:{'x-admin-password':adminPw}});
    setProjects(ps=>ps.map(p=>p.id===selId?{...p,tasks:p.tasks.filter(x=>x.id!==tid)}:p));
  };

  const chPass = async()=>{
    setPfErr('');
    const d = await fetch('/api/settings/password',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({currentPassword:pf.current,newPassword:pf.next})}).then(r=>r.json());
    if (d.ok){setShowSettings(false);setPf({current:'',next:''});alert('Lozinka promijenjena.');}
    else setPfErr(d.error||'Greška.');
  };

  const copy = (text,setter)=>{navigator.clipboard.writeText(text);setter(true);setTimeout(()=>setter(false),2000);};

  const inp = {width:'100%',background:'#1e2330',border:`1px solid ${C.bdr}`,borderRadius:8,padding:'10px 12px',fontSize:14,color:C.txt,marginBottom:8};

  const ProjList = () => (
    <div>
      {loading&&<p style={{fontSize:13,color:C.mut,textAlign:'center',padding:24}}>Učitavanje...</p>}
      {!loading&&projects.length===0&&<p style={{fontSize:13,color:C.mut,textAlign:'center',padding:24}}>Nema projekata.</p>}
      {projects.map(p=>{
        const d2=p.tasks.filter(t=>t.done).length, t2=p.tasks.length, act=selId===p.id;
        return (
          <div key={p.id} onClick={()=>setSelId(p.id)}
            style={{padding:'12px 14px',cursor:'pointer',borderLeft:act?`2px solid ${C.acc}`:'2px solid transparent',background:act?'#12161e':'transparent',borderBottom:`1px solid ${C.bdr}`}}>
            <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:2}}>
              <FolderIco/>
              <span style={{fontSize:14,fontWeight:500,color:act?C.txt:'#9aa5b8',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</span>
            </div>
            {p.client_name&&<p style={{fontSize:12,color:C.mut,marginLeft:22,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.client_name}</p>}
            <div style={{display:'flex',alignItems:'center',gap:6,marginTop:6,marginLeft:22}}>
              <div style={{flex:1,height:3,background:'#1e2330',borderRadius:2,overflow:'hidden'}}>
                <div style={{width:`${t2>0?(d2/t2)*100:0}%`,height:'100%',background:C.grn}}/>
              </div>
              <span style={{fontSize:11,color:C.mut}}>{d2}/{t2}</span>
            </div>
          </div>
        );
      })}
    </div>
  );

  const NewProjForm = () => (
    <div style={{margin:12,background:C.bg,border:`1px solid ${C.bdr}`,borderRadius:12,padding:14}}>
      <p style={{fontSize:11,fontWeight:700,color:C.mut,marginBottom:10,textTransform:'uppercase',letterSpacing:'0.06em'}}>Novi projekt</p>
      {[{ph:'Naziv projekta *',key:'name'},{ph:'Ime klijenta',key:'clientName'},{ph:'Kratki opis',key:'description'}].map(({ph,key})=>(
        <input key={key} placeholder={ph} value={nf[key]} onChange={e=>setNf(f=>({...f,[key]:e.target.value}))}
          style={{...inp,fontSize:13,padding:'9px 10px'}} />
      ))}
      <p style={{fontSize:11,color:C.mut,marginBottom:5}}>Pristupni kod za klijenta</p>
      <div style={{display:'flex',gap:6,marginBottom:4}}>
        <input value={nf.accessCode} onChange={e=>setNf(f=>({...f,accessCode:e.target.value}))}
          style={{flex:1,minWidth:0,background:'#1e2330',border:`1px solid ${C.bdr}`,borderRadius:8,padding:'9px 10px',fontSize:12,color:'#60a5fa',fontFamily:C.mono}} />
        <button onClick={()=>setNf(f=>({...f,accessCode:generateCode()}))}
          style={{background:'#1e2330',border:`1px solid ${C.bdr}`,borderRadius:8,padding:'0 10px',color:C.mut,cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center'}}><RefreshIco/></button>
        <button onClick={()=>copy(nf.accessCode,setCodeCopied)}
          style={{background:codeCopied?'#0d2516':'#1e3a5f',border:'1px solid #1e4a7a',borderRadius:8,padding:'0 10px',color:codeCopied?C.grn:'#60a5fa',cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',gap:4}}>
          {codeCopied?<CheckIco/>:<CopyIco/>}
        </button>
      </div>
      <p style={{fontSize:10,color:'#252d3d',marginBottom:10}}>Auto-generiran · možeš promijeniti</p>
      <div style={{display:'flex',gap:7}}>
        <button onClick={createProj} style={{flex:1,background:C.acc,color:'white',border:'none',borderRadius:8,padding:'10px 0',fontSize:13,fontWeight:700,cursor:'pointer'}}>Kreiraj</button>
        <button onClick={()=>setShowNew(false)} style={{flex:1,background:'#1e2330',color:C.mut,border:'none',borderRadius:8,padding:'10px 0',fontSize:13,cursor:'pointer'}}>Odustani</button>
      </div>
    </div>
  );

  const ProjDetail = () => !proj ? null : (
    <div style={{padding:'16px 16px 80px',maxWidth:680,margin:'0 auto'}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:14,padding:16,marginBottom:14}}>
        {editProj?(
          <div>
            <p style={{fontSize:11,fontWeight:700,color:C.mut,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:10}}>Uredi projekt</p>
            {[{ph:'Naziv',key:'name'},{ph:'Ime klijenta',key:'clientName'},{ph:'Opis',key:'description'}].map(({ph,key})=>(
              <input key={key} placeholder={ph} value={editProj[key]||''} onChange={e=>setEditProj(ep=>({...ep,[key]:e.target.value}))} style={inp}/>
            ))}
            <p style={{fontSize:11,color:C.mut,marginBottom:5}}>Pristupni kod</p>
            <div style={{display:'flex',gap:6,marginBottom:12}}>
              <input value={editProj.accessCode||''} onChange={e=>setEditProj(ep=>({...ep,accessCode:e.target.value}))}
                style={{flex:1,minWidth:0,background:'#1e2330',border:`1px solid ${C.bdr}`,borderRadius:8,padding:'9px 10px',fontSize:13,color:'#60a5fa',fontFamily:C.mono}}/>
              <button onClick={()=>setEditProj(ep=>({...ep,accessCode:generateCode()}))}
                style={{background:'#1e2330',border:`1px solid ${C.bdr}`,borderRadius:8,padding:'0 10px',color:C.mut,cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center'}}><RefreshIco/></button>
              <button onClick={()=>copy(editProj.accessCode,setCodeCopied)}
                style={{background:codeCopied?'#0d2516':'#1e3a5f',border:'1px solid #1e4a7a',borderRadius:8,padding:'0 10px',color:codeCopied?C.grn:'#60a5fa',cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center'}}>
                {codeCopied?<CheckIco/>:<CopyIco/>}
              </button>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={saveEdit} style={{flex:1,background:C.acc,color:'white',border:'none',borderRadius:8,padding:'10px 0',fontSize:13,fontWeight:700,cursor:'pointer'}}>Spremi</button>
              <button onClick={()=>setEditProj(null)} style={{flex:1,background:'#1e2330',color:C.mut,border:'none',borderRadius:8,padding:'10px 0',fontSize:13,cursor:'pointer'}}>Odustani</button>
            </div>
          </div>
        ):(<>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:10,marginBottom:14}}>
            <div style={{flex:1,minWidth:0}}>
              <h2 style={{fontSize:17,fontWeight:700,marginBottom:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{proj.name}</h2>
              {proj.client_name&&<p style={{fontSize:13,color:C.mut}}>{proj.client_name}</p>}
              {proj.description&&<p style={{fontSize:12,color:'#5a6070',marginTop:3}}>{proj.description}</p>}
            </div>
            <div style={{display:'flex',gap:6,flexShrink:0}}>
              <button onClick={()=>setEditProj({name:proj.name,clientName:proj.client_name,accessCode:proj.access_code,description:proj.description})}
                style={{background:'transparent',border:`1px solid ${C.bdr}`,borderRadius:8,padding:'7px 12px',fontSize:12,color:C.mut,cursor:'pointer'}}>Uredi</button>
              <button onClick={delProj}
                style={{background:'transparent',border:'1px solid #2a1a1a',borderRadius:8,padding:'7px 12px',fontSize:12,color:C.red,cursor:'pointer'}}>Briši</button>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10,background:'#0d1625',border:'1px solid #1a2a40',borderRadius:10,padding:'10px 14px',marginBottom:14}}>
            <div style={{flex:1,minWidth:0}}>
              <p style={{fontSize:10,color:C.mut,textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:2}}>Pristupni kod</p>
              <p style={{fontSize:15,fontWeight:700,fontFamily:C.mono,color:'#60a5fa',overflow:'hidden',textOverflow:'ellipsis'}}>{proj.access_code}</p>
            </div>
            <button onClick={()=>copy(proj.access_code,setCodeCopied)}
              style={{background:codeCopied?'#0d2516':'#1e3a5f',border:`1px solid ${codeCopied?'#1a4030':'#2a5080'}`,borderRadius:8,padding:'8px 14px',fontSize:13,fontWeight:600,color:codeCopied?C.grn:'#60a5fa',cursor:'pointer',display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
              {codeCopied?<CheckIco/>:<CopyIco/>}{codeCopied?'Kopirano!':'Kopiraj'}
            </button>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
            <span style={{fontSize:12,color:C.mut}}>{done}/{total} zadataka</span>
            <span style={{fontSize:12,fontWeight:700,color:pct===100?C.grn:C.txt}}>{pct}%</span>
          </div>
          <div style={{height:4,background:'#1e2330',borderRadius:2,overflow:'hidden'}}>
            <div style={{width:`${pct}%`,height:'100%',background:pct===100?C.grn:'linear-gradient(90deg,#3b82f6,#6366f1)',transition:'width 0.4s',borderRadius:2}}/>
          </div>
        </>)}
      </div>

      <div style={{display:'flex',gap:8,marginBottom:14}}>
        <input placeholder="Dodaj zadatak... (Enter)" value={newTask} onChange={e=>setNewTask(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addTask()}
          style={{flex:1,minWidth:0,background:C.card,border:`1px solid ${C.bdr}`,borderRadius:10,padding:'12px 14px',fontSize:14,color:C.txt}}/>
        <button onClick={addTask} style={{background:C.acc,color:'white',border:'none',borderRadius:10,padding:'0 18px',fontSize:13,fontWeight:700,cursor:'pointer',flexShrink:0}}>Dodaj</button>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {proj.tasks.length===0&&<div style={{background:C.card,border:`1px dashed ${C.bdr}`,borderRadius:12,padding:40,textAlign:'center'}}><p style={{fontSize:13,color:C.mut}}>Nema zadataka.</p></div>}
        {proj.tasks.map(task=>(
          <div key={task.id} style={{background:task.done?'#0d1a12':C.card,border:`1px solid ${task.done?'#1a3025':C.bdr}`,borderRadius:10,padding:'13px 14px'}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
              <button onClick={()=>toggleTask(task.id,task.done)}
                style={{width:24,height:24,borderRadius:7,flexShrink:0,border:`2px solid ${task.done?C.grn:'#2a3245'}`,background:task.done?C.grn:'transparent',display:'flex',alignItems:'center',justifyContent:'center',marginTop:1,color:'white',cursor:'pointer'}}>
                {task.done&&<CheckIco/>}
              </button>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:14,color:task.done?C.mut:C.txt,textDecoration:task.done?'line-through':'none',lineHeight:1.5}}>{task.text}</p>
                {task.note&&editNote?.taskId!==task.id&&<p style={{fontSize:13,color:'#60a5fa',marginTop:6,background:'#0f1e35',padding:'6px 10px',borderRadius:6,borderLeft:'2px solid #3b82f6'}}>{task.note}</p>}
                {editNote?.taskId===task.id&&(
                  <div style={{marginTop:8}}>
                    <textarea value={editNote.text} onChange={e=>setEditNote(en=>({...en,text:e.target.value}))} rows={2} placeholder="Bilješka za klijenta..."
                      style={{width:'100%',background:'#1e2330',border:`1px solid ${C.bdr}`,borderRadius:7,padding:'8px 10px',fontSize:13,color:C.txt,resize:'none'}}/>
                    <div style={{display:'flex',gap:6,marginTop:6}}>
                      <button onClick={()=>saveNote(task.id)} style={{background:C.acc,color:'white',border:'none',borderRadius:6,padding:'7px 16px',fontSize:13,fontWeight:700,cursor:'pointer'}}>Spremi</button>
                      <button onClick={()=>setEditNote(null)} style={{background:'#1e2330',color:C.mut,border:'none',borderRadius:6,padding:'7px 16px',fontSize:13,cursor:'pointer'}}>Odustani</button>
                    </div>
                  </div>
                )}
              </div>
              <div style={{display:'flex',gap:6,flexShrink:0}}>
                <button onClick={()=>setEditNote({taskId:task.id,text:task.note||''})}
                  style={{background:'#1e2330',border:'none',color:C.mut,width:34,height:34,borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><PencilIco/></button>
                <button onClick={()=>delTask(task.id)}
                  style={{background:'#1e0a0a',border:'none',color:'#7a2020',width:34,height:34,borderRadius:8,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}><TrashIco/></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="admin-body">
      <div style={{position:'sticky',top:0,zIndex:100,background:C.sid,borderBottom:`1px solid ${C.bdr}`}}>
        <div style={{height:52,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px'}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            {selId&&proj&&<button onClick={()=>setSelId(null)} className="mobile-only"
              style={{background:'transparent',border:'none',color:C.mut,cursor:'pointer',display:'flex',alignItems:'center',padding:'4px 8px 4px 0'}}><BackIco/></button>}
            <img src="https://prplus.hr/logo.png" alt="PR Plus" style={{height:22,filter:'brightness(0) invert(1)',maxWidth:120}}/>
            <span style={{fontSize:11,color:C.mut,background:'#1e2330',padding:'2px 8px',borderRadius:10}}>admin</span>
          </div>
          <div style={{display:'flex',gap:4}}>
            <button onClick={()=>setShowSettings(!showSettings)} style={{background:'transparent',border:'none',fontSize:12,color:C.mut,padding:'4px 10px',borderRadius:6,cursor:'pointer'}}>Postavke</button>
            <button onClick={onLogout} style={{background:'transparent',border:'none',fontSize:12,color:C.mut,padding:'4px 10px',borderRadius:6,cursor:'pointer'}}>Odjava</button>
          </div>
        </div>
        {showSettings&&(
          <div style={{background:'#1a1408',borderTop:'1px solid #332a10',padding:12,display:'flex',flexWrap:'wrap',alignItems:'center',gap:8}}>
            <span style={{fontSize:12,color:'#d4a017'}}>Nova lozinka:</span>
            <input type="password" placeholder="Trenutna" value={pf.current} onChange={e=>setPf(f=>({...f,current:e.target.value}))}
              style={{background:'#231c08',border:'1px solid #3d3010',borderRadius:6,padding:'6px 10px',fontSize:12,color:C.txt,width:120}}/>
            <input type="password" placeholder="Nova" value={pf.next} onChange={e=>setPf(f=>({...f,next:e.target.value}))}
              style={{background:'#231c08',border:'1px solid #3d3010',borderRadius:6,padding:'6px 10px',fontSize:12,color:C.txt,width:120}}/>
            <button onClick={chPass} style={{background:'#d4a017',color:'#0f0c00',fontSize:12,fontWeight:700,padding:'6px 14px',borderRadius:6,border:'none',cursor:'pointer'}}>Spremi</button>
            {pfErr&&<span style={{fontSize:12,color:'#f87171'}}>{pfErr}</span>}
            <button onClick={()=>setShowSettings(false)} style={{background:'transparent',border:'none',color:'#6b5a20',fontSize:16,cursor:'pointer',marginLeft:'auto'}}>✕</button>
          </div>
        )}
        {apiErr&&<div style={{background:'#1a0808',borderTop:'1px solid #330a0a',padding:'8px 16px',fontSize:12,color:'#f87171',display:'flex',justifyContent:'space-between'}}>
          {apiErr}<button onClick={()=>setApiErr('')} style={{background:'none',border:'none',color:'#f87171',cursor:'pointer'}}>✕</button>
        </div>}
      </div>

      <div className="admin-layout">
        <div className="admin-sidebar">
          <div style={{padding:10}}>
            <button onClick={()=>{setShowNew(!showNew);if(!showNew)setNf({name:'',clientName:'',accessCode:generateCode(),description:'']);}}
              style={{width:'100%',background:C.acc,color:'white',border:'none',borderRadius:8,padding:'9px 0',fontSize:12,fontWeight:700,cursor:'pointer'}}>
              + Novi projekt
            </button>
          </div>
          {showNew&&<NewProjForm/>}
          <ProjList/>
        </div>

        <div className="mobile-only">
          {!selId?(
            <div>
              <div style={{padding:'12px 16px',borderBottom:`1px solid ${C.bdr}`}}>
                <button onClick={()=>{setShowNew(!showNew);if(!showNew)setNf({name:'',clientName:'',accessCode:generateCode(),description:'']);}}
                  style={{width:'100%',background:C.acc,color:'white',border:'none',borderRadius:10,padding:'13px 0',fontSize:14,fontWeight:700,cursor:'pointer'}}>
                  + Novi projekt
                </button>
              </div>
              {showNew&&<NewProjForm/>}
              <ProjList/>
            </div>
          ):proj?<ProjDetail/>:null}
        </div>

        <div className="desktop-only" style={{padding:20}}>
          {!proj?(
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh',flexDirection:'column',gap:8}}>
              <FolderIco/><p style={{fontSize:13,color:C.mut}}>Odaberi projekt iz liste</p>
            </div>
          ):<ProjDetail/>}
        </div>
      </div>
    </div>
  );
}

function ClientView({ project, onLogout }) {
  const done = project.tasks.filter(t=>t.done).length;
  const total = project.tasks.length;
  const pct = total>0 ? Math.round((done/total)*100) : 0;

  return (
    <div style={{minHeight:'100vh',background:'#0f1117'}}>
      <div style={{position:'sticky',top:0,zIndex:100,height:52,borderBottom:'1px solid #1e2330',padding:'0 16px',display:'flex',alignItems:'center',justifyContent:'space-between',background:'#0d1018'}}>
        <div style={{flex:1,minWidth:0}}>
          <p style={{fontWeight:700,fontSize:15,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{project.name}</p>
          {project.client_name&&<p style={{fontSize:12,color:'#4a5568'}}>{project.client_name}</p>}
        </div>
        <button onClick={onLogout} style={{background:'transparent',border:'none',fontSize:12,color:'#4a5568',cursor:'pointer',marginLeft:12,flexShrink:0}}>Odjava</button>
      </div>
      <div style={{maxWidth:600,margin:'0 auto',padding:'20px 16px 60px'}}>
        <div style={{background:'#151921',border:'1px solid #1e2330',borderRadius:14,padding:20,marginBottom:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <span style={{fontSize:14,fontWeight:600}}>Napredak projekta</span>
            <span style={{fontSize:24,fontWeight:800,color:pct===100?'#22c55e':'#e2e8f0'}}>{pct}%</span>
          </div>
          <div style={{height:6,background:'#1e2330',borderRadius:3,overflow:'hidden'}}>
            <div style={{width:`${pct}%`,height:'100%',background:pct===100?'#22c55e':'linear-gradient(90deg,#3b82f6,#6366f1)',transition:'width 0.5s',borderRadius:3}}/>
          </div>
          <p style={{fontSize:12,color:'#4a5568',marginTop:8}}>{done} od {total} zadataka završeno</p>
          {project.description&&<p style={{fontSize:13,color:'#5a6070',marginTop:8,lineHeight:1.5}}>{project.description}</p>}
          {pct===100&&total>0&&<p style={{fontSize:14,color:'#22c55e',marginTop:10,fontWeight:700}}>Sve je gotovo!</p>}
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:8}}>
          {total===0&&<div style={{background:'#151921',border:'1px dashed #1e2330',borderRadius:12,padding:40,textAlign:'center'}}><p style={{fontSize:13,color:'#4a5568'}}>Zadaci još nisu dodani.</p></div>}
          {project.tasks.map(task=>(
            <div key={task.id} style={{background:task.done?'#0d1a12':'#151921',border:`1px solid ${task.done?'#1a3025':'#1e2330'}`,borderRadius:12,padding:'14px 16px'}}>
              <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                <div style={{width:22,height:22,borderRadius:6,flexShrink:0,border:`2px solid ${task.done?'#22c55e':'#2a3245'}`,background:task.done?'#22c55e':'transparent',display:'flex',alignItems:'center',justifyContent:'center',marginTop:2,color:'white'}}>
                  {task.done&&<CheckIco/>}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:15,color:task.done?'#4a5568':'#e2e8f0',textDecoration:task.done?'line-through':'none',lineHeight:1.5}}>{task.text}</p>
                  {task.note&&<p style={{fontSize:13,color:'#60a5fa',marginTop:7,background:'#0f1e35',padding:'8px 12px',borderRadius:7,borderLeft:'2px solid #3b82f6',lineHeight:1.5}}>{task.note}</p>}
                </div>
                <span style={{fontSize:12,padding:'4px 10px',borderRadius:20,flexShrink:0,background:task.done?'#0d2516':'#1e2330',color:task.done?'#22c55e':'#4a5568',fontWeight:500}}>
                  {task.done?'Gotovo':'Čeka'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
