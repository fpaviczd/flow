import { useState, useEffect, useCallback, createContext, useContext } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────
const generateCode = () => {
  const ch = 'abcdefghjkmnpqrstuvwxyz23456789';
  const s = () => Array.from({length:4}, () => ch[Math.floor(Math.random()*ch.length)]).join('');
  return s()+'-'+s()+'-'+s();
};

const fmtDate = (iso) => {
  const d = new Date(iso);
  const p = n => String(n).padStart(2,'0');
  return p(d.getDate())+'.'+p(d.getMonth()+1)+'.'+d.getFullYear()+' '+p(d.getHours())+':'+p(d.getMinutes());
};

// ─── Theme ────────────────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    bg:'#16202c', sid:'#1b2636', card:'#1f2d40', bdr:'#26344a',
    txt:'#eef1f5', mut:'#8492a5', acc:'#c6a23c', grn:'#4caf7d',
    red:'#e05c5c', amber:'#c6a23c',
    taskDone:'#1a2535', taskDoneBdr:'#26344a',
    commentAdmin:'#1e2d45', commentAdminBdr:'#34465f', commentAdminTxt:'#c6a23c',
    commentClient:'#2a2010', commentClientBdr:'#4a3a1a', commentClientTxt:'#e8c97a',
    codeBlock:'#16202c', inputBg:'#16202c', btnSecBg:'#26344a',
  },
  light: {
    bg:'#f7f5f0', sid:'#fffdf9', card:'#fffdf9', bdr:'#e3ddd1',
    txt:'#1f2a3d', mut:'#4a5568', acc:'#c6a23c', grn:'#2d7a4f',
    red:'#c5221f', amber:'#b8860b',
    taskDone:'#f1ede4', taskDoneBdr:'#e3ddd1',
    commentAdmin:'#f0ead8', commentAdminBdr:'#d4c49a', commentAdminTxt:'#8a6a1a',
    commentClient:'#fef3e2', commentClientBdr:'#fde293', commentClientTxt:'#7a5200',
    codeBlock:'#f1ede4', inputBg:'#f1ede4', btnSecBg:'#ece7dc',
  }
};

const PRIO_COLORS = {
  dark: {
    normal: { label:'Normalan', color:'#8492a5', bg:'#26344a', border:'#34465f' },
    visok:  { label:'Visok',    color:'#e8c97a', bg:'#2a2010', border:'#4a3a1a' },
    hitan:  { label:'Hitan',   color:'#e05c5c', bg:'#2d1a1a', border:'#4a2a2a' },
    nizak:  { label:'Nizak',   color:'#7ab8d4', bg:'#1a2d3d', border:'#2a4a5a' },
  },
  light: {
    normal: { label:'Normalan', color:'#4a5568', bg:'#ece7dc', border:'#e3ddd1' },
    visok:  { label:'Visok',    color:'#8a6a1a', bg:'#fef3e2', border:'#e8c97a' },
    hitan:  { label:'Hitan',   color:'#c5221f', bg:'#fce8e6', border:'#f5c6c6' },
    nizak:  { label:'Nizak',   color:'#2a5a8a', bg:'#e8f0fa', border:'#b0c8e8' },
  }
};
const PRIO_CYCLE = ['normal','visok','hitan','nizak'];

const ThemeCtx = createContext('dark');
const useTheme = () => {
  const theme = useContext(ThemeCtx);
  return { C: THEMES[theme], PRIO: PRIO_COLORS[theme], theme };
};

const api = async (url, opts={}, adminPw) => {
  const h = {'Content-Type':'application/json', ...(adminPw ? {'authorization':'Bearer '+adminPw} : {}), ...opts.headers};
  return fetch(url, {...opts, headers:h}).then(r=>r.json());
};

// ─── Session storage ──────────────────────────────────────────────────────────
const SESSION = {
  saveAdmin: (pw) => localStorage.setItem('flow_admin_token', pw),
  loadAdmin: () => localStorage.getItem('flow_admin_token'),
  clearAdmin: () => localStorage.removeItem('flow_admin_token'),
  saveClient: (code) => localStorage.setItem('flow_client_code', code),
  loadClient: () => localStorage.getItem('flow_client_code'),
  clearClient: () => localStorage.removeItem('flow_client_code'),
};

// ─── Icons ────────────────────────────────────────────────────────────────────
const CheckIco  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><path d="M20 6 9 17l-5-5"/></svg>;
const TrashIco  = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6M10 11v6m4-6v6M9 6V4h6v2"/></svg>;
const PencilIco = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
const CopyIco   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
const RefreshIco= () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>;
const BackIco   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:18,height:18}}><path d="M19 12H5M12 5l-7 7 7 7"/></svg>;
const FolderIco = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:15,height:15}}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>;
const UpIco     = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><path d="M18 15l-6-6-6 6"/></svg>;
const DownIco   = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><path d="M6 9l6 6 6-6"/></svg>;
const MsgIco    = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:13,height:13}}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
const SpinIco   = () => <svg style={{width:15,height:15,animation:'spin 1s linear infinite'}} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10" strokeOpacity=".2"/><path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/></svg>;

// ─── Shared components ────────────────────────────────────────────────────────
function PrioBadge({priority, onClick }) {
  const { C, PRIO } = useTheme();
  const p = PRIO[priority] || PRIO.normal;
  return (
    <span onClick={onClick} style={{fontSize:11,padding:'2px 8px',borderRadius:4,fontWeight:600,
      background:p.bg,color:p.color,border:`1px solid ${p.border}`,
      cursor:onClick?'pointer':'default',whiteSpace:'nowrap',flexShrink:0,fontWeight:600}}>
      {p.label}
    </span>
  );
}

function CommentList({comments, onDelete, onResolve }) {
  const { C, PRIO } = useTheme();
  if (!comments || comments.length === 0) return null;
  return (
    <div style={{marginTop:8,display:'flex',flexDirection:'column',gap:4}}>
      {comments.map(c => {
        const isClient = c.author === 'client';
        const isResolved = c.resolved === 1;
        return (
          <div key={c.id} style={{
            background: isResolved ? C.taskDone : isClient ? C.commentClient : C.commentAdmin,
            border:`1px solid ${isResolved?C.taskDoneBdr:isClient?C.commentClientBdr:C.commentAdminBdr}`,
            borderRadius:4,padding:'7px 10px',opacity:isResolved?0.65:1,
            borderLeft:`3px solid ${isResolved?C.grn:isClient?C.amber:C.acc}`
          }}>
            <div style={{display:'flex',alignItems:'flex-start',gap:8}}>
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3}}>
                  <span style={{fontSize:10,fontWeight:700,letterSpacing:'0.08em',
                    color:isClient?C.amber:C.acc}}>
                    {isClient?'KLIJENT':'ADMIN'}
                  </span>
                  {isResolved&&<span style={{fontSize:10,color:C.grn,fontWeight:600}}>✓ RIJEŠENO</span>}
                </div>
                <p style={{fontSize:13,color:isClient?C.commentClientTxt:C.commentAdminTxt,lineHeight:1.5,
                  textDecoration:isResolved?'line-through':'none'}}>{c.text}</p>
                <p style={{fontSize:10,color:C.mut,marginTop:2,fontWeight:600}}>{fmtDate(c.created_at)}</p>
              </div>
              <div style={{display:'flex',gap:4,flexShrink:0}}>
                {onResolve&&(
                  <button onClick={()=>onResolve(c.id)} title={isResolved?'Poništi':'Označi riješeno'}
                    style={{background:isResolved?C.taskDone:C.btnSecBg,border:'none',
                      color:isResolved?C.grn:C.mut,cursor:'pointer',padding:'3px 6px',borderRadius:4,fontSize:13}}>
                    ✓
                  </button>
                )}
                {onDelete&&(
                  <button onClick={()=>onDelete(c.id)}
                    style={{background:'transparent',border:'none',color:C.red,cursor:'pointer',padding:'3px 5px'}}>
                    <TrashIco/>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AddCommentForm({taskId, onAdd }) {
  const { C, PRIO } = useTheme();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  if (!open) return (
    <button onClick={()=>setOpen(true)}
      style={{display:'flex',alignItems:'center',gap:4,background:'transparent',border:'none',
        color:C.mut,fontSize:12,cursor:'pointer',marginTop:6,padding:0,fontWeight:600}}>
      <MsgIco/> + komentar
    </button>
  );
  return (
    <div style={{marginTop:8}}>
      <textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Komentar..." rows={2} autoFocus
        style={{width:'100%',background:C.inputBg,border:`1px solid ${C.bdr}`,borderRadius:4,
          padding:'7px 10px',fontSize:13,color:C.txt,resize:'none',fontWeight:600}}/>
      <div style={{display:'flex',gap:6,marginTop:4}}>
        <button onClick={()=>{if(text.trim()){onAdd(taskId,text.trim());setText('');setOpen(false);}}}
          style={{background:C.acc,color:'#0c0e10',border:'none',borderRadius:4,padding:'5px 14px',fontSize:12,fontWeight:700,cursor:'pointer',}}>Dodaj</button>
        <button onClick={()=>{setOpen(false);setText('');}}
          style={{background:'transparent',border:`1px solid ${C.bdr}`,color:C.mut,borderRadius:4,padding:'5px 14px',fontSize:12,cursor:'pointer',fontWeight:600}}>✕</button>
      </div>
    </div>
  );
}

function AddTaskInput({onAdd }) {
  const { C, PRIO } = useTheme();
  const [text, setText] = useState('');
  const submit = () => {if(text.trim()){onAdd(text.trim());setText('');}};
  return (
    <div style={{display:'flex',gap:8,marginBottom:14,alignItems:'flex-start'}}>
      <textarea placeholder={'Dodaj zadatak...\nEnter = dodaj  ·  Shift+Enter = novi red'} value={text} rows={2}
        onChange={e=>setText(e.target.value)}
        onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();submit();}}}
        style={{flex:1,minWidth:0,background:C.card,border:`1px solid ${C.bdr}`,borderRadius:6,
          padding:'10px 14px',fontSize:14,color:C.txt,resize:'none',lineHeight:1.5}}/>
      <button onClick={submit}
        style={{background:C.acc,color:'#0c0e10',border:'none',borderRadius:6,padding:'10px 18px',
          fontSize:13,fontWeight:700,cursor:'pointer',flexShrink:0,}}>
        Dodaj
      </button>
    </div>
  );
}

function TaskItem({task, isFirst, isLast, onToggle, onMoveUp, onMoveDown, onDelete, onChangePriority, onAddComment, onDeleteComment, onResolveComment, onEditNote, onEditText, onSetStatus }) {
  const { C, PRIO } = useTheme();
  const [showNoteEdit, setShowNoteEdit] = useState(false);
  const [noteText, setNoteText] = useState(task.note||'');
  const [editingText, setEditingText] = useState(false);
  const [taskText, setTaskText] = useState(task.text);

  useEffect(()=>{setTaskText(task.text);},[task.text]);
  useEffect(()=>{setNoteText(task.note||'');},[task.note]);

  const saveText = () => {
    const t = taskText.trim();
    if(t&&t!==task.text) onEditText(task.id,t); else setTaskText(task.text);
    setEditingText(false);
  };

  const hasUnresolvedClient = (task.comments||[]).some(c=>c.author==='client'&&!c.resolved);

  return (
    <div style={{
      background: task.done?C.taskDone:C.card,
      border:`1px solid ${task.done?C.taskDoneBdr:hasUnresolvedClient?C.amber:C.bdr}`,
      borderRadius:6,padding:'12px 14px',marginBottom:8,
      borderLeft:`3px solid ${task.done?C.grn:hasUnresolvedClient?C.amber:task.status==='awaiting_client'?C.amber:C.bdr}`
    }}>
      <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
        <button onClick={()=>onToggle(task.id,task.done)}
          style={{width:22,height:22,borderRadius:4,flexShrink:0,
            border:`2px solid ${task.done?C.grn:C.bdr}`,
            background:task.done?C.grn:'transparent',
            display:'flex',alignItems:'center',justifyContent:'center',
            marginTop:1,color:'#0c0e10',cursor:'pointer',transition:'all 0.15s'}}>
          {task.done&&<CheckIco/>}
        </button>

        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8}}>
            {editingText?(
              <textarea value={taskText} autoFocus rows={2}
                onChange={e=>setTaskText(e.target.value)}
                onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();saveText();}if(e.key==='Escape'){setTaskText(task.text);setEditingText(false);}}}
                onBlur={saveText}
                style={{flex:1,background:C.inputBg,border:`1px solid ${C.acc}`,borderRadius:4,
                  padding:'5px 8px',fontSize:14,color:C.txt,resize:'none',lineHeight:1.5}}/>
            ):(
              <p onClick={()=>setEditingText(true)} title="Klikni za uredi"
                style={{fontSize:14,color:task.done?C.mut:C.txt,
                  textDecoration:task.done?'line-through':'none',
                  lineHeight:1.5,flex:1,minWidth:0,cursor:'text',whiteSpace:'pre-wrap'}}>
                {task.text}
              </p>
            )}
            <PrioBadge priority={task.priority} onClick={()=>onChangePriority(task.id,task.priority)}/>
          </div>

          {task.note&&!showNoteEdit&&(
            <div style={{display:'flex',alignItems:'flex-start',gap:6,marginTop:6}}>
              <p style={{flex:1,fontSize:12,color:C.commentAdminTxt,background:C.commentAdmin,
                padding:'5px 8px',borderRadius:4,borderLeft:`2px solid ${C.acc}`,lineHeight:1.4,fontStyle:'italic'}}>
                {task.note}
              </p>
              <button onClick={()=>{setShowNoteEdit(true);setNoteText(task.note);}}
                style={{background:'transparent',border:'none',color:C.mut,cursor:'pointer',padding:'4px 2px',flexShrink:0}}>
                <PencilIco/>
              </button>
            </div>
          )}
          {!task.note&&!showNoteEdit&&(
            <button onClick={()=>setShowNoteEdit(true)}
              style={{display:'flex',alignItems:'center',gap:4,background:'transparent',border:'none',
                color:C.mut,fontSize:12,cursor:'pointer',marginTop:4,padding:0,fontWeight:600}}>
              <PencilIco/> bilješka
            </button>
          )}
          {showNoteEdit&&(
            <div style={{marginTop:6}}>
              <textarea value={noteText} onChange={e=>setNoteText(e.target.value)} rows={2} placeholder="Bilješka za klijenta..." autoFocus
                style={{width:'100%',background:C.inputBg,border:`1px solid ${C.bdr}`,borderRadius:4,
                  padding:'7px 10px',fontSize:12,color:C.txt,resize:'none'}}/>
              <div style={{display:'flex',gap:6,marginTop:4}}>
                <button onClick={()=>{onEditNote(task.id,noteText);setShowNoteEdit(false);}}
                  style={{background:C.acc,color:'#0c0e10',border:'none',borderRadius:4,padding:'5px 14px',fontSize:12,fontWeight:700,cursor:'pointer'}}>Spremi</button>
                <button onClick={()=>setShowNoteEdit(false)}
                  style={{background:'transparent',border:`1px solid ${C.bdr}`,color:C.mut,borderRadius:4,padding:'5px 14px',fontSize:12,cursor:'pointer'}}>✕</button>
              </div>
            </div>
          )}

          <div style={{display:'flex',alignItems:'center',gap:12,marginTop:6,marginBottom:2,flexWrap:'wrap'}}>
            <span style={{fontSize:11,color:C.mut}}>
              {task.created_at ? new Date(task.created_at).toLocaleDateString('hr-HR',{day:'2-digit',month:'2-digit',year:'numeric'}) : ''}
            </span>
            {task.done && task.updated_at && (
              <span style={{fontSize:11,color:C.grn}}>
                ✓ {new Date(task.updated_at).toLocaleDateString('hr-HR',{day:'2-digit',month:'2-digit',year:'numeric'})}
              </span>
            )}
            {(task.comments||[]).length > 0 ? <span style={{fontSize:11,color:C.mut}}>💬 {(task.comments||[]).length}</span> : null}

            {!task.done && (() => {
              const due = task.due_date ? new Date(task.due_date + 'T00:00:00') : null;
              const overdue = due && due < new Date();
              const soon = due && !overdue && (due - new Date()) < 2*86400000;
              const color = overdue ? C.red : soon ? C.amber : C.mut;
              return (
                <div style={{display:'flex',alignItems:'center',gap:6}}>
                  <span style={{fontSize:11,color:C.mut,fontWeight:500}}>rok:</span>
                  <input type="date" value={task.due_date||''}
                    onChange={e=>onSetDueDate(task.id, e.target.value||null)}
                    style={{fontSize:12,color:due?color:C.mut,
                      background:C.card,border:`1px solid ${due?color:C.bdr}`,
                      borderRadius:6,padding:'2px 6px',cursor:'pointer',
                      fontFamily:'inherit',fontWeight:due?600:400}}/>
                  {due && <button onClick={()=>onSetDueDate(task.id,null)}
                    style={{background:'transparent',border:'none',
                      color:C.mut,cursor:'pointer',fontSize:14,padding:0}}>✕</button>}
                </div>
              );
            })()}
          </div>
          <CommentList comments={task.comments} onDelete={onDeleteComment} onResolve={onResolveComment}/>
          <AddCommentForm taskId={task.id} onAdd={onAddComment}/>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:4,flexShrink:0}}>
          <button onClick={()=>onSetStatus(task.id,task.status==='awaiting_client'?'active':'awaiting_client')}
            title="Čeka klijenta"
            style={{background:task.status==='awaiting_client'?C.commentClient:'transparent',
              border:`1px solid ${task.status==='awaiting_client'?C.commentClientBdr:C.bdr}`,
              color:task.status==='awaiting_client'?C.amber:C.mut,
              width:28,height:28,borderRadius:4,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <MsgIco/>
          </button>
          <button onClick={()=>onMoveUp(task.id)} disabled={isFirst}
            style={{background:'transparent',border:'none',color:isFirst?C.bdr:C.mut,
              width:28,height:28,borderRadius:4,cursor:isFirst?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <UpIco/>
          </button>
          <button onClick={()=>onMoveDown(task.id)} disabled={isLast}
            style={{background:'transparent',border:'none',color:isLast?C.bdr:C.mut,
              width:28,height:28,borderRadius:4,cursor:isLast?'default':'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <DownIco/>
          </button>
          <button onClick={()=>onDelete(task.id)}
            style={{background:'transparent',border:'none',color:C.red,width:28,height:28,
              borderRadius:4,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <TrashIco/>
          </button>
        </div>
      </div>
    </div>
  );
}

function ProjDetailView({proj, done, total, pct, editProj, setEditProj, onSaveEdit, onDeleteProj, onArchiveProj, onCopyProj, codeCopied, onCopyCode, handlers, adminPw }) {
  const { C, PRIO } = useTheme();
  const inp = {width:'100%',background:C.inputBg,border:`1px solid ${C.bdr}`,borderRadius:6,
    padding:'10px 12px',fontSize:14,color:C.txt,marginBottom:8};

  return (
    <div style={{padding:'16px 16px 80px',maxWidth:960,margin:'0 auto'}}>
      <div style={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:8,padding:20,marginBottom:14}}>
        {editProj?(
          <div>
            <p style={{fontSize:11,fontWeight:700,color:C.mut,textTransform:'uppercase',
              letterSpacing:'0.08em',marginBottom:10,}}>Uredi projekt</p>
            {[{ph:'Naziv projekta',key:'name'},{ph:'Ime klijenta',key:'clientName'},
              {ph:'Email klijenta',key:'clientEmail'},{ph:'Opis',key:'description'}].map(({ph,key})=>(
              <input key={key} placeholder={ph} value={editProj[key]||''}
                onChange={e=>setEditProj(ep=>({...ep,[key]:e.target.value}))} style={inp}/>
            ))}
            <p style={{fontSize:11,color:C.mut,marginBottom:5,fontWeight:600}}>Pristupni kod</p>
            <div style={{display:'flex',gap:6,marginBottom:10}}>
              <input value={editProj.accessCode||''} onChange={e=>setEditProj(ep=>({...ep,accessCode:e.target.value}))}
                style={{flex:1,minWidth:0,background:C.inputBg,border:`1px solid ${C.bdr}`,borderRadius:6,
                  padding:'9px 10px',fontSize:13,color:C.acc,fontWeight:600}}/>
              <button onClick={()=>setEditProj(ep=>({...ep,accessCode:generateCode()}))}
                style={{background:C.btnSecBg,border:`1px solid ${C.bdr}`,borderRadius:6,padding:'0 10px',
                  color:C.mut,cursor:'pointer',display:'flex',alignItems:'center'}}><RefreshIco/></button>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button onClick={onSaveEdit}
                style={{flex:1,background:C.acc,color:'#0c0e10',border:'none',borderRadius:6,
                  padding:'10px 0',fontSize:13,fontWeight:700,cursor:'pointer',}}>Spremi</button>
              <button onClick={()=>setEditProj(null)}
                style={{flex:1,background:'transparent',border:`1px solid ${C.bdr}`,color:C.mut,
                  borderRadius:6,padding:'10px 0',fontSize:13,cursor:'pointer',fontWeight:600}}>Odustani</button>
            </div>
          </div>
        ):(<>
          <div style={{marginBottom:14}}>
            <h2 style={{fontSize:18,fontWeight:700,marginBottom:2}}>{proj.name}</h2>
            {proj.client_name&&<p style={{fontSize:13,color:C.mut,fontWeight:600,marginBottom:2}}>{proj.client_name}</p>}
            {proj.description&&<p style={{fontSize:12,color:C.mut,marginBottom:8}}>{proj.description}</p>}
            <div style={{display:'flex',gap:5,flexWrap:'wrap',marginTop:8}}>
                <button onClick={()=>setEditProj({name:proj.name,clientName:proj.client_name,
                  clientEmail:proj.client_email||'',accessCode:proj.access_code,description:proj.description})}
                  style={{background:'transparent',border:`1px solid ${C.bdr}`,borderRadius:6,
                    padding:'5px 10px',fontSize:11,color:C.mut,cursor:'pointer',fontWeight:600}}>uredi</button>
                <button onClick={onCopyProj}
                  style={{background:'transparent',border:`1px solid ${C.bdr}`,borderRadius:6,
                    padding:'5px 10px',fontSize:11,color:C.acc,cursor:'pointer',fontWeight:600}}>kopiraj</button>
                <button onClick={onArchiveProj}
                  style={{background:'transparent',border:`1px solid ${C.bdr}`,borderRadius:6,
                    padding:'5px 10px',fontSize:11,color:C.amber,cursor:'pointer',fontWeight:600}}>arhiviraj</button>
                <button onClick={onDeleteProj}
                  style={{background:'transparent',border:`1px solid ${C.red}`,borderRadius:6,
                    padding:'5px 10px',fontSize:11,color:C.red,cursor:'pointer',fontWeight:600}}>briši</button>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10,background:C.inputBg,
            border:`1px solid #1a2a40`,borderRadius:6,padding:'10px 14px',marginBottom:14}}>
            <div style={{flex:1,minWidth:0}}>
              <p style={{fontSize:10,color:C.mut,textTransform:'uppercase',
                letterSpacing:'0.08em',marginBottom:2,fontWeight:600}}>Pristupni kod</p>
              <p style={{fontSize:15,fontWeight:700,color:C.acc,
                overflow:'hidden',textOverflow:'ellipsis'}}>{proj.access_code}</p>
            </div>
            <button onClick={onCopyCode}
              style={{background:codeCopied?C.taskDone:C.btnSecBg,
                border:`1px solid ${codeCopied?C.taskDoneBdr:C.bdr}`,
                borderRadius:6,padding:'8px 14px',fontSize:12,fontWeight:700,
                color:codeCopied?C.grn:C.acc,cursor:'pointer',
                display:'flex',alignItems:'center',gap:6,flexShrink:0,fontWeight:600}}>
              {codeCopied?<CheckIco/>:<CopyIco/>}{codeCopied?'kopirano':'kopiraj'}
            </button>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
            <span style={{fontSize:12,color:C.mut,fontWeight:600}}>{done}/{total} zadataka</span>
            <span style={{fontSize:12,fontWeight:700,
              color:pct===100?C.grn:C.txt}}>{pct}%</span>
          </div>
          <div style={{height:4,background:C.bdr,borderRadius:2,overflow:'hidden'}}>
            <div style={{width:pct+'%',height:'100%',
              background:pct===100?C.grn:'linear-gradient(90deg,#79c0ff,#56d364)',
              transition:'width 0.4s',borderRadius:2}}/>
          </div>
        </>)}

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
        <span style={{fontSize:12,color:C.mut}}>{proj.tasks.filter(t=>!t.done).length} otvorenih</span>
        <button onClick={()=>{
          const PRIO_ORDER = {hitan:0,visok:1,normal:2,nizak:3};
          const sorted = [...proj.tasks].sort((a,b)=>(PRIO_ORDER[a.priority||'normal']||2)-(PRIO_ORDER[b.priority||'normal']||2));
          handlers.reorderTasks(proj.id, sorted);
        }} style={{background:'transparent',border:`1px solid ${C.bdr}`,borderRadius:6,
          padding:'4px 12px',fontSize:12,color:C.mut,cursor:'pointer',fontWeight:600}}>
          ↑ po prioritetu
        </button>
      </div>
      <AddTaskInput onAdd={text=>handlers.addTask(proj.id,text)}/>

      {proj.tasks.length===0&&(
        <div style={{background:C.card,border:`1px dashed ${C.bdr}`,borderRadius:8,padding:40,textAlign:'center'}}>
          <p style={{fontSize:13,color:C.mut,fontWeight:600}}>Nema zadataka.</p>
        </div>
      )}
      {proj.tasks.map((task,idx)=>(
        <TaskItem key={task.id} task={task} isFirst={idx===0} isLast={idx===proj.tasks.length-1}
          onToggle={handlers.toggleTask} onMoveUp={id=>handlers.moveTask(id,'up')}
          onMoveDown={id=>handlers.moveTask(id,'down')} onDelete={handlers.deleteTask}
          onChangePriority={handlers.changePriority} onAddComment={handlers.addComment}
          onDeleteComment={handlers.deleteComment} onResolveComment={handlers.resolveComment}
          onEditNote={handlers.editNote} onEditText={handlers.editText} onSetStatus={handlers.setStatus} onSetDueDate={handlers.setDueDate}/>
      ))}
      <ActivityLog projectId={proj.id} adminPw={adminPw}/>
    </div>
  </div>
  );
}

function ProjListView({projects, loading, selectedId, onSelect }) {
  const { C, PRIO } = useTheme();
  if (loading) return <p style={{fontSize:12,color:C.mut,textAlign:'center',padding:24}}>Učitavanje...</p>;
  if (!projects.length) return <p style={{fontSize:12,color:C.mut,textAlign:'center',padding:24}}>Nema projekata.</p>;
  return (
    <div style={{padding:'8px 10px',display:'flex',flexDirection:'column',gap:2}}>
      {projects.map(p=>{
        const d2=p.tasks.filter(t=>t.done).length, t2=p.tasks.length;
        const pct = t2>0 ? Math.round((d2/t2)*100) : 0;
        const unresolvedClient = p.tasks.some(t=>(t.comments||[]).some(c=>c.author==='client'&&!c.resolved));
        const act=selectedId===p.id;
        return (
          <div key={p.id} className="sidebar-item" onClick={()=>onSelect(p.id)}
            style={{padding:'10px 12px',cursor:'pointer',borderRadius:8,
              background:act?C.btnSecBg:'transparent',
              border:`1px solid ${act?C.bdr:'transparent'}`}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:3}}>
              <span style={{fontSize:13,fontWeight:act?600:500,
                color:act?C.txt:C.mut,overflow:'hidden',
                textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1}}>
                {p.name}
              </span>
              {unresolvedClient&&(
                <span style={{width:7,height:7,borderRadius:'50%',background:C.amber,
                  flexShrink:0,marginLeft:6,display:'inline-block'}}/>
              )}
            </div>
            {p.client_name&&(
              <p style={{fontSize:11,color:C.mut,marginBottom:7,
                overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {p.client_name}
              </p>
            )}
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <div style={{flex:1,height:3,background:C.bdr,borderRadius:2,overflow:'hidden'}}>
                <div style={{width:pct+'%',height:'100%',
                  background:pct===100?C.grn:'linear-gradient(90deg,#79c0ff,#56d364)',
                  borderRadius:2,transition:'width 0.3s'}}/>
              </div>
              <span style={{fontSize:11,color:C.mut,fontWeight:500,flexShrink:0}}>{d2}/{t2}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function NewProjForm({form, setForm, codeCopied, onCopy, onCreate, onCancel }) {
  const { C, PRIO } = useTheme();
  return (
    <div style={{margin:12,background:C.bg,border:`1px solid ${C.bdr}`,borderRadius:8,padding:14}}>
      <p style={{fontSize:11,fontWeight:700,color:C.mut,marginBottom:10,
        textTransform:'uppercase',letterSpacing:'0.08em',}}>Novi projekt</p>
      {[{ph:'Naziv projekta *',key:'name'},{ph:'Ime klijenta',key:'clientName'},
        {ph:'Email klijenta',key:'clientEmail'},{ph:'Kratki opis',key:'description'}].map(({ph,key})=>(
        <input key={key} placeholder={ph} value={form[key]}
          onChange={e=>setForm(f=>({...f,[key]:e.target.value}))}
          style={{width:'100%',background:C.inputBg,border:`1px solid ${C.bdr}`,borderRadius:6,
            padding:'9px 10px',fontSize:13,color:C.txt,marginBottom:7}}/>
      ))}
      <p style={{fontSize:11,color:C.mut,marginBottom:5,fontWeight:600}}>Pristupni kod za klijenta</p>
      <div style={{display:'flex',gap:6,marginBottom:4}}>
        <input value={form.accessCode} onChange={e=>setForm(f=>({...f,accessCode:e.target.value}))}
          style={{flex:1,minWidth:0,background:C.inputBg,border:`1px solid ${C.bdr}`,borderRadius:6,
            padding:'9px 10px',fontSize:12,color:C.acc,fontWeight:600}}/>
        <button onClick={()=>setForm(f=>({...f,accessCode:generateCode()}))}
          style={{background:C.btnSecBg,border:`1px solid ${C.bdr}`,borderRadius:6,padding:'0 10px',
            color:C.mut,cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center'}}><RefreshIco/></button>
        <button onClick={onCopy}
          style={{background:codeCopied?C.taskDone:C.btnSecBg,
            border:`1px solid ${codeCopied?C.taskDoneBdr:C.bdr}`,
            borderRadius:6,padding:'0 10px',color:codeCopied?C.grn:C.acc,
            cursor:'pointer',flexShrink:0,display:'flex',alignItems:'center',gap:4}}>
          {codeCopied?<CheckIco/>:<CopyIco/>}
        </button>
      </div>
      <p style={{fontSize:10,color:C.bdr,marginBottom:10,fontWeight:600}}>auto-generiran</p>
      <div style={{display:'flex',gap:7}}>
        <button onClick={onCreate}
          style={{flex:1,background:C.acc,color:'#0c0e10',border:'none',borderRadius:6,
            padding:'10px 0',fontSize:13,fontWeight:700,cursor:'pointer',}}>Kreiraj</button>
        <button onClick={onCancel}
          style={{flex:1,background:'transparent',border:`1px solid ${C.bdr}`,color:C.mut,
            borderRadius:6,padding:'10px 0',fontSize:13,cursor:'pointer',fontWeight:600}}>Odustani</button>
      </div>
    </div>
  );
}

// ─── Home ─────────────────────────────────────────────────────────────────────
function HomeView({ toggleTheme, theme,onAdmin, onClient }) {
  const { C, PRIO } = useTheme();
  const [tab, setTab] = useState('client');
  const [ap, setAp] = useState('');
  const [cc, setCc] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const trigErr = msg => setErr(msg);

  const doAdmin = async () => {
    if (!ap) return; setLoading(true);
    const r = await api('/api/auth/admin',{method:'POST',body:JSON.stringify({password:ap})});
    setLoading(false);
    if (r.ok && r.token){SESSION.saveAdmin(r.token);onAdmin(r.token);}else trigErr('Pogrešna lozinka.');
  };

  const doClient = async () => {
    if (!cc) return; setLoading(true);
    const r = await api('/api/auth/client',{method:'POST',body:JSON.stringify({code:cc})});
    setLoading(false);
    if (r.ok){SESSION.saveClient(cc);onClient(r.project,cc);}else trigErr('Pristupni kod nije ispravan.');
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{width:'100%',maxWidth:380}}>
        <div style={{textAlign:'center',marginBottom:32}}>
          <img src="https://arcadian.hr/icon-512.png" alt="Arcadian"
            style={{height:100,width:100,borderRadius:22,marginBottom:10,boxShadow:'0 4px 20px rgba(0,0,0,0.3)'}}/>
          <p style={{fontSize:12,color:C.mut,fontWeight:600}}>Upravljanje projektima</p>
          <button onClick={toggleTheme}
            style={{background:'transparent',border:'none',fontSize:20,cursor:'pointer',marginTop:8}}
            title={theme==='dark'?'Svijetli dizajn':'Tamni dizajn'}>
            {theme==='dark'?<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
          </button>
        </div>
        <div style={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:8,overflow:'hidden'}}>
          <div style={{display:'flex',borderBottom:`1px solid ${C.bdr}`}}>
            {[['client','Klijentski pristup'],['admin','Admin']].map(([t,label])=>(
              <button key={t} onClick={()=>{setTab(t);setErr('');}}
                style={{flex:1,padding:'13px 0',fontSize:13,fontWeight:500,border:'none',cursor:'pointer',
                  background:tab===t?C.btnSecBg:'transparent',color:tab===t?C.txt:C.mut,
                  borderBottom:tab===t?`2px solid ${C.acc}`:'2px solid transparent',fontWeight:600}}>
                {label}
              </button>
            ))}
          </div>
          <div style={{padding:24}}>
            {tab==='client'?
              <form onSubmit={e=>{e.preventDefault();doClient();}} autoComplete="on">
                <p style={{fontSize:13,color:C.mut,marginBottom:16}}>Unesite pristupni kod koji ste dobili od webmastera.</p>
                <input type="text" name="username" autoComplete="username" placeholder="Pristupni kod" value={cc}
                  onChange={e=>{setCc(e.target.value);setErr('');}}
                  style={{width:'100%',background:C.inputBg,border:`1px solid ${C.bdr}`,borderRadius:6,
                    padding:'12px 14px',fontSize:14,color:C.txt,fontWeight:600,
                    letterSpacing:'0.06em',marginBottom:6}}/>
                {err&&<p style={{fontSize:12,color:C.red,marginBottom:10,fontWeight:600}}>{err}</p>}
                {!err&&<div style={{height:16}}/>}
                <button type="submit" disabled={loading}
                  style={{width:'100%',padding:'12px 0',borderRadius:6,border:'none',cursor:'pointer',
                    background:C.acc,color:'#0c0e10',fontSize:14,fontWeight:700,
                    display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                  {loading&&<SpinIco/>} otvori projekt
                </button>
              </form>:
              <form onSubmit={e=>{e.preventDefault();doAdmin();}} autoComplete="on">
                <p style={{fontSize:13,color:C.mut,marginBottom:16}}>Admin pristup za upravljanje projektima.</p>
                <input type="text" name="username" autoComplete="username" value="admin"
                  onChange={()=>{}} style={{display:'none'}} readOnly/>
                <input type="password" name="password" autoComplete="current-password" placeholder="Lozinka" value={ap}
                  onChange={e=>{setAp(e.target.value);setErr('');}}
                  style={{width:'100%',background:C.inputBg,border:`1px solid ${C.bdr}`,borderRadius:6,
                    padding:'12px 14px',fontSize:14,color:C.txt,marginBottom:6}}/>
                {err&&<p style={{fontSize:12,color:C.red,marginBottom:10,fontWeight:600}}>{err}</p>}
                {!err&&<div style={{height:16}}/>}
                <button type="submit" disabled={loading}
                  style={{width:'100%',padding:'12px 0',borderRadius:6,border:'none',cursor:'pointer',
                    background:C.btnSecBg,color:C.txt,fontSize:14,fontWeight:700,
                    display:'flex',alignItems:'center',justifyContent:'center',gap:8}}>
                  {loading&&<SpinIco/>} prijavi se
                </button>
              </form>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Admin ────────────────────────────────────────────────────────────────────

function AdminDashboard({ projects, onSelect }) {
  const { C } = useTheme();
  const totalTasks = projects.reduce((a,p) => a + p.tasks.length, 0);
  const doneTasks = projects.reduce((a,p) => a + p.tasks.filter(t=>t.done).length, 0);
  const unresolvedComments = projects.reduce((a,p) =>
    a + p.tasks.reduce((b,t) =>
      b + (t.comments||[]).filter(c=>c.author==='client'&&!c.resolved).length, 0), 0);
  const activeProjects = projects.filter(p=>p.tasks.some(t=>!t.done)).length;

  const statBox = (label, value, color) => (
    <div style={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:12,
      padding:'20px 24px',flex:1,minWidth:140}}>
      <p style={{fontSize:32,fontWeight:800,color:color||C.txt,fontFamily:'Archivo,system-ui,sans-serif',lineHeight:1}}>{value}</p>
      <p style={{fontSize:13,color:C.mut,marginTop:6}}>{label}</p>
    </div>
  );

  return (
    <div style={{maxWidth:900,margin:'0 auto',padding:'32px 24px'}}>
      <h2 style={{fontSize:24,fontWeight:800,marginBottom:6,fontFamily:'Archivo,system-ui,sans-serif'}}>Pregled</h2>
      <p style={{fontSize:14,color:C.mut,marginBottom:24}}>Stanje svih projekata</p>

      <div style={{display:'flex',gap:14,marginBottom:32,flexWrap:'wrap'}}>
        {statBox('Aktivnih projekata', activeProjects, C.acc)}
        {statBox('Ukupno zadataka', totalTasks, C.txt)}
        {statBox('Završenih zadataka', doneTasks, C.grn)}
        {statBox('Neriješenih komentara', unresolvedComments, unresolvedComments>0?C.amber:C.grn)}
      </div>

      {(() => {
        const now = new Date();
        const overdue = [];
        const soon = [];
        projects.forEach(p => {
          p.tasks.forEach(t => {
            if (!t.done && t.due_date) {
              const due = new Date(t.due_date + 'T00:00:00');
              const diff = due - now;
              if (diff < 0) overdue.push({proj:p.name, task:t.text, due});
              else if (diff < 3*86400000) soon.push({proj:p.name, task:t.text, due});
            }
          });
        });
        if (overdue.length === 0 && soon.length === 0) return null;
        return (
          <div style={{marginBottom:24}}>
            {overdue.length > 0 && (
              <div style={{background:C.commentClient,border:`1px solid ${C.red}`,
                borderRadius:8,padding:'12px 16px',marginBottom:10}}>
                <p style={{fontSize:13,fontWeight:700,color:C.red,marginBottom:8}}>
                  ⚠ {overdue.length} zadatak{overdue.length>1?'a':''} s prošlim rokom
                </p>
                {overdue.map((x,i) => (
                  <p key={i} style={{fontSize:12,color:C.red,marginBottom:2}}>
                    <strong>{x.proj}</strong> — {x.task.substring(0,50)}{x.task.length>50?'...':''}
                    <span style={{marginLeft:6,opacity:0.7}}>
                      ({x.due.toLocaleDateString('hr-HR',{day:'2-digit',month:'2-digit'})})
                    </span>
                  </p>
                ))}
              </div>
            )}
            {soon.length > 0 && (
              <div style={{background:C.commentClient,border:`1px solid ${C.amber}`,
                borderRadius:8,padding:'12px 16px',marginBottom:10}}>
                <p style={{fontSize:13,fontWeight:700,color:C.amber,marginBottom:8}}>
                  📅 {soon.length} zadatak{soon.length>1?'a':''} s rokom u sljedeća 3 dana
                </p>
                {soon.map((x,i) => (
                  <p key={i} style={{fontSize:12,color:C.amber,marginBottom:2}}>
                    <strong>{x.proj}</strong> — {x.task.substring(0,50)}{x.task.length>50?'...':''}
                    <span style={{marginLeft:6,opacity:0.7}}>
                      ({x.due.toLocaleDateString('hr-HR',{day:'2-digit',month:'2-digit'})})
                    </span>
                  </p>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      <h3 style={{fontSize:16,fontWeight:700,marginBottom:14,fontFamily:'Archivo,system-ui,sans-serif'}}>Projekti</h3>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {projects.map(p => {
          const d = p.tasks.filter(t=>t.done).length;
          const t = p.tasks.length;
          const pct = t>0?Math.round((d/t)*100):0;
          const unresolved = p.tasks.reduce((a,task)=>
            a+(task.comments||[]).filter(c=>c.author==='client'&&!c.resolved).length,0);
          const lastActivity = p.tasks
            .flatMap(t=>[t.updated_at,t.created_at,...(t.comments||[]).map(c=>c.created_at)])
            .filter(Boolean).sort().reverse()[0];

          return (
            <div key={p.id} onClick={()=>onSelect(p.id)}
              style={{background:C.card,border:`1px solid ${unresolved>0?C.amber:C.bdr}`,
                borderRadius:10,padding:'16px 20px',cursor:'pointer',
                transition:'box-shadow 0.15s',borderLeft:`4px solid ${pct===100?C.grn:unresolved>0?C.amber:C.acc}`}}
              onMouseEnter={e=>e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,0.12)'}
              onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                <div style={{flex:1,minWidth:0}}>
                  <p style={{fontSize:15,fontWeight:700,fontFamily:'Archivo,system-ui,sans-serif',
                    overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.name}</p>
                  {p.client_name&&<p style={{fontSize:12,color:C.mut,marginTop:1}}>{p.client_name}</p>}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10,flexShrink:0,marginLeft:16}}>
                  {unresolved>0&&(
                    <span style={{background:C.amber,color:'#1a1200',fontSize:11,fontWeight:700,
                      padding:'2px 8px',borderRadius:20}}>{unresolved} kom.</span>
                  )}
                  <span style={{fontSize:13,fontWeight:700,color:pct===100?C.grn:C.txt}}>{pct}%</span>
                </div>
              </div>
              <div style={{height:4,background:C.bdr,borderRadius:2,overflow:'hidden',marginBottom:8}}>
                <div style={{width:pct+'%',height:'100%',borderRadius:2,
                  background:pct===100?C.grn:`linear-gradient(90deg,${C.acc},${C.grn})`}}/>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:12,color:C.mut}}>{d}/{t} zadataka</span>
                {lastActivity&&<span style={{fontSize:11,color:C.mut}}>
                  {new Date(lastActivity).toLocaleDateString('hr-HR',{day:'2-digit',month:'2-digit',year:'numeric'})}
                </span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


const ACTION_LABELS = {
  task_created: 'Kreiran zadatak',
  task_done: 'Označeno završenim',
  task_reopened: 'Ponovno otvoreno',
  task_edited: 'Uređen zadatak',
  status_changed: 'Status promijenjen',
  priority_changed: 'Prioritet promijenjen',
  comment_added: 'Dodan komentar',
};

function ActivityLog({ projectId, adminPw }) {
  const { C } = useTheme();
  const [logs, setLogs] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await fetch(`/api/projects/${projectId}/activity`, {
      headers: { 'authorization': 'Bearer ' + adminPw }
    }).then(r => r.json());
    if (Array.isArray(data)) setLogs(data);
    setLoading(false);
  };

  const toggle = () => {
    if (!open) load();
    setOpen(!open);
  };

  return (
    <div style={{marginTop:16}}>
      <button onClick={toggle}
        style={{background:'transparent',border:`1px solid ${C.bdr}`,borderRadius:6,
          padding:'6px 14px',fontSize:12,color:C.mut,cursor:'pointer',fontWeight:600}}>
        {open ? '▲ Sakrij aktivnost' : '▼ Aktivnost projekta'}
      </button>
      {open && (
        <div style={{marginTop:10,background:C.card,border:`1px solid ${C.bdr}`,borderRadius:8,overflow:'hidden'}}>
          {loading && <p style={{padding:16,fontSize:12,color:C.mut}}>Učitavanje...</p>}
          {!loading && logs.length === 0 && <p style={{padding:16,fontSize:12,color:C.mut}}>Nema aktivnosti.</p>}
          {!loading && logs.map(log => (
            <div key={log.id} style={{padding:'10px 16px',borderBottom:`1px solid ${C.bdr}`,
              display:'flex',alignItems:'flex-start',gap:12}}>
              <span style={{fontSize:10,fontWeight:700,
                color:log.actor==='client'?C.amber:C.acc,
                background:log.actor==='client'?C.commentClient:C.commentAdmin,
                padding:'2px 7px',borderRadius:4,flexShrink:0,marginTop:2}}>
                {log.actor==='client'?'KLIJENT':'ADMIN'}
              </span>
              <div style={{flex:1,minWidth:0}}>
                <p style={{fontSize:13,color:C.txt,fontWeight:500}}>
                  {ACTION_LABELS[log.action]||log.action}
                </p>
                {log.detail && <p style={{fontSize:12,color:C.mut,marginTop:2,
                  overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                  {log.detail}
                </p>}
              </div>
              <span style={{fontSize:11,color:C.mut,flexShrink:0}}>
                {new Date(log.created_at).toLocaleDateString('hr-HR',{day:'2-digit',month:'2-digit'})}
                {' '}
                {new Date(log.created_at).toLocaleTimeString('hr-HR',{hour:'2-digit',minute:'2-digit'})}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminView({adminPw, onLogout, toggleTheme, theme}) {
  const { C, PRIO } = useTheme();
  const [projects, setProjects] = useState([]);
  const [selId, setSelId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({name:'',clientName:'',clientEmail:'',accessCode:generateCode(),description:''});
  const [newCodeCopied, setNewCodeCopied] = useState(false);
  const [editProj, setEditProj] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [pf, setPf] = useState({current:'',next:''});
  const [pfErr, setPfErr] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [apiErr, setApiErr] = useState('');
  const [sortBy, setSortBy] = useState('default'); // default, priority, name
  const [showArchived, setShowArchived] = useState(false);
  const [archivedProjects, setArchivedProjects] = useState([]);

  const proj = projects.find(p=>p.id===selId);
  const done = proj?proj.tasks.filter(t=>t.done).length:0;
  const total = proj?proj.tasks.length:0;
  const pct = total>0?Math.round((done/total)*100):0;
  const h = {'Content-Type':'application/json','authorization':'Bearer '+adminPw};

  const load = useCallback(async()=>{
    setLoading(true);
    const d = await fetch('/api/projects',{headers:{'authorization':'Bearer '+adminPw}}).then(r=>r.json());
    if(Array.isArray(d)) setProjects(d);
    setLoading(false);
  },[adminPw]);

  useEffect(()=>{load();},[load]);

  const updateProj = d => setProjects(ps=>ps.map(p=>p.id===d.id?d:p));
  const updateTasks = tasks => setProjects(ps=>ps.map(p=>p.id===selId?{...p,tasks}:p));

  const createProject = async()=>{
    if(!newForm.name.trim()||!newForm.accessCode.trim()) return;
    const d = await fetch('/api/projects',{method:'POST',headers:h,body:JSON.stringify(newForm)}).then(r=>r.json());
    if(d.error){setApiErr(d.error);return;}
    setProjects(ps=>[d,...ps]);setSelId(d.id);setShowNew(false);
    setNewForm({name:'',clientName:'',clientEmail:'',accessCode:generateCode(),description:''});
  };

  const saveEditProj = async()=>{
    if(!editProj) return;
    const d = await fetch(`/api/projects/${selId}`,{method:'PUT',headers:h,body:JSON.stringify(editProj)}).then(r=>r.json());
    if(d.error){setApiErr(d.error);return;}
    updateProj(d);setEditProj(null);
  };

  const deleteProject = async()=>{
    if(!proj||!confirm('Obrisati projekt "'+proj.name+'"?')) return;
    await fetch(`/api/projects/${selId}`,{method:'DELETE',headers:{'authorization':'Bearer '+adminPw}});
    setProjects(ps=>ps.filter(p=>p.id!==selId));setSelId(null);
  };

  const handlers = {
    addTask: async(projId,text)=>{
      const t = await fetch(`/api/projects/${projId}/tasks`,{method:'POST',headers:h,body:JSON.stringify({text})}).then(r=>r.json());
      if(!t.error) setProjects(ps=>ps.map(p=>p.id===projId?{...p,tasks:[...p.tasks,t]}:p));
    },
    toggleTask: async(tid,cur)=>{
      const t = await fetch(`/api/tasks/${tid}`,{method:'PUT',headers:h,body:JSON.stringify({done:!cur,status:'active'})}).then(r=>r.json());
      if(!t.error) setProjects(ps=>ps.map(p=>p.id===selId?{...p,tasks:p.tasks.map(x=>x.id===tid?t:x)}:p));
    },
    editText: async(tid,text)=>{
      const t = await fetch(`/api/tasks/${tid}`,{method:'PUT',headers:h,body:JSON.stringify({text})}).then(r=>r.json());
      if(!t.error) setProjects(ps=>ps.map(p=>p.id===selId?{...p,tasks:p.tasks.map(x=>x.id===tid?t:x)}:p));
    },
    editNote: async(tid,note)=>{
      const t = await fetch(`/api/tasks/${tid}`,{method:'PUT',headers:h,body:JSON.stringify({note})}).then(r=>r.json());
      if(!t.error) setProjects(ps=>ps.map(p=>p.id===selId?{...p,tasks:p.tasks.map(x=>x.id===tid?t:x)}:p));
    },
    deleteTask: async(tid)=>{
      await fetch(`/api/tasks/${tid}`,{method:'DELETE',headers:{'authorization':'Bearer '+adminPw}});
      setProjects(ps=>ps.map(p=>p.id===selId?{...p,tasks:p.tasks.filter(x=>x.id!==tid)}:p));
    },
    moveTask: async(tid,direction)=>{
      const tasks = await fetch(`/api/tasks/${tid}/move`,{method:'POST',headers:h,body:JSON.stringify({direction})}).then(r=>r.json());
      if(Array.isArray(tasks)) updateTasks(tasks);
    },
    changePriority: async(tid,current)=>{
      const next = PRIO_CYCLE[(PRIO_CYCLE.indexOf(current)+1)%PRIO_CYCLE.length];
      const t = await fetch(`/api/tasks/${tid}`,{method:'PUT',headers:h,body:JSON.stringify({priority:next})}).then(r=>r.json());
      if(!t.error) setProjects(ps=>ps.map(p=>p.id===selId?{...p,tasks:p.tasks.map(x=>x.id===tid?t:x)}:p));
    },
    setStatus: async(tid,status)=>{
      const t = await fetch(`/api/tasks/${tid}`,{method:'PUT',headers:h,body:JSON.stringify({status,done:0})}).then(r=>r.json());
      if(!t.error) setProjects(ps=>ps.map(p=>p.id===selId?{...p,tasks:p.tasks.map(x=>x.id===tid?t:x)}:p));
    },
    addComment: async(tid,text)=>{
      const c = await fetch(`/api/tasks/${tid}/comments`,{method:'POST',headers:h,body:JSON.stringify({text})}).then(r=>r.json());
      if(!c.error) setProjects(ps=>ps.map(p=>p.id===selId?{...p,tasks:p.tasks.map(x=>x.id===tid?{...x,comments:[...(x.comments||[]),c]}:x)}:p));
    },
    deleteComment: async(cid)=>{
      await fetch(`/api/comments/${cid}`,{method:'DELETE',headers:{'authorization':'Bearer '+adminPw}});
      setProjects(ps=>ps.map(p=>p.id===selId?{...p,tasks:p.tasks.map(x=>({...x,comments:(x.comments||[]).filter(c=>c.id!==cid)}))}:p));
    },
    reorderTasks: (pid, sorted) => {
      setProjects(ps=>ps.map(p=>p.id===pid?{...p,tasks:sorted}:p));
    },
    setDueDate: async(tid, due_date)=>{
      const h = {'Content-Type':'application/json','authorization':'Bearer '+adminPw};
      const t = await fetch(`/api/tasks/${tid}`,{method:'PUT',headers:h,body:JSON.stringify({due_date})}).then(r=>r.json());
      if(!t.error) setProjects(ps=>ps.map(p=>p.id===selId?{...p,tasks:p.tasks.map(x=>x.id===tid?t:x)}:p));
    },
    archiveProject: async(pid)=>{
      if(!confirm('Arhivirati projekt? Neće biti vidljiv u listi, možeš ga pronaći u arhivi.')) return;
      await fetch(`/api/projects/${pid}/archive`,{method:'PUT',headers:{'authorization':'Bearer '+adminPw}});
      setProjects(ps=>ps.filter(p=>p.id!==pid));
      setSelId(null);
    },
    copyProject: async(pid)=>{
      const p = await fetch(`/api/projects/${pid}/copy`,{method:'POST',headers:{'authorization':'Bearer '+adminPw}}).then(r=>r.json());
      if(!p.error) { setProjects(ps=>[p,...ps]); setSelId(p.id); }
    },
    resolveComment: async(cid)=>{
      const c = await fetch(`/api/comments/${cid}/resolve`,{method:'PUT',headers:{'authorization':'Bearer '+adminPw}}).then(r=>r.json());
      if(!c.error) setProjects(ps=>ps.map(p=>p.id===selId?{...p,tasks:p.tasks.map(x=>({...x,comments:(x.comments||[]).map(cm=>cm.id===cid?c:cm)}))}:p));
    },
  };

  const copy = (text,setter)=>{navigator.clipboard.writeText(text);setter(true);setTimeout(()=>setter(false),2000);};

  const chPass = async()=>{
    setPfErr('');
    const d = await fetch('/api/settings/password',{method:'PUT',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({currentPassword:pf.current,newPassword:pf.next})}).then(r=>r.json());
    if(d.ok){setShowSettings(false);setPf({current:'',next:''});alert('Lozinka promijenjena.');}
    else setPfErr(d.error||'Greška.');
  };

  const openNew = ()=>{
    setShowNew(!showNew);
    if(!showNew) setNewForm({name:'',clientName:'',clientEmail:'',accessCode:generateCode(),description:''});
  };

  return (
    <div style={{minHeight:'100vh',background:C.bg,paddingTop:48}}>
      <div style={{position:'fixed',top:0,left:0,right:0,zIndex:200,background:C.sid,borderBottom:`1px solid ${C.bdr}`}}>
        <div style={{height:48,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px'}}>
          <div style={{display:'flex',alignItems:'center',gap:8,flex:1,minWidth:0,overflow:'hidden'}}>
            {selId&&proj&&(
              <button onClick={()=>setSelId(null)} className="mobile-only"
                style={{background:'transparent',border:'none',color:C.mut,cursor:'pointer',
                  display:'flex',alignItems:'center',padding:'4px 8px 4px 0',flexShrink:0}}>
                <BackIco/>
              </button>
            )}
            <span style={{fontSize:13,fontWeight:700,color:C.txt}}>Flow</span>
            <span className="desktop-only"
              style={{fontSize:10,color:C.mut,background:C.btnSecBg,padding:'2px 8px',
                borderRadius:4,fontWeight:600,letterSpacing:'0.06em'}}>admin</span>
          </div>
          <div style={{display:'flex',gap:4,flexShrink:0}}>
            <button className="desktop-only" onClick={()=>setShowSettings(!showSettings)}
              style={{background:'transparent',border:'none',fontSize:12,color:C.mut,
                padding:'4px 10px',borderRadius:4,cursor:'pointer',fontWeight:600}}>
              {showSettings?'✕ zatvori':'postavke'}
            </button>
            <button onClick={toggleTheme} title={theme==='dark'?'Svijetli dizajn':'Tamni dizajn'}
              style={{background:'transparent',border:'none',fontSize:16,color:C.mut,
                padding:'4px 8px',borderRadius:4,cursor:'pointer'}}>
              {theme==='dark'?<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
            </button>
            <button onClick={()=>{SESSION.clearAdmin();onLogout();}}
              style={{background:'transparent',border:'none',fontSize:12,color:C.mut,
                padding:'4px 10px',borderRadius:4,cursor:'pointer',fontWeight:600}}>odjava</button>
          </div>
        </div>

        {showSettings&&(
          <div style={{background:C.inputBg,borderTop:`1px solid ${C.bdr}`,padding:12,
            display:'flex',flexWrap:'wrap',alignItems:'center',gap:8}}>
            <span style={{fontSize:12,color:C.amber,fontWeight:600}}>nova lozinka:</span>
            <input type="password" placeholder="Trenutna" value={pf.current}
              onChange={e=>setPf(f=>({...f,current:e.target.value}))}
              style={{background:C.btnSecBg,border:`1px solid ${C.bdr}`,borderRadius:4,
                padding:'6px 10px',fontSize:12,color:C.txt,width:120}}/>
            <input type="password" placeholder="Nova" value={pf.next}
              onChange={e=>setPf(f=>({...f,next:e.target.value}))}
              style={{background:C.btnSecBg,border:`1px solid ${C.bdr}`,borderRadius:4,
                padding:'6px 10px',fontSize:12,color:C.txt,width:120}}/>
            <button onClick={chPass}
              style={{background:C.amber,color:'#0c0e10',fontSize:12,fontWeight:700,
                padding:'6px 14px',borderRadius:4,border:'none',cursor:'pointer',}}>spremi</button>
            {pfErr&&<span style={{fontSize:12,color:C.red,fontWeight:600}}>{pfErr}</span>}
          </div>
        )}
        {apiErr&&(
          <div style={{background:C.taskDone,borderTop:`1px solid #3d1010`,padding:'8px 16px',
            fontSize:12,color:C.red,display:'flex',justifyContent:'space-between',fontWeight:600}}>
            {apiErr}<button onClick={()=>setApiErr('')}
              style={{background:'none',border:'none',color:C.red,cursor:'pointer'}}>✕</button>
          </div>
        )}
      </div>

      <div className="admin-layout">
        <div className="admin-sidebar" style={{background:C.sid,borderRight:`1px solid ${C.bdr}`}}>
          <div style={{padding:'24px 16px 18px',display:'flex',alignItems:'center',gap:14,borderBottom:`1px solid ${C.bdr}`}}>
            <img src="/icon.png" alt="Flow" style={{width:80,height:80,borderRadius:18,flexShrink:0,boxShadow:'0 2px 12px rgba(0,0,0,0.25)'}}/>
            <div>
              <p style={{fontSize:17,fontWeight:700,color:C.txt,lineHeight:1.2}}>Flow</p>
              <p style={{fontSize:12,color:C.mut,marginTop:2}}>Arcadian</p>
            </div>
          </div>
          <div style={{padding:10}}>
            <button onClick={openNew}
              style={{width:'100%',background:C.acc,color:'#0c0e10',border:'none',
                borderRadius:6,padding:'9px 0',fontSize:12,fontWeight:700,cursor:'pointer'}}>
              + novi projekt
            </button>
          </div>
          {showNew&&<NewProjForm form={newForm} setForm={setNewForm} codeCopied={newCodeCopied}
            onCopy={()=>copy(newForm.accessCode,setNewCodeCopied)} onCreate={createProject} onCancel={()=>setShowNew(false)}/>}
          <ProjListView projects={projects} loading={loading} selectedId={selId} onSelect={setSelId}/>
          <div style={{padding:'10px 14px',borderTop:`1px solid ${C.bdr}`,marginTop:'auto'}}>
            <button onClick={()=>setShowSettings(!showSettings)} className="mobile-only"
              style={{background:'transparent',border:'none',fontSize:12,color:C.mut,
                cursor:'pointer',fontWeight:600,padding:0}}>
              {showSettings?'✕ zatvori':'postavke lozinke'}
            </button>
          </div>
        </div>

        <div className="mobile-only">
          {!selId?(
            <div>
              <div style={{padding:'12px 16px',borderBottom:`1px solid ${C.bdr}`}}>
                <button onClick={openNew}
                  style={{width:'100%',background:C.acc,color:'#0c0e10',border:'none',
                    borderRadius:8,padding:'13px 0',fontSize:14,fontWeight:700,cursor:'pointer',}}>
                  + novi projekt
                </button>
              </div>
              {showNew&&<NewProjForm form={newForm} setForm={setNewForm} codeCopied={newCodeCopied}
                onCopy={()=>copy(newForm.accessCode,setNewCodeCopied)} onCreate={createProject} onCancel={()=>setShowNew(false)}/>}
              <AdminDashboard projects={projects} onSelect={setSelId}/>
            </div>
          ):proj?(
            <ProjDetailView proj={proj} done={done} total={total} pct={pct}
              editProj={editProj} setEditProj={setEditProj} onSaveEdit={saveEditProj}
              onDeleteProj={deleteProject} onArchiveProj={()=>handlers.archiveProject(selId)}
              onCopyProj={()=>handlers.copyProject(selId)}
              codeCopied={codeCopied}
              onCopyCode={()=>copy(proj.access_code,setCodeCopied)} handlers={handlers} adminPw={adminPw}/>
          ):null}
        </div>

        <div className="desktop-only" style={{padding:20,overflowY:'auto'}}>
          {!proj?(
            <AdminDashboard projects={projects} onSelect={setSelId}/>
          ):(
            <ProjDetailView proj={proj} done={done} total={total} pct={pct}
              editProj={editProj} setEditProj={setEditProj} onSaveEdit={saveEditProj}
              onDeleteProj={deleteProject} onArchiveProj={()=>handlers.archiveProject(selId)}
              onCopyProj={()=>handlers.copyProject(selId)}
              codeCopied={codeCopied}
              onCopyCode={()=>copy(proj.access_code,setCodeCopied)} handlers={handlers} adminPw={adminPw}/>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Client ───────────────────────────────────────────────────────────────────

function ClientTaskText({ task, onEdit, onDelete }) {
  const { C } = useTheme();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(task.text);

  useEffect(() => { setText(task.text); }, [task.text]);

  const save = () => {
    const t = text.trim();
    if (t && t !== task.text) onEdit(task.id, t);
    else setText(task.text);
    setEditing(false);
  };

  if (editing) return (
    <div style={{flex:1}}>
      <textarea value={text} autoFocus rows={2}
        onChange={e=>setText(e.target.value)}
        onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();save();}if(e.key==='Escape'){setText(task.text);setEditing(false);}}}
        onBlur={save}
        style={{width:'100%',background:C.inputBg,border:'1px solid '+C.acc,borderRadius:6,
          padding:'6px 10px',fontSize:14,color:C.txt,resize:'none',lineHeight:1.5}}/>
    </div>
  );

  return (
    <div style={{flex:1,display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8}}>
      <p onClick={()=>!task.done&&setEditing(true)}
        style={{fontSize:14,color:task.done?C.mut:C.txt,textDecoration:task.done?'line-through':'none',
          lineHeight:1.5,whiteSpace:'pre-wrap',flex:1,cursor:task.done?'default':'text'}}
        title={task.done?'':'Klikni za uredi'}>
        {task.text}
      </p>
      {!task.done && (
        <button onClick={()=>onDelete(task.id)}
          style={{background:'transparent',border:'none',color:C.red,cursor:'pointer',
            padding:'2px 4px',flexShrink:0,opacity:0.6}}
          title="Obriši zadatak">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6M10 11v6m4-6v6M9 6V4h6v2"/></svg>
        </button>
      )}
    </div>
  );
}

function ClientView({project: initialProject, accessCode, onLogout, toggleTheme, theme }) {
  const { C, PRIO } = useTheme();
  const [project, setProject] = useState(initialProject);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async()=>{
    setRefreshing(true);
    const r = await fetch('/api/auth/client',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({code:accessCode})}).then(x=>x.json());
    if(r.ok) setProject(r.project);
    setRefreshing(false);
  };

  const addClientComment = async(tid,text)=>{
    const c = await fetch(`/api/client/tasks/${tid}/comments`,{
      method:'POST',headers:{'Content-Type':'application/json','x-access-code':accessCode},
      body:JSON.stringify({text})}).then(r=>r.json());
    if(!c.error) setProject(p=>({...p,tasks:p.tasks.map(t=>t.id===tid?{...t,comments:[...(t.comments||[]),c]}:t)}));
  };

  const editClientTask = async(tid, text)=>{
    const t = await fetch('/api/client/tasks/'+tid,{
      method:'PUT',
      headers:{'Content-Type':'application/json','x-access-code':accessCode},
      body:JSON.stringify({text})
    }).then(r=>r.json());
    if(!t.error) setProject(p=>({...p,tasks:p.tasks.map(x=>x.id===tid?t:x)}));
  };

  const deleteClientTask = async(tid)=>{
    if(!confirm('Obrisati ovaj zadatak?')) return;
    const r = await fetch('/api/client/tasks/'+tid,{
      method:'DELETE',
      headers:{'x-access-code':accessCode}
    }).then(r=>r.json());
    if(r.ok) setProject(p=>({...p,tasks:p.tasks.filter(x=>x.id!==tid)}));
  };

  const addClientTask = async(text)=>{
    const t = await fetch('/api/client/tasks',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-access-code':accessCode},
      body:JSON.stringify({text})
    }).then(r=>r.json());
    if(!t.error) setProject(p=>({...p,tasks:[...p.tasks,t]}));
  };

  const done = project.tasks.filter(t=>t.done).length;
  const total = project.tasks.length;
  const pct = total>0?Math.round((done/total)*100):0;

  return (
    <div style={{minHeight:'100vh',background:C.bg}}>
      <div style={{position:'sticky',top:0,zIndex:100,borderBottom:`1px solid ${C.bdr}`,
        padding:'0 16px',display:'flex',alignItems:'center',justifyContent:'space-between',
        background:C.sid,height:48}}>
        <div style={{display:'flex',alignItems:'center',gap:10,flex:1,minWidth:0}}>
          <img src="/icon.png" alt="Flow" style={{width:32,height:32,borderRadius:8,flexShrink:0}}/>
          <div style={{minWidth:0}}>
            <p style={{fontWeight:700,fontSize:15,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{project.name}</p>
            {project.client_name&&<p style={{fontSize:11,color:C.mut,fontWeight:600}}>{project.client_name}</p>}
          </div>
        </div>
        <div style={{display:'flex',gap:8,flexShrink:0,marginLeft:12}}>
          <button onClick={refresh} disabled={refreshing}
            style={{background:'transparent',border:`1px solid ${C.bdr}`,borderRadius:6,
              padding:'5px 10px',fontSize:12,color:C.mut,cursor:'pointer',
              display:'flex',alignItems:'center',gap:4,fontWeight:600}}>
            <RefreshIco/>{refreshing?'...':'osvježi'}
          </button>
          <button onClick={toggleTheme} title={theme==='dark'?'Svijetli dizajn':'Tamni dizajn'}
            style={{background:'transparent',border:'none',fontSize:16,color:C.mut,
              padding:'0 6px',cursor:'pointer'}}>
            {theme==='dark'?<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>:<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{width:16,height:16}}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>}
          </button>
          <button onClick={()=>{SESSION.clearClient();onLogout();}}
            style={{background:'transparent',border:'none',fontSize:12,color:C.mut,
              cursor:'pointer',fontWeight:600}}>odjava</button>
        </div>
      </div>

      <div style={{maxWidth:680,margin:'0 auto',padding:'20px 16px 60px'}}>
        <div style={{background:C.card,border:`1px solid ${C.bdr}`,borderRadius:8,padding:20,marginBottom:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <span style={{fontSize:14,fontWeight:600}}>Napredak projekta</span>
            <span style={{fontSize:22,fontWeight:800,
              color:pct===100?C.grn:C.txt}}>{pct}%</span>
          </div>
          <div style={{height:4,background:C.bdr,borderRadius:2,overflow:'hidden'}}>
            <div style={{width:pct+'%',height:'100%',
              background:pct===100?C.grn:'linear-gradient(90deg,#79c0ff,#56d364)',
              transition:'width 0.5s',borderRadius:2}}/>
          </div>
          <p style={{fontSize:12,color:C.mut,marginTop:8,fontWeight:600}}>{done} od {total} završeno</p>
          {project.description&&<p style={{fontSize:13,color:C.mut,marginTop:8,lineHeight:1.5}}>{project.description}</p>}
          {pct===100&&total>0&&<p style={{fontSize:14,color:C.grn,marginTop:10,fontWeight:700,}}>✓ sve gotovo</p>}
        </div>

        <AddTaskInput onAdd={addClientTask}/>

        {total===0&&<div style={{background:C.card,border:`1px dashed ${C.bdr}`,borderRadius:8,padding:40,textAlign:'center'}}>
          <p style={{fontSize:13,color:C.mut,fontWeight:600}}>Zadaci još nisu dodani.</p>
        </div>}

        {project.tasks.map(task=>(
          <div key={task.id} style={{
            background:task.done?C.taskDone:C.card,
            border:`1px solid ${task.done?C.taskDoneBdr:task.status==='awaiting_client'?C.amber:C.bdr}`,
            borderLeft:`3px solid ${task.done?C.grn:task.status==='awaiting_client'?C.amber:C.bdr}`,
            borderRadius:6,padding:'14px 16px',marginBottom:10}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
              <div style={{width:22,height:22,borderRadius:4,flexShrink:0,
                border:`2px solid ${task.done?C.grn:C.bdr}`,
                background:task.done?C.grn:'transparent',
                display:'flex',alignItems:'center',justifyContent:'center',marginTop:2,color:'#0c0e10'}}>
                {task.done&&<CheckIco/>}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:8,marginBottom:4}}>
                  <ClientTaskText task={task} onEdit={editClientTask} onDelete={deleteClientTask}/>
                  {task.priority&&task.priority!=='normal'&&<PrioBadge priority={task.priority}/>}
                </div>
                {task.note&&<p style={{fontSize:13,color:C.commentAdminTxt,background:C.commentAdmin,
                  padding:'6px 10px',borderRadius:4,borderLeft:`2px solid ${C.acc}`,
                  marginBottom:6,lineHeight:1.4,fontStyle:'italic'}}>{task.note}</p>}
                <CommentList comments={task.comments}/>
                <AddCommentForm taskId={task.id} onAdd={addClientComment}/>
              </div>
              <span style={{fontSize:11,padding:'3px 8px',borderRadius:4,flexShrink:0,fontWeight:600,
                background:task.done?C.taskDone:task.status==='awaiting_client'?C.commentClient:C.btnSecBg,
                color:task.done?C.grn:task.status==='awaiting_client'?C.amber:C.mut,
                border:`1px solid ${task.done?C.taskDoneBdr:task.status==='awaiting_client'?C.commentClientBdr:C.bdr}`,
                marginTop:2}}>
                {task.done?'gotovo':task.status==='awaiting_client'?'čeka klijenta':'na čekanju'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState('loading');
  const [adminPw, setAdminPw] = useState('');
  const [clientData, setClientData] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('flow_theme') || 'light');

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('flow_theme', next);
  };

  // Sync body background with theme
  useEffect(() => {
    document.body.style.background = THEMES[theme].bg;
    document.body.style.color = THEMES[theme].txt;
    const root = document.documentElement;
    if (theme === 'light') {
      root.style.setProperty('--sidebar-bg', '#f0ede6');
      root.style.setProperty('--sidebar-bdr', '#e3ddd1');
    } else {
      root.style.setProperty('--sidebar-bg', '#1b2636');
      root.style.setProperty('--sidebar-bdr', '#26344a');
    }
  }, [theme]);

  // Auto-restore session on load
  useEffect(()=>{
    const tryRestore = async()=>{
      const savedAdmin = SESSION.loadAdmin();
      const savedClient = SESSION.loadClient();

      if(savedAdmin){
        const r = await fetch('/api/projects',{headers:{'authorization':'Bearer '+savedAdmin}}).then(x=>x.json());
        if(Array.isArray(r)){setAdminPw(savedAdmin);setScreen('admin');return;}
        else SESSION.clearAdmin();
      }

      if(savedClient){
        const r = await api('/api/auth/client',{method:'POST',body:JSON.stringify({code:savedClient})});
        if(r.ok){setClientData({project:r.project,accessCode:savedClient});setScreen('client');return;}
        else SESSION.clearClient();
      }

      setScreen('home');
    };
    tryRestore();
  },[]);

  if(screen==='loading') return (
    <ThemeCtx.Provider value={theme}>
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:THEMES[theme].bg}}>
        <p style={{fontSize:12,color:THEMES[theme].mut}}>Učitavanje...</p>
      </div>
    </ThemeCtx.Provider>
  );

  return (
    <ThemeCtx.Provider value={theme}>
      {screen==='home'&&<HomeView
        onAdmin={p=>{setAdminPw(p);setScreen('admin');}}
        onClient={(proj,code)=>{setClientData({project:proj,accessCode:code});setScreen('client');}}
        toggleTheme={toggleTheme} theme={theme}/>}
      {screen==='admin'&&<AdminView adminPw={adminPw} onLogout={()=>{setAdminPw('');setScreen('home');}}
        toggleTheme={toggleTheme} theme={theme}/>}
      {screen==='client'&&clientData&&<ClientView project={clientData.project} accessCode={clientData.accessCode}
        onLogout={()=>{setClientData(null);setScreen('home');}} toggleTheme={toggleTheme} theme={theme}/>}
    </ThemeCtx.Provider>
  );
}
