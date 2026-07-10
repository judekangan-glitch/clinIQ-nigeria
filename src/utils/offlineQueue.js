import { supabase } from '../lib/supabase';
import { geminiVision } from '../lib/gemini';

const OFFLINE_CONSULT_KEY = 'cliniq_offline_consultations';
const OFFLINE_PHOTOS_KEY = 'cliniq_offline_photos';

// Save a consultation record offline
export function saveConsultationOffline(consultationData) {
  const queue = JSON.parse(localStorage.getItem(OFFLINE_CONSULT_KEY) || '[]');
  const tempId = 'temp-' + Date.now();
  const item = {
    ...consultationData,
    id: tempId,
    synced: false,
    created_at: new Date().toISOString()
  };
  queue.push(item);
  localStorage.setItem(OFFLINE_CONSULT_KEY, JSON.stringify(queue));
  return item;
}

// Save a captured photo offline for later OCR processing
export function savePhotoOffline(patientId, base64Data) {
  const queue = JSON.parse(localStorage.getItem(OFFLINE_PHOTOS_KEY) || '[]');
  queue.push({
    patientId,
    photo: base64Data,
    timestamp: Date.now()
  });
  localStorage.setItem(OFFLINE_PHOTOS_KEY, JSON.stringify(queue));
}

// Sync queued offline items to Supabase
export async function syncOfflineData() {
  if (!navigator.onLine) return;

  // Sync Consultations
  const consultations = JSON.parse(localStorage.getItem(OFFLINE_CONSULT_KEY) || '[]');
  if (consultations.length > 0) {
    const remaining = [];
    for (const item of consultations) {
      try {
        const { id, ...cleanItem } = item; // strip tempId
        cleanItem.synced = true;
        
        await supabase
          .from('consultations')
          .insert([cleanItem]);
      } catch (err) {
        console.error('Failed to sync consultation:', err);
        remaining.push(item);
      }
    }
    localStorage.setItem(OFFLINE_CONSULT_KEY, JSON.stringify(remaining));
  }

  // Sync / Process offline OCR photos
  const photos = JSON.parse(localStorage.getItem(OFFLINE_PHOTOS_KEY) || '[]');
  if (photos.length > 0) {
    const remainingPhotos = [];
    for (const item of photos) {
      try {
        // Run Gemini Vision OCR
        const ocrPrompt = `You are a medical note reader trained on Nigerian PHC consultation formats. Read the handwritten clinical note in this image carefully. Extract all clinical information and return it as a JSON object with exactly these fields: chief_complaint (string describing the main complaint), duration_days (integer number of days or null if not mentioned), associated_symptoms (array of strings listing all other symptoms mentioned), temperature (string with value and unit or null), blood_pressure (string in format systolic/diastolic or null), pulse_rate (string with value or null), respiratory_rate (string with value or null), weight (string with value and unit or null), provisional_diagnosis (string or null), investigations_ordered (array of strings or empty array), drugs_prescribed (string listing all drugs with doses or null). Handle these Nigerian PHC abbreviations: c/o means complaint of, H/O means history of, O/E means on examination, Imp means impression or provisional diagnosis, Inv means investigations, Rx means prescription or drugs. Return only the JSON object with no other text no explanation and no markdown formatting.`;
        const ocrResultText = await geminiVision(item.photo, 'image/jpeg', ocrPrompt);
        const cleanJson = ocrResultText.replace(/```json|```/g, '').trim();
        const data = JSON.parse(cleanJson);

        // Map and insert a new consultation record automatically
        const consultData = {
          patient_id: item.patientId,
          consultation_date: new Date(item.timestamp).toISOString().slice(0, 10),
          chief_complaint: data.chief_complaint || 'Handwritten note upload',
          duration_days: data.duration_days || 1,
          associated_symptoms: data.associated_symptoms || [],
          temperature: data.temperature || '',
          blood_pressure: data.blood_pressure || '',
          pulse_rate: data.pulse_rate || '',
          respiratory_rate: data.respiratory_rate || '',
          weight: data.weight || '',
          chew_provisional_diagnosis: data.provisional_diagnosis || '',
          drugs_prescribed: data.drugs_prescribed || '',
          synced: true,
          is_retrospective: true
        };

        await supabase.from('consultations').insert([consultData]);
      } catch (err) {
        console.error('Failed to process offline photo OCR:', err);
        remainingPhotos.push(item);
      }
    }
    localStorage.setItem(OFFLINE_PHOTOS_KEY, JSON.stringify(remainingPhotos));
  }
}

// Auto-register network state listener for automatic syncing
if (typeof window !== 'undefined') {
  window.addEventListener('online', syncOfflineData);
}
