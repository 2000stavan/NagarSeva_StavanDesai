/** Supported UI languages — Sarvam covers all 22 Indian languages; we expose the most common */
export const LANGS = [
  { code: 'hi', label: 'हिंदी' },
  { code: 'mr', label: 'मराठी' },
  { code: 'en', label: 'English' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'te', label: 'తెలుగు' },
  { code: 'bn', label: 'বাংলা' },
  { code: 'gu', label: 'ગુજરાતી' },
  { code: 'kn', label: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'മലയാളം' },
  { code: 'pa', label: 'ਪੰਜਾਬੀ' },
];

/** Bundled offline translations (instant load before Sarvam cache) */
export const BUNDLED = {
  hi: {
    map: 'नक्शा', feed: 'फ़ीड', report: 'रिपोर्ट', board: 'बोर्ड', profile: 'प्रोफ़ाइल',
    myJobs: 'मेरे काम', active: 'चालू', done: 'पूरा', checkIn: 'चेक इन',
    takePhoto: 'फ़ोटो लें', voiceHelp: 'आवाज़ सहायता', imStuck: 'मैं अटका हूँ',
    sos: 'मदद', submitApproval: 'अनुमोदन के लिए भेजें', stepOf: 'चरण',
    materials: 'सामग्री', login: 'लॉगिन', password: 'पासवर्ड',
    awaitingApproval: 'सुपरवाइज़र की मंज़ूरी का इंतज़ार', noJobs: 'कोई काम नहीं',
    hyperlocalFeed: 'हाइपरलोकल फ़ीड', loading: 'लोड हो रहा है...',
  },
  mr: {
    map: 'नकाशा', feed: 'फीड', report: 'अहवाल', board: 'बोर्ड', profile: 'प्रोफाइल',
    myJobs: 'माझी कामे', active: 'सुरू', done: 'पूर्ण', checkIn: 'चेक इन',
    takePhoto: 'फोटो घ्या', voiceHelp: 'आवाज मदत', imStuck: 'मी अडकलो',
    sos: 'मदत', submitApproval: 'मंजुरीसाठी पाठवा', stepOf: 'पाऊल',
    materials: 'साहित्य', login: 'लॉगिन', password: 'पासवर्ड',
    awaitingApproval: 'मंजुरीची वाट', noJobs: 'काम नाही',
    hyperlocalFeed: 'हायपरलोकल फीड', loading: 'लोड होत आहे...',
  },
};

/** Web Speech / TTS locale hints */
export const SPEECH_LOCALE = {
  hi: 'hi-IN',
  mr: 'mr-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  bn: 'bn-IN',
  gu: 'gu-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  pa: 'pa-IN',
  en: 'en-IN',
};

export function speechLocale(lang) {
  return SPEECH_LOCALE[lang] || 'en-IN';
}
