// ============================================================
// RECONCILIATION CENTER v2
// Future-timestamp anomaly management
// Two options: Move to Previous Shift | Keep As Is
// Permanent correction memory — never re-asks for same call
// ============================================================
import { useState, useMemo } from 'react';
import { useApp } from '../../store/appStore.jsx';
import { getShiftDates } from '../../parsers/effortParser.js';
import { toDDMMYYYY, formatShiftDate } from '../../utils/dateUtils.js';

function AnomalyCard({ item, onMoveToPrev, onKeepAsIs, onSuppress }) {
  const [expanded, setExpanded] = useState(true);
  const hour = parseInt(item.hour, 10);
  const prevShift  = item.previousShift;
  const origShift  = item.shiftDate;
  const prevLabel  = prevShift ? formatShiftDate(prevShift) : '—';
  const origLabel  = origShift ? formatShiftDate(origShift) : '—';

  return (
    <div style={{ border:'1.5px solid #fdba74', borderRadius:10, marginBottom:10, overflow:'hidden' }}>
      {/* Header */}
      <div onClick={() => setExpanded(!expanded)} style={{
        display:'flex', alignItems:'center', gap:12, padding:'12px 16px',
        background:'#fff7ed', cursor:'pointer' }}>
        <div style={{ width:8, height:8, borderRadius:'50%', background:'#f97316', flexShrink:0 }}/>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:13 }}>{item.advisor}</div>
          <div style={{ fontSize:11, color:'#9a3412' }}>
            Created: {item.date} · Hour: {hour}:00 · Duration: {item.duration?.toFixed(2)} min ·
            {item.connected ? ' Connected' : ' Not Connected'}
          </div>
        </div>
        <div style={{ textAlign:'right', fontSize:11 }}>
          <div style={{ fontWeight:600, color:'#9a3412' }}>Future timestamp detected</div>
          <div style={{ color:'var(--txt3)' }}>Original shift: {origLabel}</div>
        </div>
        <span style={{ fontSize:12, color:'var(--txt3)' }}>{expanded ? '▲' : '▼'}</span>
      </div>

      {expanded && (
        <div style={{ padding:'16px', background:'white', borderTop:'1px solid #fdba74' }}>
          {/* Info grid */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:14 }}>
            {[
              { label:'Advisor',           value: item.advisor },
              { label:'Call Date (Raw)',    value: item.date },
              { label:'Hour of Day',        value: `${hour}:00` },
              { label:'Duration',           value: `${item.duration?.toFixed(2)} min` },
              { label:'Connected',          value: item.connected ? '✓ Yes' : '✗ No' },
              { label:'Detected At',        value: item.detectedAt ? new Date(item.detectedAt).toLocaleString('en-IN') : '—' },
              { label:'Original Shift',     value: origLabel },
              { label:'Previous Shift',     value: prevLabel },
            ].map(f => (
              <div key={f.label} style={{ background:'#f8fafc', borderRadius:6, padding:'8px 10px' }}>
                <div style={{ fontSize:10, color:'var(--txt3)', textTransform:'uppercase', marginBottom:2 }}>{f.label}</div>
                <div style={{ fontWeight:700, fontSize:12 }}>{f.value}</div>
              </div>
            ))}
          </div>

          {/* Explanation */}
          <div style={{ background:'#fef9c3', borderRadius:8, padding:'10px 14px', fontSize:12, marginBottom:14, border:'1px solid #fde047', lineHeight:1.7 }}>
            <strong>What happened:</strong> This call was logged at <strong>{hour}:00 on {item.date}</strong>.
            At the time of upload, this timestamp was ahead of the current system time — indicating a{' '}
            <strong>Salesforce/RingDNA sync anomaly</strong>.
            {hour >= 10
              ? ` Hour ${hour} maps to the same-day shift (${origLabel}), but operationally this call likely belongs to the previous shift (${prevLabel}).`
              : ` Hour ${hour} (cross-midnight) maps to the previous shift (${origLabel}), but appeared as a future timestamp.`
            }
          </div>

          {/* THE TWO CLEAR OPTIONS */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:12 }}>

            {/* Option 1: Move to Previous Shift */}
            <div style={{ border:'2px solid #16a34a', borderRadius:8, padding:'14px', background:'#f0fdf4', cursor:'pointer' }}
              onClick={() => onMoveToPrev(item)}>
              <div style={{ fontWeight:800, fontSize:13, color:'#166534', marginBottom:6 }}>
                ✓ Move to Previous Shift
              </div>
              <div style={{ fontSize:11, color:'#166534', marginBottom:8 }}>
                Assign this call to <strong>{prevLabel}</strong>
              </div>
              <div style={{ fontSize:10, color:'#15803d', background:'#dcfce7', padding:'6px 8px', borderRadius:6 }}>
                📌 Effort / PTT / Total Calls will recalculate for {prevLabel}<br/>
                📌 Excluded from {origLabel} automatically<br/>
                📌 Remembered — won't ask again on next upload
              </div>
            </div>

            {/* Option 2: Keep As Is */}
            <div style={{ border:'2px solid #6366f1', borderRadius:8, padding:'14px', background:'#f5f3ff', cursor:'pointer' }}
              onClick={() => onKeepAsIs(item)}>
              <div style={{ fontWeight:800, fontSize:13, color:'#4338ca', marginBottom:6 }}>
                ~ Keep As Is
              </div>
              <div style={{ fontSize:11, color:'#4338ca', marginBottom:8 }}>
                Will calculate in <strong>{origLabel}</strong> when that shift's data arrives
              </div>
              <div style={{ fontSize:10, color:'#4338ca', background:'#ede9fe', padding:'6px 8px', borderRadius:6 }}>
                📌 Call stays in {origLabel} calculations<br/>
                📌 Excluded from current calculations until that shift<br/>
                📌 Remembered — won't ask again on next upload
              </div>
            </div>
          </div>

          {/* Suppress (rare) */}
          <div style={{ textAlign:'right' }}>
            <button className="btn btn-ghost btn-sm" style={{ fontSize:10, color:'var(--txt3)' }}
              onClick={() => onSuppress(item)}>
              × Suppress (exclude permanently from all calculations)
            </button>
          </div>

          {/* PTT note */}
          {item.connected && item.duration > 1.5 && (
            <div style={{ marginTop:8, fontSize:11, color:'#166534', background:'#f0fdf4', padding:'6px 10px', borderRadius:6 }}>
              ℹ This call qualifies for PTT ({item.duration?.toFixed(2)} min, connected) — will contribute to PTT in whichever shift it's assigned to.
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReconciliationCenter() {
  const { state, approveRecon, suppressRecon, ignoreRecon, notify } = useApp();
  const { reconciliationQueue=[], reconciliationApproved=[], reconCorrections={} } = state;
  const [activeTab, setActiveTab] = useState('queue');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  const handleMoveToPrev = (item) => {
    const target = item.previousShift || item.shiftDate;
    approveRecon(item.sig, item, target, false);
    notify(`✓ ${item.advisor}'s call moved to ${formatShiftDate(target)} — calculations updated`, 'success');
  };

  const handleKeepAsIs = (item) => {
    approveRecon(item.sig, item, item.shiftDate, true);
    notify(`~ ${item.advisor}'s call kept in ${formatShiftDate(item.shiftDate)}`, 'info');
  };

  const handleSuppress = (item) => {
    suppressRecon(item.sig, item);
    notify(`${item.advisor}'s call suppressed — excluded from all calculations`, 'info');
  };

  const handleMoveAll = () => {
    reconciliationQueue.forEach(item => handleMoveToPrev(item));
  };

  const handleKeepAll = () => {
    reconciliationQueue.forEach(item => handleKeepAsIs(item));
  };

  const filteredResolved = useMemo(() => {
    let list = [...reconciliationApproved].reverse();
    if (filter !== 'all') list = list.filter(r => r.status === filter || (filter === 'moved' && r.status === 'moved-to-prev-shift') || (filter === 'kept' && r.status === 'kept-as-is'));
    if (search) list = list.filter(r => r.advisor?.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [reconciliationApproved, filter, search]);

  const stats = {
    pending:    reconciliationQueue.length,
    moved:      reconciliationApproved.filter(r => r.status === 'moved-to-prev-shift').length,
    kept:       reconciliationApproved.filter(r => r.status === 'kept-as-is').length,
    suppressed: reconciliationApproved.filter(r => r.status === 'suppressed').length,
    remembered: Object.keys(reconCorrections).length,
  };

  const STATUS_STYLE = {
    'moved-to-prev-shift': { bg:'#dcfce7', color:'#166534', label:'Moved to Prev Shift' },
    'kept-as-is':          { bg:'#ede9fe', color:'#4338ca', label:'Kept As Is' },
    'suppressed':          { bg:'#f1f5f9', color:'#475569', label:'Suppressed' },
    'ignored':             { bg:'#fef9c3', color:'#854d0e', label:'Ignored' },
    'auto-applied':        { bg:'#dbeafe', color:'#1e40af', label:'Auto-Applied' },
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12 }}>
        {[
          { label:'Pending Review',   value:stats.pending,    accent:'#f97316', bg:'#fff7ed' },
          { label:'Moved to Prev',    value:stats.moved,      accent:'#16a34a', bg:'#f0fdf4' },
          { label:'Kept As Is',       value:stats.kept,       accent:'#6366f1', bg:'#f5f3ff' },
          { label:'Suppressed',       value:stats.suppressed, accent:'#64748b', bg:'#f8fafc' },
          { label:'Remembered',       value:stats.remembered, accent:'#0369a1', bg:'#eff6ff' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ background:s.bg }}>
            <div className="stat-accent" style={{ background:s.accent }}/>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ fontSize:24, color:s.accent }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tab-strip">
        <div className={`tab-pill ${activeTab==='queue'?'active':''}`} onClick={()=>setActiveTab('queue')}>
          🔄 Pending {stats.pending>0&&<span style={{background:'#f97316',color:'white',borderRadius:10,padding:'1px 6px',fontSize:10,marginLeft:6}}>{stats.pending}</span>}
        </div>
        <div className={`tab-pill ${activeTab==='history'?'active':''}`} onClick={()=>setActiveTab('history')}>
          📋 History ({stats.moved + stats.kept + stats.suppressed})
        </div>
        <div className={`tab-pill ${activeTab==='memory'?'active':''}`} onClick={()=>setActiveTab('memory')}>
          🧠 Correction Memory ({stats.remembered})
        </div>
      </div>

      {/* QUEUE TAB */}
      {activeTab === 'queue' && (
        <div>
          {reconciliationQueue.length > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14, padding:'10px 14px',
              background:'#fff7ed', borderRadius:8, border:'1px solid #fdba74' }}>
              <span style={{ fontSize:12, fontWeight:700, color:'#9a3412', flex:1 }}>
                ⚠ {reconciliationQueue.length} future-timestamp call(s) require review
              </span>
              <button className="btn btn-primary btn-sm" onClick={handleMoveAll} style={{ background:'#166534', fontSize:11 }}>
                ✓ Move All to Previous Shift
              </button>
              <button className="btn btn-outline btn-sm" onClick={handleKeepAll} style={{ fontSize:11 }}>
                ~ Keep All As Is
              </button>
            </div>
          )}
          {reconciliationQueue.length === 0 ? (
            <div className="empty-state card">
              <div style={{ fontSize:48 }}>✅</div>
              <h3>No anomalies pending</h3>
              <p>All future-timestamp calls have been resolved. Operational data is stable.</p>
              {stats.remembered > 0 && <p style={{ fontSize:12, color:'var(--brand)' }}>
                {stats.remembered} correction(s) remembered — auto-applied on next upload.
              </p>}
            </div>
          ) : (
            reconciliationQueue.map(item => (
              <AnomalyCard key={item.sig} item={item}
                onMoveToPrev={handleMoveToPrev}
                onKeepAsIs={handleKeepAsIs}
                onSuppress={handleSuppress}
              />
            ))
          )}
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <div className="card" style={{ padding:0 }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
            <input className="search-input" placeholder="Search advisor..." value={search}
              onChange={e=>setSearch(e.target.value)} style={{ width:180 }}/>
            {['all','moved-to-prev-shift','kept-as-is','suppressed'].map(f => (
              <button key={f} className={`btn btn-sm ${filter===f?'btn-primary':'btn-outline'}`}
                onClick={()=>setFilter(f)} style={{ fontSize:10 }}>
                {f==='all'?'All':STATUS_STYLE[f]?.label||f}
              </button>
            ))}
            <span style={{ marginLeft:'auto', fontSize:11, color:'var(--txt3)' }}>{filteredResolved.length} records</span>
          </div>
          <div className="table-wrap" style={{ border:'none', borderRadius:0 }}>
            <table className="data-table">
              <thead><tr>
                <th style={{ textAlign:'left' }}>Advisor</th>
                <th>Date</th><th>Hour</th><th>Duration</th><th>Connected</th>
                <th>Original Shift</th><th>Assigned To</th>
                <th>Status</th><th>By</th><th>Resolved At</th>
              </tr></thead>
              <tbody>
                {filteredResolved.length === 0
                  ? <tr><td colSpan={10} style={{ textAlign:'center', padding:24, color:'var(--txt3)' }}>No records</td></tr>
                  : filteredResolved.map((r,i) => {
                    const sc = STATUS_STYLE[r.status] || { bg:'#f1f5f9', color:'#475569', label:r.status };
                    return (
                      <tr key={i}>
                        <td style={{ textAlign:'left', fontWeight:700 }}>{r.advisor}</td>
                        <td style={{ fontSize:11 }}>{r.date}</td>
                        <td>{r.hour}:00</td>
                        <td>{r.duration?.toFixed(2)}m</td>
                        <td>{r.connected?'✓':'—'}</td>
                        <td style={{ fontSize:11, color:'var(--txt3)' }}>{r.originalShiftDate ? formatShiftDate(r.originalShiftDate) : (r.shiftDate ? formatShiftDate(r.shiftDate) : '—')}</td>
                        <td style={{ fontWeight:700 }}>{r.targetShiftDate ? formatShiftDate(r.targetShiftDate) : '—'}</td>
                        <td><span className="badge" style={{ background:sc.bg, color:sc.color, fontSize:10 }}>{sc.label}</span></td>
                        <td style={{ fontSize:11 }}>{r.modifiedBy||'—'}</td>
                        <td style={{ fontSize:10, color:'var(--txt3)' }}>
                          {r.resolvedAt ? new Date(r.resolvedAt).toLocaleString('en-IN',{dateStyle:'short',timeStyle:'short'}) : '—'}
                        </td>
                      </tr>
                    );
                  })
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MEMORY TAB */}
      {activeTab === 'memory' && (
        <div className="card" style={{ padding:0 }}>
          <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontWeight:700, fontSize:13 }}>🧠 Correction Memory</span>
            <span className="badge badge-blue" style={{ fontSize:10 }}>Auto-applied on future uploads</span>
            <span style={{ marginLeft:'auto', fontSize:11, color:'var(--txt3)' }}>
              {Object.keys(reconCorrections).length} corrections stored permanently
            </span>
          </div>
          {Object.keys(reconCorrections).length === 0 ? (
            <div className="empty-state" style={{ padding:40 }}>
              <div>🧠</div><h3>No corrections stored yet</h3>
              <p>Once you resolve anomalies, they are remembered here and auto-applied on the next upload.</p>
            </div>
          ) : (
            <div className="table-wrap" style={{ border:'none', borderRadius:0 }}>
              <table className="data-table">
                <thead><tr>
                  <th style={{ textAlign:'left' }}>Call Signature</th>
                  <th>Target Shift</th><th>Action</th><th>By</th><th>At</th>
                </tr></thead>
                <tbody>
                  {Object.entries(reconCorrections).map(([sig, c], i) => (
                    <tr key={i}>
                      <td style={{ textAlign:'left', fontSize:10, fontFamily:'monospace', color:'var(--txt3)', maxWidth:250, overflow:'hidden', textOverflow:'ellipsis' }}>{sig}</td>
                      <td style={{ fontWeight:700 }}>{c.targetShift === 'suppressed' || c.targetShift === 'ignored' ? c.targetShift : formatShiftDate(c.targetShift)}</td>
                      <td><span className="badge badge-green" style={{ fontSize:10 }}>Auto-apply</span></td>
                      <td style={{ fontSize:11 }}>{c.correctedBy||'—'}</td>
                      <td style={{ fontSize:10, color:'var(--txt3)' }}>
                        {c.correctedAt ? new Date(c.correctedAt).toLocaleString('en-IN',{dateStyle:'short',timeStyle:'short'}) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
