import { useState, useEffect } from 'react';
import AppLayout from '../../components/AppLayout';
import { supabase } from '../../lib/supabase';
import './LgaPages.css';

const INITIAL_SUPPLIES = [
  { id: '1', item: 'Malaria RDT Kits', category: 'Diagnostics', stock: 45, unit: 'Boxes', status: 'critical', details: 'Critical deficit at Langtang North PHC due to sudden surge.' },
  { id: '2', item: 'Oral Rehydration Salts (ORS)', category: 'Therapeutics', stock: 120, unit: 'Sachets', status: 'warning', details: 'Low stock at Dengi PHC. Outbreak buffer protocol recommended.' },
  { id: '3', item: 'ACT (Artemether-Lumefantrine)', category: 'Antimalarials', stock: 800, unit: 'Tablets', status: 'good', details: 'Adequate stock levels across all zones.' },
  { id: '4', item: 'Pentavalent Vaccine', category: 'Immunisation', stock: 10, unit: 'Vials', status: 'critical', details: 'Stockout risk at Mangu PHC. Distribution delivery delayed.' },
  { id: '5', item: 'Amoxicillin 250mg Dispersible', category: 'Antibiotics', stock: 350, unit: 'Blisters', status: 'good', details: 'Optimal inventory level for paediatric respiratory care.' },
];

export default function SupplyAlerts() {
  const [supplies, setSupplies] = useState(() => {
    try {
      const saved = localStorage.getItem('cliniq_supply_inventory');
      return saved ? JSON.parse(saved) : INITIAL_SUPPLIES;
    } catch {
      return INITIAL_SUPPLIES;
    }
  });

  const [simulating, setSimulating] = useState(false);
  const [success, setSuccess] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState({ item: '', category: 'Therapeutics', stock: '', unit: 'Units', details: '' });

  useEffect(() => {
    localStorage.setItem('cliniq_supply_inventory', JSON.stringify(supplies));
  }, [supplies]);

  const calcStatus = (count) => {
    if (count <= 50) return 'critical';
    if (count <= 200) return 'warning';
    return 'good';
  };

  const handleSimulateRestock = () => {
    setSimulating(true);
    setTimeout(() => {
      setSimulating(false);
      setSupplies(prev => prev.map(s => {
        if (s.status === 'critical' || s.status === 'warning') {
          const newStock = s.stock + 200;
          return { ...s, stock: newStock, status: calcStatus(newStock), details: 'Supplies replenished from Central Depot.' };
        }
        return s;
      }));
      setSuccess('📦 Stock transfer order dispatched! Replenishment delivery estimated in 24 hours.');
      setTimeout(() => setSuccess(''), 4000);
    }, 1200);
  };

  const handleAdjustStock = (id, delta) => {
    setSupplies(prev => prev.map(s => {
      if (s.id === id) {
        const nextStock = Math.max(0, s.stock + delta);
        return {
          ...s,
          stock: nextStock,
          status: calcStatus(nextStock),
          details: nextStock <= 50 ? 'Critical inventory deficit flagged.' : 'Stock level updated.'
        };
      }
      return s;
    }));
  };

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItem.item.trim()) return;

    const count = parseInt(newItem.stock, 10) || 0;
    const added = {
      id: String(Date.now()),
      item: newItem.item.trim(),
      category: newItem.category,
      stock: count,
      unit: newItem.unit,
      status: calcStatus(count),
      details: newItem.details.trim() || 'Newly cataloged item in LGA inventory.'
    };

    setSupplies(prev => [added, ...prev]);
    setNewItem({ item: '', category: 'Therapeutics', stock: '', unit: 'Units', details: '' });
    setShowAddForm(false);
    setSuccess('✅ Inventory item cataloged successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  return (
    <AppLayout title="Supply Alerts">
      <div className="lga-page-container">
        
        <div className="lga-page-header">
          <div>
            <h1 className="lga-page-title">📦 Drug & Vaccine Supply Management</h1>
            <p className="lga-page-sub">Track real-time inventory levels, deficits, and coordinate restocking transfers.</p>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-secondary" onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? '✕ Close Form' : '➕ Catalog New Item'}
            </button>
            <button className="btn-primary" onClick={handleSimulateRestock} disabled={simulating}>
              {simulating ? 'Processing...' : '⚡ Order Stock Replenishment'}
            </button>
          </div>
        </div>

        {success && (
          <div className="alert-success-banner" style={{ background: '#ECFDF5', border: '1px solid #10B981', color: '#065F46', padding: 14, borderRadius: 10, marginBottom: 20, fontWeight: 600 }}>
            {success}
          </div>
        )}

        {showAddForm && (
          <div className="card" style={{ marginBottom: 20, border: '2px solid var(--color-primary)' }}>
            <h2 className="panel-title-lg">Catalog New Supply Item</h2>
            <form onSubmit={handleAddItem} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div className="form-field">
                <label className="field-label">Item Name *</label>
                <input type="text" className="form-input" placeholder="e.g. Oxytocin 10IU" value={newItem.item} onChange={e => setNewItem({ ...newItem, item: e.target.value })} required />
              </div>
              <div className="form-field">
                <label className="field-label">Category</label>
                <select className="form-select" value={newItem.category} onChange={e => setNewItem({ ...newItem, category: e.target.value })}>
                  <option value="Diagnostics">Diagnostics</option>
                  <option value="Therapeutics">Therapeutics</option>
                  <option value="Antimalarials">Antimalarials</option>
                  <option value="Immunisation">Immunisation</option>
                  <option value="Antibiotics">Antibiotics</option>
                </select>
              </div>
              <div className="form-field">
                <label className="field-label">Current Quantity</label>
                <input type="number" min="0" className="form-input" placeholder="0" value={newItem.stock} onChange={e => setNewItem({ ...newItem, stock: e.target.value })} />
              </div>
              <div className="form-field">
                <label className="field-label">Unit of Measure</label>
                <input type="text" className="form-input" placeholder="e.g. Ampoules, Boxes" value={newItem.unit} onChange={e => setNewItem({ ...newItem, unit: e.target.value })} />
              </div>
              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <label className="field-label">Notes / Distribution Details</label>
                <input type="text" className="form-input" placeholder="Target PHC or buffer note" value={newItem.details} onChange={e => setNewItem({ ...newItem, details: e.target.value })} />
              </div>
              <div style={{ gridColumn: '1 / -1', marginTop: 4 }}>
                <button type="submit" className="btn-primary" style={{ width: '100%' }}>Save Inventory Item</button>
              </div>
            </form>
          </div>
        )}

        <div className="lga-double-grid">
          
          {/* Inventory status grid list */}
          <div className="card">
            <h2 className="panel-title-lg">Sentinel Supply Tracker ({supplies.length} Items)</h2>
            <div className="supplies-stacked-list">
              {supplies.map((s) => (
                <div key={s.id} className={`supply-status-card ${s.status}`}>
                  <div className="supply-card-top">
                    <div>
                      <span className="supply-item-title">{s.item}</span>
                      <span className="supply-cat-lbl">{s.category}</span>
                    </div>
                    <span className={`status-badge-pill ${s.status}`}>{s.status.toUpperCase()}</span>
                  </div>
                  <p className="supply-details-text">{s.details}</p>
                  <div className="supply-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Current Stock: <strong>{s.stock} {s.unit}</strong></span>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <button className="btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleAdjustStock(s.id, -10)}>
                        -10
                      </button>
                      <button className="btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: 12 }} onClick={() => handleAdjustStock(s.id, +50)}>
                        +50
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Supply forecast summary widget */}
          <div className="lga-aside">
            <div className="card">
              <h2 className="panel-title-lg">Supply Forecast</h2>
              <div className="forecast-stat-box">
                <span className="forecast-metric">48 Hours</span>
                <span className="forecast-lbl">Average response time for depot order fulfilment</span>
              </div>
              <div className="forecast-details">
                <p><strong>DEPOT RUN SCHEDULE:</strong> Tuesday & Thursday mornings.</p>
                <p><strong>ALERT THRESHOLD:</strong> Sentinel triggers are activated when facility stock levels fall below 3 days of average daily consumption (ADC).</p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </AppLayout>
  );
}

