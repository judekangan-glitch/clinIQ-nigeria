import { useState } from 'react';
import AppLayout from '../../components/AppLayout';
import './LgaPages.css';

export default function DiseaseTrends() {
  const [selectedDisease, setSelectedDisease] = useState('Malaria');

  const trendData = {
    Malaria: [
      { month: 'Jan', count: 120, baseline: 90 },
      { month: 'Feb', count: 140, baseline: 95 },
      { month: 'Mar', count: 110, baseline: 100 },
      { month: 'Apr', count: 180, baseline: 105 },
      { month: 'May', count: 240, baseline: 110 },
      { month: 'Jun', count: 310, baseline: 115 }
    ],
    Cholera: [
      { month: 'Jan', count: 0, baseline: 2 },
      { month: 'Feb', count: 0, baseline: 2 },
      { month: 'Mar', count: 1, baseline: 2 },
      { month: 'Apr', count: 8, baseline: 3 },
      { month: 'May', count: 12, baseline: 3 },
      { month: 'Jun', count: 24, baseline: 4 }
    ],
    Measles: [
      { month: 'Jan', count: 5, baseline: 8 },
      { month: 'Feb', count: 12, baseline: 7 },
      { month: 'Mar', count: 9, baseline: 6 },
      { month: 'Apr', count: 4, baseline: 5 },
      { month: 'May', count: 8, baseline: 5 },
      { month: 'Jun', count: 16, baseline: 4 }
    ]
  };

  const currentData = trendData[selectedDisease];

  return (
    <AppLayout title="Disease Trends">
      <div className="lga-page-container">
        
        <div className="lga-page-header">
          <div>
            <h1 className="lga-page-title">📈 Disease Incidence & Analytical Trends</h1>
            <p className="lga-page-sub">Analyze longitudinal trends compared to historical epidemic baseline thresholds.</p>
          </div>
          
          <div className="disease-select-wrap">
            {['Malaria', 'Cholera', 'Measles'].map(d => (
              <button
                key={d}
                className={`tab-btn ${selectedDisease === d ? 'active' : ''}`}
                onClick={() => setSelectedDisease(d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="lga-double-grid">
          
          {/* Chart Display */}
          <div className="card">
            <h2 className="panel-title-lg">{selectedDisease} Progression (H1 2026)</h2>
            <div className="trend-chart-box">
              {/* Render dynamic graphic representation using custom styled bar-chart widgets */}
              <div className="chart-bar-wrapper">
                {currentData.map((d, i) => {
                  const maxVal = Math.max(...currentData.map(v => Math.max(v.count, v.baseline)));
                  const pctCount = maxVal > 0 ? (d.count / maxVal) * 100 : 0;
                  const pctBase = maxVal > 0 ? (d.baseline / maxVal) * 100 : 0;

                  return (
                    <div key={i} className="chart-column">
                      <div className="bars-aligner">
                        <div className="bar-fill count" style={{ height: `${pctCount}%` }} title={`Incidence: ${d.count}`}>
                          {d.count > 0 && <span className="bar-val-lbl">{d.count}</span>}
                        </div>
                        <div className="bar-fill baseline" style={{ height: `${pctBase}%` }} title={`Baseline: ${d.baseline}`}>
                          <span className="bar-val-lbl base">{d.baseline}</span>
                        </div>
                      </div>
                      <span className="col-lbl-month">{d.month}</span>
                    </div>
                  );
                })}
              </div>

              <div className="chart-legend-box">
                <span className="legend-marker count"></span> Active Recorded Cases
                <span className="legend-marker baseline"></span> Epidemic Threshold Baseline
              </div>
            </div>
          </div>

          {/* Epidemiological Summary */}
          <div className="card">
            <h2 className="panel-title-lg">Epidemiological Insights</h2>
            
            <div className="insights-vertical-stack">
              <div className="insight-card-item">
                <h3>Analysis Verdict</h3>
                <p>
                  {selectedDisease === 'Malaria' && 'Malaria case volume has increased dramatically in May/Jun. This is highly correlated with the onset of the seasonal rains and wet standing water pools.'}
                  {selectedDisease === 'Cholera' && 'CRITICAL alert: Cholera threshold baseline is exceeded by over 500% in June. This requires immediate sanitary audit and water station chlorination in Langtang North.'}
                  {selectedDisease === 'Measles' && 'Measles incidence is showing a spike in late June. Focus on paediatric immunisation catch-up cycles is strongly advised.'}
                </p>
              </div>

              <div className="insight-card-item highlight">
                <h3>Recommended Action Plan</h3>
                <ul>
                  {selectedDisease === 'Malaria' && (
                    <>
                      <li>Deploy LLIN (Insecticide Treated Nets) distribution drive.</li>
                      <li>Distribute artemether-lumefantrine treatment units to low accuracy PHCs.</li>
                    </>
                  )}
                  {selectedDisease === 'Cholera' && (
                    <>
                      <li>Declare cholera risk alert and establish local ORS zones.</li>
                      <li>Deploy water sanitisation and purification units to high-density areas.</li>
                    </>
                  )}
                  {selectedDisease === 'Measles' && (
                    <>
                      <li>Initiate local community awareness drives for MMR vaccination.</li>
                      <li>Verify vaccine refrigerator temperatures in Dengi PHC.</li>
                    </>
                  )}
                </ul>
              </div>
            </div>
          </div>

        </div>

      </div>
    </AppLayout>
  );
}
