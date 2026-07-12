import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import AppLayout from '../../components/AppLayout';
import { supabase } from '../../lib/supabase';
import { STATE_TO_FOOD_ZONE } from '../../data/nigeriaData';
import './Nutrition.css';

function calcAge(dob) {
  if (!dob) return '—';
  return Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
}

// Localised Foods Database mapped by Nigerian Food Zones
const FOODS_BY_ZONE = {
  north_central: {
    zone_name: 'Middle Belt / Guinea Savannah',
    staples: [
      { name: 'Acha (Hungry Rice)', desc: 'Low glycemic index whole grain', diabetes: 'good', hypertension: 'good', malnutrition: 'good' },
      { name: 'Local Yam (Doya)', desc: 'Boiled or roasted tubers', diabetes: 'moderate', hypertension: 'good', malnutrition: 'good' },
      { name: 'Sweet Potato', desc: 'Rich in vitamin A and fiber', diabetes: 'moderate', hypertension: 'good', malnutrition: 'good' },
      { name: 'White Garri / Cassava', desc: 'Processed cassava flakes', diabetes: 'bad', hypertension: 'moderate', malnutrition: 'moderate' }
    ],
    proteins: [
      { name: 'Soybeans (Wara-Soya)', desc: 'High quality plant protein source', diabetes: 'good', hypertension: 'good', malnutrition: 'good' },
      { name: 'Cowpeas / Beans', desc: 'Staple legume high in fiber', diabetes: 'good', hypertension: 'good', malnutrition: 'good' },
      { name: 'Local Beef (Nama)', desc: 'Grassfed lean protein', diabetes: 'good', hypertension: 'moderate', malnutrition: 'good' }
    ],
    greens: [
      { name: 'Garden Egg (Gauta)', desc: 'High fiber, cardioprotective', diabetes: 'good', hypertension: 'good', malnutrition: 'moderate' },
      { name: 'Efo Shoko (Local Spinach)', desc: 'Iron and folate rich vegetable', diabetes: 'good', hypertension: 'good', malnutrition: 'good' },
      { name: 'Zobo Leaf (Sorrel)', desc: 'Unsweetened infusion lowers BP', diabetes: 'good', hypertension: 'good', malnutrition: 'moderate' }
    ]
  },
  north_west: {
    zone_name: 'Sudano-Sahelian North',
    staples: [
      { name: 'Millet (Gero)', desc: 'Fiber-rich grain used in Tuwo', diabetes: 'good', hypertension: 'good', malnutrition: 'good' },
      { name: 'Sorghum (Dawa)', desc: 'Antioxidant-rich whole grain', diabetes: 'good', hypertension: 'good', malnutrition: 'good' },
      { name: 'Tuwo Shinkafa', desc: 'Soft rice pudding staple', diabetes: 'bad', hypertension: 'moderate', malnutrition: 'good' },
      { name: 'Maize (Masara)', desc: 'Fine whole grain flour', diabetes: 'moderate', hypertension: 'good', malnutrition: 'good' }
    ],
    proteins: [
      { name: 'Groundnut Paste', desc: 'Calorie dense, healthy lipids', diabetes: 'good', hypertension: 'good', malnutrition: 'good' },
      { name: 'Cowpeas (Wake)', desc: 'Standard local legume', diabetes: 'good', hypertension: 'good', malnutrition: 'good' },
      { name: 'Kuli Kuli', desc: 'Pressed peanut protein cake', diabetes: 'good', hypertension: 'moderate', malnutrition: 'good' }
    ],
    greens: [
      { name: 'Zogale (Moringa leaves)', desc: 'High micronutrient density', diabetes: 'good', hypertension: 'good', malnutrition: 'good' },
      { name: 'Taushe (Pumpkin leaves)', desc: 'Beta-carotene rich leaves', diabetes: 'good', hypertension: 'good', malnutrition: 'good' },
      { name: 'Yakuwa leaves', desc: 'Sour sorrel leaves used in soup', diabetes: 'good', hypertension: 'good', malnutrition: 'moderate' }
    ]
  },
  south_west: {
    zone_name: 'Yoruba Rainforest Belt',
    staples: [
      { name: 'Amala (Elubo)', desc: 'Yam peel flour, low glycemic index', diabetes: 'good', hypertension: 'good', malnutrition: 'good' },
      { name: 'Plantain Flour', desc: 'Unripe plantain whole meal', diabetes: 'good', hypertension: 'good', malnutrition: 'good' },
      { name: 'White Garri / Eba', desc: 'Processed cassava meal', diabetes: 'bad', hypertension: 'moderate', malnutrition: 'moderate' },
      { name: 'Cocoyam (Koko)', desc: 'Digestible local tuber', diabetes: 'moderate', hypertension: 'good', malnutrition: 'good' }
    ],
    proteins: [
      { name: 'Brown Beans (Ewa)', desc: 'High fiber, protein staple', diabetes: 'good', hypertension: 'good', malnutrition: 'good' },
      { name: 'Local Smoked Fish', desc: 'Rich in omega-3 healthy fats', diabetes: 'good', hypertension: 'good', malnutrition: 'good' },
      { name: 'Snail (Ibinu)', desc: 'Low fat, iron-rich protein', diabetes: 'good', hypertension: 'good', malnutrition: 'good' }
    ],
    greens: [
      { name: 'Ewedu leaves', desc: 'Mucilaginous leaves, gut-healthy', diabetes: 'good', hypertension: 'good', malnutrition: 'good' },
      { name: 'Gbure (Waterleaf)', desc: 'High hydration, micronutrients', diabetes: 'good', hypertension: 'good', malnutrition: 'good' },
      { name: 'Efo Tete (Green Spinach)', desc: 'Calcium and iron booster', diabetes: 'good', hypertension: 'good', malnutrition: 'good' }
    ]
  },
  south_east: {
    zone_name: 'Forest and Delta Belt',
    staples: [
      { name: 'Plantain (Unripe)', desc: 'Rich in potassium and starch resistance', diabetes: 'good', hypertension: 'good', malnutrition: 'good' },
      { name: 'Ji (Local Yam)', desc: 'Boiled tuber carbohydrate', diabetes: 'moderate', hypertension: 'good', malnutrition: 'good' },
      { name: 'Akpu (Loi-loi)', desc: 'Fermented dense cassava paste', diabetes: 'bad', hypertension: 'moderate', malnutrition: 'moderate' }
    ],
    proteins: [
      { name: 'Crayfish Powder', desc: 'Highly bioavailable microprotein', diabetes: 'good', hypertension: 'good', malnutrition: 'good' },
      { name: 'Akidi (Local Black Beans)', desc: 'Ancient native high fiber bean', diabetes: 'good', hypertension: 'good', malnutrition: 'good' },
      { name: 'Stockfish (Okporoko)', desc: 'Lean dehydrated source of protein', diabetes: 'good', hypertension: 'moderate', malnutrition: 'good' }
    ],
    greens: [
      { name: 'Ugu (Pumpkin leaves)', desc: 'Blood building folates and iron', diabetes: 'good', hypertension: 'good', malnutrition: 'good' },
      { name: 'Utazi leaves', desc: 'Bitter herb, glycemic regulator', diabetes: 'good', hypertension: 'good', malnutrition: 'moderate' },
      { name: 'Uziza leaves', desc: 'Spicy digestive tonic leaves', diabetes: 'good', hypertension: 'good', malnutrition: 'moderate' }
    ]
  }
};

// Map default fallback for undefined zones
FOODS_BY_ZONE.north_east = FOODS_BY_ZONE.north_west;
FOODS_BY_ZONE.south_south = FOODS_BY_ZONE.south_east;

export default function Nutrition() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const patientId = searchParams.get('patient');
  const consultationId = searchParams.get('consultation');

  const [patient, setPatient] = useState(null);
  const [consultation, setConsultation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMealPlan, setSelectedMealPlan] = useState({ staple: '', protein: '', green: '' });
  const [success, setSuccess] = useState('');

  // Initialise dummy details if database record not loaded
  const [condition, setCondition] = useState('Malaria');

  useEffect(() => {
    async function loadData() {
      if (!patientId) { setLoading(false); return; }
      try {
        const { data: p } = await supabase.from('patients').select('*').eq('id', patientId).maybeSingle();
        setPatient(p);

        if (consultationId) {
          const { data: c } = await supabase.from('consultations').select('*').eq('id', consultationId).maybeSingle();
          setConsultation(c);

          // Deduce condition from diagnosis or complaint
          if (c?.chew_provisional_diagnosis) {
            setCondition(c.chew_provisional_diagnosis);
          } else if (c?.ai_diagnosis_suggestion?.differentials?.[0]?.condition) {
            setCondition(c.ai_diagnosis_suggestion.differentials[0].condition);
          } else if (c?.chief_complaint) {
            setCondition(c.chief_complaint);
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [patientId, consultationId]);

  // Determine localized food zone
  const pAge = calcAge(patient?.date_of_birth);
  const stateVal = patient?.state || 'Plateau';
  const lgaVal = patient?.lga || 'Langtang North';
  const foodZoneKey = STATE_TO_FOOD_ZONE[stateVal] || 'north_central';
  const zoneDetails = FOODS_BY_ZONE[foodZoneKey] || FOODS_BY_ZONE.north_central;

  // Determine recommendation badge class and symbol
  const getRatingInfo = (foodItem) => {
    const conditionLower = condition.toLowerCase();
    
    let rating = 'good';
    if (conditionLower.includes('diabet') || conditionLower.includes('sugar')) {
      rating = foodItem.diabetes;
    } else if (conditionLower.includes('hyper') || conditionLower.includes('tension') || conditionLower.includes('bp') || conditionLower.includes('pressure')) {
      rating = foodItem.hypertension;
    } else if (conditionLower.includes('nutrition') || conditionLower.includes('kwash') || conditionLower.includes('weight')) {
      rating = foodItem.malnutrition;
    }

    if (rating === 'good') return { cls: 'good', text: 'Highly Recommended', symbol: '✅' };
    if (rating === 'bad') return { cls: 'bad', text: 'Avoid / Limit Intake', symbol: '❌' };
    return { cls: 'moderate', text: 'Consume Moderately', symbol: '⚠️' };
  };

  const handlePrintMeal = () => {
    if (!selectedMealPlan.staple || !selectedMealPlan.protein || !selectedMealPlan.green) {
      alert('Please select one staple, one protein, and one local green to build the meal plan.');
      return;
    }
    // Triggers actual browser print dialog
    window.print();
  };

  return (
    <AppLayout showBack backTo="/chew/dashboard" title="Localized Nutrition Advice">
      <div className="nutrition-container">
        
        {/* Header Profile */}
        <div className="nutrition-profile-card card">
          <div className="profile-banner-top">
            <div>
              <span className="profile-eyebrow">Culturally Tailored Dietary Care</span>
              <h1 className="p-title-name">{patient?.full_name || 'Demo Patient'}</h1>
              <p className="p-zone-lbl">
                📍 {lgaVal} LGA, {stateVal} State · Zone: <strong>{zoneDetails.zone_name}</strong>
              </p>
            </div>
            <div className="condition-pill-box">
              <span className="condition-lbl">Patient Condition:</span>
              <span className="condition-val">{condition}</span>
            </div>
          </div>
        </div>

        {success && (
          <div className="alert-success-banner" style={{ background: '#ECFDF5', border: '1px solid #10B981', color: '#065F46', padding: 16, borderRadius: 12, marginBottom: 20, fontWeight: 600 }}>
            {success}
          </div>
        )}

        {/* NUTRITION DIRECTIVE SECTION */}
        <div className="nutrition-grid-split">
          
          {/* Local Foods Selection */}
          <div className="foods-selection-panel">
            
            {/* STAPLES */}
            <div className="card food-section-card">
              <h2 className="food-panel-title">🌾 Staple Carbohydrates ({stateVal} Region)</h2>
              <div className="foods-list-vertical">
                {zoneDetails.staples.map(f => {
                  const rating = getRatingInfo(f);
                  return (
                    <div key={f.name} className={`food-row-item ${rating.cls} ${selectedMealPlan.staple === f.name ? 'selected' : ''}`} onClick={() => setSelectedMealPlan({ ...selectedMealPlan, staple: f.name })}>
                      <div className="food-main-info">
                        <span className="food-name-bold">{f.name}</span>
                        <span className="food-desc-text">{f.desc}</span>
                      </div>
                      <div className="food-recommendation-tag">
                        <span className="rec-text">{rating.text}</span>
                        <span className="rec-symbol">{rating.symbol}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PROTEINS */}
            <div className="card food-section-card">
              <h2 className="food-panel-title">🥩 Proteins & Legumes</h2>
              <div className="foods-list-vertical">
                {zoneDetails.proteins.map(f => {
                  const rating = getRatingInfo(f);
                  return (
                    <div key={f.name} className={`food-row-item ${rating.cls} ${selectedMealPlan.protein === f.name ? 'selected' : ''}`} onClick={() => setSelectedMealPlan({ ...selectedMealPlan, protein: f.name })}>
                      <div className="food-main-info">
                        <span className="food-name-bold">{f.name}</span>
                        <span className="food-desc-text">{f.desc}</span>
                      </div>
                      <div className="food-recommendation-tag">
                        <span className="rec-text">{rating.text}</span>
                        <span className="rec-symbol">{rating.symbol}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* GREENS */}
            <div className="card food-section-card">
              <h2 className="food-panel-title">🥬 Local Herbs & Vegetables</h2>
              <div className="foods-list-vertical">
                {zoneDetails.greens.map(f => {
                  const rating = getRatingInfo(f);
                  return (
                    <div key={f.name} className={`food-row-item ${rating.cls} ${selectedMealPlan.green === f.name ? 'selected' : ''}`} onClick={() => setSelectedMealPlan({ ...selectedMealPlan, green: f.name })}>
                      <div className="food-main-info">
                        <span className="food-name-bold">{f.name}</span>
                        <span className="food-desc-text">{f.desc}</span>
                      </div>
                      <div className="food-recommendation-tag">
                        <span className="rec-text">{rating.text}</span>
                        <span className="rec-symbol">{rating.symbol}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Interactive Diet Builder */}
          <div className="nutrition-aside-card">
            
            <div className="card diet-builder-card">
              <h2 className="food-panel-title">🍽️ Dietary Meal Plan Card</h2>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>
                Select local staple options on the left to customize a dietary blueprint tailored to the patient's condition.
              </p>

              <div className="diet-preview-sheet">
                <div className="diet-sheet-row">
                  <span className="sheet-label">Staple Carbohydrate</span>
                  <span className="sheet-value">{selectedMealPlan.staple || 'Select a staple...'}</span>
                </div>
                <div className="diet-sheet-row">
                  <span className="sheet-label">Protein / Legume</span>
                  <span className="sheet-value">{selectedMealPlan.protein || 'Select protein...'}</span>
                </div>
                <div className="diet-sheet-row">
                  <span className="sheet-label">Vegetable / Herb</span>
                  <span className="sheet-value">{selectedMealPlan.green || 'Select greens...'}</span>
                </div>
              </div>

              <button className="btn-primary" style={{ width: '100%', marginTop: 20 }} onClick={handlePrintMeal}>
                🖨️ Print Patient Meal Plan
              </button>
            </div>

            <div className="card instructions-card">
              <h2 className="food-panel-title">📋 Generic Eating Rules</h2>
              <ul className="eating-rules-list">
                <li>Minimize salt intake, completely avoiding local salted fish (e.g. stockfish) for hypertensive patients.</li>
                <li>Avoid white flour bread and high starch white eba for patients managing blood sugar.</li>
                <li>Incorporate moringa leaves (zogale) or bitterleaf tea into the daily diet as a tonic.</li>
                <li>Encourage plenty of clean, safe boiled drinking water.</li>
              </ul>
            </div>

          </div>

        </div>

        {/* ── Print-only sheet container ── */}
        <div className="print-only-card" style={{ display: 'none' }}>
          <div className="print-sheet-header" style={{ borderBottom: '2px solid #000', paddingBottom: '12px', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 4px', color: '#1B4F8A' }}>ClinIQ Nigeria</h2>
            <span style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', color: '#64748B' }}>
              🏥 Localised Dietary Prescription
            </span>
          </div>

          <div className="print-patient-meta" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px', fontSize: '13px' }}>
            <div>
              <strong>Patient Name:</strong> {patient?.full_name || 'Demo Patient'}<br />
              <strong>Sex / Age:</strong> {patient?.sex === 'M' ? 'Male' : 'Female'} · {pAge} yrs<br />
              <strong>Hospital Number:</strong> {patient?.hospital_number || '—'}
            </div>
            <div>
              <strong>Facility:</strong> {patient?.phc || 'Langtang North PHC'}<br />
              <strong>Location:</strong> {lgaVal} LGA, {stateVal} State<br />
              <strong>Clinical Indication:</strong> <span style={{ color: '#DC2626', fontWeight: 'bold' }}>{condition}</span>
            </div>
          </div>

          <div className="print-meal-guidelines" style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', marginBottom: '20px', backgroundColor: '#F8FAFC' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', margin: '0 0 12px', borderBottom: '1px solid #E2E8F0', paddingBottom: '6px' }}>
              🍽️ Recommended Meal Plan ({zoneDetails.zone_name})
            </h3>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', lineHeight: '1.8' }}>
              <li><strong>Staple Carbohydrate:</strong> {selectedMealPlan.staple || 'Not selected'}</li>
              <li><strong>Protein / Legumes:</strong> {selectedMealPlan.protein || 'Not selected'}</li>
              <li><strong>Local Herbs & Greens:</strong> {selectedMealPlan.green || 'Not selected'}</li>
            </ul>
          </div>

          <div className="print-instructions-block" style={{ border: '1px solid #E2E8F0', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', margin: '0 0 10px' }}>📋 General Clinical Rules</h3>
            <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', lineHeight: '1.6', color: '#4A5568' }}>
              <li>Ensure fresh ingredients are sourced locally to guarantee micronutrient density.</li>
              <li>Limit use of high-sodium additives (bouillon cubes, table salt) for cardiovascular health.</li>
              <li>Avoid high glycemic carbohydrates (Akpu, Garri) if managing blood sugar; prioritize Acha or unripe plantains.</li>
            </ul>
          </div>

          <div className="print-sheet-footer" style={{ borderTop: '1px solid #E2E8F0', paddingTop: '10px', textAlign: 'center', fontSize: '10px', color: '#A0AEC0' }}>
            Generated on {new Date().toLocaleDateString('en-NG')} via ClinIQ Nigeria Clinical Support Module.
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
