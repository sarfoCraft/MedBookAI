/* MedBook AI v2.7.2 — clinic workspace, appointment lifecycle, DOS and billing safeguards. Synthetic demo data only. */
(() => {
'use strict';
const AppointmentDomain=window.MedBookAppointmentDomain;
let today=new Date();today.setHours(12,0,0,0);
const addDays=(n)=>{const d=new Date(today);d.setDate(d.getDate()+n);return d};
const iso=(d)=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
const fmt=(d,opt={month:'short',day:'numeric',year:'numeric'})=>new Intl.DateTimeFormat('en-US',opt).format(d instanceof Date?d:new Date(d+'T12:00:00'));
let dateNow=iso(today);
const MODIFIER_BY_SPECIALTY=Object.freeze({
 pt:{code:'GP',label:'GP — Physical Therapy'},
 chiro:{code:'AT',label:'AT — Chiropractic (active treatment only)'}
});

const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clamp=(a,min,max)=>Math.max(min,Math.min(max,a));
const baseIcon={
 grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
 users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
 clipboard:'<rect x="6" y="4" width="14" height="17" rx="2"/><rect x="9" y="2" width="8" height="5" rx="1"/><path d="M10 12h6m-6 4h5"/>',
 activity:'<path d="M2 12h4l3-8 5 16 3-8h5"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 'check-circle':'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
 chevron:'<path d="m9 18 6-6-6-6"/>',down:'<path d="m6 9 6 6 6-6"/>',
 arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
 search:'<circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/>',
 bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
 plus:'<path d="M12 4v16M4 12h16"/>',
 filter:'<path d="M4 7h16M7 12h10M10 17h4"/>',
 gift:'<rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8v13M3 12h18M12 8H7a3 3 0 1 1 3-3c0 2 2 3 2 3Zm0 0h5a3 3 0 1 0-3-3c0 2-2 3-2 3Z"/>',
 globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
 chart:'<path d="M4 20V10m5 10V5m5 15v-8m5 8V8"/>',
 settings:'<path d="M12 8a4 4 0 1 0 0 8 4 4 0 1 0 0-8Z"/><path d="M10 2h4l1 3 2 1 3-1 2 4-2 2v2l2 2-2 4-3-1-2 1-1 3h-4l-1-3-2-1-3 1-2-4 2-2v-2L2 9l2-4 3 1 2-1z"/>',
 shield:'<path d="M12 2 4 6v6c0 5 3 8 8 10 5-2 8-5 8-10V6Z"/><path d="m9 12 2 2 4-4"/>',
 lock:'<rect x="5" y="11" width="14" height="11" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
 building:'<path d="M4 21V5l8-3 8 3v16M2 21h20M9 9h1m4 0h1M9 13h1m4 0h1M10 21v-4h4v4"/>',
 briefcase:'<rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>',
 receipt:'<path d="M5 3h14v18l-3-2-4 2-4-2-3 2zM9 8h6m-6 4h6m-6 4h3"/>',
 spark:'<path d="m12 2 1.8 7 7.2 3-7.2 2.5L12 22l-2.1-7.5L3 12l6.9-3z"/>',
 plug:'<path d="M8 2v6m8-6v6M6 8h12v4a6 6 0 0 1-12 0zm6 10v4"/>',
 menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
 close:'<path d="M5 5 19 19M19 5 5 19"/>',
 copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
 logout:'<path d="M9 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4M14 7l5 5-5 5M8 12h11"/>',
 login:'<path d="M15 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 7l5 5-5 5M15 12H3"/>',
 heartbeat:'<path d="M20 5c-3-3-7 0-8 2-1-2-5-5-8-2-4 4-2 9 8 16 10-7 12-12 8-16Z"/><path d="M3 12h5l2-4 3 8 2-4h6"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
 refresh:'<path d="M20 7v5h-5M4 17v-5h5"/><path d="M5 10a8 8 0 0 1 14-3l1 5M4 12l1 5a8 8 0 0 0 14-3"/>',
 file:'<path d="M5 2h9l5 5v15H5zM14 2v5h5M9 12h6m-6 4h6"/>',
 external:'<path d="M14 4h6v6M10 14 20 4M20 13v7H4V4h7"/>',
 edit:'<path d="m4 20 4-1 12-12-3-3L5 16l-1 4ZM14 7l3 3"/>',
 eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
 monitor:'<rect x="2" y="3" width="20" height="15" rx="2"/><path d="M8 22h8m-4-4v4"/>',
 smartphone:'<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v1"/>',
 upload:'<path d="M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5"/>',
 phone:'<path d="M4 3h5l2 5-3 2a15 15 0 0 0 6 6l2-3 5 2v5c-9 2-19-8-17-17Z"/>',
 mail:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m3 6 9 7 9-7"/>',
 calendarcheck:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18m5 5 2 2 4-4"/>',
 calendarclock:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><circle cx="14" cy="16" r="3"/><path d="M14 14v2h2"/>',
 dashboard:'<path d="M3 13a9 9 0 1 1 18 0v7H3zM12 13l4-4M8 17h8"/>',
 more:'<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
 arrowdown:'<path d="M12 3v17m-7-7 7 7 7-7"/>',
 sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
 moon:'<path d="M20.6 14.9A9 9 0 0 1 9.1 3.4a9 9 0 1 0 11.5 11.5Z"/>',
 pill:'<path d="M10 3a7 7 0 0 1 10 10l-7 7A7 7 0 0 1 3 10zM7 7l10 10"/>',
 star:'<path d="m12 2 3 6.6 7 .9-5 4.9 1.2 7-6.2-3.4-6.2 3.4 1.2-7-5-4.9 7-.9z"/>',
 leaf:'<path d="M20 4c-10 0-16 5-16 12a4 4 0 0 0 4 4c7 0 12-6 12-16ZM4 20c3-6 7-10 12-12"/>',
 checkin:'<path d="M10 4H5v16h5M13 7l5 5-5 5M7 12h11"/>'
};
const icon=(name,cls='')=>`<svg class="${cls}" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${baseIcon[name]||baseIcon.grid}</svg>`;
const patients=[
{id:'PT-1041',name:'Amina Farooq',age:32,sex:'Female',phone:'+1 (555) 010-3401',last:-5,doctor:'Dr. Sarah Malik',branch:'Main Clinic',type:'Follow-up',note:'Routine review. No real medical data is stored in this demo.'},
{id:'PT-1042',name:'Omar Siddiq',age:45,sex:'Male',phone:'+1 (555) 010-3402',last:-33,doctor:'Dr. Sarah Malik',branch:'Main Clinic',type:'General',note:'Demo-only patient profile.'},
{id:'PT-1043',name:'Zara Khan',age:27,sex:'Female',phone:'+1 (555) 010-3403',last:-105,doctor:'Dr. Hamza Ali',branch:'City Branch',type:'Consultation',note:'Demo-only patient profile.'},
{id:'PT-1044',name:'Hassan Raza',age:51,sex:'Male',phone:'+1 (555) 010-3404',last:-12,doctor:'Dr. Sarah Malik',branch:'Main Clinic',type:'Follow-up',note:'Demo-only patient profile.'},
{id:'PT-1045',name:'Maryam Noor',age:39,sex:'Female',phone:'+1 (555) 010-3405',last:-134,doctor:'Dr. Hamza Ali',branch:'City Branch',type:'General',note:'Demo-only patient profile.'},
{id:'PT-1046',name:'Bilal Ahmed',age:22,sex:'Male',phone:'+1 (555) 010-3406',last:-24,doctor:'Dr. Sarah Malik',branch:'Main Clinic',type:'Consultation',note:'Demo-only patient profile.'},
{id:'PT-1047',name:'Sana Iqbal',age:36,sex:'Female',phone:'+1 (555) 010-3407',last:-210,doctor:'Dr. Sarah Malik',branch:'Main Clinic',type:'Review',note:'Demo-only patient profile.'},
{id:'PT-1048',name:'Yusuf Mirza',age:60,sex:'Male',phone:'+1 (555) 010-3408',last:-3,doctor:'Dr. Hamza Ali',branch:'City Branch',type:'General',note:'Demo-only patient profile.'},
{id:'PT-1049',name:'Fatima Javed',age:29,sex:'Female',phone:'+1 (555) 010-3409',last:-2,doctor:'Dr. Bilal Shah',branch:'City Branch',type:'Review',note:'Fictional general medicine patient.'},
{id:'PT-1050',name:'Danish Mahmood',age:48,sex:'Male',phone:'+1 (555) 010-3410',last:-49,doctor:'Dr. Bilal Shah',branch:'City Branch',type:'Consultation',note:'Fictional general medicine patient.'},
{id:'PT-1051',name:'Noor Habib',age:34,sex:'Female',phone:'+1 (555) 010-3411',last:-15,doctor:'Dr. Ayesha Noor',branch:'Main Clinic',type:'Review',note:'Fictional dermatology patient.'},
{id:'PT-1052',name:'Hira Waheed',age:26,sex:'Female',phone:'+1 (555) 010-3412',last:-120,doctor:'Dr. Ayesha Noor',branch:'Main Clinic',type:'Consultation',note:'Fictional dermatology patient.'}
];
const appointments=[
{id:1,patient:'PT-1041',time:'09:00',date:dateNow,doctor:'Dr. Sarah Malik',branch:'Main Clinic',status:'checked-out',service:'Follow-up review'},
{id:2,patient:'PT-1042',time:'09:30',date:dateNow,doctor:'Dr. Sarah Malik',branch:'Main Clinic',status:'completed',service:'General consultation'},
{id:3,patient:'PT-1044',time:'10:00',date:dateNow,doctor:'Dr. Sarah Malik',branch:'Main Clinic',status:'in-consultation',service:'Follow-up review'},
{id:4,patient:'PT-1046',time:'10:30',date:dateNow,doctor:'Dr. Sarah Malik',branch:'Main Clinic',status:'arrived',service:'Initial consultation'},
{id:5,patient:'PT-1048',time:'11:00',date:dateNow,doctor:'Dr. Hamza Ali',branch:'City Branch',status:'arrived',service:'General consultation'},
{id:6,patient:'PT-1043',time:'11:30',date:dateNow,doctor:'Dr. Hamza Ali',branch:'City Branch',status:'scheduled',service:'Consultation'},
{id:7,patient:'PT-1045',time:'14:00',date:dateNow,doctor:'Dr. Hamza Ali',branch:'City Branch',status:'scheduled',service:'General consultation'},
{id:8,patient:'PT-1042',time:'09:45',date:iso(addDays(1)),doctor:'Dr. Sarah Malik',branch:'Main Clinic',status:'scheduled',service:'Follow-up'},
{id:9,patient:'PT-1049',time:'09:00',date:dateNow,doctor:'Dr. Bilal Shah',branch:'City Branch',status:'completed',service:'General review'},
{id:10,patient:'PT-1050',time:'09:30',date:dateNow,doctor:'Dr. Bilal Shah',branch:'City Branch',status:'scheduled',service:'Initial visit'},
{id:11,patient:'PT-1051',time:'11:00',date:dateNow,doctor:'Dr. Ayesha Noor',branch:'Main Clinic',status:'arrived',service:'Skin assessment'},
{id:12,patient:'PT-1052',time:'11:30',date:dateNow,doctor:'Dr. Ayesha Noor',branch:'Main Clinic',status:'scheduled',service:'Dermatology review'}
];
// Synthetic seed records do not infer Actual DOS from the scheduled appointment date. Completed samples must be verified before billing.
appointments.forEach(a=>{
 a.created_at=`${dateNow}T12:00:00`;
 a.actual_date_of_service=null;
});
let followups=[
{id:1,patient:'PT-1041',date:iso(addDays(2)),doctor:'Dr. Sarah Malik',status:'pending',reason:'Review visit'},
{id:2,patient:'PT-1044',date:iso(addDays(-1)),doctor:'Dr. Sarah Malik',status:'pending',reason:'Routine follow-up'},
{id:3,patient:'PT-1045',date:iso(addDays(-3)),doctor:'Dr. Hamza Ali',status:'pending',reason:'Scheduled review'},
{id:4,patient:'PT-1048',date:iso(addDays(7)),doctor:'Dr. Hamza Ali',status:'booked',reason:'Progress check'}
];
const staff=[
{id:1,name:'Dr. Sarah Malik',role:'Doctor',specialty:'pt',branch:'Main Clinic',shift:'09:00 – 17:00',status:'checked-in',time:'08:55'},
{id:2,name:'Dr. Hamza Ali',role:'Doctor',specialty:'chiro',branch:'City Branch',shift:'10:00 – 18:00',status:'checked-in',time:'09:58'},
{id:3,name:'Nadia Khan',role:'Receptionist',specialty:null,branch:'Main Clinic',shift:'08:00 – 16:00',status:'checked-in',time:'08:06'},
{id:4,name:'Asif Raza',role:'Nurse',specialty:null,branch:'Main Clinic',shift:'09:00 – 17:00',status:'checked-in',time:'09:12'},
{id:5,name:'Maha Ali',role:'Clinic Manager',specialty:null,branch:'Main Clinic',shift:'09:00 – 17:00',status:'not-checked-in',time:'—'},
{id:6,name:'Rashid Noor',role:'Support Staff',specialty:null,branch:'City Branch',shift:'08:00 – 16:00',status:'checked-out',time:'08:01'},
{id:7,name:'Dr. Ayesha Noor',role:'Doctor',specialty:'derm',branch:'Main Clinic',shift:'11:00 – 19:00',status:'checked-in',time:'10:52'},
{id:8,name:'Dr. Bilal Shah',role:'Doctor',specialty:'general',branch:'City Branch',shift:'08:00 – 16:00',status:'checked-in',time:'07:58'}
];
const referrals=[
{name:'Dr. Rehan Qureshi',joined:fmt(addDays(-23)),plan:'Clinic subscription',status:'verified',reward:'45% eligible'},
{name:'Dr. Nida Tariq',joined:fmt(addDays(-8)),plan:'Clinic subscription',status:'pending',reward:'Awaiting payment'},
{name:'Dr. Faisal Mahmood',joined:fmt(addDays(-42)),plan:'Clinic subscription',status:'rejected',reward:'Not eligible'}
];
const modules=[
{id:'referrals',name:'Doctor Referral & Rewards',desc:'Verified doctor referrals and subscription discount tracking',icon:'gift'},
{id:'seo',name:'SEO & Search Console',desc:'Website metadata, sitemap and indexing assistance',icon:'search'},
{id:'analytics',name:'Google Analytics 4',desc:'Public website traffic insights and consent-aware integration',icon:'chart'},
{id:'activity',name:'Patient Flow & Engagement',desc:'Active/inactive patients, visits and clinical follow-up reporting',icon:'activity'},
{id:'checkin',name:'Patient Check-In & Check-Out',desc:'Arrival, queue, consultation and departure tracking',icon:'checkin'},
{id:'attendance',name:'Doctor & Staff Attendance',desc:'All-staff shifts, timesheets and attendance corrections',icon:'clock'},
{id:'ai',name:'AI Draft Assistant',desc:'Clinician-reviewed drafting, disabled until approved configuration',icon:'spark'}
];
const specialtyDefinitions = Object.freeze({
  general: Object.freeze({name:'General Medicine',short:'General',color:'#4f806c',icon:'heartbeat'}),
  pt: Object.freeze({name:'Physical Therapy',short:'PT',color:'#2b6cb0',icon:'activity'}),
  chiro: Object.freeze({name:'Chiropractic',short:'Chiro',color:'#dd6b20',icon:'activity'}),
  derm: Object.freeze({name:'Dermatology',short:'Derm',color:'#805ad5',icon:'leaf'})
});
const specialtyPageOwner=Object.freeze({rehab:'pt',spine:'chiro',lesions:'derm'});
const specialtyAllowsPage=(page)=>!specialtyPageOwner[page] || specialtyPageOwner[page]===state.activeSpecialty;
const specialtyName=(id)=>specialtyDefinitions[id]?.name||specialtyDefinitions.general.name;
const state={page:'overview',activeSpecialty:'general',modal:null,drawer:null,navOpen:false,branch:'All branches',role:'Clinic Owner',authUser:null,syncStatus:'Connecting',modules:Object.fromEntries(modules.map(x=>[x.id,true])),patientWindow:90,appointmentDate:dateNow,patientFilter:'All',search:'',followupFilter:'All',website:{name:'Evergreen Family Clinic',tagline:'Compassionate care for every stage of life.',color:'#4f806c',services:true,mobile:false,published:false},seo:{title:'Evergreen Family Clinic | Trusted Care Near You',description:'Discover friendly, personalized healthcare at Evergreen Family Clinic. Explore services and book an appointment with our team.',slug:'evergreen-family-clinic'},note:'Patient reports improving general wellbeing. Review of current plan completed. Consider routine follow-up as clinically appropriate.',aiGenerated:false,aiApproved:false,patients,appointments,followups,staff};
// The server returns authoritative trial status after sign-in; this object is only a pre-authentication UI fallback.
state.billing={
  plan:'trial',planLabel:'Free Trial',trialDays:30,
  trialStartedAt:dateNow,trialEndsAt:iso(addDays(30)),
  paymentMethodRequired:false,invoiceHistory:[]
};
state.pricingModalOpen=false;
state.customAccent=null;
try{const saved=localStorage.getItem('medbook-custom-accent');if(/^#[0-9a-f]{6}$/i.test(saved||''))state.customAccent=saved}catch(_){}
state.themeSettingsOpen=false;
// Brand tokens are defined in CSS under body[data-specialty]. No manual inline colors.
const themeEngine=Object.freeze({
  apply(){
    const specialty=Object.prototype.hasOwnProperty.call(specialtyDefinitions,state.activeSpecialty)?state.activeSpecialty:'general';
    document.body.setAttribute('data-specialty',specialty);
    document.body.setAttribute('data-theme',state.theme);
    if(state.customAccent&&/^#[0-9a-f]{6}$/i.test(state.customAccent)){
      document.body.style.setProperty('--primary',state.customAccent);
      document.body.style.setProperty('--primary-dark',state.customAccent);
      document.body.style.setProperty('--accent',state.customAccent);
    }else{
      ['--primary','--primary-dark','--accent'].forEach(k=>document.body.style.removeProperty(k));
    }
    document.documentElement.style.colorScheme=state.theme;
    document.body.classList.toggle('modal-open',!!state.modal);
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.setAttribute('content',state.theme==='dark'?'#111a24':specialtyDefinitions[specialty].color);
  },
  switchTo(value){
    if(!Object.prototype.hasOwnProperty.call(specialtyDefinitions,value)||value===state.activeSpecialty)return;
    state.activeSpecialty=value;
    if(!specialtyAllowsPage(state.page))state.page='overview';
    state.modal=null;state.drawer=null;state.navOpen=false;
    state.searchOpen=false;state.notificationOpen=false;
    state.navigationLoading=false;
    const nextDoc=state.staff.find(d=>d.role==='Doctor'&&d.specialty===value&&(state.branch==='All branches'||d.branch===state.branch));
    state.activeDoctor=nextDoc?.name||'';
    render();
    toast(specialtyName(value)+' workspace preview selected. No clinical data changed.');
  }
});
// Specialty sample data is static; the selected specialty preference is saved in the clinic snapshot.
state.rehabSelectedPlan='ROM-101';
state.spineSelectedRegion='Cervical';
state.lesionFilter='All';
state.activeDoctor='Dr. Bilal Shah';
state.appointmentDraft=null;
state.appointmentError='';
state.rescheduleAppointmentId=null;
state.doctorDashboardDoctor='Dr. Sarah Malik';
state.doctorDashboardRange='month';
// Prescription entries are synthetic sample drafts persisted with the clinic snapshot; they are not valid prescriptions.
state.prescriptions=[];
// A theme preference is the only optional persisted value; no clinical data is saved.
try {state.theme=localStorage.getItem('medbook-demo-theme')==='dark'?'dark':'light'}
catch (_) {state.theme='light'}

// Billing/coding examples are fictional and are NOT licensed/authoritative code sets.
// Official ICD-10-CM and CPT status, RVUs, expiry and payer coverage must be verified
// against the applicable year/version and licensed references before any real usage.
const payerKinds=['Commercial','Medicare','Medicaid','Workers Comp','Auto','Personal Injury','Hospice','Palliative','Self-Pay','Commercial','Commercial','Medicaid'];
state.patients.forEach((p,index)=>{
  const kind=payerKinds[index]||'Self-Pay';
  p.payerType=['Hospice','Palliative'].includes(kind)?'Medicare':kind;
  p.careType=kind==='Hospice'?'Hospice':kind==='Palliative'?'Palliative':'General';
  p.insuranceStatus=index===2?'Inactive':index===1?'Pending':'Active';
  p.vobStatus=index===1?'Pending':index===2?'Failed':'Verified';
  p.payerName=p.payerType==='Self-Pay'?'Self-Pay':(index===0?'Evergreen Health Plan':index===1?'Northstar Assurance':p.payerType+' Demo Plan');
  p.dob=p.dob||`${today.getFullYear()-p.age}-03-15`; // illustrative DOB, not derived from an actual record
  p.memberId=`DEMO-MBR-${String(index+1041)}`;
  p.groupNumber=`GRP-${100+index}`;
  p.copay=index===8?0:(index%3===0?25:40);
  p.deductibleRemaining=index===8?0:(350+index*75);
  if(['Workers Comp','Auto','Personal Injury'].includes(p.payerType)){
    p.claimDetails={adjuster:'Jordan Demo',adjusterPhone:'+1 (555) 010-1100',claimNumber:`DEMO-CLAIM-${1041+index}`,injuryDate:iso(addDays(-17-index)),attorney:'Casey Example',attorneyPhone:'+1 (555) 010-2230',arbitration:'Mock Mediation Office · +1 (555) 010-3300'};
  }
  if(p.careType==='Hospice') p.hospice={certificationDate:iso(addDays(-15)),electionDate:iso(addDays(-14)),attendingPhysician:p.doctor,terminalDx:'Z51.5 (illustrative care code; verify coding)'};
});
// Complete, editable synthetic patient demographics. These values are illustrative only.
state.patients.forEach((p,i)=>{
  p.email=p.email||`${p.name.toLowerCase().replace(/[^a-z0-9]+/g,'.')}@example.invalid`;
  p.address=p.address||`${100+i} Demo Avenue`;
  p.city=p.city||(p.branch==='City Branch'?'Central City':'Evergreen');
  p.region=p.region||'CA';
  p.postalCode=p.postalCode||`90${String(100+i).padStart(3,'0')}`;
  p.country=p.country||'United States';
  p.maritalStatus=p.maritalStatus||'Not specified';
  p.preferredLanguage=p.preferredLanguage||'English';
  p.pronouns=p.pronouns||'Not specified';
  p.occupation=p.occupation||'Not provided';
  p.emergencyContactName=p.emergencyContactName||'Demo Emergency Contact';
  p.emergencyContactRelationship=p.emergencyContactRelationship||'Family';
  p.emergencyContactPhone=p.emergencyContactPhone||'+1 (555) 010-9999';
  p.registrationDate=p.registrationDate||iso(addDays(-Math.min(90,i*6+3)));
});
state.staff.forEach((s,i)=>{
  s.contact=`staff${i+1}@demo.invalid`;
  s.certifications=s.role==='Doctor'?['Synthetic medical license','Basic Life Support']:['Synthetic role orientation','Privacy awareness'];
});
state.icd10Codes=[
    {code:'M54.50',description:'Low back pain, unspecified',status:'Active',suggestedCpt:['97110','97140','99213']},
    {code:'M54.5', description:'Low back pain',status:'Active'},
    {code:'I10',   description:'Essential (primary) hypertension',status:'Active',suggestedCpt:['99213','99214']},
    {code:'E11.9', description:'Type 2 diabetes mellitus without complications',status:'Active',suggestedCpt:['99213','99214']},
    {code:'J06.9', description:'Acute upper respiratory infection, unspecified',status:'Active',suggestedCpt:['99213']},
    {code:'Z00.00',description:'Encounter for general adult medical examination',status:'Active'},
    {code:'Z51.5', description:'Encounter for palliative care',status:'Active'},
    {code:'E78.5', description:'Hyperlipidemia, unspecified',status:'Active'},
    {code:'K21.9', description:'GERD without esophagitis',status:'Active'},
    {code:'R51.9', description:'Headache, unspecified',status:'Active'},
    {code:'M79.1', description:'Myalgia',status:'Active'},
    {code:'R07.9', description:'Chest pain, unspecified',status:'Active'},
    {code:'J45.909',description:'Unspecified asthma, uncomplicated',status:'Active'},
    {code:'F41.9', description:'Anxiety disorder, unspecified',status:'Active'},
    {code:'F32.9', description:'Major depressive disorder, single episode, unspecified',status:'Active'},
    {code:'G43.909',description:'Migraine, unspecified, not intractable',status:'Active'},
    {code:'M25.50',description:'Pain in unspecified joint',status:'Active',suggestedCpt:['97110','97140']},
    {code:'R10.9', description:'Unspecified abdominal pain',status:'Active'},
    {code:'N39.0', description:'Urinary tract infection, site not specified',status:'Active'},
    {code:'L03.90',description:'Cellulitis, unspecified',status:'Active'},
    {code:'S93.401A',description:'Sprain of right ankle, initial encounter',status:'Active'},
    {code:'R05.9', description:'Cough, unspecified',status:'Active'},
    {code:'H10.9', description:'Unspecified conjunctivitis',status:'Active'},
    {code:'R42',   description:'Dizziness and giddiness',status:'Active'},
    {code:'DEMO-DX-OLD',description:'Fabricated legacy demonstration code',status:'Expiring'}
  ];
state.cptCodes=[
    {code:'99213',description:'Office/outpatient established-patient visit (illustrative)',status:'Active',rvu:1.3,charge:110},
    {code:'99214',description:'Established-patient visit, moderate complexity',status:'Active',rvu:1.9,charge:150},
    {code:'99203',description:'Office/outpatient new-patient visit, low complexity',status:'Active',rvu:1.6,charge:170},
    {code:'99204',description:'New-patient visit, moderate complexity',status:'Active',rvu:2.4,charge:230},
    {code:'97110',description:'Therapeutic exercises',status:'Active',rvu:0.7,charge:80},
    {code:'97140',description:'Manual therapy techniques',status:'Active',rvu:0.9,charge:95},
    {code:'93000',description:'Routine electrocardiogram',status:'Active',rvu:0.6,charge:65},
    {code:'96372',description:'Therapeutic injection, subcutaneous/intramuscular',status:'Active',rvu:0.5,charge:55},
    {code:'36415',description:'Collection of venous blood by venipuncture',status:'Active',rvu:0.2,charge:25},
    {code:'81002',description:'Urinalysis, non-automated, without microscopy',status:'Active',rvu:0.2,charge:20},
    {code:'87804',description:'Infectious agent antigen detection, rapid test',status:'Active',rvu:0.4,charge:35},
    {code:'DEMO-CPT-OLD',description:'Fabricated discontinued procedure code',status:'Deleted',rvu:0,charge:0}
  ];
state.providerTaxonomies=[
    {code:'207Q00000X',description:'Family Medicine'},
    {code:'208000000X',description:'Pediatrics'},
    {code:'207R00000X',description:'Internal Medicine'},
    {code:'207V00000X',description:'Obstetrics & Gynecology'},
    {code:'208600000X',description:'Surgery'},
    {code:'2084P0800X',description:'Psychiatry'},
    {code:'207N00000X',description:'Dermatology'},
    {code:'207X00000X',description:'Orthopaedic Surgery'},
    {code:'207Y00000X',description:'Otolaryngology'},
    {code:'208100000X',description:'Physical Medicine & Rehabilitation'},
    {code:'225100000X',description:'Physical Therapist'},
    {code:'111N00000X',description:'Chiropractor'},
    {code:'363L00000X',description:'Nurse Practitioner'},
    {code:'363A00000X',description:'Physician Assistant'},
    {code:'261QF0400X',description:'Clinic/Center — Federally Qualified Health Center'},
    {code:'261Q00000X',description:'Clinic/Center'}
  ];
state.deletedCptCodes=[{code:'DEMO-CPT-OLD',description:'Fabricated deleted-code example; NOT an actual CPT status notice',date:dateNow}];
state.expiringDx=[5,12,25].map((days,i)=>({code:['DEMO-DX-OLD','DEMO-DX-B','DEMO-DX-C'][i],expiresAt:iso(addDays(days)),note:'Synthetic expiry training scenario'}));
state.providers=state.staff.filter(x=>x.role==='Doctor').map((s,i)=>({id:s.id,name:s.name,branch:s.branch,specialty:s.specialty,
  npi:`DEMO-NPI-${String(i+1).padStart(3,'0')}`,taxId:`DEMO-TAX-${String(i+1).padStart(3,'0')}`,
  dea:`DEMO-DEA-${String(i+1).padStart(3,'0')}`,caqh:`DEMO-CAQH-${i+1}`,
  license:`DEMO-LIC-${i+1}`,licenseExpiry:iso(addDays(i===0?17:170+i*25)),deaExpiry:iso(addDays(i===1?21:180+i*30)),
  taxonomyCode:['207Q00000X','111N00000X','207R00000X','207Q00000X'][i]||'207Q00000X'}));
state.practices=[
 {id:'PR-001',name:'Evergreen Family Clinic',legalName:'Evergreen Family Clinic LLC',branch:'Main Clinic',practiceType:'Primary Care',npi:'DEMO-ORG-NPI-001',taxId:'DEMO-ORG-TAX-001',taxonomyCode:'261QF0400X',phone:'+1 (555) 010-2001',email:'main@example.invalid',address:'100 Evergreen Avenue',city:'Evergreen',region:'CA',postalCode:'90001',country:'United States',website:'https://main.example.invalid',timezone:'America/Los_Angeles',status:'Active'},
 {id:'PR-002',name:'Evergreen City Clinic',legalName:'Evergreen City Clinic LLC',branch:'City Branch',practiceType:'Multi-specialty',npi:'DEMO-ORG-NPI-002',taxId:'DEMO-ORG-TAX-002',taxonomyCode:'261QF0400X',phone:'+1 (555) 010-2002',email:'city@example.invalid',address:'200 City Center Road',city:'Central City',region:'CA',postalCode:'90002',country:'United States',website:'https://city.example.invalid',timezone:'America/Los_Angeles',status:'Active'}
];
state.selectedPracticeId='PR-001';
state.selectedEncounterPatientId='';
state.selectedEncounterAppointmentId='';
state.reportPractice='All practices';
state.reportDoctor='All doctors';
state.superbillPractice='All practices';
state.superbillDoctor='All doctors';
state.encounterPractice='All practices';
state.encounterDoctor='All doctors';
state.practiceFormError='';
state.abnTemplates=[{id:'ABN-DEMO-1',name:'Advance Beneficiary Notice (ABN) — SAMPLE ONLY',reason:'Potential noncoverage example',estimatedCost:125}];
state.encounters={};
  state.soapTemplates=[
    // 12 seeded templates. Every one has id, name, specialty ('all' or a specialty key), subjective, objective, assessment, plan, builtIn:true.
    {id:'TPL-001', name:'General – New Patient Visit', specialty:'all', builtIn:true,
     subjective:'Patient presents for a new-patient evaluation. Chief complaint: [INSERT]. No prior records available. Allergies: [INSERT]. Current medications: [INSERT].',
     objective:'Vitals: BP __/__, HR __, RR __, Temp __, SpO2 __. General: alert, well-appearing. HEENT, neck, CV, lungs, abdomen, extremities: [describe findings].',
     assessment:'1. [Working diagnosis]\n2. [Secondary issue if any]',
     plan:'1. Diagnostic plan: [labs / imaging]\n2. Therapeutic plan: [medications / lifestyle]\n3. Patient education provided.\n4. Follow-up in [X] weeks.'},
    {id:'TPL-002', name:'General – Follow-up', specialty:'all', builtIn:true,
     subjective:'Follow-up for [condition]. Interval history: [INSERT]. Response to prior treatment: [INSERT].',
     objective:'Vitals: BP __/__, HR __, RR __, Temp __. Focused exam: [INSERT].',
     assessment:'Status of [condition]: [improving / stable / worsening].',
     plan:'Continue current plan. Adjust [medication] as needed. Return in [X] weeks.'},
    {id:'TPL-003', name:'PT – Initial Evaluation', specialty:'pt', builtIn:true,
     subjective:'Patient referred for physical therapy for [region] [pain / weakness / mobility]. Onset: [date]. Pain: __/10, [constant / intermittent]. Aggravating factors: [INSERT]. Relieving factors: [INSERT].',
     objective:'Observation: [posture / swelling / gait]. ROM: [region] [flexion / extension] __° vs __° expected. Strength: __/5. Special tests: [INSERT]. Palpation: [INSERT].',
     assessment:'[Region] pain / mobility deficits consistent with [working dx]. Prognosis: [good / guarded].',
     plan:'Plan of care: 2x/week for 6 weeks. Interventions: therapeutic exercise, manual therapy, HEP. Goals: [INSERT specific, measurable goal]. Reassess in 4 weeks.'},
    {id:'TPL-004', name:'PT – Progress Note', specialty:'pt', builtIn:true,
     subjective:'Since last visit: pain now __/10 (was __/10). Functional change: [INSERT]. Adherence to HEP: [good / partial / poor].',
     objective:'ROM now __° (was __°). Strength now __/5 (was __/5). [Test] now [result].',
     assessment:'Patient is [progressing as expected / plateauing / regressing].',
     plan:'Continue current plan of care. Progress HEP. Reassess in 2 weeks.'},
    {id:'TPL-005', name:'Chiro – Initial Visit', specialty:'chiro', builtIn:true,
     subjective:'Chief complaint: [region] [pain / stiffness]. Onset: [date / insidious]. Pain: __/10. Aggravating: [INSERT]. Relieving: [INSERT]. Prior chiropractic care: [yes / no].',
     objective:'Posture: [INSERT]. Spinal palpation: [segmental findings]. ROM: [region] [motion] __°. Orthopedic tests: [INSERT]. Neurologic: [INSERT].',
     assessment:'Somatic dysfunction of [region] spine with associated [myofascial / radicular] symptoms.',
     plan:'Spinal manipulation: [region], [segments]. Soft tissue: [INSERT]. HEP: [INSERT]. Frequency: 2-3x/week for 4 weeks. Reassess in 2 weeks.'},
    {id:'TPL-006', name:'Chiro – Re-assessment', specialty:'chiro', builtIn:true,
     subjective:'Pain now __/10 (was __/10). Functional change: [INSERT]. Tolerance of manipulation: [good / fair / poor].',
     objective:'Spinal segment [region] mobility: [improved / unchanged]. ROM: __° (was __°).',
     assessment:'[Improving / unchanged / worsening] response to care.',
     plan:'Continue current frequency for 2 more weeks, then taper to 1x/week. HEP progression: [INSERT].'},
    {id:'TPL-007', name:'Derm – Focused Lesion Eval', specialty:'derm', builtIn:true,
     subjective:'Patient presents for evaluation of a [location] lesion. Duration: [INSERT]. Changes: [size / color / symptoms]. Prior treatment: [INSERT].',
     objective:'Lesion: [size] mm, [color], [shape], [borders]. ABCDE: A__, B__, C__, D__, E__. Dermoscopy: [INSERT].',
     assessment:'[Benign / atypical / suspicious] pigmented lesion. Differential: [INSERT].',
     plan:'[Reassurance / biopsy / excision]. Patient education on sun protection. Return in [3 / 6 / 12] months.'},
    {id:'TPL-008', name:'Derm – Acne Follow-up', specialty:'derm', builtIn:true,
     subjective:'Follow-up for acne. Current regimen: [INSERT]. Response: [clear / mild / moderate / severe]. Side effects: [INSERT].',
     objective:'Face / chest / back: [number] inflammatory, [number] non-inflammatory lesions. No scarring / mild scarring.',
     assessment:'[Mild / moderate / severe] acne vulgaris. Response to current therapy: [good / partial / poor].',
     plan:'[Continue / escalate / taper] current regimen. Consider [INSERT]. Return in 3 months.'},
    {id:'TPL-009', name:'PT – Discharge Summary', specialty:'pt', builtIn:true,
     subjective:'Patient reports [INSERT] improvement. Pain now __/10 (initial __/10). Functional status: [independent / modified independent].',
     objective:'Final ROM: __° (initial __°). Strength: __/5 (initial __/5). All goals: [met / partially met / not met].',
     assessment:'Patient has [met / not met] therapy goals. Recommend discharge to HEP.',
     plan:'Discharge from skilled PT. Provide HEP. Follow-up PRN.'},
    {id:'TPL-010', name:'Chiro – Maintenance', specialty:'chiro', builtIn:true,
     subjective:'Patient presents for maintenance care. Currently [pain-free / minimal pain]. No new complaints.',
     objective:'Spinal mobility preserved. No acute findings.',
     assessment:'Stable. Maintenance care appropriate.',
     plan:'Continue monthly manipulation. Reassess in 6 months.'},
    {id:'TPL-011', name:'Derm – Annual Skin Check', specialty:'derm', builtIn:true,
     subjective:'Patient presents for annual total body skin examination. No new lesions. Personal / family history of skin cancer: [INSERT].',
     objective:'Total body exam: [number] benign nevi, no atypical lesions. Dermoscopy: [INSERT].',
     assessment:'No suspicious lesions identified. Routine surveillance appropriate.',
     plan:'Continue monthly self-exam. Annual dermatology follow-up.'},
    {id:'TPL-012', name:'General – Chronic Disease Management', specialty:'all', builtIn:true,
     subjective:'Follow-up for [chronic disease]. Adherence to medications: [good / partial / poor]. New symptoms: [INSERT].',
     objective:'Vitals: BP __/__, HR __, weight __ kg. [Focused exam for the disease]. Latest labs: [INSERT].',
     assessment:'[Controlled / uncontrolled] [condition].',
     plan:'Continue current regimen. Adjust [medication] to [dose]. Labs in [X] months. Return in 3 months.'}
  ];
state.nextSoapTemplateId=13;
state.textPatterns = [
 {id:'TP-001',name:'Normal physical exam',field:'objective',builtIn:true,text:'Patient is alert and oriented ×3. Vitals within normal limits. HEENT: normocephalic, atraumatic. Neck: supple, no lymphadenopathy. CV: RRR, no murmurs. Lungs: CTAB. Abd: soft, non-tender, non-distended. Ext: no edema. Neuro: grossly intact.'},
 {id:'TP-002',name:'Denies red flags',field:'subjective',builtIn:true,text:'Patient denies fever, chills, night sweats, unexplained weight loss, or focal neurological deficits.'},
 {id:'TP-003',name:'PT — Patient tolerated well',field:'plan',builtIn:true,text:'Patient tolerated the session well, with no adverse events. Vitals stable throughout. Will continue current plan of care.'},
 {id:'TP-004',name:'PT — HEP instructions',field:'plan',builtIn:true,text:'Home exercise program reviewed and demonstrated. Patient verbalized understanding. Instructed to perform ___ sets × ___ reps ___ times per day. Return precautions reviewed: increased pain, swelling, numbness, or new weakness.'},
 {id:'TP-005',name:'Chiro — Subluxation found',field:'objective',builtIn:true,text:'Segmental dysfunction noted at ___ level with associated hypertonicity and restricted end-range motion. Adjustment performed using ___ technique; cavitation achieved; patient reported immediate relief.'},
 {id:'TP-006',name:'Derm — Benign lesion',field:'assessment',builtIn:true,text:'Morphology and dermoscopic features are most consistent with a benign nevus. No atypical features identified. Reassurance provided; routine surveillance recommended.'},
 {id:'TP-007',name:'Derm — Sun protection counseling',field:'plan',builtIn:true,text:'Counseled on daily broad-spectrum SPF 30+, sun-protective clothing, and avoidance of tanning beds. Patient verbalized understanding.'},
 {id:'TP-008',name:'General — Return precautions',field:'plan',builtIn:true,text:'Return precautions discussed: chest pain, shortness of breath, syncope, high fever, uncontrolled bleeding, or worsening symptoms. Patient advised to seek urgent care if any occur.'}
];
state.nextTextPatternId=9;
state.textPatternTargetField=null;
state.cptModifierSuggestion='';
state.lastDxHint=null; // transient demo suggestion scoped to one encounter

state.soapTemplateFilter='all';
state.soapTemplateEditingId=null;
state.signatures={}; // demo-only last-used signature per provider
state.esignPad=null;
state.esignStrokes=[];
state.codingSearch='';
state.drawerTab='overview';
state.memberCardSide='front';
state.vobLoading={};
state.clinicalPrintDisclaimer='SYNTHETIC TRAINING FORM — NOT FOR CLAIM SUBMISSION OR REAL CLINICAL USE';

state.teamTab='directory';
state.userAccounts=[];
state.userAccountsLoading=false;
state.availabilityWeekOffset=0;
state.availabilitySelection=null;
// Leave entries are intentionally fictional. A current-week example makes the UI testable.
state.doctorLeave=[
 {doctor:'Dr. Sarah Malik',date:'2026-11-08',reason:'Personal Leave'},
 {doctor:'Dr. Sarah Malik',date:iso(addDays(1)),reason:'Personal Leave'},
 {doctor:'Dr. Ayesha Noor',date:iso(addDays(3)),reason:'Conference / Training'}
];
// Past demo events supplement the live patient-specific appointments, bills and documents.
state.patientTimeline=[
 {id:'H-1',patientId:'PT-1041',type:'visit',date:iso(addDays(-65)),title:'Physical therapy review',description:'Completed follow-up (sample)',status:'Completed'},
 {id:'H-2',patientId:'PT-1041',type:'prescription',date:iso(addDays(-58)),title:'Medication review',description:'Historic demonstration item only',status:'Draft'},
 {id:'H-3',patientId:'PT-1041',type:'invoice',date:iso(addDays(-53)),title:'Historic invoice settled',description:'Example billing milestone',status:'Paid'},
 {id:'H-4',patientId:'PT-1041',type:'document',date:iso(addDays(-42)),title:'Referral letter',description:'Synthetic document record',status:'Verified'},
 {id:'H-5',patientId:'PT-1041',type:'visit',date:iso(addDays(-24)),title:'Follow-up consultation',description:'Mock visit history',status:'Completed'},
 {id:'H-6',patientId:'PT-1041',type:'document',date:iso(addDays(-9)),title:'Care plan document',description:'Sample document, not uploaded',status:'Pending'}
];
// NPS is promoters percentage minus detractors percentage, not a satisfaction rate.
state.feedback=[
 {id:1,patient:'Sample patient A',stars:5,date:iso(addDays(-1)),comment:'Dr. Sarah was very helpful and explained the plan clearly.'},
 {id:2,patient:'Sample patient B',stars:5,date:iso(addDays(-4)),comment:'Booking and check-in felt simple.'},
 {id:3,patient:'Sample patient C',stars:4,date:iso(addDays(-7)),comment:'Friendly staff and a comfortable waiting area.'},
 {id:4,patient:'Sample patient D',stars:3,date:iso(addDays(-11)),comment:'I would appreciate shorter waiting times.'}
];
// A monotonic counter prevents a removed mock item ID being reused.
state.activeTool='ocr'; // Active iframe selection; only the chosen tool is loaded.
state.nextPrescriptionId=1;
state.auditFilter='All';
state.auditOutcome='All';
// Empty bounds mean the user has not constrained the UTC audit date range.
state.auditStartDate='';
state.auditEndDate='';
state.intakeConsents={};
// Additional UI demonstration state: no network or healthcare data is exchanged.
state.appointmentView='list';
state.navigationLoading=false;
state.searchOpen=false;
state.notificationOpen=false;
state.notificationItems=[
  {id:'alert-1',type:'danger',category:'Action Required',message:'Insurance terminated for Patient X (Zara Khan).',patientId:'PT-1043',unread:true},
  {id:'alert-2',type:'warning',category:'Warning',message:'Insurance for Patient Y (Omar Siddiq) expires in 14 days.',patientId:'PT-1042',unread:true},
  {id:'alert-3',type:'info',category:'Info',message:'Missing Documents: Patient Z (Amina Farooq) needs to upload ID.',patientId:'PT-1041',unread:true},
  {id:'alert-4',type:'info',category:'Info',message:'Sample insurance document review for Fatima Javed.',patientId:'PT-1049',unread:true},
  {id:'alert-5',type:'warning',category:'Warning',message:'Dermatology sample intake documents pending for Noor Habib.',patientId:'PT-1051',unread:true}
];
state.notificationItems.push(
  {id:'rcm-dx',type:'warning',category:'DX Expiring',message:'3 sample ICD-10 entries expire within 30 days — training scenario.',targetPage:'coding',unread:true},
  {id:'rcm-cpt',type:'warning',category:'CPT Deleted',message:'Synthetic CPT Code Updates: DEMO-CPT-OLD marked deleted (no official update).',targetPage:'coding',unread:true},
  {id:'rcm-license',type:'warning',category:'License Expiring',message:'Mock provider license/DEA credentials expire within 30 days.',targetPage:'providers',unread:true},
  {id:'rcm-vob',type:'warning',category:'VOB Pending',message:'Omar Siddiq has a pending demonstration benefits check.',patientId:'PT-1042',unread:true}
);
state.insurance={
  'PT-1041':{payer:'Evergreen Health Plan',policy:'EHP-••••-1041',status:'active',verifiedAt:null},
  'PT-1042':{payer:'Northstar Assurance',policy:'NSA-••••-1042',status:'expiring',verifiedAt:null},
  'PT-1043':{payer:'Westbridge Coverage',policy:'WBC-••••-1043',status:'terminated',verifiedAt:null}
};
state.documents={
  'PT-1041':[{name:'Insurance_Card.pdf',status:'Verified'},{name:'Lab_Results.pdf',status:'Pending'}],
  'PT-1042':[{name:'Insurance_Card.pdf',status:'Pending'}],
  'PT-1043':[{name:'Identification.pdf',status:'Verified'}]
};
state.eligibilityLoading={};
state.integrationConnections={};
state.integrationTarget=null;
state.reportType='revenue';
state.reportStart=iso(addDays(-7));
state.reportEnd=dateNow;
state.reportStatus='idle';
state.reportRows=[];
state.reportRunId=0;
state.invoices=[
  {id:'INV-2001',patientId:'PT-1041',appointmentId:1,actual_date_of_service:dateNow,amount:85,status:'Paid',items:[{label:'Follow-up consultation',qty:1,unit:80}],tax:5,paidAt:dateNow},
  {id:'INV-2002',patientId:'PT-1042',appointmentId:2,actual_date_of_service:dateNow,amount:60,status:'Paid',items:[{label:'General consultation',qty:1,unit:60}],tax:0,paidAt:dateNow},
  {id:'INV-2003',patientId:'PT-1044',amount:85,status:'Pending',items:[{label:'Review appointment',qty:1,unit:80}],tax:5},
  {id:'INV-2004',patientId:'PT-1046',amount:110,status:'Paid',items:[{label:'Consultation',qty:1,unit:100}],tax:10,paidAt:dateNow},
  {id:'INV-2005',patientId:'PT-1049',appointmentId:9,actual_date_of_service:dateNow,amount:105,status:'Pending',items:[{label:'General medicine consultation',qty:1,unit:100}],tax:5},
  {id:'INV-2006',patientId:'PT-1050',amount:70,status:'Paid',items:[{label:'Follow-up review',qty:1,unit:70}],tax:0,paidAt:dateNow},
  {id:'INV-2007',patientId:'PT-1051',amount:120,status:'Pending',items:[{label:'Dermatology review',qty:1,unit:110}],tax:10}
];
state.auditLogs=[
 {id:1,at:new Date(Date.now()-10800000).toISOString(),actor:'Receptionist',action:'patient.view',resource:'PT-1041',branch:'Main Clinic',outcome:'Success',purpose:'Registration',source:'Seeded synthetic example'},
 {id:2,at:new Date(Date.now()-7200000).toISOString(),actor:'Doctor',action:'consultation.complete',resource:'PT-1049',branch:'City Branch',outcome:'Success',purpose:'Treatment',source:'Seeded synthetic example'},
 {id:3,at:new Date(Date.now()-3600000).toISOString(),actor:'Clinic Owner',action:'invoice.view',resource:'INV-2003',branch:'Main Clinic',outcome:'Success',purpose:'Billing',source:'Seeded synthetic example'},
 {id:4,at:new Date(Date.now()-1800000).toISOString(),actor:'Receptionist',action:'invoice.denied',resource:'INV-2003',branch:'Main Clinic',outcome:'Denied',purpose:'Access policy demonstration',source:'Seeded synthetic example'}
];
state.serverAuditLogs=[];
function audit(action,resource,outcome='Success',purpose='Operational',branch='—'){
 state.auditLogs.unshift({id:Math.max(0,...state.auditLogs.map(x=>x.id))+1,at:new Date().toISOString(),actor:state.role,action,resource,branch,outcome,purpose,source:'Client-side event; server audit is authoritative'});
 state.auditLogs=state.auditLogs.slice(0,120);
}
const patient=id=>state.patients.find(p=>p.id===id);
const invoiceSubtotal=inv=>(inv?.items||[]).reduce((sum,item)=>sum+Number(item.qty||0)*Number(item.unit||0),0);
const invoiceTotal=inv=>Math.round((invoiceSubtotal(inv)+Number(inv?.tax||0))*100)/100;
// The list/search and the detail view share this source of truth. Existing v1.3 fields are normalized.
state.invoices.forEach(inv=>{inv.amount=invoiceTotal(inv)});
function ageFromDOB(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||'')))return null;
 const [y,m,d]=value.split('-').map(Number);
 const dob=new Date(y,m-1,d,12);
 if(Number.isNaN(dob.valueOf())||dob.getFullYear()!==y||dob.getMonth()!==m-1||dob.getDate()!==d||dob>today)return null;
 let age=today.getFullYear()-dob.getFullYear();
 if(today.getMonth()<dob.getMonth()||(today.getMonth()===dob.getMonth()&&today.getDate()<dob.getDate()))age--;
 return age>=0&&age<=120?age:null;
}
const utcDisplay=(value)=>{const d=new Date(value);return Number.isNaN(d.valueOf())?'Invalid date':d.toISOString().replace('T',' ').slice(0,19)+' UTC'};

const nameFor=id=>patient(id)?.name || 'Unknown demo patient';
const initials=s=>String(s).split(' ').map(x=>x[0]).filter(Boolean).slice(0,2).join('').toUpperCase();
const statusBadge=(s)=>{const value=String(s||'');let color=value==='checked-out'||value==='completed'||value==='verified'||value==='checked-in'||value==='active'?'green':value==='arrived'||value==='pending'||value==='in-consultation'||value==='rescheduled'?'orange':value==='no_show'||value==='no-show'||value==='cancelled'||value==='rejected'||value==='overdue'||value==='inactive'?'red':'blue';let label=value==='no_show'||value==='no-show'?'No-Show':value.replace(/[-_]/g,' ').replace(/\b\w/g,c=>c.toUpperCase());return `<span class="badge ${color}">${escapeHTML(label)}</span>`};
const btn=(text,action,cl='')=>`<button class="btn ${cl}" data-action="${action}">${text}</button>`;
// Whitelisted local HTML routes; never derive an iframe URL from user input.
const clinicalTools=Object.freeze({
  'ocr': Object.freeze({name:'Image to Text (OCR)',folder:'image-to-text'}),
  'pdf-merge': Object.freeze({name:'Merge PDFs',folder:'merge-pdf'}),
  'pdf-split': Object.freeze({name:'Split PDF',folder:'split-pdf'}),
  'img-pdf': Object.freeze({name:'Images to PDF',folder:'images-to-pdf'}),
  'qr-gen': Object.freeze({name:'QR Code Generator',folder:'qr-code-generator'}),
  'doc-crop': Object.freeze({name:'Scanner with Crop',folder:'crop-scanned-document'}),
});
const navGroups=[
{name:'Workspace',items:[['overview','Overview','grid'],['doctor-dashboard','Doctor Dashboard','chart'],['appointments','Appointments','calendar'],['encounters','Encounters','clipboard'],['queue','Patient Queue','clock'],['patients','Patient Records','users'],['consultation','Consultation','clipboard'],['superbills','Superbills','receipt'],['hospice','Hospice Care','heartbeat']]},
{name:'Clinical Utilities',items:[['ocr','Image to Text (OCR)','file'],['pdf-merge','Merge PDFs','file'],['pdf-split','Split PDF','file'],['img-pdf','Images to PDF','file'],['qr-gen','QR Code Generator','grid'],['doc-crop','Scanner with Crop','edit']]},
{name:'Specialty Workspace',items:[['rehab','Rehab Plans','activity',null,'pt'],['spine','Spine Tracker','activity',null,'chiro'],['lesions','Skin Lesion Gallery','leaf',null,'derm']]},
{name:'Insights & Operations',items:[['activity','Patient Activity','activity','activity'],['attendance','Staff Attendance','clock','attendance'],['referrals','Referral Rewards','gift','referrals'],['billing','Billing & Invoices','receipt'],['coding','Coding Reference','clipboard'],['reports','Reports','chart']]},
{name:'Website & Growth',items:[['builder','Website Builder','globe'],['seo','SEO & Indexing','search','seo'],['analytics','Website Analytics','chart','analytics']]},
{name:'Management',items:[['staff','Team & Roles','briefcase'],['practices','Practice Management','building'],['providers','Provider Profiles','shield'],['ai','AI Assistant','spark','ai'],['integrations','Integrations','plug'],['security','Security Center','shield'],['audit','Audit Log','shield'],['modules','Module Settings','settings']]}
];
function requireModule(page){const dict={activity:'activity',attendance:'attendance',referrals:'referrals',seo:'seo',analytics:'analytics',ai:'ai'};return !dict[page]||state.modules[dict[page]]}
const matchingDoctors=()=>state.staff.filter(d=>d.role==='Doctor'&&d.specialty===state.activeSpecialty&&(state.branch==='All branches'||d.branch===state.branch));
const doctorAllowed=name=>{const inBranch=state.staff.some(member=>member.role==='Doctor'&&member.name===name&&(state.branch==='All branches'||member.branch===state.branch));if(state.role==='Doctor')return state.activeDoctor===name&&inBranch;if(['Receptionist','Billing Staff','Auditor','Staff'].includes(state.role))return inBranch;return matchingDoctors().some(d=>d.name===name)};
const appointmentAllowed=a=>(state.branch==='All branches'||state.branch===a.branch)&&doctorAllowed(a.doctor);
const appointmentInUserScope=a=>(state.branch==='All branches'||state.branch===a.branch)&&(state.role!=='Doctor'||a.doctor===state.activeDoctor);
const visibleAppointments=(date=state.appointmentDate)=>state.appointments.filter(a=>a.date===date&&appointmentAllowed(a));
const todayApps=()=>visibleAppointments(dateNow);
const visibleAlerts=()=>state.notificationItems.filter(a=>!a.patientId||(patient(a.patientId)&&doctorAllowed(patient(a.patientId).doctor)));
const lastVisitLabel=p=>Number.isFinite(p.last)?fmt(addDays(p.last)):'No completed visit';
const doctorShift=d=>{const match=/^(\d{2}:\d{2})\s*[–-]\s*(\d{2}:\d{2})/.exec(d?.shift||'');return match?[match[1],match[2]]:['09:00','17:00']};
const toMinutes=t=>{const [h,m]=String(t).split(':').map(Number);return h*60+m};
const asTime=m=>`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
function clinicClockParts(){
 const timezone=state.authUser?.organization?.timezone||'UTC';
 try{const parts=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());const values=Object.fromEntries(parts.map(part=>[part.type,part.value]));return {date:`${values.year}-${values.month}-${values.day}`,time:`${values.hour}:${values.minute}`}}
 catch(_){return {date:dateNow,time:'00:00'}}
}
const currentClinicDate=()=>clinicClockParts().date;
const appointmentStatus=a=>AppointmentDomain.effectiveStatus(a,currentClinicDate());
function syncClinicDate(){const next=currentClinicDate();if(next!==dateNow){const previous=dateNow;dateNow=next;today=new Date(`${dateNow}T12:00:00`);if(state.appointmentDate===previous)state.appointmentDate=dateNow;if(appReady)render()}}
window.setInterval(syncClinicDate,60000);
const isBooked=(doctor,date,time,duration=30,ignoreAppointmentId=null)=>state.appointments.some(a=>a.doctor===doctor&&a.date===date&&String(a.id)!==String(ignoreAppointmentId)&&!['cancelled','no_show','rescheduled'].includes(appointmentStatus(a))&&toMinutes(time)<toMinutes(a.time)+(Number(a.duration)||30)&&toMinutes(a.time)<toMinutes(time)+duration);
function availableSlots(doctor,date){const d=state.staff.find(s=>s.name===doctor&&s.role==='Doctor');if(!d||[0,6].includes(new Date(date+'T12:00:00').getDay()))return [];
 const [start,end]=doctorShift(d).map(toMinutes),slots=[];
 for(let t=start;t+30<=end;t+=30)slots.push({time:asTime(t),booked:isBooked(doctor,date,asTime(t))});
 return slots;
}
const arrived=(a)=>['arrived','in-consultation','completed','checked-out'].includes(appointmentStatus(a));
const completed=(a)=>AppointmentDomain.isCompleted(a);
const noShow=(a)=>{const status=appointmentStatus(a);return status==='no_show'||(status==='rescheduled'&&Boolean(a.no_show_at)&&!(a.attendanceCorrectionHistory||[]).some(entry=>entry.to==='arrived'))};
const appointmentHasDOS=a=>AppointmentDomain.hasActualDateOfService(a);
function appointmentIsPastDue(a){
 if(!a||appointmentStatus(a)!=='scheduled')return false;
 const clock=clinicClockParts();
 if(a.date<clock.date)return true;
 if(a.date>clock.date)return false;
 return toMinutes(a.time)+(Number(a.duration)||30)<=toMinutes(clock.time);
}
function appointmentActionButtons(a){
 const status=appointmentStatus(a);
 if(status==='scheduled')return `${btn('Check in',`check-in:${a.id}`,'small soft')}${btn('Reschedule',`reschedule:${a.id}`,'small ghost')}${btn('Cancel',`cancel-appointment:${a.id}`,'small ghost')}${appointmentIsPastDue(a)?btn('Mark No-Show',`mark-no-show:${a.id}`,'small danger'):''}`;
 if(status==='no_show')return `${btn('Reschedule',`reschedule:${a.id}`,'small primary')}${btn('Correct attendance',`correct-attendance:${a.id}`,'small soft')}`;
 if(status==='arrived')return `${roleCanView('consultation')?btn('Start visit',`start-visit:${a.id}`,'small soft'):'<span class="muted">Waiting for clinician</span>'}${['Clinic Owner','Clinic Admin','Receptionist','Doctor'].includes(state.role)?btn('Cancel',`cancel-appointment:${a.id}`,'small ghost'):''}`;
 if(status==='in-consultation')return btn('Open notes',`encounter-open-appointment:${a.id}`,'small soft');
 if(status==='completed')return `${['Clinic Owner','Clinic Admin','Receptionist'].includes(state.role)?btn('Check out',`check-out:${a.id}`,'small soft'):''}${roleCanView('consultation')?btn('Correct DOS',`correct-dos:${a.id}`,'small ghost'):''}`;
 if(status==='checked-out')return roleCanView('consultation')?btn('Correct DOS',`correct-dos:${a.id}`,'small ghost'):'<span class="muted">Visit completed</span>';
 if(status==='rescheduled')return '<span class="muted">Moved to new booking</span>';
 return '<span class="muted">—</span>';
}
const eligiblePatients=()=>state.patients.filter(p=>((state.branch==='All branches'||p.branch===state.branch)||(state.role==='Doctor'&&state.appointments.some(a=>a.patient===p.id&&a.branch===state.branch&&appointmentAllowed(a))))&&(doctorAllowed(p.doctor)||(state.role==='Doctor'&&state.appointments.some(a=>a.patient===p.id&&appointmentAllowed(a)))));
const reportablePatients=()=>state.patients.filter(p=>(state.branch==='All branches'||p.branch===state.branch)&&(state.role!=='Doctor'||p.doctor===state.activeDoctor));
const activePatient=(p)=>{const cutoff=addDays(-state.patientWindow);return Number.isFinite(p.last)&&addDays(p.last)>=cutoff};
const dueFollowups=()=>state.followups.filter(f=>f.status==='pending'&&f.date<=dateNow&&(state.branch==='All branches'||patient(f.patient)?.branch===state.branch)&&doctorAllowed(f.doctor));
const titlePage={overview:'Overview','doctor-dashboard':'Doctor Dashboard',appointments:'Appointments & Calendar',encounters:'Encounters',superbills:'Superbills',practices:'Practice Management',queue:'Patient Queue & Check-In',patients:'Patient Records',consultation:'Consultation Workspace',activity:'Patient Flow & Engagement',attendance:'Staff Attendance',referrals:'Doctor Referral Rewards',billing:'Billing & Invoices',reports:'Reports Center',builder:'Hybrid Website Builder',seo:'SEO & Search Console',analytics:'Google Analytics 4',staff:'Team & Roles',ai:'AI Clinical Assistant',integrations:'Integrations & APIs',security:'Security Center',modules:'Optional Modules',audit:'Audit Log',rehab:'Rehab Plans',spine:'Spine Tracker',lesions:'Skin Lesion Gallery', 'clinical-tools':'Clinical Utilities',coding:'Coding Reference',providers:'Provider Profiles',hospice:'Hospice Care'};
function header(){
 const daysLeft=state.billing.status==='expired'?0:Math.max(0,Math.ceil((new Date(state.billing.trialEndsAt+'T00:00:00')-new Date(dateNow+'T00:00:00'))/86400000));
 return `<div class="topbar"><div class="top-title"><button class="iconbtn mobile-menu" data-action="nav" aria-label="Open navigation">${icon('menu')}</button><div class="crumb">MedBook AI <span class="slash">/</span> <strong>${escapeHTML(titlePage[state.page]||'Overview')}</strong></div></div><div class="toptools"><span class="demo-ribbon">● SAMPLE DATA · REPLACE BEFORE LIVE USE</span>${state.billing.plan==='paid'?'<span class="badge green" aria-label="Subscription active">Subscription active</span>':`<button type="button" class="v24-trial-banner" data-action="open-pricing" aria-label="View clinic trial status"><span class="v24-trial-icon">⏱</span><span class="v24-trial-text"><strong>${isTrialActive()?'Free Trial':'Trial expired'}</strong> — ${daysLeft} days left</span><span class="v24-trial-cta">Plan details</span></button>`}${state.billing.status==='expired'?'<span class="badge red">Read-only</span>':''}${['OWNER','ADMIN'].includes(state.authUser?.role)?`<label class="branch-pill">${icon('building')} <select id="branch" aria-label="Select branch"><option ${state.branch==='All branches'?'selected':''}>All branches</option>${[...new Set([...state.practices.map(p=>p.branch),...state.staff.map(s=>s.branch)])].map(b=>`<option value="${escapeHTML(b)}" ${state.branch===b?'selected':''}>${escapeHTML(b)}</option>`).join('')}</select></label>`:`<span class="branch-pill">${icon('building')} ${escapeHTML(state.branch)}</span>`}${state.role==='Doctor'?`<span class="specialty-switch">${icon('activity')} ${escapeHTML(specialtyName(state.activeSpecialty))}</span>`:`<label class="specialty-switch" for="active-specialty"><span class="specialty-switch-icon">${icon('activity')}</span><span class="specialty-label">Active Specialty</span><select id="active-specialty" aria-label="Active Specialty">${Object.entries(specialtyDefinitions).map(([id,info])=>`<option value="${id}" ${state.activeSpecialty===id?'selected':''}>${info.name}</option>`).join('')}</select></label>`}${state.role==='Doctor'?`<label class="doctor-switch"><span>Doctor</span><select id="active-doctor" aria-label="Active doctor profile">${matchingDoctors().map(d=>`<option value="${escapeHTML(d.name)}" ${state.activeDoctor===d.name?'selected':''}>${escapeHTML(d.name)}</option>`).join('')}</select></label>`:''}<div class="top-popover-anchor">${state.searchOpen?`<div class="global-search-wrap"><label class="global-search-bar">${icon('search')}<input id="global-search-input" type="search" autocomplete="off" placeholder="Search patients and invoices…" value="${escapeHTML(state.search)}" aria-label="Search patients and invoices" /></label><button class="iconbtn" data-action="search-close" aria-label="Close search">${icon('close')}</button></div>${globalSearchResults()}`:`<button class="iconbtn" data-action="search-toggle" aria-label="Open search">${icon('search')}</button>`}</div><div class="top-popover-anchor"><button class="iconbtn alert-trigger" data-action="notification-toggle" aria-label="Notifications, ${unreadAlertCount()} unread" aria-expanded="${state.notificationOpen}">${icon('bell')}${unreadAlertCount()?'<span class="unread-dot"></span>':''}</button>${state.notificationOpen?notificationDropdown():''}</div><button type="button" class="iconbtn theme-toggle" data-action="theme-toggle" aria-label="Switch to ${state.theme==='dark'?'light':'dark'} mode" aria-pressed="${state.theme==='dark'}" title="${state.theme==='dark'?'Light':'Dark'} mode">${icon(state.theme==='dark'?'sun':'moon')}</button><button type="button" class="iconbtn" data-action="open-theme-settings" aria-label="Customize accent colors" title="Customize colors">${icon('settings')}</button><span class="sync-status" id="sync-status" role="status" aria-live="polite">${escapeHTML(state.syncStatus||'Saved')}</span>${['Offline','Validation error'].includes(state.syncStatus)?btn('Retry Save','retry-save','small soft'):''}<button type="button" class="iconbtn" data-action="logout" aria-label="Sign out" title="Sign out">${icon('logout')}</button></div></div>`}
function sidebar(){return `<div class="side-overlay ${state.navOpen?'open':''}" data-action="nav-close"></div><aside class="sidebar ${state.navOpen?'open':''}"><div class="brand"><div class="brandmark">${icon('heartbeat')}</div><div><div class="brandname">MedBook <span>AI</span></div><div class="brandcaption">CLINIC EDITION</div></div></div><div class="navwrap">${navGroups.map(g=>{const items=g.items.filter(([id,, ,mod])=>(!mod||state.modules[mod])&&specialtyAllowsPage(id)&&roleCanView(id)&&(id!=='hospice'||state.patients.some(p=>p.careType==='Hospice')));return items.length?`<div class="navsection">${g.name}</div>${items.map(([id,label,ico])=>`<button class="navitem ${(clinicalTools[id]?state.page==='clinical-tools'&&state.activeTool===id:state.page===id)?'active':''}" data-page="${id}">${icon(ico,'navico')}<span>${label}</span>${clinicalTools[id]&&(state.role==='Doctor'||state.role==='Clinic Owner'||state.role==='Clinic Admin')?`<span class="badge clinical-tier ${state.role==='Doctor'?'green':'blue'}">${state.role==='Doctor'?'FREE':'PRO'}</span>`:''}${['activity','referrals','attendance','reports'].includes(id)?'<span class="newdot">NEW</span>':''}</button>`).join('')}`:''}).join('')}</div><div class="sidebar-bottom">${['OWNER','ADMIN'].includes(state.authUser?.role)?`<button type="button" class="reset-demo-btn" data-action="download-backup" title="Download an encrypted-at-rest clinic database export" aria-label="Back up clinic data">${icon('download','icon-inline')} Backup All Data</button><button type="button" class="reset-demo-btn" data-action="upload-backup" title="Restore clinic data from a MedBook JSON backup" aria-label="Restore clinic data from JSON">${icon('upload','icon-inline')} Restore from Backup</button>`:''}<input type="file" id="v24-backup-input" accept=".json,application/json" class="visually-hidden" aria-label="Select MedBook JSON backup" />
<button type="button" class="reset-demo-btn" data-action="download-import-template" title="Download CSV migration template" aria-label="Download synthetic CSV import template">${icon('download','icon-inline')} Download Import Template</button><button type="button" class="reset-demo-btn" data-action="open-import-instructions" title="Demo migration instructions" aria-label="Open synthetic data migration instructions">${icon('info','icon-inline')} Import Instructions</button>
<div class="support"><div class="support-title">${icon('shield','icon-inline')} Protected workspace</div><p>Clinic data is saved to your authenticated, encrypted database workspace.</p></div><div class="profile"><div class="avatar">${escapeHTML((state.authUser?.displayName||'CO').split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase())}</div><div><strong>${escapeHTML(state.authUser?.displayName||state.role)}</strong><small>${escapeHTML(state.authUser?.email||'Signed-in user')}</small></div>${icon('down','down')}</div></div></aside>`}
function pageHeader(title,subtitle,actions=''){return `<div class="pagehead"><div><div class="eyebrow">Clinic Workspace / ${title}</div><h1>${title}</h1><p>${subtitle}</p></div>${actions?`<div class="head-actions">${actions}</div>`:''}</div>`}
function stat(label,val,ico,foot,delta=''){return `<div class="stat"><div class="stathead"><span>${label}</span><div class="stat-icon">${icon(ico)}</div></div><div class="stat-value">${val}</div><div class="stat-foot">${delta?`<span class="delta">${delta}</span> `:''}${foot}</div></div>`}
function panel(title,subtitle='',right='',body='',extra=''){return `<section class="panel ${extra}"><div class="panel-head"><div><div class="panel-title">${title}</div>${subtitle?`<div class="panel-subtitle">${subtitle}</div>`:''}</div>${right}</div>${body}</section>`}
function appointmentTable(apps,actions=true,context='on this date'){
 const noVisits=state.role==='Doctor'&&state.activeDoctor
  ?`No appointments for ${escapeHTML(state.activeDoctor)} ${context}.`
  :`No appointments ${context} in the selected branch.`;
 return `<div class="tablewrap"><table class="table"><thead><tr><th>Patient</th><th>Time</th><th>Doctor / Service</th><th>Status</th>${actions?'<th>Action</th>':''}</tr></thead><tbody>${apps.length?apps.map(a=>`<tr data-patient-row="${escapeHTML(a.patient)}"><td><div class="row-ava"><span class="miniava green">${initials(nameFor(a.patient))}</span><span><strong>${escapeHTML(nameFor(a.patient))}</strong><small>${a.patient}</small></span></div></td><td>${a.time}</td><td><strong>${escapeHTML(a.doctor)}</strong><small>${escapeHTML(a.service)}</small></td><td>${statusBadge(appointmentStatus(a))}${appointmentHasDOS(a)?`<small class="appointment-dos">DOS: ${escapeHTML(a.actual_date_of_service)}</small>`:''}</td>${actions?`<td><div class="appointment-row-actions">${appointmentActionButtons(a)}</div></td>`:''}</tr>`).join(''):`<tr><td colspan="5"><div class="empty">${noVisits}</div></td></tr>`}</tbody></table></div>`}
function overviewBase(){const apps=todayApps().filter(a=>!['cancelled','rescheduled'].includes(appointmentStatus(a))),arr=apps.filter(arrived).length,done=apps.filter(completed).length,wait=apps.filter(a=>appointmentStatus(a)==='arrived').length;return `${pageHeader('Good morning, Clinic Team',`Here's your clinic at a glance · ${fmt(today,{weekday:'long',month:'long',day:'numeric',year:'numeric'})}`, (['Clinic Owner','Clinic Admin','Doctor','Receptionist'].includes(state.role)?btn(`${icon('plus')} New Appointment`,'new-appointment','primary'):'')+btn(`${icon('arrow')} Patient Flow`,'page:activity','soft'))}<div class="grid stats">${stat('Today\'s Appointments',apps.length,'calendar','Scheduled for today')}${stat('Patients Arrived',arr,'login','Includes completed visits')}${stat('Consultations Done',done,'check-circle','Separate from check-out')}${stat('Follow-ups Due',dueFollowups().length,'calendarclock','Pending clinician-set follow-ups')}</div><div class="grid two mt"><div>${panel('Patient visits overview','Synthetic weekly activity — demonstration',btn('View details','page:activity','small'),`<div class="panel-body"><div class="chartbox">${[40,48,55,45,65,53,60].map((v,i)=>`<div class="chartcol"><div class="chartbar dark" style="height:${v}%"></div><div class="chartbar" style="height:${v*.72}%"></div><div class="chartlabel">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]}</div></div>`).join('')}</div><div class="legend"><span><i class="legendsq"></i> Arrived</span><span><i class="legendsq light"></i> Completed</span></div></div>`)}<div class="mt">${panel('Today\'s Appointments','Appointments and arrival status',btn('View calendar','page:appointments','small'),appointmentTable(apps.slice(0,5),false,'today'))}</div></div><div>${specialtyOverviewWidget()}<div class="mt">${panel('Live Workflow','Actions update this demo instantly','',`<div class="panel-body">${[['calendar','Appointment scheduled','Patient gets a booked slot.'],['login','Patient checked in','Queue status updates on arrival.'],['clipboard','Consultation completed','Visit counts update; follow-up can be added.'],['logout','Checked out','Departure is tracked separately.']].map(x=>`<div class="activityrow"><div class="activityicon">${icon(x[0])}</div><div><strong>${x[1]}</strong><p>${x[2]}</p></div></div>`).join('')}</div>`)}</div></div>`}
function overview(){return `<div class="info orange mb" role="status"><strong>${state.expiringDx.length} ICD-10 code examples expire soon.</strong> Review fictional demo data before coding. ${btn('Coding Reference','page:coding','small soft')}</div>`+overviewBase()+`${state.activeSpecialty==='chiro'?`<div class="mt">${spinalAlignmentWidget()}</div>`:''}${state.activeSpecialty==='derm'?`<div class="mt">${dermatologyOverviewWidget()}</div>`:''}<div class="mt overview-alerts-span">${overviewAlerts()}</div>`}
function appointmentsPage(){const apps=visibleAppointments();return `${pageHeader('Appointments & Calendar','Track bookings, attendance, no-shows, reschedules and actual service dates.',btn(`${icon('plus')} New Appointment`,'new-appointment','primary'))}<div class="panel"><div class="panel-head appointments-toolbar"><div class="flex wrap"><label class="smalltext muted" for="appointment-date">${state.appointmentView==='calendar'?'Week of':'Select date'}</label><input class="field" id="appointment-date" type="date" value="${state.appointmentDate}" style="width:165px" /></div><div class="pill-row"><div class="segmented-group" aria-label="Appointment layout"><button data-action="calendar-view:list" class="segment-btn ${state.appointmentView==='list'?'selected':''}" aria-pressed="${state.appointmentView==='list'}">${icon('clipboard')} List View</button><button data-action="calendar-view:calendar" class="segment-btn ${state.appointmentView==='calendar'?'selected':''}" aria-pressed="${state.appointmentView==='calendar'}">${icon('calendar')} Calendar View</button></div>${state.appointmentView==='calendar'?`${btn('← Prev week','calendar-prev','small')}${btn('Next week →','calendar-next','small')}`:btn('Today','today','small soft')}${btn('Queue','page:queue','small')}</div></div>${state.appointmentView==='calendar'?appointmentWeekGrid():appointmentTable(apps,true,'on the selected date')}</div><div class="grid appointment-stats mt">${stat('Total Bookings',apps.filter(a=>!['cancelled','rescheduled'].includes(appointmentStatus(a))).length,'calendar','On selected date')}${stat('Arrived',apps.filter(arrived).length,'login','Includes active visits')}${stat('Completed',apps.filter(completed).length,'check-circle','Completed consultations')}${stat('No-Shows',apps.filter(noShow).length,'info','Missed appointments')}${stat('Rescheduled',apps.filter(a=>appointmentStatus(a)==='rescheduled').length,'calendar','Moved to another slot')}</div>`}
function doctorDashboardRangeStart(){
 if(state.doctorDashboardRange==='all')return '0000-01-01';
 if(state.doctorDashboardRange==='today')return dateNow;
 const current=new Date(`${dateNow}T12:00:00`);
 if(state.doctorDashboardRange==='week'){const monday=(current.getDay()+6)%7;current.setDate(current.getDate()-monday);return iso(current)}
 if(state.doctorDashboardRange==='month')return `${dateNow.slice(0,7)}-01`;
 const days=state.doctorDashboardRange==='7d'?6:29;current.setDate(current.getDate()-days);return iso(current);
}
function doctorDashboardTable(rows,kind){
 if(!rows.length)return '<div class="empty">No appointment records in this period.</div>';
 return `<div class="tablewrap"><table class="table"><thead><tr><th>Patient</th><th>Scheduled Date</th><th>Actual DOS</th><th>Service</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows.map(a=>{
  const status=appointmentStatus(a);
  const actions=kind==='no-show'
   ? status==='no_show'?`${btn('Reschedule',`reschedule:${a.id}`,'small primary')}${btn('Correct',`correct-attendance:${a.id}`,'small soft')}`:'<span class="muted">Rescheduled after No-Show</span>'
   :kind==='visited'?`${btn('Open Encounter',`encounter-open-appointment:${a.id}`,'small soft')}${btn('Correct DOS',`correct-dos:${a.id}`,'small ghost')}`
   :kind==='missing-dos'?btn('Verify DOS',`correct-dos:${a.id}`,'small primary'):'<span class="muted">—</span>';
  const dosCell=kind==='missing-dos'&&a.actual_date_of_service?`<span class="badge orange">Unverified ${escapeHTML(a.actual_date_of_service)}</span>`:escapeHTML(a.actual_date_of_service||'—');
  return `<tr><td><strong>${escapeHTML(nameFor(a.patient))}</strong><small>${escapeHTML(a.patient)}</small></td><td>${escapeHTML(a.date)}</td><td>${dosCell}</td><td>${escapeHTML(a.service||'Clinic visit')}</td><td>${statusBadge(status)}</td><td>${actions}</td></tr>`;
 }).join('')}</tbody></table></div>`;
}
function doctorDashboardPage(){
 const doctors=state.staff.filter(d=>d.role==='Doctor'&&(state.branch==='All branches'||d.branch===state.branch));
 const doctor=state.role==='Doctor'?state.activeDoctor:(doctors.some(d=>d.name===state.doctorDashboardDoctor)?state.doctorDashboardDoctor:(doctors[0]?.name||''));
 const start=doctorDashboardRangeStart();
 const source=state.appointments.filter(a=>a.doctor===doctor&&(state.branch==='All branches'||a.branch===state.branch));
 const createdDate=a=>String(a.created_on||a.created_at||a.createdAt||a.date||'').slice(0,10);
 const bookings=source.filter(a=>createdDate(a)>=start&&createdDate(a)<=dateNow).sort((a,b)=>createdDate(b).localeCompare(createdDate(a)));
 const visited=source.filter(a=>completed(a)&&appointmentHasDOS(a)&&a.actual_date_of_service>=start&&a.actual_date_of_service<=dateNow).sort((a,b)=>b.actual_date_of_service.localeCompare(a.actual_date_of_service));
 const missed=source.filter(a=>noShow(a)&&a.date>=start&&a.date<=dateNow).sort((a,b)=>b.date.localeCompare(a.date));
 const rescheduled=source.filter(a=>appointmentStatus(a)==='rescheduled'&&String(a.rescheduled_on||a.rescheduled_at||a.date).slice(0,10)>=start&&String(a.rescheduled_on||a.rescheduled_at||a.date).slice(0,10)<=dateNow).sort((a,b)=>String(b.rescheduled_on||b.rescheduled_at||b.date).localeCompare(String(a.rescheduled_on||a.rescheduled_at||a.date)));
 const cancelled=source.filter(a=>appointmentStatus(a)==='cancelled'&&String(a.cancelled_on||a.cancelled_at||a.date).slice(0,10)>=start&&String(a.cancelled_on||a.cancelled_at||a.date).slice(0,10)<=dateNow).sort((a,b)=>String(b.cancelled_on||b.cancelled_at||b.date).localeCompare(String(a.cancelled_on||a.cancelled_at||a.date)));
 const completedMissingDOS=source.filter(a=>completed(a)&&!appointmentHasDOS(a)&&a.date>=start&&a.date<=dateNow);
 const rangeLabel=state.doctorDashboardRange==='all'?'All time':state.doctorDashboardRange==='today'?'Daily · Today':state.doctorDashboardRange==='week'?'Weekly · This week':'Monthly · This month';
 return `${pageHeader('Doctor Dashboard','Review new bookings, completed visits using actual service dates, missed appointments and reschedules.',`<span class="badge blue">${escapeHTML(doctor||'No doctor selected')}</span>`)}<div class="panel doctor-dashboard-filters"><div class="panel-body"><div class="report-dates"><label>Doctor ${state.role==='Doctor'?`<input class="field" value="${escapeHTML(doctor)}" disabled />`:`<select class="field" id="doctor-dashboard-doctor">${doctors.map(d=>`<option value="${escapeHTML(d.name)}" ${d.name===doctor?'selected':''}>${escapeHTML(d.name)}</option>`).join('')}</select>`}</label><label>Reporting period <select class="field" id="doctor-dashboard-range"><option value="today" ${state.doctorDashboardRange==='today'?'selected':''}>Daily · Today</option><option value="week" ${state.doctorDashboardRange==='week'?'selected':''}>Weekly · This week</option><option value="month" ${state.doctorDashboardRange==='month'?'selected':''}>Monthly · This month</option><option value="all" ${state.doctorDashboardRange==='all'?'selected':''}>All time</option></select></label><span class="muted tiny">${rangeLabel} · through ${dateNow} · clinic timezone ${escapeHTML(state.authUser?.organization?.timezone||'UTC')}</span></div></div></div><div class="grid stats doctor-stats mt">${stat('Total New Bookings',bookings.length,'calendar',`${new Set(bookings.map(a=>String(a.patient))).size} unique patients · By booking date`)}${stat('Visited / Completed',visited.length,'check-circle',`${new Set(visited.map(a=>String(a.patient))).size} unique patients · By Actual DOS`)}${stat('No-Shows',missed.length,'info',`${new Set(missed.map(a=>String(a.patient))).size} unique patients · Includes later reschedules`)}${stat('Rescheduled',rescheduled.length,'calendar','Original bookings moved')}${stat('Cancelled',cancelled.length,'close','Cancelled bookings')}</div><div class="grid two mt doctor-dashboard-sections"><div>${panel('New Bookings',`${bookings.length} appointments created in ${rangeLabel.toLowerCase()}`,'',doctorDashboardTable(bookings,'bookings'))}<div class="mt">${panel('Visited / Completed',`${visited.length} completed visits · Actual Date of Service`, '',doctorDashboardTable(visited,'visited'))}</div><div class="mt">${panel('Completed visits needing DOS verification',`${completedMissingDOS.length} completed visit(s) have no confirmed Actual DOS`,'',doctorDashboardTable(completedMissingDOS,'missing-dos'))}</div></div><div>${panel('No-Shows',`${missed.length} missed appointments · including those later rescheduled`,'',doctorDashboardTable(missed,'no-show'))}<div class="mt">${panel('Rescheduled Appointments',`${rescheduled.length} original booking(s) moved to a new appointment`,'',doctorDashboardTable(rescheduled,'rescheduled'))}</div><div class="mt">${panel('Cancelled Appointments',`${cancelled.length} cancelled booking(s)`,'',doctorDashboardTable(cancelled,'cancelled'))}</div></div></div><div class="info mt">New bookings use the booking-created date. Completed visits use <strong>actual_date_of_service</strong>. No-shows use the scheduled appointment date. Rescheduled and cancelled bookings remain separate from visits and billable DOS.</div>`;
}
function queuePage(){const apps=todayApps(),waiting=apps.filter(a=>appointmentStatus(a)==='arrived'),inConsult=apps.filter(a=>appointmentStatus(a)==='in-consultation'),completedApps=apps.filter(completed);return `${pageHeader('Patient Queue & Check-In','Keep waiting rooms organized and distinguish arrival, consultation and departure.',btn(`${icon('calendar')} Appointments`,'page:appointments','soft'))}<div class="grid stats">${stat('Booked Today',apps.filter(a=>!['cancelled','rescheduled'].includes(appointmentStatus(a))).length,'calendar','Both clinic branches')}${stat('Checked In',apps.filter(arrived).length,'login','Includes later stages')}${stat('Waiting',waiting.length,'clock','Arrived, not yet called')}${stat('Checked Out',apps.filter(a=>appointmentStatus(a)==='checked-out').length,'logout','Departure confirmed')}</div><div class="grid three mt"><div>${panel('Waiting Room',`${waiting.length} patient(s) waiting`,'',`<div class="panel-body">${waiting.length?waiting.map((a,i)=>`<div class="queuecard"><div class="queuenum">${String(i+1).padStart(2,'0')}</div><div class="queuecontent"><strong>${nameFor(a.patient)}</strong><small>${a.time} · ${a.doctor}</small></div>${roleCanView('consultation')?btn('Start visit',`start-visit:${a.id}`,'small primary'):'<span class="muted">Awaiting clinician</span>'}</div>`).join(''):'<div class="empty">No patients waiting right now.</div>'}</div>`)}</div><div>${panel('With Doctor',`${inConsult.length} ongoing visit(s)`,'',`<div class="panel-body">${inConsult.length?inConsult.map(a=>`<div class="queuecard"><div class="queuenum">${icon('clipboard')}</div><div class="queuecontent"><strong>${nameFor(a.patient)}</strong><small>${a.doctor}</small></div>${roleCanView('consultation')?btn('Open','page:consultation','small soft'):'<span class="muted">Clinician workspace</span>'}</div>`).join(''):'<div class="empty">No consultation in progress.</div>'}</div>`)}</div><div>${panel('Consultation Completed',`${completedApps.length} finished consultation(s)`,'',`<div class="panel-body">${completedApps.length?completedApps.map(a=>`<div class="queuecard"><div class="queuenum">${icon('check')}</div><div class="queuecontent"><strong>${nameFor(a.patient)}</strong><small>${appointmentStatus(a)==='checked-out'?'Departed':'Still in clinic'}</small></div>${appointmentStatus(a)==='completed'&&['Clinic Owner','Clinic Admin','Receptionist'].includes(state.role)?btn('Check out',`check-out:${a.id}`,'small soft'):statusBadge(appointmentStatus(a))}</div>`).join(''):'<div class="empty">No completed visits yet.</div>'}</div>`)}</div></div><div class="info mt">${icon('info','icon-inline')} Reception check-in only confirms arrival. A consultation is complete only after clinician sign-off; departure is separately marked at check-out.</div>`}
function patientsPage(){let list=eligiblePatients().filter(p=>state.patientFilter==='All'||(state.patientFilter==='Active'?activePatient(p):!activePatient(p)));return `${pageHeader('Patient Records','Find patients, view visit history and understand engagement status.', ['Clinic Owner','Clinic Admin','Receptionist'].includes(state.role)?btn(`${icon('plus')} Add Patient`,'new-patient','primary'):'')}<div class="panel"><div class="panel-head"><div class="search">${icon('search')}<input id="filter-input" placeholder="Search name or patient ID…" /></div><select class="select" id="patient-filter"><option ${state.patientFilter==='All'?'selected':''}>All</option><option ${state.patientFilter==='Active'?'selected':''}>Active</option><option ${state.patientFilter==='Inactive'?'selected':''}>Inactive</option></select></div><div class="tablewrap"><table class="table"><thead><tr><th>Patient</th><th>Age / Gender</th><th>Assigned Doctor</th><th>Last completed visit</th><th>Activity</th><th>Profile</th></tr></thead><tbody>${list.map(p=>`<tr class="filterable" data-patient-row="${escapeHTML(p.id)}"><td><div class="row-ava"><span class="miniava ${p.age>40?'warm':'green'}">${initials(p.name)}</span><span><strong>${escapeHTML(p.name)}</strong><small>${p.id}</small></span></div></td><td>${p.age} · ${p.sex}</td><td>${p.doctor}<small>${p.branch}</small></td><td>${lastVisitLabel(p)}</td><td>${statusBadge(activePatient(p)?'active':'inactive')}</td><td>${btn('View',`patient:${p.id}`,'small soft')}</td></tr>`).join('')}</tbody></table></div></div><div class="info mt">${icon('info','icon-inline')} Activity is an administrative engagement indicator, not a clinical condition. This page uses a configurable ${state.patientWindow}-day completed-visit window.</div>`}
function consultationPage(){const app=activeEncounterAppointment(); const selected=state.selectedEncounterPatientId&&reportablePatients().find(p=>p.id===state.selectedEncounterPatientId);const person=(app?patient(app.patient):selected)||(eligiblePatients()[0]||{id:'—',name:'No assigned demo patient',age:'—',sex:'—'});return `${pageHeader('Consultation Workspace','A focused workflow for clinician-reviewed notes and prescriptions.',`${btn('All Encounters','page:encounters','soft')} ${btn(`${icon('spark')} Draft Assistant`,'page:ai','soft')}`)}<div class="grid two"><div>${panel('Encounter Notes',`${person.name} · ${person.id} · Demo patient`,statusBadge(app?appointmentStatus(app):'scheduled'),`<div class="panel-body"><div class="formgrid"><div class="formgroup"><label class="label">Chief concern</label><input class="field" value="Routine consultation" disabled /></div><div class="formgroup"><label class="label">Consultation date</label><input class="field" value="${app?escapeHTML(app.date):fmt(today)}" disabled /></div><div class="formgroup wide"><label class="label">Clinical notes (synthetic placeholder)</label><textarea class="field" id="clinical-note" rows="8" ${encounterFor(person.id,app?.id)?.status==='Signed'?'readonly':''} placeholder="Enter clinical notes…">${escapeHTML(state.note)}</textarea><div class="help">This draft is saved to the clinic workspace as sample data. It is not a signed clinical note; never enter real patient information until production controls are independently approved.</div></div></div><div class="pill-row mt">${btn('Save draft','save-note','soft')}${app&&appointmentStatus(app)==='in-consultation'?btn('Complete consultation',`complete-visit:${app.id}`,'primary'):app&&appointmentStatus(app)==='arrived'?btn('Start consultation',`start-visit:${app.id}`,'primary'):app&&completed(app)?`<span class="badge green">Actual DOS ${escapeHTML(app.actual_date_of_service||'not recorded')}</span>`:'<span class="muted tiny">No active visit selected</span>'}${btn('Add follow-up',`new-followup:${person.id}`)}</div></div>`)}<div class="mt">${panel('Prescription Draft','Synthetic items — clinician review required','',`<div class="panel-body">${state.prescriptions.length?`<div class="prescription-list" aria-label="Prescription draft items">${state.prescriptions.map(item=>`<div class="prescription-item"><div class="prescription-item-info"><strong>${escapeHTML(item.name)}</strong><span>${escapeHTML(item.dosage)} · ${escapeHTML(item.frequency)}</span></div>${btn('Remove',`prescription-remove:${item.id}`,'small soft')}</div>`).join('')}</div>`:'<div class="note-card"><h4>No draft items yet</h4><p>Add a fictional medicine to preview the prescription draft layout.</p></div>'}<div class="pill-row mt">${btn(`${icon('plus')} Add Draft Item`,'prescription-add','soft')}</div><p class="prescription-disclaimer">Sample prescription draft data is saved to the clinic workspace. It is not a valid prescription and is never transmitted to a pharmacy.</p></div>`)}</div></div><div>${panel('Patient Overview','Scoped to this example encounter','',`<div class="panel-body"><div class="flex"><div class="miniava green" style="width:48px;height:48px;font-size:15px">${initials(person.name)}</div><div><strong>${person.name}</strong><div class="subtitle">${person.age} years · ${person.sex}</div></div></div><div class="line"></div>${[['Patient ID',person.id],['Assigned doctor',person.doctor],['Branch',person.branch],['Last completed visit',fmt(addDays(person.last))]].map(([l,v])=>`<div class="listrow"><span class="muted">${l}</span><strong>${v}</strong></div>`).join('')}<div class="info mt">Clinical AI outputs require qualified clinician review before being stored or used. This demo never connects to an AI provider.</div></div>`)}<div class="mt">${panel('Encounter Steps','Illustrative clinical workflow','',`<div class="panel-body"><div class="timeline"><div class="timeline-item"><strong>Patient checked in</strong><p>Reception arrival event.</p></div><div class="timeline-item"><strong>Clinician begins consultation</strong><p>Access restricted to authorized care team.</p></div><div class="timeline-item"><strong>Clinician signs / completes encounter</strong><p>Updates completed count and activity metrics.</p></div><div class="timeline-item"><strong>Reception marks departure</strong><p>Different from encounter completion.</p></div></div></div>`)}</div></div></div>${encounterWorkspaceHTML(person,app?.id)}`}
function activityPage(){const list=eligiblePatients(),active=list.filter(activePatient).length,inactive=list.length-active;const apps=todayApps();return `${pageHeader('Patient Flow & Engagement','One connected view of appointments, arrivals, completed visits and follow-up needs.',btn(`${icon('calendarclock')} Add follow-up`,'new-followup','primary'))}<div class="grid stats">${stat('Active Patients',active,'users',`Completed visit in last ${state.patientWindow} days`)}${stat('Inactive Patients',inactive,'clock',`No completed visit in ${state.patientWindow} days`)}${stat('Arrived Today',apps.filter(arrived).length,'login','Includes later stages')}${stat('Follow-ups Overdue',dueFollowups().length,'calendarclock','Not yet completed')}</div><div class="grid two mt"><div>${panel('Patient Engagement', 'Configurable reporting window', `<div class="flex"><label class="muted tiny">Active period</label><select class="select" id="patient-window">${[30,60,90,180,365].map(n=>`<option value="${n}" ${state.patientWindow===n?'selected':''}>${n} days</option>`).join('')}</select></div>`,`<div class="panel-body"><div class="spaced" style="justify-content:flex-start;gap:28px;flex-wrap:wrap"><div class="donut" style="background:conic-gradient(#63997c 0 ${Math.round(active/Math.max(1,list.length)*100)}%,#dbece1 ${Math.round(active/Math.max(1,list.length)*100)}% 100%)"><div class="donutcenter">${active}/${list.length}<small>Active</small></div></div><div style="flex:1;min-width:180px"><div class="listrow"><span>Active patients</span><strong>${active}</strong></div><div class="listrow"><span>Inactive patients</span><strong>${inactive}</strong></div><div class="listrow"><span>Completed visits today</span><strong>${apps.filter(completed).length}</strong></div><div class="listrow"><span>Checked out today</span><strong>${apps.filter(a=>appointmentStatus(a)==='checked-out').length}</strong></div><p class="notice">Completion changes the last-visit date; booking or arrival alone does not.</p></div></div></div>`)}<div class="mt">${panel('Visit Workflow','Events that power the linked dashboard','',`<div class="panel-body"><div class="stepper">${[['calendar','Booked'],['login','Checked in'],['clipboard','With Doctor'],['check-circle','Completed'],['logout','Checked out']].map((s,i)=>`<div class="step ${i<3?'done':''}"><div class="round">${icon(s[0])}</div><span>${s[1]}</span></div>`).join('')}</div><div class="info mt">Data originates from appointments, queue, signed encounters and clinic check-out. Dashboard figures are derived rather than typed manually.</div></div>`)}</div></div><div>${panel('Follow-up Tracker',`${dueFollowups().length} overdue / due now`,btn('New follow-up','new-followup','small'),`<div class="panel-body"><div class="pill-row mb"><select class="select" id="followup-filter"><option ${state.followupFilter==='All'?'selected':''}>All</option><option ${state.followupFilter==='Due'?'selected':''}>Due</option><option ${state.followupFilter==='Upcoming'?'selected':''}>Upcoming</option><option ${state.followupFilter==='Completed'?'selected':''}>Completed</option></select></div>${state.followups.filter(f=>{if((state.branch!=='All branches'&&patient(f.patient)?.branch!==state.branch)||!doctorAllowed(f.doctor))return false;if(state.followupFilter==='Due')return f.status==='pending'&&f.date<=dateNow;if(state.followupFilter==='Upcoming')return f.date>dateNow;if(state.followupFilter==='Completed')return f.status==='completed';return true}).map(f=>`<div class="queuecard"><div class="queuecontent"><strong>${nameFor(f.patient)}</strong><small>${fmt(f.date)} · ${f.reason}</small></div><div style="text-align:right">${statusBadge(f.status==='pending'&&f.date<dateNow?'overdue':f.status)}${f.status==='pending'?`<div style="margin-top:6px">${btn('Complete',`followup-complete:${f.id}`,'small')}</div>`:''}</div></div>`).join('')||'<div class="empty">No follow-ups in this filter.</div>'}</div>`)}</div></div><div class="mt">${panel('Patient Engagement List','Illustrative administrative status',btn('Open patient records','page:patients','small'),`<div class="tablewrap"><table class="table"><thead><tr><th>Patient</th><th>Last Visit</th><th>Engagement</th><th>Branch</th></tr></thead><tbody>${list.map(p=>`<tr><td><strong>${p.name}</strong><small>${p.id}</small></td><td>${lastVisitLabel(p)}</td><td>${statusBadge(activePatient(p)?'active':'inactive')}</td><td>${p.branch}</td></tr>`).join('')}</tbody></table></div>`)}</div>`}
function attendancePage(){const here=state.staff.filter(s=>s.status==='checked-in').length;return `${pageHeader('Doctor & Staff Attendance','One system for doctors, nurses, receptionists, management and support teams.',btn(`${icon('download')} Export sample`,'export-sample','soft'))}<div class="grid stats">${stat('Total Staff',state.staff.length,'users','Across authorized branches')}${stat('On Duty',here,'check-circle','Checked in now')}${stat('Not Checked In',state.staff.filter(s=>s.status==='not-checked-in').length,'clock','Not marked present')}${stat('Checked Out',state.staff.filter(s=>s.status==='checked-out').length,'logout','Shift finished')}</div><div class="panel mt"><div class="panel-head"><div><div class="panel-title">Today’s Attendance Register</div><div class="panel-subtitle">Demo self-service check-in/out with audit-oriented controls</div></div>${btn(`${icon('clock')} Attendance Settings`,'attendance-settings','small')}</div><div class="tablewrap"><table class="table"><thead><tr><th>Team member</th><th>Role / Branch</th><th>Assigned shift</th><th>First check-in</th><th>Status</th><th>Action</th></tr></thead><tbody>${state.staff.filter(s=>state.branch==='All branches'||state.branch===s.branch).map(s=>`<tr><td><div class="row-ava"><span class="miniava green">${initials(s.name)}</span><strong>${s.name}</strong></div></td><td>${s.role}<small>${s.branch}</small></td><td>${s.shift}</td><td>${s.time}</td><td>${statusBadge(s.status)}</td><td>${!['Clinic Owner','Clinic Admin'].includes(state.role)?'<span class="muted">Supervisor only</span>':s.status==='checked-in'?btn('Check out',`staff-out:${s.id}`,'small soft'):s.status==='not-checked-in'?btn('Check in',`staff-in:${s.id}`,'small primary'):btn('View','attendance-log','small')}</td></tr>`).join('')}</tbody></table></div></div><div class="grid equal mt">${panel('Attendance Policies','Role-specific approvals and audit records','',`<div class="panel-body">${[['Individual check-in','Each staff member has their own attendance identity'],['Supervisor corrections','Changes require a reason and authorized approval'],['Branch-scoped reporting','Managers only see assigned branch data'],['Privacy-by-default','No biometric or GPS tracking in the default module']].map(([a,b])=>`<div class="activityrow"><div class="activityicon">${icon('shield')}</div><div><strong>${a}</strong><p>${b}</p></div></div>`).join('')}</div>`)}${panel('Sample Weekly Snapshot','Illustrative attendance; not a real payroll record','',`<div class="panel-body"><div class="report-grid">${[['Mon','5/6'],['Tue','6/6'],['Wed','5/6'],['Thu','4/6'],['Fri','6/6'],['Sat','2/6'],['Sun','0/6']].map(x=>`<div class="bar-day"><strong>${x[1]}</strong>${x[0]}</div>`).join('')}</div><div class="info mt">Attendance is independent of clinical permission. A clinic manager can approve staff time corrections without being able to read patient notes.</div></div>`)}</div>`}
function referralPage(){const verified=referrals.filter(r=>r.status==='verified').length;return `${pageHeader('Doctor Referral Rewards','Doctor-to-doctor subscription referral program with payment verification and anti-abuse checks.',btn(`${icon('copy')} Copy referral link`,'copy-referral','primary'))}<div class="grid equal"><div><div class="referral-box"><div class="tiny" style="letter-spacing:1.2px;font-weight:800;color:#dbeddf">REFER & REWARD</div><h2>Earn a 45% subscription discount.</h2><p>When an eligible referred doctor activates a verified paid MedBook AI subscription, the referring doctor can earn the configured reward.</p><div class="copyline"><code>medbook.example/ref/DR-DEMO-45</code><button data-action="copy-referral">${icon('copy','icon-inline')} Copy</button></div></div></div><div class="grid equal">${stat('Referrals Sent',referrals.length,'gift','Demo referral accounts')}${stat('Verified Paid',verified,'check-circle','Eligible subscriptions')}${stat('Awaiting Payment',referrals.filter(r=>r.status==='pending').length,'clock','No reward until verified')}${stat('Example Reward','45%','receipt','Discount applied subject to rules')}</div></div><div class="mt">${panel('Referral Activity','Sample referral statuses; no payments processed',btn('Program rules','referral-rules','small'),`<div class="tablewrap"><table class="table"><thead><tr><th>Referred doctor</th><th>Registration</th><th>Subscription</th><th>Payment verification</th><th>Reward</th></tr></thead><tbody>${referrals.map(r=>`<tr><td><strong>${r.name}</strong><small>Doctor-to-doctor referral</small></td><td>${r.joined}</td><td>${r.plan}</td><td>${statusBadge(r.status)}</td><td>${r.reward}</td></tr>`).join('')}</tbody></table></div>`)}</div><div class="info orange mt">${icon('info','icon-inline')} Business rules still to be approved: discount duration, stacking/caps, eligible beneficiary billing account and refund handling. No incentive for patient referrals or clinical decisions. Verified payment and anti-self-referral protections are required.</div>`}
function billableAppointments(){
 return state.appointments.filter(a=>appointmentAllowed(a)&&completed(a)&&appointmentHasDOS(a)&&!state.invoices.some(inv=>String(inv.appointmentId)===String(a.id))).sort((a,b)=>b.actual_date_of_service.localeCompare(a.actual_date_of_service));
}
function billingPage(){
 const visible=state.invoices.filter(i=>eligiblePatients().some(p=>p.id===i.patientId));
 const paid=visible.filter(i=>i.status==='Paid'),pending=visible.filter(i=>i.status==='Pending');
 return `${pageHeader('Billing & Invoices','Create invoices only against completed visits with a verified Actual Date of Service.',btn(`${icon('plus')} New demo invoice`,'new-invoice','primary'))}
 <div class="grid three">${stat('Demo Invoices',visible.length,'receipt','Active specialty patients')}${stat('Marked Paid',paid.length,'check-circle','Sample records')}${stat('Pending',pending.length,'clock','No actual payment handling')}</div>
 <div class="mt">${panel('Recent Invoices','Verified Actual DOS is copied from the completed appointment and is never inferred from the booking date.','',`<div class="tablewrap"><table class="table"><thead><tr><th>Invoice</th><th>Patient</th><th>Appointment</th><th>Actual DOS</th><th>Total</th><th>Status</th><th>Details</th></tr></thead><tbody>${visible.map(i=>`<tr><td><strong>${escapeHTML(i.id)}</strong></td><td>${escapeHTML(nameFor(i.patientId))}</td><td>${i.appointmentId?`#${escapeHTML(i.appointmentId)}`:'—'}</td><td>${i.dos_verified===false?`<span class="badge orange">Unverified ${escapeHTML(i.actual_date_of_service||'legacy DOS')}</span>`:escapeHTML(i.actual_date_of_service||'—')}</td><td>$${invoiceTotal(i).toFixed(2)}</td><td>${statusBadge(i.status==='Paid'?'verified':'pending')}</td><td>${btn('View invoice',`invoice:${i.id}`,'small soft')}</td></tr>`).join('')||'<tr><td colspan="7"><div class="empty">No invoices for this specialty.</div></td></tr>'}</tbody></table></div>`)}</div>
 <div class="info mt">Only completed appointments with a verified actual DOS can create a new invoice. Existing legacy invoices without an appointment link or DOS remain visible for reference only. Recording a payment updates the local demo only; no payment gateway or ledger is connected.</div>`;
}
function siteCard(){const w=state.website;const style=`--site-accent:${w.color}`;return `<div class="clinic-preview ${w.mobile?'mobile-site':''}" style="${style}"><div class="sitebar"><div class="sitelogo" data-preview="name">${escapeHTML(w.name)}</div><div class="sitelinks"><span>Home</span><span>Services</span><span>Our Doctors</span><span>Contact</span></div></div><div class="site-hero"><div class="site-copy"><span class="badge green" style="background:#ffffffc9">Your health, our priority</span><h2>Care that feels <span style="color:${w.color}">personal.</span></h2><p data-preview="tagline">${escapeHTML(w.tagline)}</p><button class="btn primary small" data-action="site-book">Book Appointment ${icon('arrow','icon-inline')}</button></div><div class="site-portrait">${icon('heartbeat')}</div></div>${w.services?`<div class="website-services">${[['heartbeat','Family medicine'],['calendar','Online booking'],['users','Experienced doctors']].map(([ic,t])=>`<div class="service-tile">${icon(ic)}${t}</div>`).join('')}</div>`:''}</div>`}
function builderPage(){return `${pageHeader('Hybrid Website Builder','Edit branding and predefined sections while preserving a responsive, safe layout.',btn(`${icon('eye')} Preview website`,'preview-site','soft')+btn(`${icon('upload')} ${state.website.published?'Unpublish demo':'Publish demo'}`,'publish-site','primary'))}<div class="grid two" style="grid-template-columns:minmax(310px,0.7fr) minmax(0,1.3fr)"><div>${panel('Website Settings','Changes appear in the demo preview', '',`<div class="panel-body"><div class="formgroup"><label class="label">Clinic display name</label><input class="field" id="site-name" maxlength="80" value="${escapeHTML(state.website.name)}" /></div><div class="formgroup mt"><label class="label">Hero description</label><textarea class="field" id="site-tagline" rows="3" maxlength="160">${escapeHTML(state.website.tagline)}</textarea></div><div class="formgroup mt"><label class="label">Brand accent</label><div class="pill-row">${['#4f806c','#4a7f96','#957c68','#806b99'].map(c=>`<button aria-label="Set color ${c}" data-action="site-color:${c}" style="height:29px;width:29px;border-radius:9px;background:${c};border:3px solid ${state.website.color===c?'#d7e8dc':'#fff'};box-shadow:0 0 0 1px #e2eae3"></button>`).join('')}</div></div><div class="listrow mt"><div><strong>Services section</strong><div class="notice">Reusable content block</div></div><label class="switch"><input id="site-services" type="checkbox" ${state.website.services?'checked':''}/><span class="switchslider"></span></label></div><div class="info mt">Approved hybrid editor: templates, reusable sections, controlled editing and section ordering — not unrestricted drag-and-drop.</div></div>`)}<div class="mt">${panel('Suggested Next Steps','Basic SEO is part of the website builder','',`<div class="panel-body"><div class="listrow"><span>${icon('search','icon-inline')} SEO title & metadata</span>${btn('Open','page:seo','small')}</div><div class="listrow"><span>${icon('chart','icon-inline')} Website analytics</span>${btn('Open','page:analytics','small')}</div><div class="listrow"><span>${icon('calendar','icon-inline')} Public booking</span><span class="badge">Demo only</span></div></div>`)}</div></div><div>${panel('Responsive Website Preview','Fictional template — no public website is deployed',`<div class="device"><button data-action="device:desktop" class="${state.website.mobile?'':'active'}" aria-label="Desktop">${icon('monitor')}</button><button data-action="device:mobile" class="${state.website.mobile?'active':''}" aria-label="Mobile">${icon('smartphone')}</button></div>`,`<div class="panel-body">${siteCard()}<div class="spaced mt"><span class="badge ${state.website.published?'green':'orange'}">${state.website.published?'Published locally (demo)':'Draft · Not publicly published'}</span><span class="notice">Preview uses no external assets</span></div></div>`)}</div></div>`}
function seoPage(){const x=state.seo,score=(x.title.length>=30&&x.title.length<=60?30:15)+(x.description.length>=70&&x.description.length<=160?30:15)+(x.slug.includes('-')?20:10)+20;return `${pageHeader('SEO & Google Indexing','Search-friendly settings, site health checks and Search Console readiness.',btn(`${icon('globe')} Website Builder`,'page:builder','soft'))}<div class="grid two"><div>${panel('Page SEO Settings','Editable website page metadata','',`<div class="panel-body"><div class="formgroup"><label class="label">SEO title <span class="muted tiny">(${x.title.length}/60)</span></label><input class="field" id="seo-title" maxlength="85" value="${escapeHTML(x.title)}" /></div><div class="formgroup mt"><label class="label">Meta description <span class="muted tiny">(${x.description.length}/160)</span></label><textarea class="field" id="seo-desc" rows="4" maxlength="220">${escapeHTML(x.description)}</textarea></div><div class="formgroup mt"><label class="label">Page slug</label><input class="field" id="seo-slug" value="${escapeHTML(x.slug)}" /></div><div class="pill-row mt">${btn('Update preview','seo-update','primary')}${btn('Sitemap sample','sitemap','soft')}</div></div>`)}<div class="mt">${panel('Search Result Preview','Example only; Google may display it differently','',`<div class="panel-body"><div class="seo-preview"><div class="url">https://yourclinic.example/${escapeHTML(x.slug)}</div><h3>${escapeHTML(x.title)}</h3><p>${escapeHTML(x.description)}</p></div></div>`)}</div></div><div>${panel('Technical SEO Checklist','These indicators are prototype examples',`<span class="badge green">${score}/100 demo score</span>`,`<div class="panel-body"><div class="progress"><div class="bar" style="width:${score}%"></div></div><div style="margin-top:16px">${[['check','XML sitemap generator'],['check','robots.txt publishing'],['check','Canonical URLs'],['check','Mobile-friendly templates'],['check','Clinic / doctor structured data'],['clock','Search Console connection (not connected)'],['clock','Google indexing verification (not connected)']].map(([ic,t])=>`<div class="check-item">${icon(ic)}<span>${t}</span>${ic==='clock'?'<span class="badge orange" style="margin-left:auto">Setup</span>':''}</div>`).join('')}</div><div class="info mt">Google indexing and rankings are not guaranteed. Search Console setup requires explicit clinic-owned Google authorization; no API integration exists in this prototype.</div></div>`)}<div class="mt">${panel('Search Visibility','Planned integration options','',`<div class="panel-body">${[['Sitemap status','Example: ready to generate'],['Index coverage','Connect Search Console'],['Search impressions','Connect Search Console'],['Google Business Profile','Setup guidance only']].map(([a,b])=>`<div class="listrow"><strong>${a}</strong><span class="muted">${b}</span></div>`).join('')}</div>`)}</div></div></div>`}
function analyticsPage(){return `${pageHeader('Website Analytics','GA4-style public website dashboard using fictional sample metrics.',btn(`${icon('settings')} Connection settings`,'analytics-info','soft'))}<div class="info mb">${icon('info','icon-inline')} Sample data only. Google Analytics 4 is <strong>not connected</strong>. Do not send patient names, appointment details, diagnoses or PHI to analytics.</div><div class="grid stats">${stat('Website Visitors','2,480','users','Example • Last 30 days', '+12.8%')}${stat('Page Views','7,360','eye','Example • Last 30 days','+8.1%')}${stat('Booking Clicks','186','calendar','Example clicks, not confirmed visits','+5.3%')}${stat('Avg. Engagement','2m 24s','clock','Illustrative only')}</div><div class="grid two mt"><div>${panel('Traffic Over Time','Sample daily visitor data','',`<div class="panel-body"><div class="chartbox">${[42,47,38,62,68,52,65,58,63,70,60,80,73,68].map((v,i)=>`<div class="chartcol"><div class="chartbar dark" style="height:${v}%"></div>${i%2===0?`<div class="chartlabel">${i+1}</div>`:''}</div>`).join('')}</div><div class="legend"><span><i class="legendsq"></i> Visitors (sample)</span></div></div>`)}<div class="mt">${panel('Most Viewed Public Pages','Sample results, excludes private clinical routes','',`<div class="panel-body">${[['Homepage','1,964'],['Our Services','1,152'],['Meet Our Doctors','908'],['Appointment Booking','567'],['Contact & Location','398']].map(([a,b])=>`<div class="listrow"><span>${a}</span><strong>${b}</strong></div>`).join('')}</div>`)}</div></div><div>${panel('Traffic Acquisition','Illustrative traffic mix','',`<div class="panel-body"><div class="spaced" style="justify-content:center;gap:25px;flex-wrap:wrap"><div class="donut"><div class="donutcenter">2.4K<small>Visitors</small></div></div><div style="flex:1;min-width:115px">${[['Organic search','67%'],['Direct','21%'],['Other','12%']].map(([a,b])=>`<div class="listrow"><span>${a}</span><strong>${b}</strong></div>`).join('')}</div></div></div>`)}<div class="mt">${panel('Privacy Controls','Recommended integration boundary','',`<div class="panel-body"><div class="check-item">${icon('shield')} Public website only — no clinical dashboard events</div><div class="check-item">${icon('check')} No patient identifiers in tracking payloads</div><div class="check-item">${icon('check')} Consent-dependent activation where required</div><div class="check-item">${icon('check')} Clinic-controlled property and account</div>${btn('View security baseline','page:security','small soft')}</div>`)}</div></div></div>`}
// Keep the exported date range and on-screen week in sync, including year boundaries.
function availabilityWeekDays(){
 const monday=new Date(dateNow+'T12:00:00');
 monday.setDate(monday.getDate()-(monday.getDay()+6)%7+7*state.availabilityWeekOffset);
 return Array.from({length:7},(_,i)=>{const day=new Date(monday);day.setDate(monday.getDate()+i);return {date:iso(day),weekday:day.getDay(),label:new Intl.DateTimeFormat('en-US',{weekday:'short'}).format(day)}});
}
function availabilityDoctors(){return state.staff.filter(s=>s.role==='Doctor'&&(state.branch==='All branches'||s.branch===state.branch))}
function availabilityCsvRows(){
 const rows=[['Doctor','Branch','Day','Date','Status','Details']];
 availabilityDoctors().forEach(doctor=>availabilityWeekDays().forEach(day=>{
   const leave=state.doctorLeave.find(item=>item.doctor===doctor.name&&item.date===day.date);
   const off=day.weekday===0||day.weekday===6;
   rows.push([doctor.name,doctor.branch,day.label,day.date,leave?'Leave':off?'Off':'Available',leave?leave.reason:off?'Weekend / Off':doctorShift(doctor).join('–')]);
 }));
 return rows;
}
function doctorAvailabilityHTML(){
 const days=availabilityWeekDays();
 const docs=availabilityDoctors();
 const selected=state.availabilitySelection;
 return `<section class="panel availability-panel" aria-label="Doctor availability"><div class="panel-head"><div><div class="panel-title">Doctor Availability & Leave</div><div class="panel-subtitle">Weekly shifts and mock leave · green available, orange leave, grey off</div></div><div class="pill-row"><button class="btn small soft" data-action="availability-prev" aria-label="Previous week">←</button><button class="btn small soft" data-action="availability-today">This week</button><button class="btn small soft" data-action="availability-next" aria-label="Next week">→</button><button class="btn small soft" data-action="availability-export" title="Export current visible week" aria-label="Export availability CSV">${icon('download','icon-inline')} Export CSV</button></div></div><div class="availability-scroll"><table class="availability-grid"><thead><tr><th>Doctor</th>${days.map(d=>`<th>${d.label}<small>${fmt(d.date,{month:'short',day:'numeric'})}</small></th>`).join('')}</tr></thead><tbody>${docs.map(doc=>`<tr><th><strong>${escapeHTML(doc.name)}</strong><small>${escapeHTML(doc.branch)}</small></th>${days.map(d=>{const leave=state.doctorLeave.find(l=>l.doctor===doc.name&&l.date===d.date);const off=[0,6].includes(d.weekday);const status=leave?'leave':off?'off':'available',label=leave?'Leave':off?'Off':'Available';return `<td><button class="availability-day ${status} ${selected?.doctor===doc.name&&selected?.date===d.date?'selected':''}" data-action="availability-day" data-doctor-id="${doc.id}" data-date="${d.date}" title="${escapeHTML(doc.name)} · ${escapeHTML(label)}" aria-label="${escapeHTML(doc.name)} ${d.date}: ${label}"><span>${label}</span><small>${leave?'Time off':off?'Weekend':doctorShift(doc).join('–')}</small></button></td>`}).join('')}</tr>`).join('')}</tbody></table></div>${selected?`<div class="availability-detail" role="status"><span class="availability-detail-icon">${icon(selected.status==='leave'?'calendar':selected.status==='available'?'check-circle':'clock')}</span><span><strong>${escapeHTML(selected.doctor)} · ${fmt(selected.date)}</strong><small>${escapeHTML(selected.status==='leave'?'On Leave: '+selected.reason:selected.status==='off'?'Off / Weekend':'Available: '+selected.shift)}</small></span><button class="iconbtn" data-action="availability-clear" aria-label="Dismiss availability details">${icon('close')}</button></div>`:''}</section>`;
}
function staffPage(){
 const canManage=['OWNER','ADMIN'].includes(state.authUser?.role);
 const accountsPanel=canManage?`<div class="mt">${panel('Login Accounts','Individual secure accounts with server-enforced roles and clinic scope',btn(`${icon('plus')} Create Login Account`,'account-new','primary')+btn('Refresh','account-refresh','small soft'),`<div class="tablewrap"><table class="table"><thead><tr><th>User</th><th>Role</th><th>Assigned scope</th><th>Status</th><th>Last login</th><th>Action</th></tr></thead><tbody>${state.userAccountsLoading?'<tr><td colspan="6">Loading accounts…</td></tr>':state.userAccounts.map(user=>`<tr><td><strong>${escapeHTML(user.displayName)}</strong><small>${escapeHTML(user.email)}</small></td><td>${escapeHTML(user.role)}</td><td>${escapeHTML(user.providerName||'—')} ${user.branch?'· '+escapeHTML(user.branch):''}</td><td>${statusBadge(user.isActive?'active':'inactive')}</td><td>${user.lastLoginAt?escapeHTML(fmt(user.lastLoginAt.slice(0,10))):'Never'}</td><td>${user.role==='OWNER'?'<span class="muted">Protected</span>':btn(user.isActive?'Disable':'Enable',`account-toggle:${user.id}`,'small soft')}</td></tr>`).join('')||'<tr><td colspan="6" class="muted">No additional login accounts have been created.</td></tr>'}</tbody></table></div>`)}<div class="info mt">Firebase-linked accounts use Firebase Authentication; legacy accounts retain bcrypt hashes. Deactivating an account or changing its role/assignment revokes its existing sessions. Doctor accounts are scoped to their assigned provider and branch on the server.</div></div>`:'';
 return `${pageHeader('Team & Roles','Manage staff directory, individual login accounts and branch responsibilities.',canManage?btn(`${icon('plus')} Invite Team Member`,'team-invite','primary'):'') }<div class="team-tabs" role="group" aria-label="Team & Roles sections"><button class="tab ${state.teamTab==='directory'?'active':''}" data-action="team-tab:directory">Team Directory</button><button class="tab ${state.teamTab==='availability'?'active':''}" data-action="team-tab:availability">${icon('calendar','icon-inline')} Availability</button></div>${state.teamTab==='availability'?doctorAvailabilityHTML():`<div class="grid three">${stat('Team Members',state.staff.length,'users','Staff directory records')}${stat('Clinic Branches',state.practices.length,'building','Clinic locations')}${stat('Login Accounts',state.userAccounts.length,'shield','Provisioned secure users')}</div><div class="mt">${panel('Team Directory','Staff profiles are separate from login accounts','',`<div class="tablewrap"><table class="table"><thead><tr><th>Staff member</th><th>Role</th><th>Branch</th><th>Status</th><th>Profile</th></tr></thead><tbody>${state.staff.map(member=>`<tr><td><div class="staff-member-cell"><strong>${escapeHTML(member.name)}</strong>${member.role==='Doctor'?`<span class="specialty-tag ${member.specialty===state.activeSpecialty?'current':''}">${escapeHTML(specialtyName(member.specialty))}</span>`:''}</div></td><td>${escapeHTML(member.role)}</td><td>${escapeHTML(member.branch)}</td><td>${statusBadge(member.status||'active')}</td><td>${canManage?btn('View Profile',`staff-profile:${member.id}`,'small soft'):'<span class="badge outline">Restricted</span>'}</td></tr>`).join('')}</tbody></table></div>`)}</div>${accountsPanel}<div class="info mt">Directory records do not grant access by themselves. Only accounts listed above can sign in; permissions and branch/provider scope are checked by the backend.</div>`}`;
}
function integrationsPage(){const integrations=[
  {id:'availity',name:'Availity',subtitle:'Payer eligibility & clearinghouse • sandbox',tag:'Clearinghouse',mode:'oauth'},
  {id:'change',name:'Change Healthcare',subtitle:'Claims and clearinghouse connectivity • sandbox',tag:'Clearinghouse',mode:'apikey'},
  {id:'quest',name:'Quest Diagnostics',subtitle:'Lab orders and results • sandbox',tag:'Laboratory',mode:'apikey'},
  {id:'search-console',name:'Google Search Console',subtitle:'Public website indexing assistance',tag:'Website',mode:'oauth'},
  {id:'ga4',name:'Google Analytics 4',subtitle:'Privacy-safe public website traffic reporting',tag:'Website',mode:'oauth'}
];return `${pageHeader('Integrations & APIs','Explore sandbox connection flows; no external provider is contacted.',btn(`${icon('file')} API Overview`,'api-info','soft'))}<div class="integration-grid">${integrations.map(i=>`<div class="integration-card"><div class="integration-head"><div class="provider-icon">${icon(i.tag==='Laboratory'?'activity':i.tag==='Website'?'globe':'plug')}</div><span class="badge ${state.integrationConnections[i.id]?'green':'orange'}">${state.integrationConnections[i.id]?'Sandbox connected':'Not connected'}</span></div><strong>${escapeHTML(i.name)}</strong><p>${escapeHTML(i.subtitle)}</p><div class="integration-foot"><span class="smalltext muted">${escapeHTML(i.tag)}</span>${btn(state.integrationConnections[i.id]?'Reconnect':'Connect',`integration:${i.id}`,state.integrationConnections[i.id]?'soft small':'primary small')}</div></div>`).join('')}</div><div class="info mt">Demo-only connectivity. Credentials entered here are <strong>not sent, stored, authenticated or validated</strong>. Real healthcare integrations require approved contracts, OAuth, least privilege, PHI controls, audit logs and security review.</div>`}
function securityPage(){return `${pageHeader('Security Center','Implemented v2.7.2 safeguards and the remaining controls required before production use.',btn(`${icon('file')} Security Checklist`,'security-summary','soft'))}<div class="info orange mb">${icon('info','icon-inline')} <strong>Security baseline integrated — not a compliance certification.</strong> This release supports Owner/Admin and scoped Doctor/Receptionist/Billing/Auditor/Staff accounts, encrypted database snapshots and server-side trial enforcement. Do not enter real patient information until the remaining controls have been independently reviewed.</div><div class="grid security-grid">${[
['lock','Encrypted clinic snapshots','AES-256-GCM encryption is applied before clinic state and stored backup copies are written to PostgreSQL.','Implemented'],
['users','Individual account authentication','Firebase-linked accounts use Firebase Authentication with PostgreSQL-backed server sessions; legacy accounts retain bcrypt password hashes.','Implemented'],
['shield','Session and request security','HttpOnly/SameSite cookies, CSRF tokens, same-origin checks, login rate limits and Helmet headers.','Implemented'],
['building','Organization data boundary','State, backups and audit queries are scoped to the authenticated organization and role.','Implemented · Tenant + role scope'],
['clipboard','Server audit events','Appointment creation/status, No-Show corrections, rescheduling, completion, DOS changes, invoices, patient/encounter changes, user permissions and backup actions are recorded separately from editable UI activity.','Partial'],
['refresh','Backup and restore','JSON schema validation, optimistic version checks and a pre-restore encrypted database snapshot.','Implemented'],
['key','MFA and advanced identity controls','MFA, self-service password reset and step-up authentication are not enabled.','Required next'],
['check-circle','Compliance and independent testing','BAAs, threat modeling, penetration testing, retention policy and healthcare legal review remain required.','Required before go-live']
].map(([ic,t,d,status])=>`<div class="security-item"><div class="stat-icon">${icon(ic)}</div><div><strong>${t}</strong><p>${d}</p><span class="badge ${status.startsWith('Implemented')?'green':status==='Partial'?'orange':'red'}" style="margin-top:9px">${status}</span></div></div>`).join('')}</div><div class="mt">${panel('Before Production Go-Live','Mandatory remaining gates','',`<div class="panel-body">${[['Deploy behind HTTPS and private PostgreSQL','Required'],['Move secrets to a managed secrets vault and test key recovery','Required'],['Add MFA, password reset and step-up authentication','Not implemented'],['Normalize clinical resources and add row-level authorization','Not implemented'],['Complete BAA/privacy review, penetration test and restore drill','Required']].map(([a,b])=>`<div class="listrow"><span>${a}</span><span class="badge orange">${b}</span></div>`).join('')}</div>`)}</div>`}
function modulesPage(){return `${pageHeader('Optional Modules','Clinic Owner or Admin can enable or disable add-ons without modifying core appointments and records.',btn(`${icon('refresh')} Restore default toggles`,'reset-modules','soft'))}<div class="grid equal">${modules.map(m=>`<div class="modulecard"><div class="moduleicon">${icon(m.icon)}</div><div style="flex:1"><strong>${m.name}</strong><p>${m.desc}</p></div><label class="switch" aria-label="Toggle ${m.name}"><input type="checkbox" data-module="${m.id}" ${state.modules[m.id]?'checked':''}/><span class="switchslider"></span></label></div>`).join('')}</div><div class="info mt">Module visibility preferences are saved to the clinic workspace. They do not grant or revoke backend permissions, and disabling a module does not delete records.</div><div class="mt">${panel('Core Features Remain Available','Always-on base functionality in this design','',`<div class="panel-body"><div class="pill-row">${['Patients','Appointments','Queue','Consultations','Billing','Staff roles','Audit','Backups','Website builder'].map(n=>`<span class="badge outline">${n}</span>`).join('')}</div></div>`)}</div>`}

// -------- Specialty UI adaptation: synthetic metrics & mock clinical workspaces --------
const rehabPlans=Object.freeze([
 {id:'ROM-101',patient:'Amina Farooq',area:'Shoulder mobility',baseline:72,current:118,target:150,unit:'°',status:'In progress',sessions:'6 / 10',doctor:'Dr. Sarah Malik'},
 {id:'ROM-102',patient:'Omar Siddiq',area:'Knee flexion',baseline:90,current:124,target:135,unit:'°',status:'Review due',sessions:'4 / 8',doctor:'Dr. Sarah Malik'},
 {id:'ROM-103',patient:'Hassan Raza',area:'Ankle dorsiflexion',baseline:8,current:14,target:20,unit:'°',status:'In progress',sessions:'3 / 6',doctor:'Dr. Sarah Malik'}
]);
const spineRegions=Object.freeze([
 {name:'Cervical',progress:64,visits:'4 of 8',note:'Follow-up assessment planned'},
 {name:'Thoracic',progress:78,visits:'6 of 8',note:'Review previous observations'},
 {name:'Lumbar',progress:52,visits:'3 of 8',note:'Track visit notes and mobility goals'},
 {name:'Sacral',progress:69,visits:'5 of 8',note:'Continue documentation'},
 {name:'Pelvic',progress:82,visits:'7 of 8',note:'Clinician review pending'}
]);
const demoLesions=Object.freeze([
 {id:'LES-101',patient:'Noor Habib',site:'Forearm',status:'Awaiting review',updated:'Today',tone:'lilac'},
 {id:'LES-102',patient:'Hira Waheed',site:'Upper back',status:'Documented',updated:'Yesterday',tone:'rose'},
 {id:'LES-103',patient:'Noor Habib',site:'Cheek',status:'Awaiting review',updated:'2 days ago',tone:'sand'},
 {id:'LES-104',patient:'Hira Waheed',site:'Lower leg',status:'Documented',updated:'5 days ago',tone:'sage'}
]);
function metricProgress(current,target,label){const pct=Math.max(0,Math.min(100,Math.round(current/Math.max(1,target)*100)));return `<div class="metric-track" role="progressbar" aria-label="${escapeHTML(label)}" aria-valuenow="${current}" aria-valuemin="0" aria-valuemax="${target}"><div class="metric-fill" style="width:${pct}%"></div></div>`}
function specialtyOverviewWidget(){
 if(state.activeSpecialty==='pt')return panel('Range of Motion Progress','Synthetic measurements • for UI demonstration only',btn('Open rehab plans','page:rehab','small soft'),`<div class="panel-body"><div class="rom-summary"><div><span>Average goal completion</span><strong>78%</strong><small>Example data, not a clinical result</small></div><div class="rom-symbol">${icon('activity')}</div></div><div class="rom-metrics">${rehabPlans.map(p=>`<div class="rom-row"><div class="rom-label"><strong>${escapeHTML(p.area)}</strong><span>${p.current}${p.unit} / ${p.target}${p.unit}</span></div>${metricProgress(p.current,p.target,p.area)}</div>`).join('')}</div></div>`);
 return panel('Patient Engagement','90-day rule is editable in Patient Activity',btn('View activity','page:activity','small'),`<div class="panel-body"><div class="spaced" style="justify-content:center;gap:28px;flex-wrap:wrap"><div class="donut"><div class="donutcenter">${Math.round(eligiblePatients().filter(activePatient).length/Math.max(1,eligiblePatients().length)*100)}%<small>Active</small></div></div><div style="min-width:130px"><div class="listrow"><span><i class="linedot"></i> Active</span><strong>${eligiblePatients().filter(activePatient).length}</strong></div><div class="listrow"><span><i class="linedot" style="background:var(--mint)"></i> Inactive</span><strong>${eligiblePatients().filter(p=>!activePatient(p)).length}</strong></div><div class="listrow"><span><i class="linedot" style="background:#f2cfa3"></i> Total</span><strong>${eligiblePatients().length}</strong></div></div></div></div>`);
}
function spinalAlignmentWidget(){return panel('Spinal Alignment','Illustrative workflow progress — not diagnostic measurements',btn('Open Spine Tracker','page:spine','small soft'),`<div class="panel-body"><div class="spine-overview"><div class="spine-illustration" aria-hidden="true"><div class="spine-column">${spineRegions.map(()=>'<i></i>').join('')}</div></div><div class="spine-overview-content"><div class="spine-kicker">Sample follow-up documentation</div><div class="spine-hero"><strong>68%</strong><span>Progress against a fictional tracking plan</span></div>${metricProgress(68,100,'Spinal alignment demo progress')}<div class="spine-pills"><span class="badge outline">5 spinal regions</span><span class="badge outline">3 reviews due</span><span class="badge outline">Clinician review required</span></div></div></div></div>`)}
function dermatologyOverviewWidget(){return panel('Skin Lesion Gallery','Synthetic gallery summaries — no real clinical images',btn('View gallery','page:lesions','small soft'),`<div class="panel-body"><div class="derm-overview"><span class="derm-overview-icon">${icon('leaf')}</span><div><strong>4 illustrative records</strong><p>2 awaiting documentation review · 2 documented. No automated diagnosis or clinical classifications.</p></div></div></div>`)}
function rehabPage(){const chosen=rehabPlans.find(p=>p.id===state.rehabSelectedPlan)||rehabPlans[0];return `${pageHeader('Rehab Plans','Physical Therapy workspace • synthetic therapy-plan progress and appointment context.',`<span class="badge outline">${escapeHTML(specialtyName(state.activeSpecialty))}</span>`)}<div class="grid three">${stat('Active Rehab Plans',3,'activity','Fictional sample plans')}${stat('Sessions This Week',14,'calendar','Illustrative scheduling data')}${stat('Progress Reviews',2,'clipboard','Require clinician confirmation')}</div><div class="grid two mt rehab-workspace"><div>${panel('Rehab Plan Directory','Choose a patient plan to inspect example milestones','',`<div class="panel-body rehab-list">${rehabPlans.map(p=>`<button data-action="rehab-select:${p.id}" class="rehab-plan-row ${chosen.id===p.id?'is-selected':''}" aria-pressed="${chosen.id===p.id}"><span class="rehab-plan-icon">${icon('activity')}</span><span><strong>${escapeHTML(p.patient)}</strong><small>${escapeHTML(p.area)} · ${escapeHTML(p.sessions)} sessions</small></span><span class="badge ${p.status==='Review due'?'orange':'outline'}">${escapeHTML(p.status)}</span></button>`).join('')}</div>`)}</div><div>${panel('Range of Motion Plan',`${escapeHTML(chosen.patient)} · ${escapeHTML(chosen.id)}`,'',`<div class="panel-body"><div class="rehab-detail-heading"><div><span class="detail-overline">TARGET AREA</span><h3>${escapeHTML(chosen.area)}</h3></div><span class="badge blue">${escapeHTML(chosen.sessions)} sessions</span></div><div class="rehab-gauges"><div><small>Baseline</small><strong>${chosen.baseline}${chosen.unit}</strong></div><div><small>Current</small><strong>${chosen.current}${chosen.unit}</strong></div><div><small>Example goal</small><strong>${chosen.target}${chosen.unit}</strong></div></div>${metricProgress(chosen.current,chosen.target,'Mock range of motion goal')}<p class="specialty-hint">${Math.round(chosen.current/chosen.target*100)}% of sample goal · These values are invented and should not guide clinical care.</p><div class="info">In production, ROM measurements and goals would be entered and approved by an authorized PT and linked to a patient encounter.</div></div>`)}</div></div>`}
function spinePage(){const chosen=spineRegions.find(r=>r.name===state.spineSelectedRegion)||spineRegions[0];return `${pageHeader('Spine Tracker','Chiropractic workspace • mock regional documentation and follow-up tracking.',`<span class="badge outline">${escapeHTML(specialtyName(state.activeSpecialty))}</span>`)}<div class="grid three">${stat('Documented Regions',5,'activity','Demo spine-region entries')}${stat('Follow-up Visits',11,'calendar','Fictional totals')}${stat('Reviews Pending',3,'clock','Clinician review required')}</div><div class="grid two mt"><div>${panel('Spine Region Map','Select a region to view its illustrative progress','',`<div class="panel-body"><div class="spine-region-list">${spineRegions.map(r=>`<button data-action="spine-select:${r.name}" class="spine-region ${chosen.name===r.name?'is-selected':''}" aria-pressed="${chosen.name===r.name}"><span class="region-mark">${icon('activity')}</span><span><strong>${escapeHTML(r.name)}</strong><small>${escapeHTML(r.visits)} follow-up stages</small></span><span class="region-percent">${r.progress}%</span></button>`).join('')}</div></div>`)}</div><div>${panel(`${escapeHTML(chosen.name)} Tracking`,'Fictional goal-tracking values; not spinal alignment diagnostics','',`<div class="panel-body"><div class="spine-detail"><div class="spine-detail-visual" aria-hidden="true"><div class="spine-column">${spineRegions.map(r=>`<i class="${r.name===chosen.name?'chosen':''}"></i>`).join('')}</div></div><div><span class="detail-overline">DEMO TRACKING COMPLETION</span><strong>${chosen.progress}%</strong><small>${escapeHTML(chosen.visits)} visits</small></div></div>${metricProgress(chosen.progress,100,'Mock '+chosen.name+' plan progress')}<p class="specialty-hint">${escapeHTML(chosen.note)}</p><div class="info">Production chiropractic assessments require clinically validated documentation, authorizations and audit logging.</div></div>`)}</div></div>`}
function lesionPage(){const list=state.lesionFilter==='All'?demoLesions:demoLesions.filter(l=>l.status===state.lesionFilter);return `${pageHeader('Skin Lesion Gallery','Dermatology workspace • illustrative record cards only. No patient photos are uploaded.',`<span class="badge outline">${escapeHTML(specialtyName(state.activeSpecialty))}</span>`)}<div class="grid three">${stat('Gallery Records',demoLesions.length,'file','Synthetic entries only')}${stat('Awaiting Review',demoLesions.filter(l=>l.status==='Awaiting review').length,'clock','Requires clinician review')}${stat('Documented',demoLesions.filter(l=>l.status==='Documented').length,'check-circle','Demo documentation state')}</div><div class="panel mt"><div class="panel-head"><div><div class="panel-title">Lesion Gallery</div><div class="panel-subtitle">Color illustrations represent placeholders, not photographs or clinical findings.</div></div><div class="segmented-group" aria-label="Gallery status filter">${['All','Awaiting review','Documented'].map(s=>`<button data-action="lesion-filter:${s}" class="segment-btn ${state.lesionFilter===s?'selected':''}" aria-pressed="${state.lesionFilter===s}">${escapeHTML(s)}</button>`).join('')}</div></div><div class="panel-body"><div class="lesion-grid">${list.map(l=>`<article class="lesion-card"><div class="lesion-visual ${l.tone}" role="img" aria-label="Decorative placeholder for gallery item, not a clinical image"><span class="lesion-shape"></span><span class="lesion-watermark">ILLUSTRATIVE</span></div><div class="lesion-card-info"><div class="spaced"><strong>${escapeHTML(l.id)}</strong><span class="badge ${l.status==='Documented'?'green':'orange'}">${escapeHTML(l.status)}</span></div><p>${escapeHTML(l.patient)} · ${escapeHTML(l.site)}</p><small>${escapeHTML(l.updated)}</small></div></article>`).join('')}</div>${list.length?'':'<div class="empty">No records match this filter.</div>'}<div class="info mt">Do not use synthetic images as dermatology references. Real image workflows require informed consent, restricted storage, encryption, access policies and an approved clinical review process.</div></div></div>`}


function auditPage(){
 const kinds=['All','patient','invoice','appointment','documents','settings','consultation','state','backup','auth'];
 const events=[...(state.serverAuditLogs||[]),...state.auditLogs];
 // The table displays UTC timestamps, so the date inputs filter full UTC days.
 // Treat the end date as inclusive by comparing to the next UTC midnight.
 const start=state.auditStartDate?Date.parse(`${state.auditStartDate}T00:00:00.000Z`):null;
 const end=state.auditEndDate?Date.parse(`${state.auditEndDate}T00:00:00.000Z`)+86400000:null;
 const filtered=events.filter(x=>{
   const at=Date.parse(x.at);
   return (state.auditFilter==='All'||x.action.startsWith(state.auditFilter))
     &&(state.auditOutcome==='All'||x.outcome===state.auditOutcome)
     &&Number.isFinite(at)
     &&(start===null||at>=start)
     &&(end===null||at<end);
 });
 const deniedCount=events.filter(x=>x.outcome==='Denied').length;
 return `${pageHeader('Audit Log','Server-side sign-in, save and backup events alongside client-side workflow activity.',btn(`${icon('download')} Export audit log`,'audit-export','soft'))}
 <div class="info orange mb"><strong>Audit scope:</strong> server events are stored separately in PostgreSQL and are authoritative for sign-in, snapshot saves and backup operations. Other screen-level workflow entries are client-generated and must not be treated as an immutable compliance audit.</div>
 <div class="panel"><div class="panel-head audit-panel-head"><div class="audit-panel-title"><div class="panel-title">Record Access & Activity</div><div class="panel-subtitle">${filtered.length} of ${events.length} events · ${deniedCount} access denials · UTC timestamps</div></div><div class="audit-controls"><label class="audit-control" for="audit-filter">Action type <select class="select" id="audit-filter">${kinds.map(k=>`<option value="${k}" ${state.auditFilter===k?'selected':''}>${k==='All'?'All actions':k}</option>`).join('')}</select></label><label class="audit-control" for="audit-outcome">Outcome <select class="select" id="audit-outcome">${['All','Success','Denied'].map(k=>`<option value="${k}" ${state.auditOutcome===k?'selected':''}>${k==='All'?'All outcomes':k}</option>`).join('')}</select></label><label class="audit-control" for="audit-start-date">From (UTC) <input class="field" type="date" id="audit-start-date" value="${escapeHTML(state.auditStartDate)}" /></label><label class="audit-control" for="audit-end-date">To (UTC) <input class="field" type="date" id="audit-end-date" value="${escapeHTML(state.auditEndDate)}" /></label></div></div>
 <div class="tablewrap"><table class="table"><thead><tr><th>Time (UTC)</th><th>Actor / Role</th><th>Action</th><th>Resource ID</th><th>Branch</th><th>Outcome</th><th>Purpose</th></tr></thead><tbody>${filtered.map(x=>`<tr><td>${escapeHTML(utcDisplay(x.at))}</td><td>${escapeHTML(x.actor)}<small>${escapeHTML(x.source)}</small></td><td><strong>${escapeHTML(x.action)}</strong></td><td>${escapeHTML(x.resource)}</td><td>${escapeHTML(x.branch)}</td><td><span class="badge ${x.outcome==='Success'?'green':'red'}">${escapeHTML(x.outcome)}</span></td><td>${escapeHTML(x.purpose)}</td></tr>`).join('')||'<tr><td colspan="7"><div class="empty">No matching audit events.</div></td></tr>'}</tbody></table></div></div>`;
}

// SnapText lives under an iframe: CSS and third-party libraries are not loaded by MedBook.
function clinicalToolsPage(){
 const tool=clinicalTools[state.activeTool]||clinicalTools.ocr;
 const activeId=clinicalTools[state.activeTool]?state.activeTool:'ocr';
 const src=`snaptext-tools/tools/${tool.folder}/index.html`;
 return `${pageHeader('Clinical Utility: '+tool.name,'Independent browser-based document tools inside the MedBook workspace. This is a demo; do not use identifiable patient information.')}<section class="clinical-tool-shell" aria-label="Clinical utility workspace"><div class="clinical-tool-header"><div class="clinical-tool-heading">${icon('file')}<div><strong>${escapeHTML(tool.name)}</strong><small>Embedded SnapText Studio · ${state.role==='Doctor'?'FREE':['Clinic Owner','Clinic Admin'].includes(state.role)?'PRO':'Demo'} preview · no EHR data transfer</small></div></div><span class="badge ${state.role==='Doctor'?'green':'blue'}">${state.role==='Doctor'?'FREE':'PRO'}</span></div><iframe id="clinical-tool-frame" class="clinical-tool-frame" data-tool="${activeId}" src="${src}" title="${escapeHTML(tool.name)} — SnapText Studio" loading="lazy" referrerpolicy="no-referrer" allow="clipboard-write; camera"></iframe><p class="clinical-tool-notice">Files are handled by the embedded tool, not attached to patient records. SnapText loads third-party JavaScript/OCR resources when a tool opens; use sample files only.</p></section>`;
}

// ---- v2.0 RCM demonstration: no actual coding validation, payer lookup or submission. ----
const dollars=value=>'$'+Number(value||0).toFixed(2);
const safeDaysRemaining=value=>Math.round((new Date(value+'T12:00:00')-today)/86400000);
const expiryLabel=value=>{const days=safeDaysRemaining(value);return days<0?'Expired (mock)':days<=30?'Expiring in '+days+' days':'Current (mock)'};
const rcmStatus=value=>`<span class="badge ${['Active','Verified','Signed','Available','Paid'].includes(value)?'green':['Failed','Inactive','Deleted','Expired'].includes(value)?'red':'orange'}">${escapeHTML(value)}</span>`;
function codingReferencePage(){
 const dx=state.icd10Codes, cpt=state.cptCodes;
 const alerts=`<div class="rcm-alerts"><div class="info orange"><strong>${state.expiringDx.length} synthetic ICD-10 expiry alerts</strong> — ${state.expiringDx.map(x=>`${escapeHTML(x.code)} (${fmt(x.expiresAt)})`).join(', ')}.</div><div class="info orange"><strong>CPT Code Updates:</strong> ${state.deletedCptCodes.map(x=>escapeHTML(x.code)).join(', ')} is an invented discontinued-code exercise, not a published CPT update.</div></div>`;
 return `${pageHeader('Coding Reference','Search synthetic diagnosis and procedure examples. Not a licensed coding reference or current-year codebook.',`<span class="badge orange">Training data</span>`)}${alerts}<div class="panel mt"><div class="panel-head"><div><div class="panel-title">Diagnosis & Procedure Master Data</div><div class="panel-subtitle">Active/demo statuses only; coding, billing and RVUs require source validation.</div></div><input class="field rcm-code-search" id="coding-search" type="search" placeholder="Search ICD-10 / CPT codes…" value="${escapeHTML(state.codingSearch)}" aria-label="Search coding reference" /></div><div class="panel-body"><div class="grid two rcm-code-columns"><section><h3>ICD-10-CM (DX)</h3><div class="tablewrap"><table class="table"><thead><tr><th>Code</th><th>Description</th><th>Status</th></tr></thead><tbody>${dx.map(x=>`<tr class="coding-filterable"><td><strong>${escapeHTML(x.code)}</strong></td><td>${escapeHTML(x.description)}</td><td>${rcmStatus(x.status)}</td></tr>`).join('')}</tbody></table></div></section><section><h3>CPT (Procedure)</h3><div class="tablewrap"><table class="table"><thead><tr><th>Code</th><th>Description</th><th>RVU*</th><th>Status</th></tr></thead><tbody>${cpt.map(x=>`<tr class="coding-filterable"><td><strong>${escapeHTML(x.code)}</strong></td><td>${escapeHTML(x.description)}</td><td>${x.rvu.toFixed(2)}</td><td>${rcmStatus(x.status)}</td></tr>`).join('')}</tbody></table></div></section></div><p class="helper-disclaimer">*RVU and prices are made-up UI figures. CPT terminology/code status may require a license and current payer/AMA validation. Do not submit claims using these examples.</p></div></div>`;
}
function providerProfilesPage(){
 const providerList=state.role==='Doctor'?state.providers.filter(p=>p.name===state.activeDoctor):state.providers;
 const expiring=providerList.filter(p=>[p.licenseExpiry,p.deaExpiry].some(d=>safeDaysRemaining(d)<=30));
 return `${pageHeader('Provider Profiles','Each doctor has an individual editable profile with specialty, taxonomy and credential details.',`<span class="badge orange">${expiring.length} expiry alerts</span>`)}<div class="info orange mb">NPI, Tax ID, DEA, CAQH and license values prefixed with DEMO are intentionally invalid. Taxonomy codes must be verified against the current NUCC taxonomy file.</div>${panel('Provider Directory','Select a provider to review or edit their individual profile','',`<div class="tablewrap"><table class="table"><thead><tr><th>Provider / Specialty</th><th>Practice</th><th>Provider Taxonomy</th><th>NPI</th><th>License / Expiry</th><th>Action</th></tr></thead><tbody>${providerList.map(x=>`<tr><td><strong>${escapeHTML(x.name)}</strong><small>${escapeHTML(specialtyName(x.specialty))}</small></td><td>${escapeHTML(x.branch)}</td><td><strong>${escapeHTML(x.taxonomyCode||'Not set')}</strong></td><td>${escapeHTML(x.npi)}</td><td>${escapeHTML(x.license)}<small>${fmt(x.licenseExpiry)} · ${escapeHTML(expiryLabel(x.licenseExpiry))}</small><small>DEA: ${fmt(x.deaExpiry)} · ${escapeHTML(expiryLabel(x.deaExpiry))}</small></td><td><div class="pill-row">${btn('View',`provider-profile:${x.id}`,'small soft')}${btn('Edit',`provider-edit:${x.id}`,'small primary')}</div></td></tr>`).join('')}</tbody></table></div>`)}<div class="info mt">Each provider profile can be updated independently. This release supports clinic-owner sign-in only. It does not verify provider credentials or enable staff accounts.</div>`;
}
function hospiceCarePage(){
 const list=state.patients.filter(p=>p.careType==='Hospice'&&(state.role==='Clinic Owner'||eligiblePatients().some(x=>x.id===p.id)));
 return `${pageHeader('Hospice Care','Demonstration of hospice certification and benefits election workflows.',`<span class="badge orange">Fictional forms</span>`)}<div class="grid three">${stat('Hospice Patients',list.length,'heartbeat','Scoped synthetic patients')}${stat('Certifications',list.filter(p=>p.hospice?.certificationDate).length,'file','Mock form preview')}${stat('Open Reviews',list.length,'clock','Requires medical director / clinician approval')}</div><div class="panel mt"><div class="panel-head"><div><div class="panel-title">Hospice Case Register</div><div class="panel-subtitle">Use only as a design preview. Hospice eligibility, coverage periods and physician certification rules vary.</div></div></div><div class="tablewrap"><table class="table"><thead><tr><th>Patient</th><th>Certification</th><th>Election Date</th><th>Attending Physician</th><th>Terminal Diagnosis (example)</th><th>Forms</th></tr></thead><tbody>${list.map(p=>`<tr><td><strong>${escapeHTML(p.name)}</strong><small>${escapeHTML(p.id)}</small></td><td>${fmt(p.hospice.certificationDate)}</td><td>${fmt(p.hospice.electionDate)}</td><td>${escapeHTML(p.hospice.attendingPhysician)}</td><td>${escapeHTML(p.hospice.terminalDx)}</td><td>${btn('Certification Form',`hospice-cert:${p.id}`,'small soft')}</td></tr>`).join('')||'<tr><td colspan="6"><div class="empty">No hospice patients in this role/specialty scope. Select Physical Therapy for the sample clinician.</div></td></tr>'}</tbody></table></div></div>`;
}
function activeEncounterAppointment(){
 const selected=state.selectedEncounterAppointmentId&&state.appointments.find(a=>String(a.id)===String(state.selectedEncounterAppointmentId));
 if(selected&&(!state.selectedEncounterPatientId||selected.patient===state.selectedEncounterPatientId)&&['arrived','in-consultation','completed','checked-out'].includes(appointmentStatus(selected)))return selected;
 return todayApps().find(a=>appointmentStatus(a)==='in-consultation')||todayApps().find(a=>appointmentStatus(a)==='arrived')||null;
}
function activeEncounterPatient(){
 const a=activeEncounterAppointment();
 if(a)return patient(a.patient)||null;
 const selected=state.selectedEncounterPatientId&&eligiblePatients().find(p=>p.id===state.selectedEncounterPatientId);
 return selected||eligiblePatients()[0]||null;
}
function encounterFor(id,appointmentId=null){
 const p=patient(id);
 if(!p)return null;
 let appointment=appointmentId?state.appointments.find(a=>String(a.id)===String(appointmentId)):null;
 if(appointment&&appointment.patient!==id)appointment=null;
 if(!appointment&&state.selectedEncounterPatientId===id&&state.selectedEncounterAppointmentId){
  appointment=state.appointments.find(a=>String(a.id)===String(state.selectedEncounterAppointmentId)&&a.patient===id)||null;
 }
 if(!appointment){const active=activeEncounterAppointment();if(active?.patient===id)appointment=active}
 const key=appointment?`appointment:${appointment.id}`:`patient:${id}`;
 if(!state.encounters[key]){
  const legacy=state.encounters[id];
  const priorAppointmentEncounter=Object.keys(state.encounters).some(existingKey=>existingKey.startsWith('appointment:')&&state.encounters[existingKey]?.patientId===id);
  state.encounters[key]=legacy&&(!appointment||!priorAppointmentEncounter)?{...legacy,patientId:id,appointmentId:appointment?.id??legacy.appointmentId??null}:{
   patientId:id,appointmentId:appointment?.id??null,actual_date_of_service:null,dateOfService:'',provider:appointment?.doctor||p.doctor,
   subjective:'',objective:'',assessment:'',plan:'',dxCodes:[],cptItems:[],status:'Draft',signedAt:null
  };
 }
 const encounter=state.encounters[key];
 if(appointment){
  encounter.patientId=id;
  encounter.appointmentId=appointment.id;
  encounter.provider=appointment.doctor;
  if(appointmentHasDOS(appointment)){if(!encounter.actual_date_of_service)encounter.actual_date_of_service=appointment.actual_date_of_service;if(!encounter.dateOfService)encounter.dateOfService=appointment.actual_date_of_service;encounter.dos_verified=true}
  else if(appointment.dos_verified===false&&AppointmentDomain.isCompleted(appointment)){encounter.actual_date_of_service=appointment.actual_date_of_service||encounter.actual_date_of_service||null;encounter.dateOfService=encounter.actual_date_of_service||'';encounter.dos_verified=false}
  else{encounter.actual_date_of_service=null;encounter.dateOfService='';encounter.dos_verified=false}
 }else{
  encounter.actual_date_of_service=null;
  encounter.dateOfService='';
 }
 return encounter;
}
const encounterTotal=e=>(e?.cptItems||[]).reduce((total,x)=>total+Number(x.charge||0)*Number(x.units||1),0);
function superbillRows(p,e,appointment=activeEncounterAppointment()){
 const dos=appointment?.actual_date_of_service||e.actual_date_of_service||'';
 const rows=[['Field','Value'],['Patient',p.name],['Patient ID',p.id],['DOB',p.dob],['Member ID',p.memberId],['Appointment ID',appointment?.id??e.appointmentId??'—'],['Actual Date of Service',dos||'Not recorded'],['Rendering Provider',e.provider],['Encounter State',e.status],['DX Codes',e.dxCodes.join('; ')||'—']];
 e.cptItems.forEach((item,i)=>rows.push(['CPT '+(i+1),item.code],['Modifier '+(i+1),item.modifier||'—'],['Units '+(i+1),item.units],['Charge '+(i+1),dollars(item.charge*item.units)]));
 rows.push(['Total Charges',dollars(encounterTotal(e))],['Disclaimer','DEMO ONLY — NOT A SUBMITTED CLAIM']);
 return rows;
}
function templatesForCurrentView(){
 const f=state.soapTemplateFilter;
 let list=state.soapTemplates.filter(t=>t.specialty==='all'||t.specialty===state.activeSpecialty);
 if(f==='thisSpecialty'&&state.activeSpecialty!=='general')list=list.filter(t=>t.specialty===state.activeSpecialty);
 if(f==='custom')list=list.filter(t=>!t.builtIn);
 return list.slice().sort((a,b)=>{
   const rank=t=>t.specialty===state.activeSpecialty?0:1;
   return rank(a)-rank(b)||a.name.localeCompare(b.name);
 });
}
function soapTemplateToolbarHTML(signed){
 return `<div class="pill-row soap-tpl-toolbar">
  <select id="soap-template-filter" class="select" aria-label="Filter SOAP templates" ${signed?'disabled':''}>
   <option value="all" ${state.soapTemplateFilter==='all'?'selected':''}>All available templates</option>
   <option value="thisSpecialty" ${state.soapTemplateFilter==='thisSpecialty'?'selected':''}>This specialty only</option>
   <option value="custom" ${state.soapTemplateFilter==='custom'?'selected':''}>My custom only</option>
  </select>
  <select id="soap-template-select" class="select" aria-label="Choose SOAP template" ${signed?'disabled':''}>
   <option value="">— Choose a template —</option>
   ${templatesForCurrentView().map(t=>`<option value="${escapeHTML(t.id)}">${escapeHTML(t.name)}${t.specialty!=='all'?' ('+escapeHTML(specialtyName(t.specialty))+')':''}${t.builtIn?'':' ★'}</option>`).join('')}
  </select>
  <button class="btn small primary" data-action="soap-template-apply" ${signed?'disabled':''}>Apply template</button>
  <button class="btn small soft" data-action="soap-template-save-current" ${signed?'disabled':''}>Save as template</button>
  <button class="btn small soft" data-action="soap-template-new" ${signed?'disabled':''}>New template</button>
 </div>`;
}
function soapTemplateCustomListHTML(signed){
 return `<div class="soap-tpl-list">${templatesForCurrentView().filter(t=>!t.builtIn).map(t=>`
  <div class="soap-tpl-row"><span>${escapeHTML(t.name)}</span>
   <span class="badge outline">${escapeHTML(t.specialty==='all'?'All':specialtyName(t.specialty))}</span>
   <button class="btn small soft" data-action="soap-template-edit:${escapeHTML(t.id)}" ${signed?'disabled':''}>Edit</button>
   <button class="btn small danger" data-action="soap-template-delete:${escapeHTML(t.id)}" ${signed?'disabled':''}>Delete</button>
  </div>`).join('')||'<p class="muted tiny">No custom templates yet. Use Save as template or New template.</p>'}</div>`;
}
function esignPrintHTML(e){
 if(e.status!=='Signed')return '';
 const sig=e.signature;
 const drawn=sig?.drawnDataUrl;
 return `<div class="esign-print-block"><div class="esign-block-label">Electronically signed · DEMO ONLY</div>${drawn?`<img src="${drawn}" alt="Drawn demo signature" class="esign-drawn"/>`:''}<div class="esign-typed">${escapeHTML(sig?.typed||e.signedBy||e.provider)}</div><div class="esign-meta">Signed ${e.signedAt?escapeHTML(new Date(e.signedAt).toLocaleString()):'—'} · Not a legally valid signature</div></div>`;
}
function encounterWorkspaceHTML(p,appointmentId=null){
 if(!p)return '<div class="info">No patient in this demo role/specialty scope.</div>';
 const appointment=appointmentId?state.appointments.find(a=>String(a.id)===String(appointmentId)):activeEncounterAppointment(),e=encounterFor(p.id,appointment?.id),signed=e.status==='Signed',billable=!!(appointment&&completed(appointment)&&appointmentHasDOS(appointment));
 return `<div class="grid two mt rcm-encounter-panels"><div>${panel('SOAP Notes',`${escapeHTML(p.name)} · ${escapeHTML(p.id)} · ${appointment?`Scheduled ${escapeHTML(appointment.date)} · ${appointment.dos_verified===false?`Unverified legacy DOS ${escapeHTML(appointment.actual_date_of_service||'not recorded')}`:`Actual DOS ${escapeHTML(appointment.actual_date_of_service||'pending')}`}`:'No appointment selected'}`,rcmStatus(e.status)+soapTemplateToolbarHTML(signed),`<div class="panel-body">${soapTemplateCustomListHTML(signed)}<div class="soap-form">${[['subjective','Subjective'],['objective','Objective'],['assessment','Assessment'],['plan','Plan']].map(([key,label])=>`<div class="formgroup"><div class="v22-snippet-row"><label class="label" for="soap-${key}">${label}</label><button type="button" class="btn small soft v22-snippet-btn" data-action="text-pattern-open:${key}" ${signed?'disabled':''}>⌨ Insert demo snippet</button></div><textarea id="soap-${key}" class="field soap-field" data-soap-field="${key}" rows="3" ${signed?'readonly':''} placeholder="Synthetic ${label.toLowerCase()} draft…">${escapeHTML(e[key])}</textarea></div>`).join('')}</div>${signed?`<div class="esign-block"><div class="esign-block-label">Electronically signed by · DEMO ONLY</div>${e.signature?.drawnDataUrl?`<img src="${e.signature.drawnDataUrl}" class="esign-drawn" alt="Drawn demo signature"/>`:''}<div class="esign-typed">${escapeHTML(e.signature?.typed||e.signedBy||e.provider)}</div><div class="esign-meta">Signed ${e.signedAt?escapeHTML(new Date(e.signedAt).toLocaleString()):'—'} · Not a legally valid signature</div></div>`:''}<div class="pill-row mt">${btn('Save Encounter Draft','encounter-save',signed?'soft':'primary')}${btn(`${icon('check')} Sign Encounter`,'encounter-sign',signed?'soft':'primary')}</div><p class="helper-disclaimer">${signed?'Signed and locked within this browser session; no edits permitted.':'Sign locks the sample note and charge capture. No authentic signature or electronic health record is created.'}</p></div>`)}</div><div>${panel('Encounter & Charges','Add multiple DX and CPT entries; deleted items are blocked','',`<div class="panel-body"><div class="rcm-code-add"><label class="formgroup"><span class="label">Diagnosis ICD-10</span><input id="encounter-dx-input" class="field" list="dx-datalist" placeholder="Type an exact ICD-10 code…" autocomplete="off" ${signed?'disabled':''}/><datalist id="dx-datalist">${state.icd10Codes.filter(x=>x.status==='Active').map(x=>`<option value="${escapeHTML(x.code)}">${escapeHTML(x.description)}</option>`).join('')}</datalist></label>${btn('Add DX','encounter-add-dx','small soft')}</div><div class="rcm-chip-list">${e.dxCodes.map(code=>`<span class="rcm-chip">${escapeHTML(code)} ${signed?'':`<button type="button" data-action="encounter-remove-dx:${escapeHTML(code)}" aria-label="Remove DX ${escapeHTML(code)}">×</button>`}</span>`).join('')||'<span class="muted">No diagnoses selected</span>'}</div>${!signed&&state.lastDxHint?.patientId===p.id&&e.dxCodes.includes(state.lastDxHint.code)&&state.lastDxHint.suggestions.length?`<div class="v22-cds-hint"><span class="v22-cds-label">💡 Demo CPT suggestions for ${escapeHTML(state.lastDxHint.code)} — verify clinically and with payer</span>${state.lastDxHint.suggestions.map(code=>`<button type="button" class="btn small soft v22-cds-chip" data-action="cds-add-cpt:${escapeHTML(code)}" title="Add synthetic CPT ${escapeHTML(code)}">+ ${escapeHTML(code)}</button>`).join('')}<button type="button" class="btn small ghost v22-cds-dismiss" data-action="cds-dismiss" aria-label="Dismiss suggestions">×</button></div>`:''}<div class="rcm-code-add"><label class="formgroup"><span class="label">CPT / Procedure</span><input id="encounter-cpt-input" class="field" list="cpt-datalist" placeholder="Type an exact CPT code…" autocomplete="off" ${signed?'disabled':''}/><datalist id="cpt-datalist">${state.cptCodes.map(x=>`<option value="${escapeHTML(x.code)}">${escapeHTML(x.description)}${x.status==='Deleted'?' (Deleted)':''}</option>`).join('')}</datalist></label><label class="formgroup"><span class="label">Modifier (optional)</span><input id="encounter-modifier" class="field" maxlength="2" value="${escapeHTML(MODIFIER_BY_SPECIALTY[state.activeSpecialty]?.code||'')}" placeholder="25" ${signed?'readonly':''}/>${MODIFIER_BY_SPECIALTY[state.activeSpecialty]?`<small class="v22-modifier-hint">Demo suggestion: ${escapeHTML(MODIFIER_BY_SPECIALTY[state.activeSpecialty].label)} — verify before billing</small>`:''}</label><label class="formgroup"><span class="label">Units</span><input id="encounter-units" type="number" class="field" value="1" min="1" max="99" /></label>${btn('Add CPT','encounter-add-cpt','small soft')}</div><div class="tablewrap"><table class="table"><thead><tr><th>Procedure</th><th>Modifier</th><th>Units</th><th>Charge</th><th></th></tr></thead><tbody>${e.cptItems.map((item,i)=>`<tr><td>${escapeHTML(item.code)}</td><td>${escapeHTML(item.modifier||'—')}</td><td>${item.units}</td><td>${dollars(item.charge*item.units)}</td><td>${signed?'':btn('Remove',`encounter-remove-cpt:${i}`,'small soft')}</td></tr>`).join('')||'<tr><td colspan="5" class="muted">No charges added</td></tr>'}</tbody></table></div><div class="rcm-total"><span>Total charges</span><strong>${dollars(encounterTotal(e))}</strong></div><div class="pill-row mt">${billable?`${btn(`${icon('download')} Download Superbill CSV`,'superbill-csv','soft')}${btn(`${icon('file')} Print / Save PDF`,'superbill-open','primary')}`:'<span class="muted tiny">Superbill export becomes available after this appointment is completed and Actual DOS is verified.</span>'}</div><p class="helper-disclaimer">Export is a sample superbill for biller UI review, not a CMS-1500, claim, coding determination or patient bill.</p></div>`)}</div></div>`;
}
function rcmDocumentBody(title,fields,notice,signatureHTML=''){
 return `<div class="rcm-print-sheet"><div class="rcm-print-mark">DEMO — NOT A VALID CLINICAL OR INSURANCE FORM</div><h2>${escapeHTML(title)}</h2><p class="muted">Evergreen Family Clinic · Training preview · ${fmt(today)}</p><div class="rcm-document-fields">${fields.map(([k,v])=>`<div class="listrow"><span>${escapeHTML(k)}</span><strong>${escapeHTML(v)}</strong></div>`).join('')}</div>${signatureHTML||'<div class="rcm-signature"><span>Authorized signature (not captured)</span><span>______________________________</span></div>'}<p class="helper-disclaimer">${escapeHTML(notice||state.clinicalPrintDisclaimer)}</p></div>`;
}
function rcmModalDetail(type,id){
 if(type==='staff-profile'){
  if(!roleCanView('staff'))return null;
  const s=state.staff.find(x=>String(x.id)===id);if(!s)return null;
  return {heading:'Staff Profile — '+s.name,body:rcmDocumentBody('Staff Profile',[['Name',s.name],['Role',s.role],['Branch',s.branch],['Specialty',s.specialty?specialtyName(s.specialty):'General Operations'],['Contact',s.contact],['Certifications',s.certifications.join(', ')]],'Synthetic staff credentials; no HR validation.'),print:false};
 }
 if(type==='provider-profile'){
  if(!roleCanView('providers'))return null;
  const x=state.providers.find(p=>String(p.id)===id);if(!x)return null;
  return {heading:'Provider Profile — '+x.name,body:rcmDocumentBody('Provider Credentials',[['Provider',x.name],['Specialty',specialtyName(x.specialty)],['Provider Taxonomy Code',x.taxonomyCode||'Not set'],['NPI',x.npi],['Tax ID',x.taxId],['DEA',x.dea],['CAQH',x.caqh],['License Number',x.license],['License Expiry',x.licenseExpiry+' · '+expiryLabel(x.licenseExpiry)],['DEA Expiry',x.deaExpiry+' · '+expiryLabel(x.deaExpiry)]],'Invented identifiers: do not use for credentialing.'),print:false};
 }
 if(type==='practice-profile'){
  const p=state.practices.find(x=>x.id===id);if(!p||!roleCanView('practices'))return null;
  return {heading:'Practice Profile — '+p.name,body:rcmDocumentBody('Practice Profile',[['Practice Name',p.name],['Legal Name',p.legalName],['Branch',p.branch],['Practice Type',p.practiceType],['Organization NPI',p.npi],['Tax ID',p.taxId],['Practice Taxonomy',p.taxonomyCode],['Phone',p.phone],['Email',p.email],['Address',[p.address,p.city,p.region,p.postalCode,p.country].filter(Boolean).join(', ')],['Website',p.website],['Timezone',p.timezone]],'Synthetic practice profile; verify all legal and billing identifiers before production.'),print:false};
 }
 if(type==='superbill-batch'&&roleCanView('consultation')){
  const list=state.appointments.filter(a=>appointmentAllowed(a)&&completed(a)&&appointmentHasDOS(a)&&(state.superbillPractice==='All practices'||a.branch===state.superbillPractice)&&(state.superbillDoctor==='All doctors'||a.doctor===state.superbillDoctor));
  if(!list.length)return null;
  const body=list.map((a,i)=>{const p=patient(a.patient),e=encounterFor(a.patient,a.id);if(!p)return '';const fields=[['Patient',p.name],['Patient ID',p.id],['Appointment ID',a.id],['Scheduled Date',a.date],['Actual Date of Service',a.actual_date_of_service],['DOB',p.dob],['Phone',p.phone],['Email',p.email],['Practice',p.branch],['Address',[p.address,p.city,p.region,p.postalCode,p.country].filter(Boolean).join(', ')],['Payer',p.payerName],['Member ID',p.memberId],['Rendering Doctor',e.provider],['Provider Taxonomy',state.providers.find(x=>x.name===e.provider)?.taxonomyCode||'Not set'],['DX Codes',e.dxCodes.join(', ')||'None'],...e.cptItems.map((x,n)=>['CPT '+(n+1),`${x.code} ${x.modifier?'mod '+x.modifier:''} · ${x.units} units · ${dollars(x.charge*x.units)}`]),['Total Charges',dollars(encounterTotal(e))],['Signed by',e.signature?.typed||e.signedBy||'—'],['Signed at',e.signedAt?new Date(e.signedAt).toLocaleString():'—']];
   return rcmDocumentBody(`Encounter Superbill ${i+1} of ${list.length}`,fields,'Sample charge capture only. Not an official claim or patient bill.',esignPrintHTML(e));
  }).join('<div class="print-page-break"></div>');
  return {heading:'Filtered Superbills — Print / Save PDF',body,print:true};
 }
 const p=patient(id);
 if(type==='demographics'&&p&&eligiblePatients().some(x=>x.id===id)){
  const fields=[['Patient Name',p.name],['Patient ID',p.id],['Date of Birth',p.dob],['Age',p.age],['Sex',p.sex],['Pronouns',p.pronouns],['Marital Status',p.maritalStatus],['Phone',p.phone],['Email',p.email],['Street Address',p.address],['City',p.city],['State / Province',p.region],['Postal Code',p.postalCode],['Country',p.country],['Preferred Language',p.preferredLanguage],['Occupation',p.occupation],['Emergency Contact',p.emergencyContactName],['Relationship',p.emergencyContactRelationship],['Emergency Contact Phone',p.emergencyContactPhone],['Assigned Doctor',p.doctor],['Practice',p.branch],['Payer',p.payerName],['Payer Type',p.payerType],['Member ID',p.memberId],['Group Number',p.groupNumber],['Registration Date',p.registrationDate]];
  return {heading:'Patient Demographics Form — '+p.name,body:rcmDocumentBody('Patient Demographics & Registration Form',fields,'Review every field with the patient. This is a sample form, not a jurisdiction-specific consent or legal record.'),print:true};
 }
 if(!p||!((type==='hospice-cert'&&roleCanView('hospice')&&(state.role==='Clinic Owner'||eligiblePatients().some(x=>x.id===id)))||eligiblePatients().some(x=>x.id===id)||(type==='superbill'&&reportablePatients().some(x=>x.id===id))))return null;
 const common=[['Patient',p.name],['DOB',p.dob],['Patient ID',p.id],['Date',dateNow]];
 if(type==='abn')return {heading:'Beneficiary Notice (ABN) — SAMPLE',body:rcmDocumentBody('Advance Beneficiary Notice — NOT AN OFFICIAL CMS FORM',[...common,['Payer',p.payerName],['Member ID',p.memberId],['Proposed Service','Sample noncovered item'],['Estimated Cost',dollars(state.abnTemplates[0].estimatedCost)],['Reason','Coverage may be limited; verify official notice requirements']],'Not an official Medicare ABN. No beneficiary election, valid notice, or signature occurs.'),print:true};
 if(type==='claim-form'&&p.claimDetails)return {heading:'Workers Comp / Auto / PI Claim Preview',body:rcmDocumentBody('Claim Information — CMS-1500-style DEMONSTRATION',[...common,['Claim Type',p.payerType],['Claim #',p.claimDetails.claimNumber],['Date of Injury',p.claimDetails.injuryDate],['Adjuster',p.claimDetails.adjuster+' · '+p.claimDetails.adjusterPhone],['Attorney',p.claimDetails.attorney+' · '+p.claimDetails.attorneyPhone],['Mediation',p.claimDetails.arbitration]],'NOT an official CMS-1500 form, and cannot be submitted to a payer.'),print:true};
 if(type==='hospice-cert'&&p.hospice)return {heading:'Hospice Certification — SAMPLE',body:rcmDocumentBody('Hospice Certification Preview',[...common,['Certification Date',p.hospice.certificationDate],['Election of Benefits',p.hospice.electionDate],['Attending Physician',p.hospice.attendingPhysician],['Terminal Diagnosis (illustrative)',p.hospice.terminalDx]],'Fictional certification. No legal election, medical certification or hospice benefit determination.'),print:true};
 if(type==='superbill'&&roleCanView('consultation')){
  const appointment=activeEncounterAppointment();
  if(!appointment||appointment.patient!==id||!completed(appointment)||!appointmentHasDOS(appointment))return null;
  const e=encounterFor(id,appointment.id);if(!e)return null;
  const fields=[...common,['Patient Phone',p.phone],['Patient Email',p.email],['Practice',p.branch],['Appointment ID',appointment.id],['Scheduled Date',appointment.date],['Actual Date of Service',appointment.actual_date_of_service],['Street Address',[p.address,p.city,p.region,p.postalCode,p.country].filter(Boolean).join(', ')],['Member ID',p.memberId],['Payer Type',p.payerType],['Rendering Provider',e.provider],['Provider Taxonomy',state.providers.find(x=>x.name===e.provider)?.taxonomyCode||'Not set'],['DX Codes',e.dxCodes.join(', ')||'None'],...e.cptItems.map((x,i)=>['CPT '+(i+1),`${x.code} ${x.modifier?'mod '+x.modifier:''} · ${x.units} units · ${dollars(x.charge*x.units)}`]),['Total Charges',dollars(encounterTotal(e))],['Signed by',e.signature?.typed||e.signedBy||'—'],['Signed at',e.signedAt?new Date(e.signedAt).toLocaleString():'—']];
  return {heading:'Superbill — Printable Sample',body:rcmDocumentBody('Encounter Superbill',fields,'Sample charge capture only. No code validation or insurance claim generation.',esignPrintHTML(e)),print:true};
 }
 return null;
}


function practiceForBranch(branch){return state.practices.find(p=>p.branch===branch)||null}
function practiceOptions(selected='All practices'){
 return `<option value="All practices" ${selected==='All practices'?'selected':''}>All practices</option>${state.practices.map(p=>`<option value="${escapeHTML(p.branch)}" ${selected===p.branch?'selected':''}>${escapeHTML(p.name)} · ${escapeHTML(p.branch)}</option>`).join('')}`;
}
function doctorOptions(selected='All doctors'){
 const docs=state.staff.filter(s=>s.role==='Doctor');
 return `<option value="All doctors" ${selected==='All doctors'?'selected':''}>All doctors</option>${docs.map(d=>`<option value="${escapeHTML(d.name)}" ${selected===d.name?'selected':''}>${escapeHTML(d.name)}</option>`).join('')}`;
}
function practicesPage(){
 const canManage=['Clinic Owner','Clinic Admin'].includes(state.role);
 const cards=state.practices.map(p=>{
  const doctors=state.staff.filter(s=>s.role==='Doctor'&&s.branch===p.branch).length;
  const patients=state.patients.filter(x=>x.branch===p.branch).length;
  const visits=state.appointments.filter(x=>x.branch===p.branch).length;
  return `<article class="practice-card"><div class="practice-card-top"><div class="practice-avatar">${icon('building')}</div><span class="badge ${p.status==='Active'?'green':'outline'}">${escapeHTML(p.status)}</span></div><h3>${escapeHTML(p.name)}</h3><p class="muted">${escapeHTML(p.legalName||p.name)} · ${escapeHTML(p.practiceType||'Clinic')}</p><div class="practice-metrics"><span><strong>${doctors}</strong>Doctors</span><span><strong>${patients}</strong>Patients</span><span><strong>${visits}</strong>Appointments</span></div><div class="practice-details"><div><small>Practice / Branch</small><strong>${escapeHTML(p.branch)}</strong></div><div><small>Taxonomy</small><strong>${escapeHTML(p.taxonomyCode||'Not set')}</strong></div><div><small>Contact</small><strong>${escapeHTML(p.phone||'—')}</strong></div><div><small>Email</small><strong>${escapeHTML(p.email||'—')}</strong></div><div class="wide"><small>Address</small><strong>${escapeHTML([p.address,p.city,p.region,p.postalCode,p.country].filter(Boolean).join(', ')||'—')}</strong></div></div><div class="pill-row mt">${canManage?btn(`${icon('edit')} Edit Profile`,`practice-edit:${p.id}`,'soft'):''}${btn('View Profile',`practice-view:${p.id}`,'small soft')}${canManage?btn('Delete','practice-delete:'+p.id,'small danger'):''}</div></article>`;
 }).join('');
 return `${pageHeader('Practice Management',canManage?'Each practice has an independent profile. Edit its details, add locations, and manage practice records.':'Read-only view. Only the Clinic Owner can create, edit or delete practice profiles.',canManage?btn(`${icon('plus')} Add Practice`,'practice-add','primary'):'<span class="badge outline">Owner only</span>')}<div class="info mb">Practice changes are reflected in the demo branch selector and practice-wise appointment / superbill reports. A practice linked to doctors, patients or appointments cannot be deleted until those records are reassigned.</div><div class="practice-grid">${cards||'<div class="empty-state">No practices created yet.</div>'}</div>`;
}
function encountersPage(){
 const visits=state.appointments.filter(a=>appointmentAllowed(a)&&['arrived','in-consultation','completed','checked-out'].includes(appointmentStatus(a))&&(state.encounterPractice==='All practices'||a.branch===state.encounterPractice)&&(state.encounterDoctor==='All doctors'||a.doctor===state.encounterDoctor)).sort((a,b)=>b.date.localeCompare(a.date)||b.time.localeCompare(a.time));
 return `${pageHeader('Encounters','Open a specific appointment encounter, complete SOAP documentation, and prepare billing after the visit is completed.',btn(`${icon('plus')} Start Encounter`,'encounter-start','primary'))}<div class="panel"><div class="panel-head report-dates"><label>Practice <select id="encounter-practice" class="field">${practiceOptions(state.encounterPractice)}</select></label><label>Doctor <select id="encounter-doctor" class="field">${doctorOptions(state.encounterDoctor)}</select></label></div><div class="tablewrap"><table class="table"><thead><tr><th>Patient</th><th>Practice</th><th>Doctor</th><th>Scheduled Date</th><th>Actual DOS</th><th>Encounter</th><th>Status</th><th>Action</th></tr></thead><tbody>${visits.map(a=>{const p=patient(a.patient),e=encounterFor(a.patient,a.id);return `<tr><td><strong>${escapeHTML(p?.name||a.patient)}</strong><small>${escapeHTML(a.patient)} · ${escapeHTML(p?.dob||'DOB not set')}</small></td><td>${escapeHTML(a.branch)}</td><td>${escapeHTML(a.doctor)}</td><td>${escapeHTML(a.date)}</td><td>${a.dos_verified===false&&a.actual_date_of_service?`<span class="badge orange">Unverified ${escapeHTML(a.actual_date_of_service)}</span>`:escapeHTML(a.actual_date_of_service||'—')}</td><td>${e.dxCodes.length} DX · ${e.cptItems.length} CPT</td><td>${statusBadge(appointmentStatus(a))}</td><td>${btn('Open Encounter',`encounter-open-appointment:${a.id}`,'small primary')}</td></tr>`}).join('')||'<tr><td colspan="8" class="muted">No arrived or completed visits match these filters. Scheduled bookings and no-shows are not billable encounters.</td></tr>'}</tbody></table></div></div><div class="info mt">Each encounter is linked to an appointment. The actual DOS is blank until the clinician completes that appointment; historical completed records without a verified DOS are flagged rather than guessed.</div>`;
}
function superbillsPage(){
 const rows=state.appointments.filter(a=>appointmentAllowed(a)&&(state.superbillPractice==='All practices'||a.branch===state.superbillPractice)&&(state.superbillDoctor==='All doctors'||a.doctor===state.superbillDoctor)&&completed(a)).sort((a,b)=>String(b.actual_date_of_service||'').localeCompare(String(a.actual_date_of_service||'')));
 const billable=rows.filter(appointmentHasDOS);
 const totals=billable.reduce((n,a)=>n+encounterTotal(encounterFor(a.patient,a.id)),0);
 return `${pageHeader('Superbill Register','Review completed appointments and verify their actual dates of service.',`<span class="badge blue">${billable.length} billable visits</span>`)}<div class="panel"><div class="panel-head report-dates"><label>Practice <select id="superbill-practice" class="field">${practiceOptions(state.superbillPractice)}</select></label><label>Rendering doctor <select id="superbill-doctor" class="field">${doctorOptions(state.superbillDoctor)}</select></label><div class="pill-row">${btn(`${icon('download')} Export Register CSV`,'superbill-register-csv','soft')}${btn(`${icon('file')} Print Filtered Superbills`,'superbill-batch-open','primary')}</div></div><div class="panel-body"><div class="rcm-total"><span>Filtered superbill charges (completed visits with DOS)</span><strong>${dollars(totals)}</strong></div></div><div class="tablewrap"><table class="table"><thead><tr><th>Patient</th><th>Appointment</th><th>Practice</th><th>Doctor</th><th>Scheduled Date</th><th>Actual DOS</th><th>DX</th><th>CPT Lines</th><th>Total</th><th>Actions</th></tr></thead><tbody>${rows.map(a=>{const p=patient(a.patient),e=encounterFor(a.patient,a.id),dos=appointmentHasDOS(a);return `<tr><td><strong>${escapeHTML(p?.name||a.patient)}</strong><small>${escapeHTML(a.patient)}</small></td><td>#${escapeHTML(a.id)}</td><td>${escapeHTML(a.branch)}</td><td>${escapeHTML(a.doctor)}</td><td>${escapeHTML(a.date)}</td><td>${dos?escapeHTML(a.actual_date_of_service):a.actual_date_of_service?`<span class="badge orange">Unverified ${escapeHTML(a.actual_date_of_service)}</span>`:'<span class="badge orange">Not recorded</span>'}</td><td>${e.dxCodes.length}</td><td>${e.cptItems.length}</td><td><strong>${dos?dollars(encounterTotal(e)):'—'}</strong></td><td><div class="pill-row">${btn('Open','encounter-open-appointment:'+a.id,'small soft')}${dos?btn('Print PDF','superbill-open-appointment:'+a.id,'small primary'):roleCanView('consultation')?btn('Verify DOS','correct-dos:'+a.id,'small soft'):'<span class="muted">Not billable — DOS missing</span>'}</div></td></tr>`}).join('')||'<tr><td colspan="10" class="muted">No completed appointments match the selected filters.</td></tr>'}</tbody></table></div></div><div class="info mt">Only completed appointments with a verified Actual DOS can be exported as superbills. No-shows, cancelled bookings and rescheduled originals are excluded. Superbills are encounter-level charge summaries, not submitted insurance claims or proof of payment.</div>`;
}
function pageHTML(){if(!specialtyAllowsPage(state.page))return `${pageHeader('Specialty unavailable','Select the matching Active Specialty to view this workspace.')}<div class="info">This demo limits specialty screens to their selected workspace.</div>`;if(!roleCanView(state.page))return `${pageHeader('Access restricted','Your signed-in account does not have permission to view this screen.')}<div class="info">Access is checked by the server. Contact the clinic owner if you need access.</div>`;if(!requireModule(state.page))return `${pageHeader('Module Disabled','Clinic Owner has switched this optional feature off.',btn('Module settings','page:modules','primary'))}<div class="info">Enable the module in Settings → Optional Modules to review its screen again.</div>`;switch(state.page){case'clinical-tools':return clinicalToolsPage();case'coding':return codingReferencePage();case'providers':return providerProfilesPage();case'hospice':return hospiceCarePage();case'overview':return overview();case'doctor-dashboard':return doctorDashboardPage();case'appointments':return appointmentsPage();case'encounters':return encountersPage();case'superbills':return superbillsPage();case'practices':return practicesPage();case'queue':return queuePage();case'patients':return patientsPage();case'consultation':return consultationPage();case'activity':return activityPage();case'attendance':return attendancePage();case'referrals':return referralPage();case'billing':return billingPage();case'reports':return reportsPage();case'builder':return builderPage();case'seo':return seoPage();case'analytics':return analyticsPage();case'staff':return staffPage();case'ai':return aiPage();case'integrations':return integrationsPage();case'security':return securityPage();case'audit':return auditPage();case'modules':return modulesPage();case'rehab':return rehabPage();case'spine':return spinePage();case'lesions':return lesionPage();default:return overview()}}
// -------- New modular widgets and pages --------
const rolePages={
 'Clinic Owner':null,
 'Clinic Admin':null,
 'Receptionist':new Set(['overview','appointments','queue','patients','activity','attendance']),
 'Doctor':new Set(['overview','doctor-dashboard','appointments','encounters','queue','patients','consultation','superbills','providers','coding','hospice','activity','rehab','spine','lesions','ai','clinical-tools',...Object.keys(clinicalTools)]),
 'Billing Staff':new Set(['overview','billing','reports']),
 'Auditor':new Set(['overview','reports','audit']),
 'Staff':new Set(['overview','attendance'])
};
const roleCanView=page=>!rolePages[state.role]||rolePages[state.role].has(page);
const isTrialActive=()=>state.billing.status==='expired'?false:(state.billing.plan==='paid'||
  (state.billing.plan==='trial'&&state.billing.trialEndsAt>=dateNow));
const unreadAlertCount=()=>visibleAlerts().filter(a=>a.unread).length;
function notificationDropdown(){return `<div class="notification-popover" role="region" aria-label="Demo notifications"><div class="popover-heading"><div><strong>Notifications</strong><small>${unreadAlertCount()} unread · Synthetic examples</small></div><button data-action="notifications-read" class="text-button">Mark all read</button></div><div class="notification-list">${visibleAlerts().map(a=>`<button class="notification-row ${a.type} ${a.unread?'is-unread':''}" data-action="alert-open:${a.id}"><span class="alert-mark ${a.type}"></span><span><strong>${escapeHTML(a.category)}</strong><small>${escapeHTML(a.message)}</small></span>${a.unread?'<i class="tiny-unread" aria-label="Unread"></i>':''}</button>`).join('')}</div><div class="popover-note">These are fabricated examples; no insurance service is connected.</div></div>`}
function overviewAlerts(){return panel('Alerts & Follow-up Actions','Insurance and document events shown as example alerts',btn(`View all ${icon('bell')}`,'notification-toggle','small soft'),`<div class="panel-body"><div class="overview-alert-grid">${visibleAlerts().map(a=>`<button class="overview-alert ${a.type}" data-action="alert-open:${a.id}"><span class="alert-mark ${a.type}"></span><span><strong>${escapeHTML(a.category)}</strong><small>${escapeHTML(a.message)}</small></span>${icon('chevron')}</button>`).join('')}</div></div>`) }
function globalSearchResults(){
 const term=state.search.trim().toLowerCase();
 const matches=term?eligiblePatients().filter(p=>`${p.name} ${p.id}`.toLowerCase().includes(term)).slice(0,6):[];
 const invoices=term&&roleCanView('billing')?state.invoices.filter(i=>`${i.id} ${nameFor(i.patientId)}`.toLowerCase().includes(term)&&eligiblePatients().some(p=>p.id===i.patientId)).slice(0,5):[];
 const patientsBlock=matches.length?matches.map(p=>`<button data-action="patient:${p.id}" class="search-result">${icon('user')}<span><strong>${escapeHTML(p.name)}</strong><small>${escapeHTML(p.id)}</small></span>${icon('arrow')}</button>`).join(''):`<p class="no-results">${term?'No matching patients':'Try searching a patient name or ID'}</p>`;
 const invoicesBlock=roleCanView('billing')?`<div class="search-suggestion-title">Invoices</div>${invoices.length?invoices.map(i=>`<div class="search-invoice-row"><button data-action="open-invoice:${i.id}" class="search-result">${icon('receipt')}<span><strong>${escapeHTML(i.id)}</strong><small>${escapeHTML(nameFor(i.patientId))} · $${invoiceTotal(i).toFixed(2)}</small></span>${icon('arrow')}</button><button class="btn small soft search-invoice-print" data-action="search-print-invoice:${i.id}" aria-label="Print invoice ${escapeHTML(i.id)}">${icon('receipt')} Print</button></div>`).join(''):`<p class="no-results">${term?'No matching invoices':'Search invoice number or patient name'}</p>`}`:'';
 return `<div class="global-search-dropdown" role="region" aria-label="Search results"><div class="search-suggestion-title">Patients</div>${patientsBlock}${invoicesBlock}</div>`;
}
function insuranceFor(id){return state.insurance[id]||(state.insurance[id]={payer:'Evergreen Health Plan',policy:'EHP-••••-'+id.slice(-4),status:'active',verifiedAt:null})}
// Pure read for the drawer and timeline. Never fabricate a file on view.
function getExistingDocuments(id){return state.documents[id]||[]}
// An explicit Add Demo Document click may initialize a patient's demo list.
function documentFor(id){return state.documents[id]||(state.documents[id]=[])}
function insuranceBadge(p){const ins=insuranceFor(p.id),map={active:['green','● Active'],expiring:['orange','● Expiring soon'],terminated:['red','● Terminated'],unverified:['orange','● Not verified']},[klass,label]=map[ins.status]||map.active;return `<span class="badge ${klass}">${label}${ins.verifiedAt?' · Verified just now':''}</span>`}
function appointmentWeekGrid(){
 const reference=new Date(state.appointmentDate+'T12:00:00');
 const dayIndex=(reference.getDay()+6)%7,monday=new Date(reference);
 monday.setDate(reference.getDate()-dayIndex);
 const days=Array.from({length:7},(_,i)=>{const d=new Date(monday);d.setDate(monday.getDate()+i);return d});
 const doctors=matchingDoctors().filter(d=>state.role!=='Doctor'||d.name===state.activeDoctor);
 return `<div class="calendar-summary"><span class="badge green">${fmt(days[0],{month:'short',day:'numeric'})} – ${fmt(days[6],{month:'short',day:'numeric',year:'numeric'})}</span><span>${icon('clock')} Live-from-state demo slot calculations · ${escapeHTML(specialtyName(state.activeSpecialty))}</span></div>
 <div class="week-scroll"><div class="week-grid">${days.map(d=>{
 const day=iso(d),events=visibleAppointments(day).slice().sort((a,b)=>a.time.localeCompare(b.time));
 const weekend=[0,6].includes(d.getDay());
 return `<section class="calendar-day ${day===dateNow?'today':''}"><header><strong>${new Intl.DateTimeFormat('en-US',{weekday:'short'}).format(d)}</strong><span>${fmt(d,{month:'short',day:'numeric'})}</span></header>
 ${doctors.map(doc=>{
 const all=availableSlots(doc.name,day),booked=all.filter(x=>x.booked),free=all.filter(x=>!x.booked);
 const shift=doctorShift(doc);
 return `<div class="doctor-day"><div class="doctor-day-head"><strong>${escapeHTML(doc.name.replace('Dr. ',''))}</strong><small>${weekend?'Closed':shift.join('–')}</small></div>
 <div class="day-slot-summary">${weekend?'No scheduled hours':`${booked.length} booked · ${free.length} free`}</div>
 ${free.slice(0,2).map(s=>`<button type="button" class="free-slot" data-action="book-slot" data-doctor="${escapeHTML(doc.name)}" data-date="${day}" data-time="${s.time}" aria-label="Book ${escapeHTML(doc.name)} at ${s.time}">${icon('plus')} ${s.time} Available</button>`).join('')}
 </div>`}).join('')}
 ${events.length?events.map(a=>`<button class="cal-event ${completed(a)?'is-complete':appointmentStatus(a)==='no_show'?'is-no-show':appointmentStatus(a)==='rescheduled'?'is-rescheduled':''}" data-action="patient:${a.patient}"><b>${escapeHTML(a.time)}</b><span>${escapeHTML(nameFor(a.patient))}</span><small>${escapeHTML(a.doctor)}</small><small>${statusBadge(appointmentStatus(a))}</small></button>`).join(''):`<div class="calendar-empty">${weekend?'Closed':'No booked visits'}</div>`}
 </section>`}).join('')}</div></div>`;
}
const reports=[
{id:'revenue',name:'Daily Revenue',desc:'Sample daily paid and pending revenue by date.',icon:'receipt'},
{id:'claims',name:'Insurance Claims',desc:'Sample clearinghouse claims statuses (fabricated).',icon:'shield'},
{id:'demographics',name:'Patient Demographics',desc:'Grouped synthetic patient age ranges and counts.',icon:'users'},
{id:'feedback',name:'Patient Feedback & NPS',desc:'Illustrative promoter breakdown and sample patient comments.',icon:'star'},
{id:'appointments',name:'All Appointment Details',desc:'Every appointment in the selected period with patient, practice, doctor and status.',icon:'calendar'},
{id:'practice-appointments',name:'Appointments by Practice',desc:'Appointment counts and status totals grouped by practice.',icon:'building'},
{id:'doctor-appointments',name:'Appointments by Doctor',desc:'Appointment counts and status totals grouped by rendering doctor.',icon:'user'}
];
function appointmentReportItems(){
 return state.appointments.filter(a=>(!state.reportStart||a.date>=state.reportStart)&&(!state.reportEnd||a.date<=state.reportEnd)
 &&(state.reportPractice==='All practices'||a.branch===state.reportPractice)
 &&(state.reportDoctor==='All doctors'||a.doctor===state.reportDoctor)
 &&(state.branch==='All branches'||a.branch===state.branch)
 &&(state.role!=='Doctor'||a.doctor===state.activeDoctor));
}
function appointmentReportPreviewHTML(){
 const items=appointmentReportItems();
 const groups=state.reportType==='practice-appointments'?state.practices.map(p=>({name:p.name,branch:p.branch})):state.staff.filter(s=>s.role==='Doctor').map(d=>({name:d.name,doctor:d.name}));
 const rows=groups.map(g=>{const subset=items.filter(a=>g.branch?a.branch===g.branch:a.doctor===g.doctor);return {...g,total:subset.length,scheduled:subset.filter(a=>appointmentStatus(a)==='scheduled').length,completed:subset.filter(completed).length,arrived:subset.filter(arrived).length,noShow:subset.filter(noShow).length,rescheduled:subset.filter(a=>appointmentStatus(a)==='rescheduled').length}});
 return `<div class="panel mt"><div class="panel-head"><div><div class="panel-title">${state.reportType==='practice-appointments'?'Practice-wise appointment summary':state.reportType==='doctor-appointments'?'Doctor-wise appointment summary':'Appointment report preview'}</div><div class="panel-subtitle">${items.length} appointment records in the selected period and filters</div></div><span class="badge blue">${items.length} visits</span></div><div class="tablewrap"><table class="table"><thead><tr><th>${state.reportType==='practice-appointments'?'Practice':state.reportType==='doctor-appointments'?'Doctor':'Appointment'}</th><th>Total</th><th>Scheduled</th><th>Arrived / In progress</th><th>Completed</th><th>No-Show</th><th>Rescheduled</th></tr></thead><tbody>${rows.map(r=>`<tr><td><strong>${escapeHTML(r.name)}</strong></td><td>${r.total}</td><td>${r.scheduled}</td><td>${r.arrived}</td><td>${r.completed}</td><td>${r.noShow}</td><td>${r.rescheduled}</td></tr>`).join('')||`<tr><td colspan="7" class="muted">No appointment records match the selected filters.</td></tr>`}</tbody></table></div></div>`;
}
function reportsPage(){
 const appointmentType=state.reportType.includes('appointment');
 return `${pageHeader('Reports Center','Generate date-filtered operational reports, including appointment totals by practice and doctor.',`<span class="badge blue">Synthetic data only</span>`)}<div class="panel report-filters"><div class="panel-head"><div><div class="panel-title">Report Filters</div><div class="panel-subtitle">Apply the same period and practice / doctor filters to appointment reports.</div></div></div><div class="panel-body"><div class="report-dates"><label>From <input class="field" type="date" id="report-start" value="${state.reportStart}" /></label><label>To <input class="field" type="date" id="report-end" value="${state.reportEnd}" /></label><label>Practice <select class="field" id="report-practice">${practiceOptions(state.reportPractice)}</select></label><label>Doctor <select class="field" id="report-doctor">${doctorOptions(state.reportDoctor)}</select></label></div></div></div><div class="report-cards mt">${reports.map(r=>`<div class="report-card ${state.reportType===r.id?'selected':''}"><div class="report-heading"><span class="report-icon">${icon(r.icon)}</span><span class="badge ${state.reportType===r.id?'green':'outline'}">${state.reportType===r.id?'Selected':'CSV'}</span></div><strong>${r.name}</strong><p>${r.desc}</p><div class="report-actions"><button class="btn small ${state.reportType===r.id?'soft':''}" data-action="report-select:${r.id}">${state.reportType===r.id?'Selected':'Select report'}</button></div></div>`).join('')}</div>${state.reportType==='feedback'?feedbackPreviewHTML():''}${appointmentType?appointmentReportPreviewHTML():''}<div class="panel mt"><div class="panel-body report-bottom"><div><strong>${reports.find(r=>r.id===state.reportType)?.name}</strong><p class="smalltext muted">${state.reportStatus==='ready'?'Report prepared. The CSV contains demo data only.':state.reportStatus==='loading'?'Preparing report rows…':'Generate the selected report to download a CSV.'}</p></div><div class="pill-row"><button class="btn primary" ${state.reportStatus==='loading'?'disabled':''} data-action="report-generate">${state.reportStatus==='loading'?'<span class="spinner"></span> Generating…':`${icon('refresh')} Generate`}</button>${state.reportStatus==='ready'?btn(`${icon('download')} Download CSV`,'report-download','soft'):''}</div></div></div>`;
}
function filteredFeedback(){
 if(state.reportStart&&state.reportEnd&&state.reportStart>state.reportEnd)return [];
 return state.feedback.filter(item=>(!state.reportStart||item.date>=state.reportStart)&&(!state.reportEnd||item.date<=state.reportEnd));
}
function feedbackMetrics(){
 const items=filteredFeedback(),total=items.length;
 const promoters=items.filter(item=>item.stars===5).length;
 const passives=items.filter(item=>item.stars===4).length;
 const detractors=total-promoters-passives;
 const share=count=>total?Math.round(count*100/total):0;
 const parts={promoters:share(promoters),passives:share(passives),detractors:share(detractors)};
 // NPS is a signed score (-100..100), not a percent satisfaction value.
 return {items,total,...parts,score:total?Math.round((promoters-detractors)*100/total):null};
}
function feedbackPreviewHTML(){
 const n=feedbackMetrics(),scoreLabel=n.score===null?'—':(n.score>0?'+':'')+n.score;
 return `<section class="panel mt feedback-preview" aria-label="Patient feedback report"><div class="panel-head"><div><div class="panel-title">Patient Feedback & NPS</div><div class="panel-subtitle">Fictional survey feedback · ${n.total} response${n.total===1?'':'s'} in selected period</div></div><span class="badge blue">NPS ${scoreLabel}</span></div><div class="panel-body">${n.total?`<div class="feedback-layout"><div class="feedback-summary"><div class="feedback-donut" role="img" aria-label="${n.promoters}% promoters, ${n.passives}% passives, ${n.detractors}% detractors" style="--nps-promoters:${n.promoters}%;--nps-passives:${n.promoters+n.passives}%"><div class="feedback-donut-center"><strong>${scoreLabel}</strong><small>NPS points</small></div></div><div class="feedback-legend"><span><i class="feedback-key promoters"></i>Promoters <strong>${n.promoters}%</strong></span><span><i class="feedback-key passives"></i>Passives <strong>${n.passives}%</strong></span><span><i class="feedback-key detractors"></i>Detractors <strong>${n.detractors}%</strong></span><small>NPS = % promoters − % detractors</small></div></div><div class="feedback-comments"><h3>Sample comments</h3>${n.items.map(f=>`<article class="feedback-comment"><div class="spaced"><strong>${escapeHTML(f.patient)}</strong><span class="feedback-stars" aria-label="${f.stars} out of 5 stars">${'★'.repeat(clamp(f.stars,0,5))}${'☆'.repeat(5-clamp(f.stars,0,5))}</span></div><p>${escapeHTML(f.comment)}</p><small>${fmt(f.date)}</small></article>`).join('')}</div></div>`:`<div class="feedback-empty" role="status">No feedback in the selected date range. Choose a different period to see the NPS breakdown and comments.</div>`}</div></section>`;
}
function demoReportRows(){
 if(state.reportType==='feedback'){
  const n=feedbackMetrics(),score=n.score===null?'N/A':n.score;
  return [['Category','Percent','NPS Score','Period'],['Promoters',n.promoters+'%',score,state.reportStart+' to '+state.reportEnd],['Passives',n.passives+'%','',''],['Detractors',n.detractors+'%','',''],...n.items.map(f=>['Feedback · '+f.patient,f.stars+' stars',f.comment,f.date])];
 }
 if(state.reportType==='appointments'){
  const items=appointmentReportItems();
  return [['Appointment ID','Scheduled Date','Time','Patient','Patient ID','Practice','Doctor','Service','Status','Actual Date of Service','DOS Verification'],...items.map(a=>[a.id,a.date,a.time,nameFor(a.patient),a.patient,a.branch,a.doctor,a.service,appointmentStatus(a),a.actual_date_of_service||'',appointmentHasDOS(a)?'Verified':a.actual_date_of_service?'Unverified legacy':'Missing'])];
 }
 if(state.reportType==='practice-appointments'||state.reportType==='doctor-appointments'){
  const items=appointmentReportItems(),byPractice=state.reportType==='practice-appointments';
  const groups=byPractice?state.practices.map(p=>({name:p.name,key:p.branch})):state.staff.filter(s=>s.role==='Doctor').map(d=>({name:d.name,key:d.name}));
  return [[byPractice?'Practice':'Doctor','Total Appointments','Scheduled','Arrived / In Progress','Completed','No-Shows','Rescheduled','Cancelled','Period Start','Period End'],...groups.map(g=>{
   const subset=items.filter(a=>byPractice?a.branch===g.key:a.doctor===g.key);
   return [g.name,subset.length,subset.filter(a=>appointmentStatus(a)==='scheduled').length,subset.filter(arrived).length,subset.filter(completed).length,subset.filter(noShow).length,subset.filter(a=>appointmentStatus(a)==='rescheduled').length,subset.filter(a=>appointmentStatus(a)==='cancelled').length,state.reportStart,state.reportEnd];
  })];
 }
 if(state.reportType==='revenue')return [['Date','Paid (USD)','Pending (USD)','Invoices'],[state.reportStart,'145.00','85.00','3'],[state.reportEnd,'110.00','0.00','1']];
 if(state.reportType==='claims')return [['Claim ID','Service Date','Payer','Status'],['CLM-1001',state.reportStart,'Evergreen Health Plan','Accepted (demo)'],['CLM-1002',state.reportEnd,'Northstar Assurance','Pending (demo)']];
 return [['Age Band','Patients','Period Start','Period End'],['18–34',3,state.reportStart,state.reportEnd],['35–54',4,state.reportStart,state.reportEnd],['55+',1,state.reportStart,state.reportEnd]];
}
function downloadBlob(blob,filename){
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1500);
}
// v2.4 backup keys remain accepted for compatibility; v2.7 adds hardened DOS and role-scoped accounts; v2.7.2 fixes scoped write validation and save retry behavior.
const V24_BACKUP_ARRAYS=['patients','appointments','followups','staff','providers','practices','soapTemplates','textPatterns','invoices','auditLogs','feedback','prescriptions','patientTimeline'];
const V24_BACKUP_OBJECTS=['encounters','signatures','documents','insurance','intakeConsents','billing'];
const V24_BACKUP_NUMBERS=['nextSoapTemplateId','nextTextPatternId'];
const V24_BACKUP_KEYS=[...V24_BACKUP_ARRAYS,...V24_BACKUP_OBJECTS,...V24_BACKUP_NUMBERS,'customAccent'];
const V26_STATE_KEYS=[...V24_BACKUP_KEYS,'website','seo','modules','doctorLeave','nextPrescriptionId','notificationItems','integrationConnections','note','theme','activeSpecialty','activeDoctor','branch','selectedPracticeId','selectedEncounterAppointmentId','doctorDashboardDoctor','doctorDashboardRange'];
let appReady=false;
let stateVersion=0;
let saveTimer=null;
let saveInFlight=false;
let queuedSnapshot=null;
let lastSavedFingerprint=null;
let pendingSaveReason='';
let saveRetryTimer=null;
let saveRetryAttempt=0;
let saveConflict=false;
let savePaused=false;
let savePauseReason='';

function snapshotState(){
 const record={};
 V26_STATE_KEYS.filter(k=>k!=='billing').forEach(k=>record[k]=state[k]??null);
 return record;
}
function normalizeAppointmentRecords(){
 if(state.doctorDashboardRange==='7d')state.doctorDashboardRange='week';else if(state.doctorDashboardRange==='30d'||!['today','week','month','all'].includes(state.doctorDashboardRange))state.doctorDashboardRange='month';
 state.appointments.forEach(a=>{
  if(a.status==='no-show')a.status='no_show';
  if(!a.created_at)a.created_at=a.createdAt||`${a.date||dateNow}T${a.time||'12:00'}:00`;
  if(!AppointmentDomain.isCompleted(a)){a.actual_date_of_service=null;a.dos_verified=false}
  else if(!AppointmentDomain.isISODate(a.actual_date_of_service)){a.actual_date_of_service=null;a.dos_verified=false}
  else if(a.dos_verified===undefined)a.dos_verified=Boolean(a.dos_recorded_by||(Array.isArray(a.dosHistory)&&a.dosHistory.length));
 });
 state.invoices.forEach(inv=>{
  const linked=state.appointments.find(a=>String(a.id)===String(inv.appointmentId));
  if(linked&&appointmentHasDOS(linked)){if(!inv.actual_date_of_service)inv.actual_date_of_service=linked.actual_date_of_service;inv.dos_verified=true}
  else if(linked)inv.dos_verified=false;
 });
 Object.values(state.encounters).forEach(encounter=>{
  if(!encounter||typeof encounter!=='object'||Array.isArray(encounter))return;
  const linked=encounter.appointmentId==null?null:state.appointments.find(a=>String(a.id)===String(encounter.appointmentId));
  if(!linked){encounter.appointmentId=null;encounter.actual_date_of_service=null;encounter.dateOfService='';encounter.dos_verified=false;return}
  if(appointmentHasDOS(linked)){if(!encounter.actual_date_of_service)encounter.actual_date_of_service=linked.actual_date_of_service;if(!encounter.dateOfService)encounter.dateOfService=linked.actual_date_of_service;encounter.dos_verified=true}
  else encounter.dos_verified=false;
 });
}
function updateSyncStatus(label){
 state.syncStatus=label;
 const node=document.getElementById('sync-status');
 if(node){node.textContent=label;node.dataset.status=label.toLowerCase().replace(/[^a-z]+/g,'-')}
}
async function refreshServerAudit(){
 if(!appReady||!state.authUser)return;
 try{
   const result=await MedBookAPI.loadAudit();
   state.serverAuditLogs=(result.events||[]).map(event=>({
     id:'server-'+event.id,
     at:event.createdAt,
     actor:event.actor?.displayName||event.actor?.email||'System',
     action:event.action,
     resource:event.resourceId||event.resourceType,
     branch:'—',
     outcome:event.outcome==='SUCCESS'?'Success':'Denied',
     purpose:event.metadata?JSON.stringify(event.metadata):'Server-side event',
     source:'Server audit · PostgreSQL'
   }));
   if(state.page==='audit')render();
 }catch(_){/* The core workspace remains usable if audit history is temporarily unavailable. */}
}
async function refreshUserAccounts(){
 if(!appReady||!['OWNER','ADMIN'].includes(state.authUser?.role))return;
 state.userAccountsLoading=true;
 try{const result=await MedBookAPI.listUsers();state.userAccounts=result.users||[]}
 catch(error){toast(error.message||'Could not load staff login accounts.')}
 finally{state.userAccountsLoading=false;if(state.page==='staff')render()}
}
function scheduleStateSave(){
 if(!appReady||!state.authUser)return;
 if(!isTrialActive()){updateSyncStatus('Read-only');return}
 if(saveConflict){updateSyncStatus('Conflict');return}
 let serialized;
 try{serialized=JSON.stringify(snapshotState())}catch(_){updateSyncStatus('Save error');return}
 if(serialized===lastSavedFingerprint&&!queuedSnapshot)return;
 if(queuedSnapshot&&queuedSnapshot.serialized===serialized){
  if(pendingSaveReason)queuedSnapshot.reason=pendingSaveReason;
 }else{
  queuedSnapshot={serialized,reason:pendingSaveReason||queuedSnapshot?.reason||''};
 }
 pendingSaveReason='';
 updateSyncStatus('Unsaved');
 if(savePaused){updateSyncStatus('Save paused');return}
 if(saveTimer)clearTimeout(saveTimer);
 if(saveInFlight)return;
 saveTimer=setTimeout(()=>{saveTimer=null;persistSnapshot()},850);
}
async function persistSnapshot(serialized=null,reason=''){
 if(serialized){queuedSnapshot={serialized,reason:reason||pendingSaveReason||queuedSnapshot?.reason||''};pendingSaveReason=''}
 if(!appReady||!state.authUser||savePaused)return;
 if(saveInFlight||saveConflict)return;
 if(saveRetryTimer){clearTimeout(saveRetryTimer);saveRetryTimer=null}
 saveInFlight=true;
 let shouldRetry=false;
 try{
  while(queuedSnapshot){
   const job=queuedSnapshot;queuedSnapshot=null;
   if(job.serialized===lastSavedFingerprint)continue;
   updateSyncStatus('Saving…');
   try{
    const result=await MedBookAPI.saveState(JSON.parse(job.serialized),stateVersion,job.reason||'');
    stateVersion=result.version;
    if(result.billing)state.billing=result.billing;
    if(result.clinicToday&&AppointmentDomain.isISODate(result.clinicToday))dateNow=result.clinicToday;
    if(result.state&&JSON.stringify(snapshotState())===job.serialized){
     Object.entries(result.state).forEach(([key,value])=>{if(V26_STATE_KEYS.includes(key)&&key!=='billing')state[key]=value});
     job.serialized=JSON.stringify(snapshotState());
    }
    lastSavedFingerprint=job.serialized;
    saveRetryAttempt=0;
    updateSyncStatus(JSON.stringify(snapshotState())===lastSavedFingerprint&&!queuedSnapshot?'Saved':'Unsaved');
    refreshServerAudit();
   }catch(error){
    if(!queuedSnapshot)queuedSnapshot=job;
    if(error.status===409){saveConflict=true;savePaused=true;savePauseReason='conflict';updateSyncStatus('Conflict');toast('This clinic was changed in another session. Reload the workspace before continuing; unsaved changes are retained in this tab.');return}
    if(error.status===402){savePaused=true;savePauseReason='trial';if(error.data?.billing)state.billing=error.data.billing;updateSyncStatus('Read-only');render();toast('Trial expired. Your pending changes remain in this tab but cannot be saved.');return}
    if(error.status===400||error.status===413){savePaused=true;savePauseReason='validation';updateSyncStatus('Validation error');toast(error.data?.error||error.message||'The data could not be saved because it failed validation.');return}
    if(error.status===401||error.status===403){savePaused=true;savePauseReason='session';updateSyncStatus('Session expired');appReady=false;try{await MedBookAPI.session()}catch(_){}renderLogin('Your session or permissions changed. Please sign in again.');return}
    saveRetryAttempt++;
    updateSyncStatus('Offline');
    if(saveRetryAttempt<5){
     shouldRetry=true;
     const delay=Math.min(30000,1000*(2**(saveRetryAttempt-1)));
     saveRetryTimer=setTimeout(()=>{saveRetryTimer=null;persistSnapshot()},delay);
     toast('Database connection interrupted. Your latest changes are queued and will retry automatically.');
    }else{
     savePaused=true;savePauseReason='network';updateSyncStatus('Save paused');
     toast('Automatic retries paused after five attempts. Your latest changes remain queued; restore the connection and use Retry Save.');
    }
    return;
   }
  }
 }finally{
  saveInFlight=false;
  if(queuedSnapshot&&!saveRetryTimer&&!saveConflict&&!savePaused&&!shouldRetry){
   if(saveTimer)clearTimeout(saveTimer);
   saveTimer=setTimeout(()=>{saveTimer=null;persistSnapshot()},0);
  }
 }
}
function retryPendingSave(){
 if(saveConflict){toast('Reload the workspace to resolve the version conflict safely.');return}
 if(!isTrialActive()){savePaused=true;savePauseReason='trial';updateSyncStatus('Read-only');toast('The clinic trial is not active. Pending changes cannot be saved until access is restored.');return}
 savePaused=false;savePauseReason='';
 if(!queuedSnapshot){const serialized=JSON.stringify(snapshotState());if(serialized!==lastSavedFingerprint)queuedSnapshot={serialized,reason:pendingSaveReason||''}}
 saveRetryAttempt=0;
 if(queuedSnapshot)persistSnapshot();
}
async function downloadServerBackup(){
 try{
   const backup=await MedBookAPI.exportBackup();
   downloadBlob(new Blob([JSON.stringify(backup,null,2)],{type:'application/json'}),`medbook-backup-${dateNow}.json`);
   refreshServerAudit();toast('Clinic database backup downloaded. Keep this file in a secure location.');
 }catch(error){toast(error.message||'Could not create a database backup.')}
}
async function signOut(){
 try{
   await new Promise(resolve=>setTimeout(resolve,0));
   if(saveTimer){clearTimeout(saveTimer);saveTimer=null}
   const pending=JSON.stringify(snapshotState());
   if(pending!==lastSavedFingerprint&&isTrialActive())queuedSnapshot={serialized:pending,reason:pendingSaveReason||queuedSnapshot?.reason||''};
   if(queuedSnapshot&&isTrialActive())await persistSnapshot();
   while(saveInFlight)await new Promise(resolve=>setTimeout(resolve,50));
   if(queuedSnapshot){toast('Sign out paused because changes are still waiting to save. Restore the connection and retry save first.');return}
   await MedBookAPI.logout();appReady=false;state.authUser=null;window.location.reload()
 }catch(error){toast(error.message||'Sign out failed. Please retry.')}
}
function renderLogin(message=''){
 appReady=false;
 document.body.setAttribute('data-theme','light');
 document.body.classList.remove('modal-open');
 document.getElementById('app').innerHTML=`<main class="auth-shell"><section class="auth-card"><div class="auth-brand"><span class="auth-brandmark">${icon('heartbeat')}</span><div><strong>MedBook <span>AI</span></strong><small>CLINIC WORKSPACE</small></div></div><div class="auth-kicker">SECURE SIGN IN</div><h1>Welcome back</h1><p class="auth-copy">Sign in to access your clinic workspace and saved records.</p><form id="login-form" class="auth-form"><label class="formgroup"><span class="label">Email address</span><input class="field" type="email" name="email" autocomplete="username" required maxlength="254" placeholder="you@yourclinic.com"></label><label class="formgroup"><span class="label">Password</span><input class="field" type="password" name="password" autocomplete="current-password" required maxlength="200" placeholder="Enter your password"></label><p id="login-error" class="auth-error" role="alert">${escapeHTML(message)}</p><button class="btn primary auth-submit" type="submit">Sign in securely ${icon('arrow')}</button></form><div class="auth-foot"><span>${icon('shield')} Encrypted database session</span><span>MedBook AI v2.7.2</span></div></section><p class="auth-disclaimer">Use only an account provisioned by your clinic administrator. Never use sample patient records for real clinical decisions.</p></main>`;
}
function renderConnectionError(message){
 appReady=false;
 document.getElementById('app').innerHTML=`<main class="auth-shell"><section class="auth-card"><div class="auth-brand"><span class="auth-brandmark">${icon('heartbeat')}</span><div><strong>MedBook <span>AI</span></strong><small>CLINIC WORKSPACE</small></div></div><div class="auth-kicker">CONNECTION REQUIRED</div><h1>Cannot reach MedBook</h1><p class="auth-copy">${escapeHTML(message||'The application server or database is unavailable.')}</p><button class="btn primary auth-submit" type="button" id="auth-retry">Try again ${icon('refresh')}</button><div class="auth-foot"><span>${icon('shield')} Your data was not cleared</span><span>MedBook AI v2.7.2</span></div></section></main>`;
}
async function bootstrapApp(){
 appReady=false;updateSyncStatus('Connecting…');
 try{
   const sessionInfo=await MedBookAPI.session();
   if(!sessionInfo.authenticated){state.authUser=null;renderLogin();return}
   const result=await MedBookAPI.loadState();
   state.authUser=result.user||sessionInfo.user;
   const roleLabels={OWNER:'Clinic Owner',ADMIN:'Clinic Admin',DOCTOR:'Doctor',RECEPTIONIST:'Receptionist',BILLING:'Billing Staff',AUDITOR:'Auditor',STAFF:'Staff'};
   state.role=roleLabels[state.authUser?.role]||'Clinic Owner';
   if(state.authUser?.branch)state.branch=state.authUser.branch;
   if(result.clinicToday&&AppointmentDomain.isISODate(result.clinicToday)){dateNow=result.clinicToday;today=new Date(`${dateNow}T12:00:00`)}
   state.billing=result.billing;
   stateVersion=result.version||0;
   if(result.state){Object.entries(result.state).forEach(([key,value])=>{if(V26_STATE_KEYS.includes(key)&&key!=='billing')state[key]=value})}
   else{
     if(!['OWNER','ADMIN'].includes(state.authUser?.role))throw Object.assign(new Error('An Owner or Admin must initialize the clinic workspace before staff accounts can sign in.'),{status:409});
     const initial=snapshotState();
     const created=await MedBookAPI.saveState(initial,0);
     stateVersion=created.version;
     state.billing=created.billing||state.billing;
   }
   if(state.role==='Doctor'){
     const ownDoctor=state.staff.find(member=>member.role==='Doctor'&&member.name===state.authUser.providerName);
     if(ownDoctor?.specialty)state.activeSpecialty=ownDoctor.specialty;
     state.activeDoctor=state.authUser.providerName||ownDoctor?.name||'';
     state.doctorDashboardDoctor=state.activeDoctor;
   }
   normalizeAppointmentRecords();
   lastSavedFingerprint=JSON.stringify(snapshotState());
   queuedSnapshot=null;saveConflict=false;saveRetryAttempt=0;savePaused=false;savePauseReason='';
   appReady=true;
   await refreshServerAudit();
   render();
   updateSyncStatus(isTrialActive()?'Saved':'Read-only');
 }catch(error){
   if(error.status===401){state.authUser=null;renderLogin('Your session expired. Please sign in again.');return}
   if(error.status===403){renderConnectionError('Your account is not authorized to access this clinic workspace. Contact your clinic administrator.');return}
   renderConnectionError(error.message||'Check the server and PostgreSQL connection, then retry.');
 }
}
function triggerCsv(rows,filename){const csv=rows.map(r=>r.map(v=>'"'+String(v??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');const file=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
function renderLoadingSkeleton(){return `<div class="loading-shell" role="status" aria-live="polite"><div class="skel skel-title"></div><div class="skel skel-caption"></div><div class="skeleton-cards">${Array.from({length:4},()=>'<div class="skel skel-card"></div>').join('')}</div><div class="skel skel-table"></div><span class="visually-hidden">Loading demonstration page</span></div>`}

const otherModalText={
'notifications':['Demo Notifications','<p>Open the bell dropdown in the top bar for insurance and document alerts.</p>'],
'referral-rules':['Referral Program Rules','<p><strong>Proposed reward:</strong> 45% subscription discount for an eligible doctor who refers another doctor whose paid MedBook AI subscription is verified.</p><p>Final duration, caps, eligible account, stacking, refund/reversal and eligibility rules have not been finalized. Self-referrals, duplicate accounts and fraudulent transactions must be blocked.</p><p>This program must never incentivize patient referrals or treatment decisions.</p>'],
'attendance-settings':['Attendance Configuration','<p>Planned options include shifts, authorized check-in method, leave types, break handling, supervisor approval and audit-backed corrections.</p><p>Location tracking and biometrics are <strong>not enabled</strong> in the default concept.</p>'],
'attendance-log':['Attendance History','<p>A production register will display individual check-in/out timestamps, corrections, reasons, approver and auditable event history. Attendance changes are saved with the clinic snapshot, but these fictional entries are not payroll records.</p>'],
'analytics-info':['Google Analytics 4 Setup','<p>A clinic-owned Google Analytics property must be authorized before real website traffic can be shown. Analytics events must exclude patient identity, diagnoses, appointment details and other protected health information.</p><p>The current charts are synthetic examples, not real GA4 data.</p>'],
'api-info':['Versioned API & Integrations','<p>The current v2.7.2 backend exposes same-origin REST endpoints under <code>/api</code> for individual authentication, role/branch-scoped state, user provisioning, versioned saves, trial checks, backup export/restore and server audit events.</p><p>OAuth, signed webhooks, payer/lab connections, MFA and normalized resource-level API permissions are not implemented in this release.</p>'],
'security-summary':['MedBook v2.7.2 Security Status','<p><strong>Implemented:</strong> individual role accounts, Firebase Authentication or legacy bcrypt login, PostgreSQL-backed sessions, CSRF validation, same-origin checks, login/API rate limits, AES-256-GCM encrypted clinic snapshots and stored backups, organization isolation, branch/provider-scoped state views, role-limited writes, version checks, server audit events and append-only audit triggers.</p><p><strong>Still required:</strong> MFA, password reset/rotation workflow, HTTPS production deployment, managed key storage/rotation, normalized clinical tables and database row-level security, off-site restore drills, independent penetration testing and healthcare compliance review.</p><p>This is a security baseline, not a compliance certification. Do not store real patient information until the remaining controls are independently reviewed.</p>'],
'role-info':['Role Permissions','<p>MedBook v2.7.2 supports individual Owner, Admin, Doctor, Receptionist, Billing, Auditor and Staff accounts. Doctor and branch-scoped records are filtered by the server; write access is restricted by role and assigned clinic branch.</p><p>Staff directory entries do not grant access by themselves. Create an individual login account, assign its role and provider/branch, and share the temporary password securely. MFA and a self-service password reset flow are still required before production deployment.</p>'],
'prescription-info':['Prescription Drafting','<p>A production clinician could prepare a prescription draft, edit medicines and sign/print after approval. This demo does not issue prescriptions or connect to any electronic prescribing network.</p>'],
'preview-site':['Website Preview','<p>The website design can be reviewed in the Website Builder using the desktop/mobile controls. There is no public URL or server behind this prototype.</p>'],
'site-book':['Public Booking Preview','<p>The public appointment button is visual only. Production website booking must use dedicated public endpoints with rate limits, validation and clinic-approved availability rules.</p>'],
'page-search':['Jump to a Screen',`<div class="formgroup"><label class="label">Choose a screen</label><select class="field" id="jump-screen">${navGroups.flatMap(g=>g.items).filter(i=>requireModule(i[0])&&roleCanView(i[0])&&specialtyAllowsPage(i[0])).map(i=>`<option value="${i[0]}">${i[1]}</option>`).join('')}</select></div>`]
};
function renderModal(){if(!state.modal)return '';let t=state.modal,heading='',body='',footer='';if(t==='pricing'){
  heading='Clinic Subscription Status';
  body=`<div class="v24-pricing-grid">
    <section class="v24-plan-card ${state.billing.status==='trial'?'current':''}">
      <span class="v24-plan-badge">${state.billing.status==='expired'?'Trial expired':state.billing.status==='trial'?'Current trial':'Trial not active'}</span>
      <h3>Free Trial</h3><p class="v24-plan-price"><strong>$0</strong> for ${state.billing.trialDays||30} days</p>
      <ul class="v24-plan-features"><li>✓ All Pro demo features</li><li>✓ Unlimited synthetic patients &amp; appointments</li><li>✓ SOAP templates + demo e-signature</li><li>✓ DX/CPT/Taxonomy samples</li><li>✓ No payment method or credit card</li></ul>
      <p class="v24-plan-note">Trial dates are enforced by the server and saved with your clinic account.</p>
    </section>
    <section class="v24-plan-card ${state.billing.plan==='paid'?'current':''}">
      <span class="v24-plan-badge">Subscription</span><h3>Paid Plan</h3>
      <p class="v24-plan-price"><strong>Contact</strong> administrator</p>
      <ul class="v24-plan-features"><li>✓ Subscription status managed by the clinic</li><li>✓ Existing records remain available for export</li><li>✓ Database backup and restore</li><li>✓ Server-side trial enforcement</li><li>✓ No simulated payment activation</li></ul>
      <button type="button" class="btn primary v24-upgrade-btn" data-action="upgrade-lifetime" aria-label="Contact administrator about subscription">Contact administrator</button>
      <p class="v24-plan-note">No payment gateway is connected in this release. An administrator must activate a subscription after verifying payment.</p>
    </section>
  </div>`;
  footer=btn('Close','close-modal');
} else if(t==='new-appointment'){
  heading=state.rescheduleAppointmentId?'Reschedule Appointment':'Create Demo Appointment';const choices=matchingDoctors().filter(d=>state.role!=='Doctor'||d.name===state.activeDoctor),draft=state.appointmentDraft||{},selectedDoctor=choices.find(d=>d.name===draft.doctor)||choices[0];
  if(!choices.length){
    body=`<div class="info orange"><strong>No doctors available.</strong><p>Active specialty: ${escapeHTML(specialtyName(state.activeSpecialty))}</p><p>Branch filter: ${escapeHTML(state.branch)}</p><p>Doctor role profile: ${escapeHTML(state.activeDoctor||'None')}</p><p>Change the specialty, branch or doctor in the top bar, then reopen this dialog.</p></div>`;
    footer=btn('Close','close-modal','primary');
    return `<div class="modal-cover" data-action="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-label="${heading}"><div class="modalheader"><strong>${heading}</strong><button class="iconbtn" data-action="close-modal" aria-label="Close">${icon('close')}</button></div><div class="modalbody subtitle">${body}</div><div class="modalfooter">${footer}</div></div></div>`;
  }
  body=`<form id="form-appointment"><div class="formgrid">
  <div class="formgroup wide"><label class="label">Patient</label><select name="patient" class="field" required>${eligiblePatients().map(p=>`<option value="${p.id}" ${draft.patient===p.id?'selected':''}>${escapeHTML(p.name)} (${escapeHTML(p.id)})</option>`).join('')}</select></div>
  <div class="formgroup"><label class="label">Appointment date</label><input type="date" class="field" name="date" value="${escapeHTML(draft.date||dateNow)}" required /></div>
  <div class="formgroup"><label class="label">Time</label><input type="time" class="field" name="time" value="${escapeHTML(draft.time||'12:30')}" step="1800" required /></div>
  <div class="formgroup"><label class="label">Doctor</label><select class="field" name="doctor" id="appointment-doctor" required>${choices.map(d=>`<option value="${escapeHTML(d.name)}" ${selectedDoctor?.name===d.name?'selected':''}>${escapeHTML(d.name)} · ${escapeHTML(d.branch)}</option>`).join('')}</select></div>
  <div class="formgroup"><label class="label">Duration</label><select class="field" name="duration"><option value="30" ${Number(draft.duration||30)===30?'selected':''}>30 minutes</option><option value="60" ${Number(draft.duration)===60?'selected':''}>60 minutes</option></select></div>
  <div class="formgroup wide"><label class="label">Service</label><input class="field" name="service" value="${escapeHTML(draft.service||'General consultation')}" maxlength="80" required /></div>
  </div><p class="form-error" id="appointment-error" role="alert">${escapeHTML(state.appointmentError||'')}</p><div class="info mt">Branch is derived from the selected doctor's record. The system blocks overlapping slots and bookings outside the clinician's demo working hours. ${state.rescheduleAppointmentId?'The original appointment will remain in history with Rescheduled status.':'No real booking is created.'}</div></form>`;
  footer=`${btn('Cancel','close-modal')}<button class="btn primary" type="submit" form="form-appointment" ${choices.length?'':'disabled'}>${state.rescheduleAppointmentId?'Save New Appointment':'Create appointment'}</button>`;
 }
else if(t.startsWith('complete-visit:')){
 const appointment=state.appointments.find(a=>String(a.id)===t.slice('complete-visit:'.length));
 heading='Complete Consultation · Confirm Actual DOS';
 if(!appointment||!appointmentAllowed(appointment)||appointmentStatus(appointment)!=='in-consultation'){
  body='<div class="info orange">This appointment is no longer in consultation or is outside your assigned scope.</div>';footer=btn('Close','close-modal');
 }else{
  body=`<form id="form-complete-visit"><input type="hidden" name="appointmentId" value="${escapeHTML(appointment.id)}"/><div class="info mb">Confirm the date the patient actually received the service. The scheduled date (${escapeHTML(appointment.date)}) is shown for reference only and will not be copied automatically.</div><div class="formgroup"><label class="label">Actual Date of Service *</label><input class="field" type="date" name="actualDate" value="${dateNow}" max="${dateNow}" required /></div><div class="listrow mt"><span class="muted">Clinic timezone</span><strong>${escapeHTML(state.authUser?.organization?.timezone||'UTC')}</strong></div><p class="help mt">The appointment will become Completed only after you confirm this date. Invoices and superbills will use this Actual DOS.</p></form>`;
  footer=btn('Cancel','close-modal')+`<button class="btn primary" type="submit" form="form-complete-visit">Confirm DOS & Complete Visit</button>`;
 }
}
else if(t.startsWith('correct-dos:')){
 const appointment=state.appointments.find(a=>String(a.id)===t.slice('correct-dos:'.length));
 heading=appointment?.dos_verified===false?'Verify Legacy Actual DOS':'Correct Actual Date of Service';
 if(!appointment||!appointmentAllowed(appointment)||!completed(appointment)){
  body='<div class="info orange">Only completed visits in your assigned scope can have their DOS corrected.</div>';footer=btn('Close','close-modal');
 }else{
  body=`<form id="form-correct-dos"><input type="hidden" name="appointmentId" value="${escapeHTML(appointment.id)}"/><div class="listrow"><span>Patient</span><strong>${escapeHTML(nameFor(appointment.patient))}</strong></div><div class="listrow"><span>Scheduled date</span><strong>${escapeHTML(appointment.date)}</strong></div><div class="listrow"><span>Current Actual DOS</span><strong>${appointment.dos_verified===false?`Unverified · ${escapeHTML(appointment.actual_date_of_service||'Not recorded')}`:escapeHTML(appointment.actual_date_of_service||'Not recorded')}</strong></div><div class="formgroup mt"><label class="label">Confirm Actual DOS *</label><input class="field" type="date" name="actualDate" value="${escapeHTML(appointment.actual_date_of_service||dateNow)}" max="${currentClinicDate()}" required /></div><div class="formgroup mt"><label class="label">Reason for correction *</label><textarea class="field" name="reason" rows="3" minlength="8" maxlength="500" required placeholder="Explain why the original service date was incorrect…"></textarea></div><div class="info orange mt">${appointment.dos_verified===false?'This legacy DOS has not been verified. Confirm the displayed date or enter the correct service date.':'The previous date will remain in the appointment DOS history.'} A reason is required and the verification/correction will be recorded in the server audit log.</div></form>`;
  footer=btn('Cancel','close-modal')+`<button class="btn primary" type="submit" form="form-correct-dos">${appointment.dos_verified===false?'Verify Actual DOS':'Save DOS Correction'}</button>`;
 }
}
else if(t.startsWith('cancel-appointment:')){
 const appointment=state.appointments.find(a=>String(a.id)===t.slice('cancel-appointment:'.length));
 heading='Cancel Appointment';
 if(!appointment||!appointmentAllowed(appointment)||!['scheduled','arrived'].includes(appointmentStatus(appointment))){
  body='<div class="info orange">Only scheduled or arrived appointments in your assigned scope can be cancelled.</div>';footer=btn('Close','close-modal');
 }else{
  body=`<form id="form-cancel-appointment"><input type="hidden" name="appointmentId" value="${escapeHTML(appointment.id)}"/><div class="listrow"><span>Patient</span><strong>${escapeHTML(nameFor(appointment.patient))}</strong></div><div class="listrow"><span>Scheduled</span><strong>${escapeHTML(appointment.date)} · ${escapeHTML(appointment.time)}</strong></div><div class="formgroup mt"><label class="label">Cancellation reason *</label><textarea class="field" name="reason" rows="3" minlength="8" maxlength="500" required placeholder="Enter why this appointment is being cancelled…"></textarea></div><div class="info orange mt">Cancelled appointments remain in the history and cannot be billed as completed visits.</div></form>`;
  footer=btn('Keep Appointment','close-modal')+`<button class="btn danger" type="submit" form="form-cancel-appointment">Confirm Cancellation</button>`;
 }
}
else if(t.startsWith('correct-attendance:')){
 const appointment=state.appointments.find(a=>String(a.id)===t.slice('correct-attendance:'.length));
 heading='Correct No-Show Attendance';
 if(!appointment||!appointmentAllowed(appointment)||appointmentStatus(appointment)!=='no_show'){
  body='<div class="info orange">This appointment is not currently a No-Show in your assigned scope.</div>';footer=btn('Close','close-modal');
 }else{
  body=`<form id="form-correct-attendance"><input type="hidden" name="appointmentId" value="${escapeHTML(appointment.id)}"/><div class="listrow"><span>Patient</span><strong>${escapeHTML(nameFor(appointment.patient))}</strong></div><div class="listrow"><span>Scheduled date</span><strong>${escapeHTML(appointment.date)}</strong></div><div class="formgroup mt"><label class="label">Correct attendance to *</label><select class="field" name="nextStatus" required><option value="arrived">Arrived — patient attended</option></select></div><div class="formgroup mt"><label class="label">Correction reason *</label><textarea class="field" name="reason" rows="3" minlength="8" maxlength="500" required placeholder="Explain why this No-Show was incorrect…"></textarea></div><div class="info mt">The correction is audit-logged. If the patient attended, continue through Start Visit and Complete Consultation to record the Actual DOS.</div></form>`;
  footer=btn('Cancel','close-modal')+`<button class="btn primary" type="submit" form="form-correct-attendance">Save Attendance Correction</button>`;
 }
}
else if(t==='account-new'){
 heading='Create Staff Login Account';
 const branches=[...new Set(state.practices.map(pr=>pr.branch))];
 const roles=state.role==='Clinic Owner'?['ADMIN','DOCTOR','RECEPTIONIST','BILLING','AUDITOR','STAFF']:['DOCTOR','RECEPTIONIST','BILLING','STAFF'];
 body=`<form id="form-user-account"><div class="formgrid"><div class="formgroup"><label class="label">Full name *</label><input class="field" name="displayName" maxlength="100" required /></div><div class="formgroup"><label class="label">Email *</label><input class="field" type="email" name="email" maxlength="254" required /></div><div class="formgroup"><label class="label">Role *</label><select class="field" name="role" required>${roles.map(role=>`<option value="${role}">${role.replaceAll('_',' ')}</option>`).join('')}</select></div><div class="formgroup"><label class="label">Branch *</label><select class="field" name="branch"><option value="">Select branch</option>${branches.map(branch=>`<option value="${escapeHTML(branch)}">${escapeHTML(branch)}</option>`).join('')}</select></div><div class="formgroup wide"><label class="label">Doctor / staff profile name</label><select class="field" name="providerName"><option value="">Not applicable</option>${state.staff.map(member=>`<option value="${escapeHTML(member.name)}">${escapeHTML(member.name)} · ${escapeHTML(member.role)} · ${escapeHTML(member.branch)}</option>`).join('')}</select><small class="help">Required for Doctor and Staff accounts. Doctor accounts are restricted to their assigned provider profile.</small></div><div class="formgroup wide"><label class="label">Temporary password *</label><input class="field" type="password" name="password" minlength="14" maxlength="200" autocomplete="new-password" required /><small class="help">At least 14 characters. Share securely and ask the user to change it after sign-in.</small></div></div><p class="form-error" id="account-error" role="alert"></p></form>`;
 footer=btn('Cancel','close-modal')+`<button class="btn primary" type="submit" form="form-user-account">Create Account</button>`;
}

else if(t==='import-instructions'){
  heading='How to Migrate EHR Data — Demo Instructions';
  body=`<div class="v24-import-steps"><ol>
    <li><strong>Download the template.</strong> Use the sidebar CSV template (23 columns).</li>
    <li><strong>Export from your previous EHR.</strong> Work only with synthetic/sample records in this prototype.</li>
    <li><strong>Map columns.</strong> Match source fields to the MedBook demonstration layout.
      <table class="v24-map-table"><thead><tr><th>Demo column</th><th>Other EHR examples</th></tr></thead><tbody>
        <tr><td>patient_id</td><td>MRN, Chart #, PatientID</td></tr>
        <tr><td>first_name / last_name</td><td>Pt_Name, Full_Name (split carefully)</td></tr>
        <tr><td>dob (YYYY-MM-DD)</td><td>DOB, DateOfBirth, Birth_Date</td></tr>
        <tr><td>sex</td><td>Gender, Sex_At_Birth</td></tr>
        <tr><td>phone</td><td>Phone, Home_Phone, Cell</td></tr>
        <tr><td>payer_type</td><td>Insurance_Type, Coverage</td></tr>
        <tr><td>assigned_doctor</td><td>PCP, Provider, Rendering</td></tr>
        <tr><td>branch</td><td>Location, Site, Clinic</td></tr>
      </tbody></table></li>
    <li><strong>Save as CSV.</strong> Keep UTF-8 encoding and header order.</li>
    <li><strong>Review, don't upload here.</strong> JSON Restore accepts MedBook JSON backups only; it CANNOT import CSV. Actual CSV import requires a separate validated importer.</li>
    <li><strong>Verify rows before migration.</strong> Review demographics, doctor, branch and insurance mappings in a production-ready system.</li>
  </ol><div class="info mt"><strong>Demo only:</strong> This site has no CSV importer or secure healthcare-data storage. Never enter or upload real patient information.</div></div>`;
  footer=btn('Close','close-modal','primary');
}
else if(t==='theme-settings'){
  heading='Customize Colors — Demo';
  const palette=['#4f806c','#2b6cb0','#dd6b20','#805ad5','#c53030','#38a169','#3182ce','#d69e2e','#b83280','#2c7a7b'];
  body=`<p class="muted">Pick an accent color. Clinical status colors are unchanged. Only this preference is saved locally.</p>
    <div class="v24-accent-grid" role="group" aria-label="Accent color swatches">
      ${palette.map(c=>`<button type="button" class="v24-accent-swatch ${state.customAccent===c?'active':''}" data-action="set-accent:${c}" style="background:${c}" aria-label="Select accent ${c}" title="${c}"></button>`).join('')}
    </div><div class="formgroup mt"><label class="label" for="v24-accent-picker">Custom accent color</label>
      <input type="color" id="v24-accent-picker" class="field" aria-label="Pick custom accent color" value="${state.customAccent||specialtyDefinitions[state.activeSpecialty].color}" /></div>
    <div class="pill-row mt"><button class="btn small soft" data-action="reset-accent" aria-label="Reset to specialty default colors">Reset to specialty default</button></div>`;
  footer=btn('Close','close-modal','primary');
}
else if(t==='new-followup'||t.startsWith('new-followup:')){heading='Schedule Demo Follow-Up';let chosen=t.includes(':')?t.split(':')[1]:'';body=`<form id="form-followup"><div class="formgrid"><div class="formgroup wide"><label class="label">Patient</label><select class="field" name="patient">${eligiblePatients().map(p=>`<option value="${p.id}" ${p.id===chosen?'selected':''}>${escapeHTML(p.name)}</option>`).join('')}</select></div><div class="formgroup wide"><label class="label">Follow-up date</label><input type="date" class="field" name="date" value="${iso(addDays(7))}" required /></div><div class="formgroup wide"><label class="label">Follow-up reason (non-clinical example)</label><input class="field" name="reason" value="Routine follow-up" maxlength="90" required /></div></div><div class="info mt">Clinician-set follow-up dates feed the dashboard. Actual reminders require patient consent and configured provider integrations.</div></form>`;footer=`${btn('Cancel','close-modal')}<button class="btn primary" type="submit" form="form-followup">Add follow-up</button>`}
else if(t==='new-patient'){
  const choices=matchingDoctors().filter(d=>state.role!=='Doctor'||d.name===state.activeDoctor);
  heading='Register Demo Patient';body=`<form id="form-patient-intake"><div class="formgrid">
    <div class="formgroup wide"><label class="label" for="intake-name">Full legal name *</label><input id="intake-name" name="name" class="field" maxlength="80" required placeholder="Patient full name" /></div>
    <div class="formgroup"><label class="label">Date of birth *</label><input id="intake-dob" name="dob" class="field" type="date" max="${dateNow}" required /></div>
    <div class="formgroup"><label class="label" for="intake-age">Age (calculated)</label><output id="intake-age" class="field intake-age-output" aria-live="polite">Select DOB</output></div>
    <div class="formgroup"><label class="label">Sex</label><select name="sex" class="field"><option value="Not specified">Not specified</option><option>Female</option><option>Male</option><option>Intersex</option><option>Prefer not to say</option></select></div>
    <div class="formgroup"><label class="label">Pronouns (optional)</label><input name="pronouns" class="field" maxlength="32" placeholder="e.g. she/her" /></div>
    <div class="formgroup"><label class="label">Marital status</label><select name="maritalStatus" class="field"><option>Not specified</option><option>Single</option><option>Married</option><option>Divorced</option><option>Widowed</option><option>Prefer not to say</option></select></div>
    <div class="formgroup"><label class="label">Mobile / Phone *</label><input name="phone" class="field" maxlength="32" required placeholder="+1 ..." /></div>
    <div class="formgroup"><label class="label">Email</label><input name="email" class="field" type="email" maxlength="100" placeholder="patient@example.com" /></div>
    <div class="formgroup wide"><label class="label">Street address</label><input name="address" class="field" maxlength="120" placeholder="Street, building, apartment" /></div>
    <div class="formgroup"><label class="label">City</label><input name="city" class="field" maxlength="60" /></div>
    <div class="formgroup"><label class="label">State / Province</label><input name="region" class="field" maxlength="40" /></div>
    <div class="formgroup"><label class="label">ZIP / Postal code</label><input name="postalCode" class="field" maxlength="20" /></div>
    <div class="formgroup"><label class="label">Country</label><input name="country" class="field" maxlength="60" value="United States" /></div>
    <div class="formgroup"><label class="label">Preferred language</label><input name="preferredLanguage" class="field" maxlength="40" value="English" /></div>
    <div class="formgroup"><label class="label">Occupation</label><input name="occupation" class="field" maxlength="70" /></div>
    <div class="formgroup"><label class="label">Emergency contact name</label><input name="emergencyContactName" class="field" maxlength="80" /></div>
    <div class="formgroup"><label class="label">Relationship</label><input name="emergencyContactRelationship" class="field" maxlength="40" placeholder="e.g. spouse, parent" /></div>
    <div class="formgroup"><label class="label">Emergency contact phone</label><input name="emergencyContactPhone" class="field" maxlength="32" /></div>
    <div class="formgroup"><label class="label">Assigned doctor *</label><select name="doctor" class="field" required>${choices.map(d=>`<option value="${escapeHTML(d.name)}">${escapeHTML(d.name)} · ${escapeHTML(d.branch)}</option>`).join('')}</select></div>
    <div class="formgroup"><label class="label">Payer name</label><input name="payer" class="field" maxlength="80" placeholder="Insurance company / Self-pay" /></div>
    <div class="formgroup"><label class="label">Policy number</label><input name="policy" class="field" maxlength="48" placeholder="Demo policy number" /></div>
  </div><div class="consent-box"><label><input type="checkbox" name="notice" required/> <span>I acknowledge receiving this clinic's privacy notice (demo acknowledgment).</span></label><label><input type="checkbox" name="analytics"/><span>Optional: allow non-identifying public website usage analytics.</span></label></div>
  <p id="intake-error" class="form-error" role="alert"></p><div class="info mt">Use fictional data only. Sample fields are saved in the clinic workspace. This demo acknowledgment is not a legally valid consent record; production needs approved privacy, consent, retention and access controls.</div></form>`;
  footer=btn('Cancel','close-modal')+`<button type="submit" form="form-patient-intake" class="btn primary" ${choices.length?'':'disabled'}>Register demo patient</button>`;
 }
 else if(t.startsWith('patient-edit:')){
  const p=patient(t.slice(13)),choices=state.staff.filter(d=>d.role==='Doctor');
  if(p){heading='Edit Patient Demographics';body=`<form id="form-patient-edit"><input type="hidden" name="recordId" value="${escapeHTML(p.id)}"/><div class="formgrid">
   <div class="formgroup wide"><label class="label">Full legal name *</label><input class="field" name="name" value="${escapeHTML(p.name)}" maxlength="80" required /></div>
   <div class="formgroup"><label class="label">Date of birth *</label><input class="field" name="dob" type="date" max="${dateNow}" value="${escapeHTML(p.dob||'')}" required /></div>
   <div class="formgroup"><label class="label">Sex</label><select class="field" name="sex">${['Not specified','Female','Male','Intersex','Prefer not to say'].map(v=>`<option ${p.sex===v?'selected':''}>${v}</option>`).join('')}</select></div>
   <div class="formgroup"><label class="label">Pronouns</label><input class="field" name="pronouns" value="${escapeHTML(p.pronouns||'')}" maxlength="32"/></div>
   <div class="formgroup"><label class="label">Marital status</label><select class="field" name="maritalStatus">${['Not specified','Single','Married','Divorced','Widowed','Prefer not to say'].map(v=>`<option ${p.maritalStatus===v?'selected':''}>${v}</option>`).join('')}</select></div>
   <div class="formgroup"><label class="label">Phone *</label><input class="field" name="phone" value="${escapeHTML(p.phone||'')}" maxlength="32" required /></div>
   <div class="formgroup"><label class="label">Email</label><input class="field" name="email" type="email" value="${escapeHTML(p.email||'')}" maxlength="100"/></div>
   <div class="formgroup wide"><label class="label">Street address</label><input class="field" name="address" value="${escapeHTML(p.address||'')}" maxlength="120"/></div>
   <div class="formgroup"><label class="label">City</label><input class="field" name="city" value="${escapeHTML(p.city||'')}" maxlength="60"/></div>
   <div class="formgroup"><label class="label">State / Province</label><input class="field" name="region" value="${escapeHTML(p.region||'')}" maxlength="40"/></div>
   <div class="formgroup"><label class="label">ZIP / Postal code</label><input class="field" name="postalCode" value="${escapeHTML(p.postalCode||'')}" maxlength="20"/></div>
   <div class="formgroup"><label class="label">Country</label><input class="field" name="country" value="${escapeHTML(p.country||'')}" maxlength="60"/></div>
   <div class="formgroup"><label class="label">Preferred language</label><input class="field" name="preferredLanguage" value="${escapeHTML(p.preferredLanguage||'')}" maxlength="40"/></div>
   <div class="formgroup"><label class="label">Occupation</label><input class="field" name="occupation" value="${escapeHTML(p.occupation||'')}" maxlength="70"/></div>
   <div class="formgroup"><label class="label">Emergency contact name</label><input class="field" name="emergencyContactName" value="${escapeHTML(p.emergencyContactName||'')}" maxlength="80"/></div>
   <div class="formgroup"><label class="label">Emergency contact relationship</label><input class="field" name="emergencyContactRelationship" value="${escapeHTML(p.emergencyContactRelationship||'')}" maxlength="40"/></div>
   <div class="formgroup"><label class="label">Emergency contact phone</label><input class="field" name="emergencyContactPhone" value="${escapeHTML(p.emergencyContactPhone||'')}" maxlength="32"/></div>
   <div class="formgroup"><label class="label">Assigned doctor</label><select class="field" name="doctor">${choices.map(d=>`<option value="${escapeHTML(d.name)}" ${p.doctor===d.name?'selected':''}>${escapeHTML(d.name)} · ${escapeHTML(d.branch)}</option>`).join('')}</select></div>
   </div><div class="info mt">To change the assigned doctor or practice, first reassign or cancel appointments dated today or later.</div></form>`;footer=btn('Cancel','close-modal')+'<button type="submit" form="form-patient-edit" class="btn primary">Save Demographics</button>'}
  else{heading='Patient not found';body='<p>Patient profile unavailable.</p>';footer=btn('Close','close-modal')}
 }
 else if(t.startsWith('practice-edit:')||t==='practice-add'){
  const editing=t.startsWith('practice-edit:'),p=editing?state.practices.find(x=>x.id===t.slice(14)):null;
  heading=editing?'Edit Practice Profile':'Add Practice';
  if(editing&&!p){body='<p>Practice not found.</p>';footer=btn('Close','close-modal')}
  else{body=`<form id="form-practice"><input type="hidden" name="recordId" value="${escapeHTML(p?.id||'')}"/><div class="formgrid">
   <div class="formgroup"><label class="label">Practice display name *</label><input class="field" name="name" value="${escapeHTML(p?.name||'')}" maxlength="90" required /></div>
   <div class="formgroup"><label class="label">Branch / location name *</label><input class="field" name="branch" value="${escapeHTML(p?.branch||'')}" maxlength="60" required /></div>
   <div class="formgroup wide"><label class="label">Legal business name</label><input class="field" name="legalName" value="${escapeHTML(p?.legalName||'')}" maxlength="100"/></div>
   <div class="formgroup"><label class="label">Practice type</label><input class="field" name="practiceType" value="${escapeHTML(p?.practiceType||'Clinic')}" maxlength="50"/></div>
   <div class="formgroup"><label class="label">Organization NPI (demo)</label><input class="field" name="npi" value="${escapeHTML(p?.npi||'')}" maxlength="30"/></div>
   <div class="formgroup"><label class="label">Tax ID (demo)</label><input class="field" name="taxId" value="${escapeHTML(p?.taxId||'')}" maxlength="30"/></div>
   <div class="formgroup"><label class="label">Practice Taxonomy Code</label><input class="field" name="taxonomyCode" value="${escapeHTML(p?.taxonomyCode||'')}" maxlength="20" placeholder="e.g. 261QF0400X"/></div>
   <div class="formgroup"><label class="label">Phone</label><input class="field" name="phone" value="${escapeHTML(p?.phone||'')}" maxlength="32"/></div>
   <div class="formgroup"><label class="label">Email</label><input class="field" name="email" type="email" value="${escapeHTML(p?.email||'')}" maxlength="100"/></div>
   <div class="formgroup wide"><label class="label">Street address</label><input class="field" name="address" value="${escapeHTML(p?.address||'')}" maxlength="120"/></div>
   <div class="formgroup"><label class="label">City</label><input class="field" name="city" value="${escapeHTML(p?.city||'')}" maxlength="60"/></div>
   <div class="formgroup"><label class="label">State / Province</label><input class="field" name="region" value="${escapeHTML(p?.region||'')}" maxlength="40"/></div>
   <div class="formgroup"><label class="label">ZIP / Postal code</label><input class="field" name="postalCode" value="${escapeHTML(p?.postalCode||'')}" maxlength="20"/></div>
   <div class="formgroup"><label class="label">Country</label><input class="field" name="country" value="${escapeHTML(p?.country||'United States')}" maxlength="60"/></div>
   <div class="formgroup"><label class="label">Website</label><input class="field" name="website" value="${escapeHTML(p?.website||'')}" maxlength="120"/></div>
   <div class="formgroup"><label class="label">Timezone</label><input class="field" name="timezone" value="${escapeHTML(p?.timezone||'America/Los_Angeles')}" maxlength="60"/></div>
   </div><div class="info mt">Tax IDs, NPI and taxonomy details in this prototype are not validated or credentialed. Use official sources before production billing.</div></form>`;footer=btn('Cancel','close-modal')+`<button type="submit" form="form-practice" class="btn primary">${editing?'Save Practice':'Create Practice'}</button>`}
 }
 else if(t.startsWith('practice-delete:')){
  const p=state.practices.find(x=>x.id===t.slice(16));
  const alternatives=state.practices.filter(x=>x.id!==p?.id);
  heading='Delete Practice & Reassign Records';
  if(!p||!alternatives.length){body='<p>Practice cannot be deleted until another active practice exists.</p>';footer=btn('Close','close-modal')}
  else{body=`<form id="form-practice-delete"><input type="hidden" name="recordId" value="${escapeHTML(p.id)}"/><p>Deleting <strong>${escapeHTML(p.name)}</strong> will move its linked doctors, providers, patients and appointments to the selected practice before removing this profile.</p><div class="formgroup"><label class="label">Reassign linked records to *</label><select class="field" name="targetBranch" required>${alternatives.map(x=>`<option value="${escapeHTML(x.branch)}">${escapeHTML(x.name)} · ${escapeHTML(x.branch)}</option>`).join('')}</select></div><div class="info mt">This preserves appointment and patient history in the demo. Review the target practice carefully.</div></form>`;footer=btn('Cancel','close-modal')+'<button type="submit" form="form-practice-delete" class="btn danger">Reassign & Delete Practice</button>'}
 }
 else if(t.startsWith('provider-edit:')){
  const p=state.providers.find(x=>String(x.id)===t.slice(14)&&(state.role!=='Doctor'||x.name===state.activeDoctor));
  heading='Edit Provider Profile';
  if(!p){body='<p>Provider not found.</p>';footer=btn('Close','close-modal')}
  else{body=`<form id="form-provider-edit"><input type="hidden" name="recordId" value="${escapeHTML(p.id)}"/><div class="formgrid">
   <div class="formgroup wide"><label class="label">Provider name</label><input class="field" value="${escapeHTML(p.name)}" disabled /></div>
   <div class="formgroup"><label class="label">Assigned practice / branch</label><select class="field" name="branch">${state.practices.map(pr=>`<option value="${escapeHTML(pr.branch)}" ${p.branch===pr.branch?'selected':''}>${escapeHTML(pr.name)} · ${escapeHTML(pr.branch)}</option>`).join('')}</select></div>
   <div class="formgroup"><label class="label">Provider Taxonomy Code (NUCC)</label><input class="field" name="taxonomyCode" list="nucc-datalist" value="${escapeHTML(p.taxonomyCode||'')}" maxlength="20" required placeholder="e.g. 207Q00000X"/><datalist id="nucc-datalist">${state.providerTaxonomies.map(x=>`<option value="${escapeHTML(x.code)}">${escapeHTML(x.description)}</option>`).join('')}</datalist></div>
   <div class="formgroup"><label class="label">NPI (demo)</label><input class="field" name="npi" value="${escapeHTML(p.npi)}" maxlength="30"/></div>
   <div class="formgroup"><label class="label">Tax ID (demo)</label><input class="field" name="taxId" value="${escapeHTML(p.taxId)}" maxlength="30"/></div>
   <div class="formgroup"><label class="label">DEA (demo)</label><input class="field" name="dea" value="${escapeHTML(p.dea)}" maxlength="30"/></div>
   <div class="formgroup"><label class="label">CAQH (demo)</label><input class="field" name="caqh" value="${escapeHTML(p.caqh)}" maxlength="30"/></div>
   <div class="formgroup"><label class="label">License number (demo)</label><input class="field" name="license" value="${escapeHTML(p.license)}" maxlength="30"/></div>
   <div class="formgroup"><label class="label">License expiry</label><input class="field" type="date" name="licenseExpiry" value="${escapeHTML(p.licenseExpiry)}"/></div>
   <div class="formgroup"><label class="label">DEA expiry</label><input class="field" type="date" name="deaExpiry" value="${escapeHTML(p.deaExpiry)}"/></div>
   </div><div class="info mt">Taxonomy and credential data are user-editable demo fields. Validate taxonomy against NUCC and credentials against authoritative sources before real use.</div></form>`;footer=btn('Cancel','close-modal')+'<button type="submit" form="form-provider-edit" class="btn primary">Save Provider Profile</button>'}
 }
 else if(t==='text-pattern-picker'){
   const field=state.textPatternTargetField;
   const matches=state.textPatterns.filter(p=>p.field===field||p.field==='any');
   heading='Insert Demo Snippet — '+escapeHTML(field||'SOAP');
   body=`<div class="v22-picker-list">${matches.map(p=>`<div class="v22-picker-row"><div class="v22-picker-info"><strong>${escapeHTML(p.name)}</strong><small>${escapeHTML(p.text.slice(0,90))}${p.text.length>90?'…':''}</small></div><div class="pill-row"><button class="btn small primary" data-action="text-pattern-apply:${escapeHTML(p.id)}">Insert</button>${p.builtIn?'<span class="badge outline">Built-in</span>':`<button class="btn small soft" data-action="text-pattern-edit:${escapeHTML(p.id)}">Edit</button><button class="btn small danger" data-action="text-pattern-delete:${escapeHTML(p.id)}">Delete</button>`}</div></div>`).join('')||'<p class="muted">No demo snippets for this field yet.</p>'}</div><div class="pill-row mt"><button class="btn small soft" data-action="text-pattern-new">+ New demo snippet</button></div><p class="helper-disclaimer">Synthetic example text only. Clinician must review and replace any assertions before use.</p>`;
   footer=btn('Close','close-modal');
 }
 else if(t.startsWith('text-pattern-edit:')){
   const editingId=t.slice('text-pattern-edit:'.length);
   const editing=state.textPatterns.find(p=>p.id===editingId&&!p.builtIn),isNew=!editingId;
   heading=isNew?'New Demo Snippet':'Edit Demo Snippet';
   if(!isNew&&!editing){body='<p>Custom snippet not available.</p>';footer=btn('Close','close-modal')}
   else{
     body=`<form id="form-text-pattern"><input type="hidden" name="recordId" value="${escapeHTML(editing?.id||'')}"/>
       <div class="formgroup"><label class="label">Snippet name *</label><input class="field" name="name" maxlength="60" required value="${escapeHTML(editing?.name||'')}" placeholder="e.g. Post-op precautions"/></div>
       <div class="formgroup mt"><label class="label">Target SOAP field</label><select class="field" name="field">${['subjective','objective','assessment','plan','any'].map(f=>`<option value="${f}" ${(editing?.field||state.textPatternTargetField||'any')===f?'selected':''}>${f==='any'?'Any field':f[0].toUpperCase()+f.slice(1)}</option>`).join('')}</select></div>
       <div class="formgroup mt"><label class="label">Snippet text *</label><textarea class="field" name="text" rows="6" maxlength="2000" required placeholder="Enter synthetic demo text…">${escapeHTML(editing?.text||'')}</textarea></div>
       <p class="helper-disclaimer">Custom sample text is saved to the clinic workspace and requires clinician verification before any real clinical use.</p></form>`;
     footer=btn('Cancel','close-modal')+`<button type="submit" form="form-text-pattern" class="btn primary">${isNew?'Create snippet':'Save changes'}</button>`;
   }
 }
 else if(t.startsWith('soap-template-edit:')){
   const editingId=t.slice('soap-template-edit:'.length);
   const editing=state.soapTemplates.find(x=>x.id===editingId&&!x.builtIn);
   const isNew=!editingId;
   heading=isNew?'New SOAP Template':'Edit SOAP Template';
   if(!isNew&&!editing){body='<p>Template unavailable.</p>';footer=btn('Close','close-modal')}
   else{
     body=`<form id="form-soap-template">
       <input type="hidden" name="recordId" value="${escapeHTML(editing?.id||'')}"/>
       <div class="formgrid">
         <div class="formgroup wide"><label class="label">Template name *</label><input class="field" name="name" maxlength="80" required value="${escapeHTML(editing?.name||'')}" placeholder="e.g. PT – Post-op Knee"/></div>
         <div class="formgroup wide"><label class="label">Specialty</label><select class="field" name="specialty">
           <option value="all" ${editing?.specialty==='all'?'selected':''}>All specialties</option>
           ${Object.entries(specialtyDefinitions).map(([k,v])=>`<option value="${k}" ${(editing?.specialty||state.activeSpecialty)===k?'selected':''}>${escapeHTML(v.name)}</option>`).join('')}
         </select></div>
         ${['subjective','objective','assessment','plan'].map(k=>`<div class="formgroup wide"><label class="label">${k[0].toUpperCase()+k.slice(1)}</label><textarea class="field" name="${k}" rows="3" maxlength="2000">${escapeHTML(editing?.[k]||'')}</textarea></div>`).join('')}
       </div><div class="info mt">Fill in [INSERT] and __ placeholders after applying. Demo data only.</div>
     </form>`;
     footer=btn('Cancel','close-modal')+`<button type="submit" form="form-soap-template" class="btn primary">${isNew?'Create template':'Save changes'}</button>`;
   }
 }
 else if(t.startsWith('esign:')){
   const patientId=t.slice('esign:'.length),p=patient(patientId),e=p?encounterFor(patientId):null;
   if(!p||!eligiblePatients().some(x=>x.id===patientId)||e?.status==='Signed'){
     heading='Signature';body='<p>Encounter unavailable.</p>';footer=btn('Close','close-modal');
   }else{
     const provider=e.provider,existing=state.signatures[provider];
     heading='Electronic Signature — '+escapeHTML(provider);
     body=`<div class="esign-wrap"><p class="esign-intro">By signing below, I attest that I am the clinician of record for this demo encounter and that the documentation is accurate to the best of my knowledge.</p>
       <div class="formgroup"><label class="label">Typed signature (full legal name) *</label><input class="field" id="esign-typed" maxlength="80" value="${escapeHTML(existing?.typed||provider)}"/></div>
       <label class="label">Drawn signature (optional)</label><div class="esign-pad-wrap">
        <canvas id="esign-pad" class="esign-pad" width="640" height="160" aria-label="Signature pad"></canvas>
        <div class="pill-row"><button type="button" class="btn small soft" data-action="esign-clear">Clear pad</button><span class="muted tiny">Draw with mouse, stylus or finger.</span></div>
       </div><div class="info mt"><strong>Demo only:</strong> not a legally valid electronic signature. No certificate, trusted timestamp service or tamper-proof audit trail.</div></div>`;
     footer=btn('Cancel','close-modal')+`<button class="btn primary" data-action="esign-commit:${escapeHTML(patientId)}">Sign &amp; lock encounter</button>`;
   }
 }
 else if(t==='new-invoice'){
  const billable=billableAppointments();
  heading='Create Demo Invoice';
  body=`<form id="form-invoice"><div class="formgrid">
   <div class="formgroup wide"><label class="label">Completed appointment / Actual DOS *</label><select class="field" name="appointmentId" required ${billable.length?'':'disabled'}><option value="">Select completed appointment</option>${billable.map(a=>`<option value="${escapeHTML(a.id)}">${escapeHTML(nameFor(a.patient))} · ${escapeHTML(a.doctor)} · DOS ${escapeHTML(a.actual_date_of_service)} · #${escapeHTML(a.id)}</option>`).join('')}</select></div>
   <div class="formgroup wide"><label class="label">Line item</label><input class="field" name="description" maxlength="90" value="Consultation" required /></div>
   <div class="formgroup"><label class="label">Quantity</label><input class="field" name="qty" type="number" min="1" max="99" step="1" value="1" required /></div>
   <div class="formgroup"><label class="label">Unit price (USD)</label><input class="field" name="unit" type="number" min="0" max="99999" step="0.01" value="80.00" required /></div>
   <div class="formgroup"><label class="label">Example tax (USD)</label><input class="field" name="tax" type="number" min="0" max="99999" step="0.01" value="0.00" required /></div>
   </div>${billable.length?'':'<div class="info orange mt">No completed, unbilled appointments with a verified Actual DOS are available. Complete a visit first; no-show and scheduled appointments cannot be invoiced.</div>'}<div class="info mt">The invoice inherits its patient and verified actual_date_of_service from the selected completed appointment. No financial transaction or payment processing occurs.</div></form>`;
  footer=btn('Cancel','close-modal')+`<button type="submit" form="form-invoice" class="btn primary" ${billable.length?'':'disabled'}>Create demo invoice</button>`;
 }
 else if(t.startsWith('invoice:')){
  const inv=state.invoices.find(i=>i.id===t.slice(8)&&eligiblePatients().some(p=>p.id===i.patientId));
  if(inv){const subtotal=invoiceSubtotal(inv),total=invoiceTotal(inv);
  heading=`Invoice ${escapeHTML(inv.id)}`;
  body=`<div class="invoice-heading"><div><strong>${escapeHTML(nameFor(inv.patientId))}</strong><small>${escapeHTML(inv.patientId)} · Demo only</small></div>${statusBadge(inv.status==='Paid'?'verified':'pending')}</div>
  <div class="listrow"><span>Appointment ID</span><strong>${escapeHTML(inv.appointmentId||'—')}</strong></div><div class="listrow"><span>Actual Date of Service</span><strong>${inv.dos_verified===false?`Unverified legacy DOS · ${escapeHTML(inv.actual_date_of_service||'Not recorded')}`:escapeHTML(inv.actual_date_of_service||'Not recorded')}</strong></div>
  <div class="invoice-items"><div class="invoice-grid invoice-th"><span>Description</span><span>Qty</span><span>Rate</span><span>Total</span></div>
  ${inv.items.map(x=>`<div class="invoice-grid"><span>${escapeHTML(x.label)}</span><span>${x.qty}</span><span>$${x.unit.toFixed(2)}</span><strong>$${(x.qty*x.unit).toFixed(2)}</strong></div>`).join('')}</div>
  <div class="invoice-sum"><div><span>Subtotal</span><strong>$${subtotal.toFixed(2)}</strong></div><div><span>Example tax</span><strong>$${inv.tax.toFixed(2)}</strong></div><div class="invoice-total"><span>Total</span><strong>$${total.toFixed(2)}</strong></div></div>
  <div class="info mt">${inv.status==='Paid'?'Payment marked as received in synthetic state.':'Record Payment only changes the simulated status; no funds move.'}</div>`;
  // Print is available for both Pending and Paid demo invoices.
  footer=btn('Close','close-modal')+btn(`${icon('file')} Print Invoice`,'print-invoice','soft')+(inv.status==='Pending'?btn('Record Payment',`pay-invoice:${inv.id}`,'primary'):'');
  }else{heading='Invoice not available';body='<p>Invoice is outside your demo scope.</p>';footer=btn('Close','close-modal')}
 }
 else if(/^(?:abn|claim-form|hospice-cert|superbill|superbill-batch|staff-profile|provider-profile|practice-profile|demographics):/.test(t)){
  const split=t.indexOf(':'),kind=t.slice(0,split),recordId=t.slice(split+1);
  const doc=rcmModalDetail(kind,recordId);
  if(doc){heading=escapeHTML(doc.heading);body=doc.body;footer=btn('Close','close-modal')+(doc.print?btn(`${icon('file')} Print / Save PDF`,'print-document','primary'):'')}
  else if(kind==='practice-profile'||kind==='staff-profile'){
    heading=(kind==='practice-profile'?'Practice':'Staff')+' Profile — Restricted';
    body='<div class="info orange">This profile is restricted to the <strong>Clinic Owner</strong> role in this demo. Switch role in the top bar.</div>';
    footer=btn('Close','close-modal','primary');
  }
  else{heading='Document unavailable';body='<div class="info">This template is not accessible in the active demo scope.</div>';footer=btn('Close','close-modal')}
 }
 else if(t.startsWith('connect:')){const id=t.slice(8),provider={availity:['Availity','OAuth 2.0'],change:['Change Healthcare','Sandbox API key'],quest:['Quest Diagnostics','Sandbox API key'],'search-console':['Google Search Console','OAuth 2.0'],ga4:['Google Analytics 4','OAuth 2.0']}[id];if(provider){heading=`Connect ${provider[0]} (Sandbox)`;body=`<form id="form-integration"><input type="hidden" name="provider" value="${escapeHTML(id)}"/><p class="muted">${provider[1]} connection simulation. Enter any non-sensitive test value — the app discards it immediately.</p><div class="formgroup"><label class="label">${provider[1]==='OAuth 2.0'?'Demo account / sandbox alias':'Demo API key alias'}</label><input class="field" name="sandboxAlias" placeholder="sandbox-demo" maxlength="60" required autocomplete="off" /></div><div class="info mt">No authentication request, token exchange, API call or credential storage takes place.</div></form>`;footer=btn('Cancel','close-modal')+'<button type="submit" form="form-integration" class="btn primary">Simulate connection</button>'}else{heading='Connector unavailable';body='<p>No demo adapter defined.</p>';footer=btn('Close','close-modal')}}
else if(otherModalText[t]){[heading,body]=otherModalText[t];footer=btn('Close','close-modal','primary')+(t==='page-search'?btn('Open screen','jump-screen','soft'):'')}
else{heading='UI Preview';body='<p>This capability is shown as a layout concept only.</p>';footer=btn('Close','close-modal','primary')}
return `<div class="modal-cover ${t.startsWith('invoice:')?'invoice-print-cover':/^(?:abn|claim-form|hospice-cert|superbill|superbill-batch|demographics):/.test(t)?'document-print-cover':''}${t.startsWith('demographics:')?' v24-demographics':''}" data-action="modal-backdrop"><div class="modal" role="dialog" aria-modal="true" aria-label="${heading}"><div class="modalheader"><strong>${heading}</strong><button class="iconbtn" data-action="close-modal" aria-label="Close">${icon('close')}</button></div><div class="modalbody subtitle">${body}</div><div class="modalfooter">${footer}</div></div></div>`}
// Merge seeded history and current clinic operational records for one patient.
// Do not mutate global arrays when sorting. No future appointments are shown as history.
function timelineFor(patientId){
 const events=state.patientTimeline.filter(x=>x.patientId===patientId).map(x=>({...x}));
 state.appointments.filter(a=>a.patient===patientId&&a.date<=dateNow).forEach(a=>events.push({id:'appt-'+a.id,type:'visit',date:a.date,title:a.service||'Clinic visit',description:a.doctor+' · '+a.time,status:appointmentStatus(a)}));
 state.invoices.filter(i=>i.patientId===patientId).forEach(i=>events.push({id:'bill-'+i.id,type:'invoice',date:i.createdAt||i.paidAt||dateNow,title:'Invoice '+i.id,description:'$'+invoiceTotal(i).toFixed(2)+' · Demo billing',status:i.status}));
 getExistingDocuments(patientId).forEach((d,i)=>events.push({id:'doc-'+i,type:'document',date:d.createdAt||iso(addDays(-14)),title:d.name,description:'Demo document metadata only',status:d.status}));
 state.prescriptions.filter(p=>p.patientId===patientId).forEach(p=>events.push({id:'rx-'+p.id,type:'prescription',date:p.createdAt||dateNow,title:p.name,description:p.dosage+' · '+p.frequency+' · UI-only draft',status:'Draft'}));
 return events.filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x.date)).sort((a,b)=>b.date.localeCompare(a.date)||String(b.id).localeCompare(String(a.id)));
}
function patientTimelineHTML(patientId){
 const icons={visit:'calendar',invoice:'receipt',document:'file',prescription:'pill'};
 const events=timelineFor(patientId);
 return `<div class="patient-timeline" role="list" aria-label="Patient visit history">${events.map(x=>`<div class="patient-timeline-entry" role="listitem"><span class="patient-timeline-icon type-${x.type}">${icon(icons[x.type]||'file')}</span><div class="patient-timeline-content"><div class="patient-timeline-heading"><strong>${escapeHTML(x.title)}</strong>${statusBadge(String(x.status).toLowerCase().replace(/\s+/g,'-'))}</div><time datetime="${escapeHTML(x.date)}">${fmt(x.date)}</time><p>${escapeHTML(x.description)}</p></div></div>`).join('')||'<p class="muted">No historical demo entries.</p>'}</div>`;
}
function renderDrawer(){
 if(!state.drawer)return '';
 const p=patient(state.drawer);if(!p)return '';
 const ins=insuranceFor(p.id),docs=getExistingDocuments(p.id),loading=!!state.eligibilityLoading[p.id],vobBusy=!!state.vobLoading[p.id];
 const claimTypes=['Workers Comp','Auto','Personal Injury'];
 const hasClaim=claimTypes.includes(p.payerType);
 const cell=(label,value)=>`<div><small>${escapeHTML(label)}</small><strong>${escapeHTML(value??'—')}</strong></div>`;
 const claim=p.claimDetails;
 const tabs=hasClaim?`<div class="team-tabs drawer-tabs" role="tablist"><button role="tab" class="tab ${state.drawerTab==='overview'?'active':''}" data-action="drawer-tab:overview" aria-selected="${state.drawerTab==='overview'}">Overview</button><button role="tab" class="tab ${state.drawerTab==='claims'?'active':''}" data-action="drawer-tab:claims" aria-selected="${state.drawerTab==='claims'}">Claim Details</button></div>`:'';
 const claimContents=claim?`<section class="drawer-section" aria-label="Claim Details"><div class="section-heading"><h3>${escapeHTML(p.payerType)} — Claim Details</h3>${rcmStatus('Pending')}</div><div class="insurance-meta">${cell('Claim number',claim.claimNumber)}${cell('Date of injury',claim.injuryDate)}${cell('Adjuster name',claim.adjuster)}${cell('Adjuster phone',claim.adjusterPhone)}${cell('Attorney',claim.attorney)}${cell('Attorney phone',claim.attorneyPhone)}${cell('Arbitration / Mediation',claim.arbitration)}</div><div class="pill-row mt">${btn(`${icon('file')} Print Required Forms`,`claim-form:${p.id}`,'primary')}</div><p class="helper-disclaimer">Mock claim information. The printable example is NOT an official CMS-1500 form and cannot be submitted.</p></section>`:'';
 const overview=`<div class="line"></div>${[['Assigned doctor',p.doctor],['Practice / Branch',p.branch],['Last completed visit',lastVisitLabel(p)],['Activity',activePatient(p)?'Active':'Inactive'],['Care Type',p.careType]].map(([a,b])=>`<div class="listrow"><span class="muted">${escapeHTML(a)}</span><strong>${escapeHTML(b)}</strong></div>`).join('')}
 <section class="drawer-section"><div class="section-heading"><h3>Patient Demographics</h3><span class="badge blue">Complete profile</span></div><div class="insurance-meta">${cell('Date of birth / Age',`${p.dob||'—'} · ${p.age??'—'} yrs`)}${cell('Sex / Pronouns',`${p.sex||'—'} · ${p.pronouns||'—'}`)}${cell('Marital status',p.maritalStatus)}${cell('Phone',p.phone)}${cell('Email',p.email)}${cell('Street address',p.address)}${cell('City / State',`${p.city||'—'}, ${p.region||'—'}`)}${cell('Postal / Country',`${p.postalCode||'—'} · ${p.country||'—'}`)}${cell('Preferred language',p.preferredLanguage)}${cell('Occupation',p.occupation)}${cell('Emergency contact',p.emergencyContactName)}${cell('Relationship / Phone',`${p.emergencyContactRelationship||'—'} · ${p.emergencyContactPhone||'—'}`)}</div><div class="pill-row mt">${['Clinic Owner','Clinic Admin','Receptionist'].includes(state.role)?btn(`${icon('edit')} Edit Demographics`,`patient-edit:${p.id}`,'soft'):''}${btn(`${icon('file')} Download Demographics PDF`,`demographics:${p.id}`,'primary')}</div></section>
 <section class="drawer-section"><div class="section-heading"><h3>Insurance & Eligibility</h3>${insuranceBadge(p)}</div><div class="insurance-meta">${cell('Payer Name',p.payerName||ins.payer)}${cell('Payer Type',p.payerType)}${cell('Member ID',p.memberId)}${cell('Group Number',p.groupNumber)}${cell('Coverage',p.insuranceStatus)}${cell('VOB Status',p.vobStatus)}${cell('Copay',dollars(p.copay))}${cell('Deductible Remaining',dollars(p.deductibleRemaining))}</div><div class="drawer-btn-row"><button class="btn soft" data-action="eligibility:${p.id}" ${loading?'disabled':''}>${loading?'<span class="spinner"></span> Checking…':`${icon('refresh')} Check Eligibility`}</button><button class="btn primary" data-action="run-vob:${p.id}" ${vobBusy?'disabled':''}>${vobBusy?'<span class="spinner"></span> Checking VOB…':`${icon('shield')} Run VOB`}</button><button class="btn soft" data-action="abn:${p.id}">${icon('file')} Generate ABN</button><button class="btn soft" data-action="request-documents:${p.id}">${icon('mail')} Request Documents</button></div><p class="helper-disclaimer">No payer, clearinghouse, SMS or Medicare endpoint is contacted. VOB outcomes are invented.</p></section>
 <section class="drawer-section"><div class="section-heading"><h3>Member Card</h3><span class="badge outline">${escapeHTML(state.memberCardSide.toUpperCase())}</span></div><div class="member-card ${state.memberCardSide==='back'?'is-back':''}"><div class="member-card-head"><span>${icon('shield')} ${escapeHTML(p.payerName||'Self-Pay')}</span><small>DEMO CARD — ${escapeHTML(state.memberCardSide.toUpperCase())}</small></div>${state.memberCardSide==='front'?`<div class="member-card-name">${escapeHTML(p.name)}</div><div class="member-card-details"><span>Member ID <strong>${escapeHTML(p.memberId)}</strong></span><span>Group <strong>${escapeHTML(p.groupNumber)}</strong></span></div>`:`<p>Mock plan support: +1 (555) 010-0000</p><p>Provider line: DEMO ONLY · No eligibility guarantee</p>`}</div><div class="pill-row mt">${btn('Front','card-side:front','small soft')}${btn('Back','card-side:back','small soft')}${btn(`${icon('upload')} Replace Card`,'replace-card','small soft')}<input type="file" id="member-card-file" class="visually-hidden" accept="image/*,application/pdf" aria-label="Select sample replacement member card" /></div><p class="helper-disclaimer">Visual-only chooser. Selected files are not uploaded, stored, previewed or attached.</p></section>
 <section class="drawer-section"><div class="section-heading"><h3>Documents</h3><span class="badge outline">Demo files</span></div><div class="upload-zone" role="group" aria-label="Demo document area">${icon('upload')}<strong>Add a sample patient document</strong><span>Creates a fictional pending entry only. No file is selected or uploaded.</span><button type="button" class="btn small soft" data-action="add-document:${p.id}">${icon('plus')} Add Demo Document</button></div><div class="document-list">${docs.map(d=>`<div class="document-row">${icon('file')}<span>${escapeHTML(d.name)}</span><span class="badge ${d.status==='Verified'?'green':'orange'}">${escapeHTML(d.status)}</span></div>`).join('')}</div></section>
 ${p.careType==='Hospice'&&p.hospice?`<section class="drawer-section"><div class="section-heading"><h3>Hospice Certification</h3><span class="badge orange">Sample</span></div><div class="insurance-meta">${cell('Certification Date',p.hospice.certificationDate)}${cell('Election of Hospice Benefits',p.hospice.electionDate)}${cell('Attending Physician',p.hospice.attendingPhysician)}${cell('Terminal Diagnosis (example)',p.hospice.terminalDx)}</div>${btn('Print Hospice Certification',`hospice-cert:${p.id}`,'soft')}</section>`:''}
 <section class="drawer-section"><div class="section-heading"><h3>Patient Timeline / Visit History</h3><span class="badge outline">Demo history</span></div>${patientTimelineHTML(p.id)}</section><div class="info mt">All details are synthetic. Actual healthcare records require backend authorization, clinical validation and privacy protections.</div>`;
 return `<div class="drawer-cover" data-action="drawer-backdrop"><div class="drawer" role="dialog" aria-modal="true" aria-label="Patient profile"><div class="modalheader"><strong>Patient Profile</strong><button class="iconbtn" data-action="close-drawer" aria-label="Close">${icon('close')}</button></div><div class="drawer-body"><div class="flex"><div class="miniava green" style="width:52px;height:52px;font-size:17px">${initials(p.name)}</div><div><h2 style="margin:0;font-size:20px">${escapeHTML(p.name)}</h2><p class="subtitle no-margin">${escapeHTML(p.id)} · ${p.age} yrs · ${escapeHTML(p.sex)}</p></div></div>${tabs}${state.drawerTab==='claims'&&hasClaim?claimContents:overview}</div></div></div>`;
}
function render(){themeEngine.apply();document.body.classList.toggle('modal-open',!!state.modal);document.getElementById('app').innerHTML=`<div class="layout">${sidebar()}<main class="main">${header()}<div class="workspace">${state.navigationLoading?renderLoadingSkeleton():pageHTML()}</div></main></div>${renderModal()}${renderDrawer()}<div class="floating-actions"><button class="fabbt" title="Optional modules" aria-label="Optional module settings" data-page="modules">${icon('settings')}</button></div><div id="v24-context-menu" class="v24-context-menu hidden" role="menu" aria-label="Patient actions"></div>`;
 const pad=document.getElementById('esign-pad');
 if(pad && !pad.dataset.bound){
   pad.dataset.bound='1';
   const ctx=pad.getContext('2d');
   ctx.lineWidth=2.2;ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#14172b';
   let drawing=false,last=null;
   const point=e=>{const r=pad.getBoundingClientRect();return {x:(e.clientX-r.left)*pad.width/r.width,y:(e.clientY-r.top)*pad.height/r.height}};
   pad.addEventListener('pointerdown',e=>{e.preventDefault();drawing=true;pad.setPointerCapture(e.pointerId);last=point(e);ctx.beginPath();ctx.arc(last.x,last.y,1,0,Math.PI*2);ctx.fillStyle='#14172b';ctx.fill()});
   pad.addEventListener('pointermove',e=>{if(!drawing)return;e.preventDefault();const cur=point(e);ctx.beginPath();ctx.moveTo(last.x,last.y);ctx.lineTo(cur.x,cur.y);ctx.stroke();last=cur});
   const stop=()=>{drawing=false;last=null};
   pad.addEventListener('pointerup',stop);pad.addEventListener('pointercancel',stop);
 }
 document.title=`${titlePage[state.page]||'Overview'} | MedBook AI`;scheduleStateSave()}
function toast(message){
 const root=document.getElementById('toast-root');if(!root)return;
 const el=document.createElement('div');el.className='toast';el.textContent=message;
 root.appendChild(el);
 while(root.children.length>3)root.firstElementChild.remove();
 window.setTimeout(()=>el.remove(),3500);
}
let navigationToken=0;
function navigate(page){const selectedTool=Object.prototype.hasOwnProperty.call(clinicalTools,page)?page:null;const target=selectedTool?'clinical-tools':titlePage[page]?page:'overview';if(selectedTool&&roleCanView('clinical-tools'))state.activeTool=selectedTool;state.page=roleCanView(target)&&specialtyAllowsPage(target)?target:'overview';state.modal=null;state.drawer=null;state.navOpen=false;state.searchOpen=false;state.notificationOpen=false;state.navigationLoading=true;const token=++navigationToken;render();if(target==='audit')refreshServerAudit();if(target==='staff')refreshUserAccounts();window.scrollTo({top:0,behavior:'instant'});setTimeout(()=>{if(token!==navigationToken)return;state.navigationLoading=false;render()},500)}
function copyText(value){if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(value).then(()=>toast('Copied to clipboard.')).catch(()=>fallbackCopy(value))}else fallbackCopy(value)}
function fallbackCopy(value){const x=document.createElement('textarea');x.value=value;x.style.position='fixed';x.style.opacity='0';document.body.appendChild(x);x.select();let ok=false;try{ok=document.execCommand('copy')}catch(e){}x.remove();toast(ok?'Copied to clipboard.':'Copy not available in this browser. Text: '+value)}
function downloadCSV(){const rows=[['Staff member','Role','Branch','Shift','Status','Check-in'],...state.staff.map(x=>[x.name,x.role,x.branch,x.shift,x.status,x.time])];const csv=rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(',')).join('\r\n');const file=new Blob([csv],{type:'text/csv;charset=utf-8;'});const u=URL.createObjectURL(file);const a=document.createElement('a');a.href=u;a.download='MedBook_Demo_Staff_Attendance.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),1500);toast('Synthetic attendance CSV downloaded.')}
function applyActionBase(action,evt){const [key,id]=action.split(':');if(key==='page'){navigate(id);return}if(key==='patient'){state.drawer=id;state.drawerTab='overview';state.memberCardSide='front';render();return}if(key==='nav'){state.navOpen=!state.navOpen;render();return}if(key==='nav-close'){state.navOpen=false;render();return}if(key==='modal-backdrop'){if(evt.target.classList.contains('modal-cover')){state.modal=null;state.rescheduleAppointmentId=null;state.appointmentDraft=null;render()}return}if(key==='drawer-backdrop'){if(evt.target.classList.contains('drawer-cover')){state.drawer=null;render()}return}if(key==='close-modal'){state.modal=null;state.rescheduleAppointmentId=null;state.appointmentDraft=null;render();return}if(key==='close-drawer'){state.drawer=null;render();return}if(key==='search-pages'){state.modal='page-search';render();return}if(key==='jump-screen'){navigate(document.getElementById('jump-screen')?.value||'overview');return}
if(key==='account-new'){if(!['OWNER','ADMIN'].includes(state.authUser?.role)){toast('Only Owner or Admin can provision login accounts.');return}state.modal='account-new';render();return}
if(key==='account-refresh'){refreshUserAccounts();return}
if(key==='account-toggle'){const user=state.userAccounts.find(item=>item.id===id);if(!user)return;(async()=>{try{await MedBookAPI.updateUser(id,{isActive:!user.isActive});await refreshUserAccounts();toast('Account access updated and active sessions revoked.')}catch(error){toast(error.message||'Could not update account access.')}})();return}
if(key==='new-patient'&&!['Clinic Owner','Clinic Admin','Receptionist'].includes(state.role)){toast('Your role cannot register patients.');return}
if(key==='new-followup'||key==='new-patient'||key==='notifications'||key==='referral-rules'||key==='attendance-settings'||key==='attendance-log'||key==='analytics-info'||key==='api-info'||key==='security-summary'||key==='role-info'||key==='prescription-info'||key==='preview-site'||key==='site-book'||key==='team-invite'){state.modal=action==='team-invite'?'account-new':action;render();return}
if(key==='mark-no-show'){
 if(!['Clinic Owner','Clinic Admin','Receptionist','Doctor'].includes(state.role)){toast('Your role cannot mark No-Show appointments.');return}
 if(!isTrialActive()){toast('Trial expired. Appointment updates are read-only.');state.modal='pricing';render();return}
 const a=state.appointments.find(x=>String(x.id)===id);
 if(!a||!appointmentInUserScope(a)){toast('Appointment is outside your active scope.');return}
 try{AppointmentDomain.markNoShow(a,dateNow,clinicClockParts().time)}catch(error){toast(error.message);return}
 a.no_show_marked_at=new Date().toISOString();audit('appointment.no_show',a.patient,'Success','Patient attendance',a.branch);
 render();toast(`${nameFor(a.patient)} marked as No-Show. No DOS was recorded.`);return;
}
if(key==='reschedule'){
 if(!['Clinic Owner','Clinic Admin','Receptionist','Doctor'].includes(state.role)){toast('Your role cannot reschedule appointments.');return}
 if(!isTrialActive()){toast('Trial expired. Appointment updates are read-only.');state.modal='pricing';render();return}
 const a=state.appointments.find(x=>String(x.id)===id);
 if(!a||!appointmentInUserScope(a)){toast('Appointment is outside your active scope.');return}
 if(!['scheduled','no_show'].includes(appointmentStatus(a))){toast('Only scheduled or no-show appointments can be rescheduled.');return}
 const assignedDoctor=state.staff.find(d=>d.role==='Doctor'&&d.name===a.doctor);
 if(state.role!=='Doctor'&&assignedDoctor?.specialty)state.activeSpecialty=assignedDoctor.specialty;
 if(assignedDoctor?.specialty)themeEngine.apply();
 const next=addDays(1);while([0,6].includes(next.getDay()))next.setDate(next.getDate()+1);
 state.rescheduleAppointmentId=a.id;
 state.appointmentDraft={doctor:a.doctor,date:iso(next),time:a.time,duration:a.duration||30,patient:a.patient,service:a.service||'General consultation'};
 state.appointmentError='';state.modal='new-appointment';render();return;
}
if(key==='complete-visit'){
 if(!isTrialActive()){toast('Trial expired. Clinical updates are read-only.');state.modal='pricing';render();return}
 if(!roleCanView('consultation')){toast('Only an authorized clinician can complete a consultation.');return}
 const a=state.appointments.find(x=>String(x.id)===id);
 if(!a||!appointmentAllowed(a)||appointmentStatus(a)!=='in-consultation'){toast('Only an in-consultation appointment in your assigned scope can be completed.');return}
 state.modal='complete-visit:'+a.id;render();return;
}
if(key==='correct-dos'){
 if(!isTrialActive()){toast('Trial expired. DOS corrections are read-only.');state.modal='pricing';render();return}
 if(!roleCanView('consultation')){toast('Only an authorized clinician can correct Actual DOS.');return}
 const a=state.appointments.find(x=>String(x.id)===id);
 if(!a||!appointmentAllowed(a)||!completed(a)){toast('Completed appointment not found in your scope.');return}
 state.modal='correct-dos:'+a.id;render();return;
}
if(key==='cancel-appointment'){
 if(!isTrialActive()){toast('Trial expired. Appointment updates are read-only.');state.modal='pricing';render();return}
 if(!['Clinic Owner','Clinic Admin','Receptionist','Doctor'].includes(state.role)){toast('Your role cannot cancel appointments.');return}
 const a=state.appointments.find(x=>String(x.id)===id);
 if(!a||!appointmentAllowed(a)||!['scheduled','arrived'].includes(appointmentStatus(a))){toast('Only scheduled or arrived appointments in your scope can be cancelled.');return}
 state.modal='cancel-appointment:'+a.id;render();return;
}
if(key==='correct-attendance'){
 if(!isTrialActive()){toast('Trial expired. Attendance corrections are read-only.');state.modal='pricing';render();return}
 if(!['Clinic Owner','Clinic Admin','Receptionist','Doctor'].includes(state.role)){toast('Your role cannot correct appointment attendance.');return}
 const a=state.appointments.find(x=>String(x.id)===id);
 if(!a||!appointmentInUserScope(a)||appointmentStatus(a)!=='no_show'){toast('No-Show appointment not found in your assigned scope.');return}
 state.modal='correct-attendance:'+a.id;render();return;
}
if(key==='check-in'||key==='start-visit'||key==='check-out'){
 if(!isTrialActive()){toast('Trial expired. Appointment updates are read-only.');state.modal='pricing';render();return}
 if(key==='check-in'&&!['Clinic Owner','Clinic Admin','Receptionist','Doctor'].includes(state.role)){toast('Your role cannot check in patients.');return}
 if(key==='check-out'&&!['Clinic Owner','Clinic Admin','Receptionist'].includes(state.role)){toast('Your role cannot check out patients.');return}
 if(key==='start-visit'&&!roleCanView('consultation')){toast('Only a clinician may start a consultation.');return}
 const a=state.appointments.find(x=>String(x.id)===id);if(!a||!appointmentAllowed(a)){toast('Appointment is outside your active scope.');return}
 const expected={'check-in':'scheduled','start-visit':'arrived','check-out':'completed'}[key];
 if(appointmentStatus(a)!==expected){toast('That status change is not available for this visit.');return}
 const newStatus={'check-in':'arrived','start-visit':'in-consultation','check-out':'checked-out'}[key];a.status=newStatus;
 if(key==='start-visit'){state.selectedEncounterPatientId=a.patient;state.selectedEncounterAppointmentId=String(a.id)}
 audit('appointment.'+key,a.patient,'Success','Patient flow',a.branch);
 toast(`${nameFor(a.patient)}: ${newStatus.replaceAll('-',' ')}.`);
 if(key==='start-visit')navigate('consultation');else render();return;
}
if(key==='followup-complete'){const f=state.followups.find(f=>String(f.id)===id);if(f)f.status='completed';render();toast('Follow-up marked completed (demo).');return}
if(key==='staff-out'||key==='staff-in'){if(!['Clinic Owner','Clinic Admin'].includes(state.role)){toast('Only a supervisor can update another staff member in this role demo.');return}const p=state.staff.find(s=>String(s.id)===id);if(p){p.status=key==='staff-out'?'checked-out':'checked-in';if(key==='staff-in')p.time='09:00';render();toast(p.name+': '+p.status.replaceAll('-',' ')+' (demo).')}return}
if(key==='retry-save'){retryPendingSave();return}
if(key==='today'){state.appointmentDate=dateNow;render();return}if(key==='save-note'){const p=activeEncounterPatient();if(p&&encounterFor(p.id)?.status==='Signed'){toast('Signed encounter is locked.');return}state.note=document.getElementById('clinical-note')?.value||state.note;toast('Sample draft saved to the clinic workspace; it is not a signed clinical note.');return}
if(key==='copy-referral'){copyText('https://medbook.example/ref/DR-DEMO-45');return}
if(key==='export-sample'){downloadCSV();return}
if(key==='device'){state.website.mobile=id==='mobile';render();return}if(key==='site-color'){state.website.color=id;render();return}
if(key==='publish-site'){state.website.published=!state.website.published;render();toast(state.website.published?'Demo publish flag enabled. No public website was deployed.':'Demo site set to draft.');return}
if(key==='seo-update'){state.seo.title=document.getElementById('seo-title')?.value||state.seo.title;state.seo.description=document.getElementById('seo-desc')?.value||state.seo.description;state.seo.slug=(document.getElementById('seo-slug')?.value||state.seo.slug).trim().toLowerCase().replace(/[^a-z0-9-]/g,'-');render();toast('Local search preview updated.');return}
if(key==='sitemap'){const xml='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>https://yourclinic.example/</loc></url>\n  <url><loc>https://yourclinic.example/services</loc></url>\n</urlset>';copyText(xml);return}
if(key==='generate-draft'){state.note=document.getElementById('ai-note')?.value||state.note;state.aiGenerated=true;state.aiApproved=false;render();toast('Fixed sample draft shown. No AI service was contacted.');return}if(key==='clear-draft'){state.aiGenerated=false;state.aiApproved=false;render();return}if(key==='approve-draft'){state.aiApproved=true;render();toast('UI demo review flag changed; no real clinical sign-off.');return}
if(key==='reset-modules'){modules.forEach(m=>state.modules[m.id]=true);render();toast('Optional module preview reset to enabled.');return}
}
function applyAction(action,evt){
  const [key,id]=action.split(':');
  if(key==='download-import-template'){
    const headers=['patient_id','first_name','last_name','dob (YYYY-MM-DD)','sex','phone','email','address','city','region','postal_code','country','preferred_language','emergency_contact_name','emergency_relationship','emergency_phone','assigned_doctor','branch','payer_name','payer_type','member_id','group_number','registration_date'];
    const examples=[
      ['PT-9001','John','Doe','1985-03-12','Male','+1 555 010-0001','john.doe@example.invalid','123 Main St','Springfield','IL','62701','USA','English','Jane Doe','Spouse','+1 555 010-0002','Dr. Sarah Malik','Main Clinic','Evergreen Health Plan','Commercial','DEMO-MBR-9001','GRP-200','2024-01-15'],
      ['PT-9002','Mary','Smith','1990-07-22','Female','+1 555 010-0003','mary.smith@example.invalid','456 Oak Ave','Centerville','CA','90210','USA','Spanish','John Smith','Parent','+1 555 010-0004','Dr. Bilal Shah','City Branch','Northstar Assurance','Medicare','DEMO-MBR-9002','GRP-201','2024-02-01']
    ];
    const csv=[headers,...examples].map(row=>row.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
    downloadBlob(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'}),'MedBook_Import_Template.csv');
    toast('Synthetic 23-column CSV template downloaded; CSV import is not implemented.');return;
  }
  if(key==='open-import-instructions'){state.modal='import-instructions';render();return}
  if(key==='download-backup'){downloadServerBackup();return}
  if(key==='logout'){signOut();return}
  if(key==='upload-backup'){document.getElementById('v24-backup-input')?.click();return}
  if(key==='open-in-new-window'){
    if(!eligiblePatients().some(p=>p.id===id)){toast('Patient not available in this demo scope.');return}
    const url=new URL(window.location.href);url.hash='patient='+encodeURIComponent(id);
    window.open(url.toString(),'_blank','noopener');
    return;
  }
  if(key==='copy-patient-id'){
    if(!eligiblePatients().some(p=>p.id===id))return;
    copyText(id);document.getElementById('v24-context-menu')?.classList.add('hidden');return;
  }
  if(key==='open-theme-settings'){state.themeSettingsOpen=true;state.modal='theme-settings';render();return}
  if(key==='set-accent'){
    if(!/^#[0-9a-f]{6}$/i.test(id)){toast('Invalid color.');return}
    state.customAccent=id;
    try{localStorage.setItem('medbook-custom-accent',id)}catch(_){}
    render();toast('Accent color updated.');return;
  }
  if(key==='reset-accent'){
    state.customAccent=null;
    try{localStorage.removeItem('medbook-custom-accent')}catch(_){}
    render();toast('Accent reset.');return;
  }
  if(key==='open-pricing'){state.pricingModalOpen=true;state.modal='pricing';render();return}
  if(key==='upgrade-lifetime'){
    toast('Online payments are not configured. Contact your clinic administrator to activate a subscription.');
    return;
  }
  if(['new-patient','new-appointment','new-invoice','soap-template-apply','soap-template-save-current','esign-commit'].includes(key)&&!isTrialActive()){
    toast('Trial expired. Contact your clinic administrator to reactivate editing.');state.modal='pricing';render();return;
  }
  if(['check-in','start-visit','complete-visit','check-out','mark-no-show','reschedule'].includes(key)&&!isTrialActive()){
    toast('Trial expired. Appointment updates are read-only until the clinic is reactivated.');state.modal='pricing';render();return;
  }
  if(['new-patient','new-appointment'].includes(key)&&!roleCanView(key==='new-patient'?'patients':'appointments')){toast('Demo role cannot perform this action.');return}
  if(['new-invoice','pay-invoice','open-invoice','invoice','search-print-invoice','print-invoice'].includes(key)&&!roleCanView('billing')){audit('invoice.denied',id,'Denied','UI demo');toast('Billing is restricted for this role (UI demo).');return}
  if(key==='patient'&&!eligiblePatients().some(p=>p.id===id)){audit('patient.denied',id,'Denied','UI demo');toast('Patient is outside the active specialty or role scope.');return}

  if(key==='encounter-open-appointment'){
    const appointment=state.appointments.find(a=>String(a.id)===id);
    if(!appointment||!appointmentInUserScope(appointment)||!reportablePatients().some(p=>p.id===appointment.patient)){toast('Appointment is outside the active doctor / practice scope.');return}
    const assignedDoctor=state.staff.find(d=>d.role==='Doctor'&&d.name===appointment.doctor);
    if(state.role!=='Doctor'&&assignedDoctor?.specialty)state.activeSpecialty=assignedDoctor.specialty;
    if(assignedDoctor?.specialty)themeEngine.apply();
    state.selectedEncounterPatientId=appointment.patient;state.selectedEncounterAppointmentId=String(appointment.id);
    navigate('consultation');return;
  }
  if(key==='encounter-open'||key==='encounter-start'){
    const target=id||activeEncounterPatient()?.id;
    if(!target||!reportablePatients().some(p=>p.id===target)){toast('Choose a patient within the active practice / doctor scope.');return}
    state.selectedEncounterPatientId=target;
    const linked=state.appointments.filter(a=>a.patient===target&&appointmentAllowed(a)&&['arrived','in-consultation','completed','checked-out'].includes(appointmentStatus(a))).sort((a,b)=>b.date.localeCompare(a.date)||b.time.localeCompare(a.time))[0];
    state.selectedEncounterAppointmentId=linked?String(linked.id):'';
    navigate('consultation');return;
  }
  if(key==='practice-add'||key==='practice-edit'){
    if(!['Clinic Owner','Clinic Admin'].includes(state.role)){toast('Only Owner or Admin can manage practice profiles.');return}
    state.modal=key==='practice-add'?'practice-add':'practice-edit:'+id;render();return;
  }
  if(key==='practice-view'){
    state.modal='practice-profile:'+id;render();return;
  }
  if(key==='practice-delete'){
    if(!['Clinic Owner','Clinic Admin'].includes(state.role)){toast('Only Owner or Admin can delete a practice.');return}
    const pr=state.practices.find(p=>p.id===id);if(!pr)return;
    const linked=state.staff.some(s=>s.branch===pr.branch)||state.patients.some(p=>p.branch===pr.branch)||state.appointments.some(a=>a.branch===pr.branch);
    if(linked){
      if(state.practices.length<2){toast('Add another practice before deleting this one so linked records can be reassigned.');return}
      state.modal='practice-delete:'+id;render();return;
    }
    state.practices=state.practices.filter(p=>p.id!==id);
    if(state.branch===pr.branch)state.branch='All branches';
    render();toast('Practice deleted from the demo workspace.');return;
  }
  if(key==='provider-edit'){
    const provider=state.providers.find(p=>String(p.id)===id);
    if(!provider||!['Clinic Owner','Clinic Admin'].includes(state.role)){toast('You can only edit your own provider profile.');return}
    state.modal='provider-edit:'+id;render();return;
  }
  if(key==='patient-edit'){
    if(!['Clinic Owner','Clinic Admin','Receptionist'].includes(state.role)){toast('Your role cannot edit patient demographics.');return}
    if(!eligiblePatients().some(p=>p.id===id)){toast('Patient profile is outside your active scope.');return}
    state.modal='patient-edit:'+id;render();return;
  }
  if(key==='text-pattern-open'){
    if(!roleCanView('consultation')){toast('Consultation access required.');return}
    if(!['subjective','objective','assessment','plan'].includes(id))return;
    const p=activeEncounterPatient();if(!p||encounterFor(p.id).status==='Signed'){toast('Encounter unavailable or locked.');return}
    state.textPatternTargetField=id;state.modal='text-pattern-picker';render();return;
  }
  if(key==='text-pattern-apply'){
    if(!roleCanView('consultation')||state.modal!=='text-pattern-picker'){toast('Open the snippet picker first.');return}
    const p=activeEncounterPatient();if(!p)return;
    const enc=encounterFor(p.id);
    if(enc.status==='Signed'){toast('Signed encounter is locked.');return}
    const tpl=state.textPatterns.find(t=>t.id===id),target=state.textPatternTargetField;
    if(!tpl||!['subjective','objective','assessment','plan'].includes(target)||(tpl.field!==target&&tpl.field!=='any')){toast('Invalid snippet selection.');return}
    const current=String(enc[target]||'');
    const updated=current?(current.trimEnd()+'\n\n'+tpl.text):tpl.text;
    if(updated.length>7000){toast('Snippet would exceed the 7,000-character SOAP field limit.');return}
    enc[target]=updated;state.modal=null;render();toast(`Demo snippet "${tpl.name}" inserted into ${target}.`);return;
  }
  if(key==='text-pattern-new'||key==='text-pattern-edit'){
    if(!roleCanView('consultation')){toast('Consultation access required.');return}
    if(key==='text-pattern-edit'&&!state.textPatterns.some(t=>t.id===id&&!t.builtIn)){toast('Only custom snippets can be edited.');return}
    state.modal='text-pattern-edit:'+(key==='text-pattern-new'?'':id);render();return;
  }
  if(key==='text-pattern-delete'){
    if(!roleCanView('consultation')){toast('Consultation access required.');return}
    const tpl=state.textPatterns.find(t=>t.id===id);
    if(!tpl||tpl.builtIn){toast('Built-in snippets cannot be deleted.');return}
    if(!window.confirm(`Delete snippet "${tpl.name}"?`))return;
    state.textPatterns=state.textPatterns.filter(t=>t.id!==id);
    render();toast('Demo snippet deleted.');return;
  }
  if(key==='soap-template-apply'||key==='soap-template-save-current'||key==='soap-template-new'||key==='soap-template-edit'||key==='soap-template-delete'){
    if(!roleCanView('consultation')){toast('Consultation access required.');return}
    const p=activeEncounterPatient();if(!p)return;
    const enc=encounterFor(p.id);
    if(enc.status==='Signed'){toast('Signed encounter is locked.');return}
    if(key==='soap-template-apply'){
      const tplId=document.getElementById('soap-template-select')?.value;
      const tpl=templatesForCurrentView().find(t=>t.id===tplId);
      if(!tpl){toast('Select a template first.');return}
      let applied=0;
      ['subjective','objective','assessment','plan'].forEach(f=>{
        if(!String(enc[f]||'').trim()&&String(tpl[f]||'').trim()){enc[f]=tpl[f];applied++}
      });
      if(!applied){toast('All SOAP fields already have content; template not applied.');return}
      render();toast(`Template "${tpl.name}" applied to ${applied} empty field(s).`);return;
    }
    if(key==='soap-template-save-current'){
      const name=window.prompt('Name this template:');
      if(!name||!name.trim()){toast('Template name is required.');return}
      const newId='TPL-'+String(state.nextSoapTemplateId++).padStart(3,'0');
      state.soapTemplates.push({id:newId,name:name.trim().slice(0,80),specialty:state.activeSpecialty,builtIn:false,
        subjective:enc.subjective||'',objective:enc.objective||'',assessment:enc.assessment||'',plan:enc.plan||''});
      render();toast(`Template "${name.trim()}" saved.`);return;
    }
    if(key==='soap-template-new'){
      state.soapTemplateEditingId=null;state.modal='soap-template-edit:';render();return;
    }
    const tpl=state.soapTemplates.find(t=>t.id===id);
    if(!tpl||tpl.builtIn){toast('Only custom templates can be modified.');return}
    if(key==='soap-template-edit'){
      state.soapTemplateEditingId=id;state.modal='soap-template-edit:'+id;render();return;
    }
    if(!window.confirm(`Delete template "${tpl.name}"?`))return;
    state.soapTemplates=state.soapTemplates.filter(t=>t.id!==id);
    render();toast('Template deleted.');return;
  }
  if(key==='esign-clear'){
    const pad=document.getElementById('esign-pad');
    pad?.getContext('2d')?.clearRect(0,0,pad.width,pad.height);
    state.esignStrokes=[];return;
  }
  if(key==='esign-commit'){
    let rollback=null;
    try {
      if(!roleCanView('consultation')||state.modal!=='esign:'+id){toast('Signature dialog is not active.');return}
      const p=patient(id);
      if(!p||!eligiblePatients().some(x=>x.id===id)){toast('Encounter not available.');return}
      const enc=encounterFor(id);
      if(enc.status==='Signed'){toast('Already signed.');return}
      if(![enc.subjective,enc.objective,enc.assessment,enc.plan].some(v=>String(v||'').trim())){toast('Enter a SOAP field first.');return}
      const typed=String(document.getElementById('esign-typed')?.value||'').trim();
      if(typed.length<2){toast('Typed signature is required.');return}
      const pad=document.getElementById('esign-pad');
      let drawnDataUrl=null;
      if(pad){
        const px=pad.getContext('2d').getImageData(0,0,pad.width,pad.height).data;
        let ink=false;
        for(let i=0;i<px.length;i+=4){
          if(px[i+3]>0&&(px[i]<250||px[i+1]<250||px[i+2]<250)){
            ink=true;
            break;
          }
        }
        if(ink)drawnDataUrl=pad.toDataURL('image/png');
      }
      const savedAt=new Date().toISOString();
      const sig={typed,drawnDataUrl,savedAt};

      // Restore all changed demo state if an error occurs during the commit or render.
      const previous={
        signature:enc.signature,
        status:enc.status,
        signedAt:enc.signedAt,
        signedBy:enc.signedBy,
        signedWithDrawing:enc.signedWithDrawing
      };
      const hadProviderSignature=Object.prototype.hasOwnProperty.call(state.signatures,enc.provider);
      const previousProviderSignature=state.signatures[enc.provider];
      const previousAuditLogs=state.auditLogs.slice();
      rollback=()=>{
        Object.assign(enc,previous);
        if(hadProviderSignature)state.signatures[enc.provider]=previousProviderSignature;
        else delete state.signatures[enc.provider];
        state.auditLogs=previousAuditLogs;
      };

      audit('encounter.signed',id,'Success','Demo clinician sign-off',p.branch);
      Object.assign(enc,{
        signature:{...sig},
        status:'Signed',
        signedAt:savedAt,
        signedBy:typed,
        signedWithDrawing:!!drawnDataUrl
      });
      state.signatures[enc.provider]={...sig};
      state.modal=null;
      render();
      rollback=null;
      toast('Sample encounter locked in the clinic database; this is not a legally valid electronic signature.');
      return;
    } catch(error) {
      console.error('Electronic signature failed:',error);
      if(rollback)rollback();
      state.modal='esign:'+id;
      render();
      toast('Could not sign. Please try again.');
      return;
    }
  }
  if(key==='cds-add-cpt'){
    if(!roleCanView('consultation')){toast('Consultation access required.');return}
    const p=activeEncounterPatient();if(!p)return;
    const enc=encounterFor(p.id);
    if(enc.status==='Signed'){toast('Signed encounter is locked.');return}
    if(state.lastDxHint?.patientId!==p.id||!state.lastDxHint.suggestions.includes(id)||!enc.dxCodes.includes(state.lastDxHint.code)){toast('CPT suggestion is no longer available.');return}
    const cpt=state.cptCodes.find(x=>x.code===id&&x.status==='Active');
    if(!cpt){toast('CPT not available in demo catalog.');return}
    if(enc.cptItems.some(item=>item.code===id)){toast('CPT already added.');return}
    const modifier=MODIFIER_BY_SPECIALTY[state.activeSpecialty]?.code||'';
    enc.cptItems.push({code:id,modifier,units:1,charge:cpt.charge});
    state.lastDxHint=null;render();toast(`Demo CPT ${id} added${modifier?' with suggested modifier '+modifier:''}. Verify before billing.`);return;
  }
  if(key==='cds-dismiss'){
    state.lastDxHint=null;render();return;
  }
  // RCM screens and synthetic document actions use the existing single delegated click handler.
  if(['encounter-add-dx','encounter-add-cpt','encounter-remove-dx','encounter-remove-cpt','encounter-save','encounter-sign','superbill-csv','superbill-open'].includes(key)){
    if(!roleCanView('consultation')){toast('Consultation access required for this UI demo.');return}
    let p=activeEncounterPatient();
    if(key==='superbill-open'&&id)p=reportablePatients().find(x=>x.id===id)||null;
    if(!p){toast('No active synthetic encounter patient.');return}
    const activeAppointment=activeEncounterAppointment();
    if(['superbill-csv','superbill-open'].includes(key)&&(!activeAppointment||activeAppointment.patient!==p.id||!completed(activeAppointment)||!appointmentHasDOS(activeAppointment))){toast('Superbills are available only after the linked appointment is completed and Actual DOS is recorded.');return}
    const enc=encounterFor(p.id,activeAppointment?.id);
    if(key==='superbill-csv'){
      triggerCsv(superbillRows(p,enc,activeAppointment),`MedBook_DEMO_Superbill_${p.id}_${activeAppointment.actual_date_of_service}.csv`);
      audit('superbill.export',p.id,'Success','Demo billing',p.branch);toast('Synthetic superbill CSV exported.');return;
    }
    if(key==='superbill-open'){state.selectedEncounterPatientId=p.id;state.selectedEncounterAppointmentId=String(activeAppointment.id);state.modal='superbill:'+p.id;render();return}
    if(enc.status==='Signed'){toast('Encounter is signed and locked. No changes permitted.');return}
    if(key==='encounter-add-dx'){
      const code=String(document.getElementById('encounter-dx-input')?.value||'').trim().toUpperCase();
      const found=state.icd10Codes.find(x=>x.code===code);
      if(!found){toast('Type an exact ICD-10 code from the list.');return}
      if(found.status!=='Active'){toast(`ICD-10 ${code} is ${found.status.toLowerCase()} in this demo.`);return}
      if(enc.dxCodes.includes(code)){toast('DX code already selected.');return}
      enc.dxCodes.push(code);
      const suggestions=(found.suggestedCpt||[]).filter(c=>state.cptCodes.some(item=>item.code===c&&item.status==='Active'));
      state.lastDxHint=suggestions.length?{patientId:p.id,code,suggestions}:null;
    }else if(key==='encounter-remove-dx'){
      enc.dxCodes=enc.dxCodes.filter(x=>x!==id);
      if(state.lastDxHint?.patientId===p.id&&state.lastDxHint.code===id)state.lastDxHint=null;
    }
    else if(key==='encounter-add-cpt'){
      const code=String(document.getElementById('encounter-cpt-input')?.value||'').trim().toUpperCase();
      const cpt=state.cptCodes.find(x=>x.code===code);
      if(!cpt){toast('Choose a procedure code.');return}
      if(cpt.status==='Deleted'||state.deletedCptCodes.some(x=>x.code===code)){
        toast(`CPT ${code} has been deleted in this demo. Please select an active code.`);
        audit('cpt.deleted-blocked',code,'Denied','Synthetic encounter',p.branch);return;
      }
      if(cpt.status!=='Active'){toast('CPT is not active.');return}
      const units=Number(document.getElementById('encounter-units')?.value||1);
      const modifier=String(document.getElementById('encounter-modifier')?.value||'').trim().toUpperCase();
      if(!Number.isInteger(units)||units<1||units>99||!/^([A-Z0-9]{2})?$/.test(modifier)){toast('Enter 1–99 units and a two-character modifier or leave it blank.');return}
      enc.cptItems.push({code,modifier,units,charge:cpt.charge});
      state.cptModifierSuggestion='';
    }else if(key==='encounter-remove-cpt'){
      const idx=Number(id);if(!Number.isInteger(idx)||idx<0||idx>=enc.cptItems.length)return;
      enc.cptItems.splice(idx,1);
    }else if(key==='encounter-save'){
      audit('encounter.draft-saved',p.id,'Success','Clinical draft',p.branch);
      render();toast('Sample SOAP encounter saved to the clinic database; no legally valid signature is created.');return;
    }else if(key==='encounter-sign'){
      if(![enc.subjective,enc.objective,enc.assessment,enc.plan].some(v=>String(v||'').trim())){toast('Enter at least one SOAP field before signing.');return}
      state.modal='esign:'+p.id;render();return;
    }
    render();toast('Synthetic encounter updated.');return;
  }
  if(key==='print-document'){
    if(!state.modal||!/^(?:superbill|superbill-batch|abn|claim-form|hospice-cert|demographics):/.test(state.modal)){toast('Open an authorized print template first.');return}
    const cut=state.modal.indexOf(':');if(!rcmModalDetail(state.modal.slice(0,cut),state.modal.slice(cut+1))){toast('Printable document not available.');return}
    window.print();return;
  }
  if(['abn','claim-form','hospice-cert','superbill','staff-profile','provider-profile','practice-profile','demographics','superbill-batch'].includes(key)){
    if(!rcmModalDetail(key,id)&&!['staff-profile','practice-profile'].includes(key)){toast('This demo record is unavailable for your role or scope.');return}
    state.modal=key+':'+id;render();return;
  }
  if(key==='drawer-tab'){
    if(!['overview','claims'].includes(id)||!state.drawer)return;
    const p=patient(state.drawer);if(id==='claims'&&!['Workers Comp','Auto','Personal Injury'].includes(p?.payerType))return;
    state.drawerTab=id;render();return;
  }
  if(key==='card-side'){
    if(!state.drawer||!['front','back'].includes(id))return;
    state.memberCardSide=id;render();return;
  }
  if(key==='replace-card'){
    if(!state.drawer)return;
    document.getElementById('member-card-file')?.click();return;
  }
  if(key==='run-vob'){
    const p=eligiblePatients().find(x=>x.id===id);
    if(!p||state.vobLoading[id])return;
    state.vobLoading[id]=true;p.vobStatus='Pending';render();
    window.setTimeout(()=>{
      state.vobLoading[id]=false;
      p.vobStatus=p.insuranceStatus==='Inactive'?'Failed':'Verified';
      audit('insurance.vob-mock',id,'Success','Synthetic benefits check',p.branch);
      render();toast('Mock VOB '+p.vobStatus+'. No insurance payer was contacted.');
    },2000);return;
  }
  if(key==='theme-toggle'){
    state.theme=state.theme==='dark'?'light':'dark';
    try {localStorage.setItem('medbook-demo-theme',state.theme)} catch (_) {/* file/private mode can block storage */}
    if(state.page==='clinical-tools'&&!state.navigationLoading){
      // Re-theming without recreating the iframe preserves in-progress local files.
      // The embedded theme bridge observes the host's data-theme attribute.
      themeEngine.apply();
      const toggle=document.querySelector('.theme-toggle');
      if(toggle){
        const label=state.theme==='dark'?'light':'dark';
        toggle.setAttribute('aria-label','Switch to '+label+' mode');
        toggle.setAttribute('aria-pressed',String(state.theme==='dark'));
        toggle.title=(state.theme==='dark'?'Light':'Dark')+' mode';
        toggle.innerHTML=icon(state.theme==='dark'?'sun':'moon');
      }
    }else render();
    return;
  }
  if(key==='team-tab'){
    if(!roleCanView('staff'))return;
    if(!['directory','availability'].includes(id))return;
    state.teamTab=id;state.availabilitySelection=null;render();return;
  }
  if(key==='availability-export'){
    if(!roleCanView('staff')||state.teamTab!=='availability')return;
    const days=availabilityWeekDays();
    triggerCsv(availabilityCsvRows(),`MedBook_Doctor_Availability_${days[0].date}_to_${days[6].date}.csv`);
    toast('Demo availability CSV downloaded for the displayed week.');return;
  }
  if(key==='reset-demo'){
    toast('Reset Demo is disabled in the connected database workspace. Use a verified backup before any data cleanup.');return;
  }
  if(key==='availability-prev'||key==='availability-next'||key==='availability-today'||key==='availability-clear'||key==='availability-day'){
    if(!roleCanView('staff'))return;
    if(key==='availability-day'){
      const el=evt.target.closest('[data-action="availability-day"]');
      const doctor=state.staff.find(d=>d.role==='Doctor'&&String(d.id)===el?.dataset.doctorId);
      const day=el?.dataset.date;
      if(!doctor||!/^\d{4}-\d{2}-\d{2}$/.test(day))return;
      const leave=state.doctorLeave.find(l=>l.doctor===doctor.name&&l.date===day);
      const off=[0,6].includes(new Date(day+'T12:00:00').getDay());
      state.availabilitySelection={doctor:doctor.name,date:day,status:leave?'leave':off?'off':'available',reason:leave?.reason||'',shift:doctorShift(doctor).join('–')};
    }else if(key==='availability-clear')state.availabilitySelection=null;
    else {state.availabilityWeekOffset=key==='availability-today'?0:state.availabilityWeekOffset+(key==='availability-next'?1:-1);state.availabilitySelection=null;}
    render();return;
  }
  // Dispatch explicitly, so the New Invoice button always opens its form.
  if(key==='new-invoice'){
    state.modal='new-invoice';
    render();return;
  }
  if(key==='print-invoice'){
    // Only print a currently displayed, authorized invoice — never other modals.
    const invoiceId=state.modal?.startsWith('invoice:')?state.modal.slice('invoice:'.length):null;
    const invoice=state.invoices.find(i=>i.id===invoiceId&&eligiblePatients().some(p=>p.id===i.patientId));
    if(!invoice){toast('Open an available demo invoice before printing.');return}
    window.print();return;
  }

  if(key==='invoice'||key==='open-invoice'||key==='search-print-invoice'){
    const invoice=state.invoices.find(i=>i.id===id&&eligiblePatients().some(p=>p.id===i.patientId));
    if(!invoice){toast('Invoice not found in the active specialty scope.');return}
    audit('invoice.view',id,'Success','Billing',patient(invoice.patientId)?.branch||'—');
    state.modal='invoice:'+id;state.searchOpen=false;render();return;
  }
  if(key==='pay-invoice'){
    const invoice=state.invoices.find(i=>i.id===id&&eligiblePatients().some(p=>p.id===i.patientId));
    if(!invoice||invoice.status==='Paid'){toast('No outstanding invoice to record.');return}
    invoice.status='Paid';invoice.paidAt=dateNow;
    audit('invoice.payment-recorded',id,'Success','Billing',patient(invoice.patientId)?.branch||'—');
    state.modal='invoice:'+id;render();toast('Demo payment recorded locally; no payment provider contacted.');return;
  }
  // Manual booking must never inherit the last calendar-slot draft.
  if(key==='new-appointment'){
    state.appointmentDraft=null;
    state.appointmentError='';
    state.rescheduleAppointmentId=null;
    state.modal='new-appointment';
    render();return;
  }
  // Synthetic draft medicines are local UI items, not issued prescriptions.
  if(key==='prescription-add'||key==='prescription-remove'){
    if(!roleCanView('consultation')){toast('Your account does not have permission to change this consultation draft.');return}
    if(key==='prescription-add'){
      const next=state.nextPrescriptionId++;
      const activeVisit=todayApps().find(a=>appointmentStatus(a)==='in-consultation')||todayApps().find(a=>appointmentStatus(a)==='arrived');
      const encounterPatient=activeVisit?.patient||eligiblePatients()[0]?.id||null;
      state.prescriptions.push({id:next,patientId:encounterPatient,createdAt:dateNow,name:'Paracetamol 500mg',dosage:'1 tablet',frequency:'3x daily'});
      render();toast('Mock item added locally — no prescription issued.');
    }else{
      const itemId=Number(id),index=state.prescriptions.findIndex(item=>item.id===itemId);
      if(index<0)return;
      state.prescriptions.splice(index,1);
      render();toast('Mock draft item removed.');
    }
    return;
  }
  if(key==='book-slot'){
    const el=evt.target.closest('[data-action="book-slot"]');if(!el)return;
    const doctor=el.dataset.doctor,date=el.dataset.date,time=el.dataset.time;
    if(!doctorAllowed(doctor)||isBooked(doctor,date,time)){toast('Doctor already booked or unavailable.');return}
    state.appointmentDraft={doctor,date,time};state.appointmentError='';state.modal='new-appointment';render();return;
  }
  if(key==='audit-export'){
    if(!roleCanView('audit'))return;
    const events=[...(state.serverAuditLogs||[]),...state.auditLogs];triggerCsv([['Time UTC','Actor','Action','Resource ID','Branch','Outcome','Purpose','Type'],...events.map(x=>[utcDisplay(x.at),x.actor,x.action,x.resource,x.branch,x.outcome,x.purpose,x.source])],'MedBook_Audit.csv');
    toast('Audit log CSV downloaded.');return;
  }
  if(key==='rehab-select'){if(!rehabPlans.some(p=>p.id===id))return;state.rehabSelectedPlan=id;render();return}
  if(key==='spine-select'){if(!spineRegions.some(r=>r.name===id))return;state.spineSelectedRegion=id;render();return}
  if(key==='lesion-filter'){if(!['All','Awaiting review','Documented'].includes(id))return;state.lesionFilter=id;render();return}
  if(key==='notification-toggle'){state.notificationOpen=!state.notificationOpen;state.searchOpen=false;render();return}
 if(key==='notifications-read'){visibleAlerts().forEach(a=>a.unread=false);render();toast('All demo notifications marked read.');return}
 if(key==='alert-open'){const a=visibleAlerts().find(x=>x.id===id);if(a){a.unread=false;state.notificationOpen=false;state.searchOpen=false;if(a.targetPage){navigate(a.targetPage)}else if(a.patientId&&eligiblePatients().some(p=>p.id===a.patientId)){state.drawer=a.patientId;state.drawerTab='overview';render()}else render()}return}
 if(key==='search-toggle'){state.searchOpen=true;state.notificationOpen=false;render();document.getElementById('global-search-input')?.focus();return}
 if(key==='search-close'){state.searchOpen=false;state.search='';render();return}
 
 if(key==='calendar-view'){state.appointmentView=id==='calendar'?'calendar':'list';render();return}
 if(key==='calendar-prev'||key==='calendar-next'){const d=new Date(state.appointmentDate+'T12:00:00');d.setDate(d.getDate()+(key==='calendar-prev'?-7:7));state.appointmentDate=iso(d);render();return}
 if(key==='integration'){state.integrationTarget=id;state.modal='connect:'+id;render();return}
  if(key==='add-document'){
    const p=eligiblePatients().find(x=>x.id===id);
    if(!p){audit('documents.denied',id,'Denied','UI demo');toast('Patient is outside your active scope.');return}
    const docs=documentFor(id),n=docs.filter(d=>d.demoAdded).length+1;
    docs.unshift({name:n===1?'Lab_Results.pdf':`Demo_Document_${n}.pdf`,status:'Pending',demoAdded:true,createdAt:dateNow});
    audit('documents.added',id,'Success','Demo document metadata',p.branch);
    render();toast('Sample document added as Pending. No file was uploaded.');return;
  }
 if(key==='eligibility'){const record=insuranceFor(id);if(state.eligibilityLoading[id])return;state.eligibilityLoading[id]=true;render();setTimeout(()=>{state.eligibilityLoading[id]=false;record.status='active';record.verifiedAt=Date.now();state.notificationItems.filter(a=>a.patientId===id&&['danger','warning'].includes(a.type)).forEach(a=>{a.type='info';a.category='Info';a.message='Sandbox eligibility check shown as Active for '+nameFor(id)+' (not payer verified).';a.unread=false});if(state.drawer===id)render();toast('Demo only: eligibility displayed as Active (Verified just now). No insurer contacted.')},1500);return}
 if(key==='request-documents'){audit('documents.request',id,'Success','Administrative',patient(id)?.branch||'—');toast('Demo only: SMS request simulated. No message sent.');return}
 if(key==='superbill-open-appointment'){
  const appointment=state.appointments.find(a=>String(a.id)===String(id));
  if(!appointment||!appointmentAllowed(appointment)||!completed(appointment)||!appointmentHasDOS(appointment)){toast('Only a completed appointment with an actual DOS can be printed as a superbill.');return}
  state.selectedEncounterPatientId=appointment.patient;state.selectedEncounterAppointmentId=String(appointment.id);
  state.modal='superbill:'+appointment.patient;render();return;
 }
 if(key==='superbill-batch-open'){
  if(!roleCanView('consultation')){toast('Consultation access required.');return}
  const any=state.appointments.some(a=>appointmentAllowed(a)&&completed(a)&&appointmentHasDOS(a)&&(state.superbillPractice==='All practices'||a.branch===state.superbillPractice)&&(state.superbillDoctor==='All doctors'||a.doctor===state.superbillDoctor));
  if(!any){toast('No completed appointments with a recorded Actual DOS match the current filters.');return}
  state.modal='superbill-batch:filtered';render();return;
 }
 if(key==='superbill-register-csv'){
  const rows=[['Patient','Patient ID','Appointment ID','DOB','Practice','Rendering Doctor','Provider Taxonomy','Scheduled Date','Actual Date of Service','DX Codes','CPT Codes','Total Charges','Encounter Status']];
  state.appointments.filter(a=>appointmentAllowed(a)&&completed(a)&&appointmentHasDOS(a)&&(state.superbillPractice==='All practices'||a.branch===state.superbillPractice)&&(state.superbillDoctor==='All doctors'||a.doctor===state.superbillDoctor)).forEach(a=>{
   const p=patient(a.patient);if(!p)return;const e=encounterFor(p.id,a.id);rows.push([p.name,p.id,a.id,p.dob,p.branch,e.provider,state.providers.find(x=>x.name===e.provider)?.taxonomyCode||'',a.date,a.actual_date_of_service,e.dxCodes.join('; '),e.cptItems.map(x=>x.code+(x.modifier?'-'+x.modifier:'')+' x'+x.units).join('; '),encounterTotal(e).toFixed(2),e.status]);
  });
  triggerCsv(rows,'MedBook_Superbill_Register_'+dateNow+'.csv');toast('Completed-visit superbill register exported with actual DOS.');return;
 }
 if(key==='report-select'){if(!reports.some(r=>r.id===id))return;state.reportType=id;state.reportStatus='idle';state.reportRows=[];state.reportRunId++;render();return}
 if(key==='report-generate'){if(state.reportStart>state.reportEnd){toast('Report start date must not be after end date.');return}state.reportStatus='loading';const token=++state.reportRunId;render();setTimeout(()=>{if(token!==state.reportRunId)return;state.reportRows=demoReportRows();state.reportStatus='ready';render();toast('Synthetic report prepared for download.')},850);return}
 if(key==='report-download'){if(state.reportStatus!=='ready')return;triggerCsv(state.reportRows,`MedBook_Demo_${state.reportType.replace(/[^a-z0-9-]/gi,'_')}_${state.reportStart}_to_${state.reportEnd}.csv`);toast('Demo CSV downloaded.');return}
 if(key==='patient'){state.searchOpen=false;state.notificationOpen=false;audit('patient.view',id,'Success','Profile review',patient(id)?.branch||'—')}
 return applyActionBase(action,evt);
}

document.addEventListener('contextmenu',e=>{
 const row=e.target.closest('[data-patient-row]');
 if(!row)return;
 const pid=row.dataset.patientRow;
 if(!eligiblePatients().some(p=>p.id===pid))return;
 const menu=document.getElementById('v24-context-menu');if(!menu)return;
 e.preventDefault();
 menu.innerHTML=`<button type="button" role="menuitem" data-action="open-in-new-window:${escapeHTML(pid)}" aria-label="Open demo patient in new window">↗ Open in new window</button>
   <button type="button" role="menuitem" data-action="patient:${escapeHTML(pid)}" aria-label="Open demo patient here">👁 Open here</button>
   <button type="button" role="menuitem" data-action="copy-patient-id:${escapeHTML(pid)}" aria-label="Copy demo patient ID">📋 Copy patient ID</button>`;
 menu.classList.remove('hidden');
 menu.style.left=Math.max(0,Math.min(e.clientX,window.innerWidth-220))+'px';
 menu.style.top=Math.max(0,Math.min(e.clientY,window.innerHeight-150))+'px';
});
document.addEventListener('click',e=>{
 const menu=document.getElementById('v24-context-menu');
 if(menu&&!e.target.closest('#v24-context-menu'))menu.classList.add('hidden');
});
document.addEventListener('click',e=>{const b=e.target.closest('[data-page],[data-action]');if(!b)return;const page=b.getAttribute('data-page');if(page){navigate(page);return}const action=b.getAttribute('data-action');if(action)applyAction(action,e)});
document.addEventListener('change',e=>{const t=e.target;if(t.id==='branch'){state.branch=t.value;if(state.role==='Doctor'&&!matchingDoctors().some(d=>d.name===state.activeDoctor))state.activeDoctor=matchingDoctors()[0]?.name||'';render()}else if(t.id==='doctor-dashboard-doctor'){state.doctorDashboardDoctor=t.value;render()}else if(t.id==='doctor-dashboard-range'){state.doctorDashboardRange=['today','week','month','all'].includes(t.value)?t.value:'month';render()}else if(t.id==='appointment-date'){state.appointmentDate=t.value;render()}else if(t.id==='patient-filter'){state.patientFilter=t.value;render()}else if(t.id==='patient-window'){state.patientWindow=Number(t.value);render()}else if(t.id==='followup-filter'){state.followupFilter=t.value;render()}else if(t.id==='site-services'){state.website.services=t.checked;render()}else if(t.dataset.module){if(!['Clinic Owner','Clinic Admin'].includes(state.role)){toast('Only Owner or Admin can change module settings.');return}state.modules[t.dataset.module]=t.checked;audit('settings.module-'+(t.checked?'enabled':'disabled'),t.dataset.module,'Success','Configuration');if(!requireModule(state.page))state.page='modules';render();toast('Module preview '+(t.checked?'enabled':'disabled')+'.')}});
document.addEventListener('input',e=>{const t=e.target;if(t.id==='filter-input'){const val=t.value.toLowerCase();document.querySelectorAll('tr.filterable').forEach(row=>row.classList.toggle('invisible',!row.textContent.toLowerCase().includes(val)))}else if(t.id==='site-name'){state.website.name=t.value;document.querySelectorAll('[data-preview="name"]').forEach(n=>n.textContent=t.value)}else if(t.id==='site-tagline'){state.website.tagline=t.value;document.querySelectorAll('[data-preview="tagline"]').forEach(n=>n.textContent=t.value)}else if(t.id==='clinical-note'||t.id==='ai-note'){state.note=t.value}});
document.addEventListener('submit',e=>{
 const form=e.target;
 if(form.id==='form-user-account'){
  e.preventDefault();const x=Object.fromEntries(new FormData(form));
  (async()=>{try{
   await MedBookAPI.createUser({email:x.email,displayName:x.displayName,password:x.password,role:x.role,providerName:x.providerName||null,branch:x.branch||null});
   state.modal=null;await refreshUserAccounts();render();toast('Login account created. Share its temporary password securely.');
  }catch(error){const target=document.getElementById('account-error');if(target)target.textContent=error.data?.error||error.message||'Account could not be created.';else toast(error.message||'Account could not be created.')}})();return;
 }
 if(form.id==='form-complete-visit'){
  e.preventDefault();if(!isTrialActive()){toast('Trial expired. Visit completion is read-only.');state.modal='pricing';render();return}
  const x=Object.fromEntries(new FormData(form));const a=state.appointments.find(item=>String(item.id)===String(x.appointmentId));
  if(!a||!appointmentAllowed(a)||appointmentStatus(a)!=='in-consultation'||!AppointmentDomain.isISODate(x.actualDate)||x.actualDate>dateNow){toast('Select a valid actual service date no later than today in the clinic timezone.');return}
  try{AppointmentDomain.completeAppointment(a,x.actualDate)}catch(error){toast(error.message);return}
  a.completed_at=new Date().toISOString();a.dos_recorded_by=state.authUser?.id||null;a.dos_verified=true;
  state.selectedEncounterPatientId=a.patient;state.selectedEncounterAppointmentId=String(a.id);
  const enc=encounterFor(a.patient,a.id);enc.actual_date_of_service=a.actual_date_of_service;enc.dateOfService=a.actual_date_of_service;enc.dos_verified=true;
  const p=patient(a.patient);if(p)p.last=Math.max(0,Math.round((new Date(`${dateNow}T12:00:00Z`)-new Date(`${x.actualDate}T12:00:00Z`))/86400000));
  state.modal=null;audit('consultation.complete',a.patient,'Success','Treatment',a.branch);render();toast('Consultation completed. Actual DOS confirmed as '+a.actual_date_of_service+'.');return;
 }
 if(form.id==='form-correct-dos'){
  e.preventDefault();if(!isTrialActive()){toast('Trial expired. DOS corrections are read-only.');state.modal='pricing';render();return}
  const x=Object.fromEntries(new FormData(form));const a=state.appointments.find(item=>String(item.id)===String(x.appointmentId));
  const reason=String(x.reason||'').trim(),next=x.actualDate,previous=a?.actual_date_of_service||null;
  const needsVerification=a?.dos_verified===false;
  if(!a||!appointmentAllowed(a)||!completed(a)||!AppointmentDomain.isISODate(next)||next>currentClinicDate(a.branch)||reason.length<8||reason.length>500){toast('Check the completed visit, Actual DOS and correction reason.');return}
  if(previous===next&&!needsVerification){toast('The selected date is unchanged.');return}
  a.dosHistory=Array.isArray(a.dosHistory)?a.dosHistory:[];
  a.dosHistory.push({previous,next,reason,at:new Date().toISOString(),actor:state.authUser?.id||null});
  a.actual_date_of_service=next;a.dos_verified=true;
  const enc=encounterFor(a.patient,a.id);if(enc){enc.actual_date_of_service=next;enc.dateOfService=next;enc.dos_verified=true}
  state.invoices.filter(invoice=>String(invoice.appointmentId)===String(a.id)).forEach(invoice=>{invoice.actual_date_of_service=next;invoice.dos_verified=true});
  const p=patient(a.patient);if(p)p.last=Math.max(0,Math.round((new Date(`${dateNow}T12:00:00Z`)-new Date(`${next}T12:00:00Z`))/86400000));
  pendingSaveReason=reason;state.modal=null;audit(needsVerification?'appointment.dos_verified':'appointment.dos_modified',a.patient,'Success','DOS verification/correction',a.branch);render();toast('Actual DOS corrected. Previous and new dates are retained in history.');return;
 }
 if(form.id==='form-cancel-appointment'){
  e.preventDefault();if(!isTrialActive()){toast('Trial expired. Appointment changes are read-only.');state.modal='pricing';render();return}
  const x=Object.fromEntries(new FormData(form));const a=state.appointments.find(item=>String(item.id)===String(x.appointmentId));
  const reason=String(x.reason||'').trim();
  if(!a||!appointmentAllowed(a)||!['scheduled','arrived'].includes(appointmentStatus(a))||reason.length<8||reason.length>500){toast('Check the appointment and provide a valid cancellation reason.');return}
  try{AppointmentDomain.cancelAppointment(a,reason)}catch(error){toast(error.message);return}
  pendingSaveReason=reason;state.modal=null;audit('appointment.cancelled',a.patient,'Success','Cancellation',a.branch);render();toast('Appointment cancelled. It remains in the appointment history.');return;
 }
 if(form.id==='form-correct-attendance'){
  e.preventDefault();if(!isTrialActive()){toast('Trial expired. Attendance corrections are read-only.');state.modal='pricing';render();return}
  const x=Object.fromEntries(new FormData(form));const a=state.appointments.find(item=>String(item.id)===String(x.appointmentId));
  const reason=String(x.reason||'').trim(),next=String(x.nextStatus||'');
  if(!a||!appointmentInUserScope(a)||appointmentStatus(a)!=='no_show'||reason.length<8||reason.length>500){toast('Check the No-Show appointment and correction reason.');return}
  const previous=AppointmentDomain.normalizeStatus(a.status);
  try{AppointmentDomain.correctNoShow(a,next,reason,dateNow)}catch(error){toast(error.message);return}
  a.attendanceCorrectionHistory=Array.isArray(a.attendanceCorrectionHistory)?a.attendanceCorrectionHistory:[];
  a.attendanceCorrectionHistory.push({from:previous,to:next,reason,at:new Date().toISOString(),actor:state.authUser?.id||null});
  pendingSaveReason=reason;state.modal=null;audit('appointment.attendance_corrected',a.patient,'Success','Attendance correction',a.branch);render();toast('Attendance corrected to '+next+'. The correction reason is recorded.');return;
 }
 if(form.id==='form-appointment'){
   if(!isTrialActive()){e.preventDefault();toast('Trial expired. Contact your clinic administrator to reactivate editing.');state.modal='pricing';render();return}
   e.preventDefault();const x=Object.fromEntries(new FormData(form));
   const doc=matchingDoctors().find(d=>d.name===x.doctor&&(state.role!=='Doctor'||d.name===state.activeDoctor));
   const date=x.date,time=x.time,duration=Number(x.duration)||30;
   const original=state.rescheduleAppointmentId?state.appointments.find(a=>String(a.id)===String(state.rescheduleAppointmentId)):null;
   const issue=()=>{
     if(state.rescheduleAppointmentId&&!original)return 'The original appointment could not be found. Reopen the appointment and try again.';
     if(original&&!['scheduled','no_show'].includes(appointmentStatus(original)))return 'Only scheduled or no-show appointments can be rescheduled.';
     if(!doc)return 'Selected doctor is not available in this specialty/branch.';
     if(!eligiblePatients().some(p=>p.id===x.patient))return 'Patient is outside the selected specialty scope.';
     if(original&&original.patient!==x.patient)return 'A rescheduled appointment must remain linked to the same patient.';
     if(!date||date<dateNow||!/^\d\d:\d\d$/.test(time)||!Number.isInteger(duration))return 'Choose today or a future date and enter a valid time and duration.';
     if([0,6].includes(new Date(date+'T12:00:00').getDay()))return 'Doctor is not scheduled on weekends in this demo.';
     const [start,end]=doctorShift(doc).map(toMinutes);
     if(toMinutes(time)<start||toMinutes(time)+duration>end)return 'Outside doctor working hours ('+doctorShift(doc).join('–')+').';
     if(isBooked(doc.name,date,time,duration,original?.id))return 'Doctor already booked. Choose another available time.';
     return '';
   };
   state.appointmentError=issue();
   if(state.appointmentError){document.getElementById('appointment-error').textContent=state.appointmentError;toast(state.appointmentError);audit('appointment.rejected',doc?.name||'unknown','Denied','Conflict validation',doc?.branch||'—');return}
   const newId=Math.max(0,...state.appointments.map(a=>Number(a.id)||0))+1;
   const newAppointment={id:newId,patient:x.patient,date,time,duration,doctor:doc.name,branch:doc.branch,status:'scheduled',service:x.service.trim().slice(0,80),created_at:`${dateNow}T${new Date().toTimeString().slice(0,8)}`,actual_date_of_service:null};
   if(original){
     try{AppointmentDomain.markRescheduled(original,dateNow)}catch(error){toast(error.message);return}
     original.rescheduled_at=new Date().toISOString();original.rescheduled_to_id=newId;
     newAppointment.rescheduled_from_id=original.id;
     state.appointments.push(newAppointment);
     audit('appointment.rescheduled',original.id,'Success','Rescheduling',original.branch);
   }else{
     state.appointments.push(newAppointment);
     audit('appointment.created',x.patient,'Success','Scheduling',doc.branch);
   }
   state.appointmentDate=date;state.appointmentDraft=null;state.appointmentError='';state.rescheduleAppointmentId=null;state.modal=null;
   navigate('appointments');toast(original?'Appointment rescheduled. Original booking retained in history.':'New appointment saved; doctor slot marked booked.');return;
 }
 if(form.id==='form-invoice'){
   if(!isTrialActive()){e.preventDefault();toast('Trial expired. Contact your clinic administrator to reactivate editing.');state.modal='pricing';render();return}
   e.preventDefault();
   if(!roleCanView('billing')){audit('invoice.denied','new','Denied','UI demo');toast('Billing is restricted for this role.');return}
   const x=Object.fromEntries(new FormData(form));
   const appointment=state.appointments.find(a=>String(a.id)===String(x.appointmentId)&&appointmentAllowed(a));
   const target=appointment?patient(appointment.patient):null;
   const qty=Number(x.qty),unit=Number(x.unit),tax=Number(x.tax);
   if(!appointment||!target||!completed(appointment)||!appointmentHasDOS(appointment)||state.invoices.some(inv=>String(inv.appointmentId)===String(appointment.id))||!x.description?.trim()||!Number.isInteger(qty)||qty<1||qty>99||![unit,tax].every(Number.isFinite)||unit<0||tax<0||unit>99999||tax>99999){toast('Select an eligible completed appointment with a recorded Actual DOS and enter valid invoice details.');return}
   const next=Math.max(2007,...state.invoices.map(i=>Number(i.id.match(/\d+$/)?.[0])||0))+1;
   const inv={id:'INV-'+next,patientId:target.id,appointmentId:appointment.id,actual_date_of_service:appointment.actual_date_of_service,status:'Pending',items:[{label:x.description.trim().slice(0,90),qty,unit:Math.round(unit*100)/100}],tax:Math.round(tax*100)/100};
   inv.amount=invoiceTotal(inv);state.invoices.unshift(inv);audit('invoice.created',inv.id,'Success','Billing',target.branch);
   state.modal='invoice:'+inv.id;render();toast('Demo invoice created using the completed appointment Actual DOS.');return;
 }
 if(form.id==='form-patient-intake'){
   if(!['Clinic Owner','Clinic Admin','Receptionist'].includes(state.role)){e.preventDefault();toast('Your role cannot register patients.');return}
   if(!isTrialActive()){e.preventDefault();toast('Trial expired. Contact your clinic administrator to reactivate editing.');state.modal='pricing';render();return}
   e.preventDefault();const x=Object.fromEntries(new FormData(form));const doc=matchingDoctors().find(d=>d.name===x.doctor&&(state.role!=='Doctor'||d.name===state.activeDoctor));
   if(!doc||!x.name?.trim()||!x.dob||x.dob>dateNow||!x.notice||!x.phone?.trim()){toast('Check the required patient, DOB, phone, doctor and privacy acknowledgment fields.');return}
   if(x.name.trim().length<2){document.getElementById('intake-error').textContent='Name must contain at least two characters.';return}
   const age=ageFromDOB(x.dob);
   if(age===null){document.getElementById('intake-error').textContent='Enter a valid date of birth.';return}
   const number=Math.max(1052,...state.patients.map(p=>Number(p.id.match(/\d+$/)?.[0])||0))+1,id='PT-'+number;
   const payer=x.payer?.trim()||'Self-Pay';
   state.patients.push({id,name:x.name.trim(),dob:x.dob,age,sex:x.sex||'Not specified',pronouns:x.pronouns||'Not specified',maritalStatus:x.maritalStatus||'Not specified',phone:x.phone.trim(),email:x.email||'',address:x.address||'',city:x.city||'',region:x.region||'',postalCode:x.postalCode||'',country:x.country||'',preferredLanguage:x.preferredLanguage||'English',occupation:x.occupation||'',emergencyContactName:x.emergencyContactName||'',emergencyContactRelationship:x.emergencyContactRelationship||'',emergencyContactPhone:x.emergencyContactPhone||'',registrationDate:dateNow,last:null,doctor:doc.name,branch:doc.branch,type:'New',note:'Fictional newly registered patient. No completed visit yet.',payerType:payer==='Self-Pay'?'Self-Pay':'Commercial',payerName:payer,insuranceStatus:'Pending',vobStatus:'Pending',memberId:'DEMO-MBR-'+number,groupNumber:'GRP-DEMO',copay:25,deductibleRemaining:500,careType:'General'});
   state.insurance[id]={payer:payer,policy:x.policy?.trim()||'Not supplied',status:'unverified',verifiedAt:null};state.documents[id]=[];
   state.intakeConsents[id]={privacyNoticeGiven:true,analyticsOptIn:!!x.analytics,recordedAt:new Date().toISOString()};
   audit('patient.registered',id,'Success','Registration',doc.branch);state.modal=null;state.drawer=id;state.drawerTab='overview';render();toast('Demo patient registered with complete demographics.');return;
 }
 if(form.id==='form-patient-edit'){
   e.preventDefault();if(!['Clinic Owner','Clinic Admin','Receptionist'].includes(state.role)){toast('Your role cannot edit patient demographics.');return}const x=Object.fromEntries(new FormData(form)),p=eligiblePatients().find(v=>v.id===x.recordId);
   const doc=state.staff.find(d=>d.role==='Doctor'&&d.name===x.doctor&&(state.role!=='Doctor'||d.name===state.activeDoctor));
   if(!p||!doc||!x.name?.trim()||!x.dob||x.dob>dateNow||!x.phone?.trim()){toast('Check required patient demographics and assigned doctor.');return}
   const age=ageFromDOB(x.dob);if(age===null){toast('Enter a valid date of birth.');return}
   if((doc.name!==p.doctor||doc.branch!==p.branch)&&state.appointments.some(a=>a.patient===p.id&&a.date>=dateNow)){
     toast('Reassign or cancel future appointments before changing the doctor.');
     return;
   }
   ['name','dob','sex','pronouns','maritalStatus','phone','email','address','city','region','postalCode','country','preferredLanguage','occupation','emergencyContactName','emergencyContactRelationship','emergencyContactPhone'].forEach(k=>p[k]=String(x[k]||'').trim());
   p.age=age;p.doctor=doc.name;p.branch=doc.branch;
   audit('patient.demographics-updated',p.id,'Success','Patient profile',p.branch);state.modal=null;render();toast('Patient demographics updated in this demo.');return;
 }
 if(form.id==='form-practice'){
   e.preventDefault();if(!['Clinic Owner','Clinic Admin'].includes(state.role)){toast('Only Owner or Admin can modify practices.');return}
   const x=Object.fromEntries(new FormData(form)),editing=!!x.recordId;
   const existing=editing?state.practices.find(p=>p.id===x.recordId):null;
   if(editing&&!existing){toast('Practice not found.');return}
   const name=String(x.name||'').trim(),branch=String(x.branch||'').trim();
   if(name.length<2||branch.length<2){toast('Practice name and branch are required.');return}
   if(state.practices.some(p=>p.branch.toLowerCase()===branch.toLowerCase()&&p.id!==x.recordId)){toast('A practice already uses this branch name.');return}
   const oldBranch=existing?.branch;
   const data={name,branch,legalName:String(x.legalName||'').trim(),practiceType:String(x.practiceType||'Clinic').trim(),npi:String(x.npi||'').trim(),taxId:String(x.taxId||'').trim(),taxonomyCode:String(x.taxonomyCode||'').trim(),phone:String(x.phone||'').trim(),email:String(x.email||'').trim(),address:String(x.address||'').trim(),city:String(x.city||'').trim(),region:String(x.region||'').trim(),postalCode:String(x.postalCode||'').trim(),country:String(x.country||'').trim(),website:String(x.website||'').trim(),timezone:String(x.timezone||'').trim(),status:existing?.status||'Active'};
   if(existing){
    Object.assign(existing,data);
    if(oldBranch!==branch){
     state.staff.forEach(s=>{if(s.branch===oldBranch)s.branch=branch});
     state.providers.forEach(s=>{if(s.branch===oldBranch)s.branch=branch});
     state.patients.forEach(s=>{if(s.branch===oldBranch)s.branch=branch});
     state.appointments.forEach(s=>{if(s.branch===oldBranch)s.branch=branch});
     if(state.branch===oldBranch)state.branch=branch;
    }
   }else{
    const next=Math.max(0,...state.practices.map(p=>Number(p.id.match(/\d+$/)?.[0])||0))+1;
    const newId='PR-'+String(next).padStart(3,'0');
    state.practices.push({id:newId,...data});
    window.__lastPracticeId=newId;
   }
   audit(editing?'practice.updated':'practice.created',existing?.id||branch,'Success','Practice management',branch);
   state.modal=null;render();toast(editing?'Practice profile updated.':'Practice created.');return;
 }
 if(form.id==='form-practice-delete'){
   e.preventDefault();const x=Object.fromEntries(new FormData(form)),pr=state.practices.find(p=>p.id===x.recordId),target=state.practices.find(p=>p.branch===x.targetBranch&&p.id!==x.recordId);
   if(!pr||!target){toast('Select a valid destination practice.');return}
   const oldBranch=pr.branch,newBranch=target.branch;
   state.staff.forEach(s=>{if(s.branch===oldBranch)s.branch=newBranch});
   state.providers.forEach(s=>{if(s.branch===oldBranch)s.branch=newBranch});
   state.patients.forEach(s=>{if(s.branch===oldBranch)s.branch=newBranch});
   state.appointments.forEach(s=>{if(s.branch===oldBranch)s.branch=newBranch});
   if(state.branch===oldBranch)state.branch=newBranch;
   state.practices=state.practices.filter(p=>p.id!==pr.id);
   audit('practice.deleted',pr.id,'Success','Reassigned to '+target.name,newBranch);
   state.modal=null;render();toast('Practice deleted; linked records reassigned to '+target.name+'.');return;
 }
 if(form.id==='form-text-pattern'){
   e.preventDefault();
   if(!roleCanView('consultation')){toast('Consultation access required.');return}
   const x=Object.fromEntries(new FormData(form));
   const name=String(x.name||'').trim(),field=String(x.field||'any'),snippetText=String(x.text||'').trim(),id=String(x.recordId||'').trim();
   if(name.length<2||name.length>60||!snippetText||snippetText.length>2000){toast('Enter a 2–60 character name and 1–2,000 characters of text.');return}
   if(!['subjective','objective','assessment','plan','any'].includes(field)){toast('Invalid SOAP field.');return}
   if(id){
     const item=state.textPatterns.find(t=>t.id===id&&!t.builtIn);
     if(!item){toast('Only custom snippets can be edited.');return}
     Object.assign(item,{name,field,text:snippetText});toast('Demo snippet updated.');
   }else{
     const newId='TP-'+String(state.nextTextPatternId++).padStart(3,'0');
     state.textPatterns.push({id:newId,name,field,text:snippetText,builtIn:false});toast('Demo snippet created.');
   }
   state.modal=null;render();return;
 }
 if(form.id==='form-soap-template'){
   e.preventDefault();
   if(!roleCanView('consultation')){toast('Consultation access required.');return}
   const x=Object.fromEntries(new FormData(form));
   const name=String(x.name||'').trim(),specialty=String(x.specialty||'all'),id=String(x.recordId||'').trim();
   if(name.length<2){toast('Template name must have at least two characters.');return}
   if(specialty!=='all'&&!Object.prototype.hasOwnProperty.call(specialtyDefinitions,specialty)){toast('Invalid specialty.');return}
   const values={name:name.slice(0,80),specialty};
   ['subjective','objective','assessment','plan'].forEach(k=>values[k]=String(x[k]||'').slice(0,2000));
   if(id){
     const tpl=state.soapTemplates.find(t=>t.id===id&&!t.builtIn);
     if(!tpl){toast('Cannot edit built-in templates.');return}
     Object.assign(tpl,values);toast('Template updated.');
   }else{
     const newId='TPL-'+String(state.nextSoapTemplateId++).padStart(3,'0');
     state.soapTemplates.push({id:newId,builtIn:false,...values});toast('Template created.');
   }
   state.modal=null;state.soapTemplateEditingId=null;render();return;
 }
 if(form.id==='form-provider-edit'){
   e.preventDefault();const x=Object.fromEntries(new FormData(form)),p=state.providers.find(v=>String(v.id)===x.recordId&&(state.role!=='Doctor'||v.name===state.activeDoctor));
   if(!p){toast('Provider profile is outside your edit scope.');return}
   if(!state.providerTaxonomies.some(t=>t.code===String(x.taxonomyCode||'').trim().toUpperCase())){toast('Select a taxonomy from the NUCC list.');return}
   x.taxonomyCode=String(x.taxonomyCode).trim().toUpperCase();
   ['taxonomyCode','npi','taxId','dea','caqh','license','licenseExpiry','deaExpiry'].forEach(k=>p[k]=String(x[k]||'').trim());
   p.branch=String(x.branch||p.branch);
   const staffRecord=state.staff.find(s=>s.name===p.name);if(staffRecord)staffRecord.branch=p.branch;
   audit('provider.profile-updated',p.id,'Success','Provider credentials',p.branch);state.modal=null;render();toast('Provider profile updated. Verify taxonomy and credentials with official sources.');return;
 }
 if(form.id==='form-followup'){
   e.preventDefault();const x=Object.fromEntries(new FormData(form));const p=eligiblePatients().find(p=>p.id===x.patient);
   if(!p){toast('Patient unavailable in selected specialty.');return}
   state.followups.push({id:Math.max(0,...state.followups.map(a=>a.id))+1,patient:x.patient,date:x.date,doctor:p.doctor,status:'pending',reason:x.reason});
   audit('followup.created',p.id,'Success','Follow-up',p.branch);state.modal=null;navigate('activity');toast('Sample follow-up saved to the clinic database.');
 }
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&(state.modal||state.drawer||state.navOpen||state.searchOpen||state.notificationOpen)){state.modal=null;state.drawer=null;state.navOpen=false;state.searchOpen=false;state.notificationOpen=false;render()}});

// Additional event delegation for clinic workspace interactions.
document.addEventListener('change',e=>{
 const t=e.target;
  if(t.id==='v24-backup-input'){
    const file=t.files?.[0];t.value='';if(!file)return;
    if(!file.name.toLowerCase().endsWith('.json')||file.size>13*1024*1024){toast('Select a JSON backup under 13 MB.');return}
    file.text().then(async raw=>{
      let parsed;
      try{parsed=JSON.parse(raw)}catch(_){toast('Invalid JSON file.');return}
      const s=parsed?.state;
      if(parsed?._meta?.app!=='MedBook AI'||parsed?._meta?.schema!=='medbook-state-v1'||!s||typeof s!=='object'||Array.isArray(s)){
        toast('Not a valid MedBook backup.');return;
      }
      const own=(k)=>Object.prototype.hasOwnProperty.call(s,k);
      if(V24_BACKUP_ARRAYS.some(k=>!own(k)||!Array.isArray(s[k]))||
         V24_BACKUP_OBJECTS.some(k=>!own(k)||!s[k]||typeof s[k]!=='object'||Array.isArray(s[k]))||
         V24_BACKUP_NUMBERS.some(k=>!own(k)||!Number.isSafeInteger(s[k])||s[k]<0)||
         !own('customAccent')||(s.customAccent!==null&&!/^#[0-9a-f]{6}$/i.test(s.customAccent))){
        toast('Invalid backup record types. No changes made.');return;
      }
      if(!window.confirm('Restore this MedBook backup to the current clinic? A pre-restore database snapshot will be saved first.'))return;
      try{
        const restored=await MedBookAPI.restoreBackup(parsed,stateVersion);
        V26_STATE_KEYS.forEach(k=>{if(k!=='billing'&&Object.prototype.hasOwnProperty.call(restored.state,k))state[k]=restored.state[k]});
        state.billing=restored.billing;stateVersion=restored.version;
        if(state.customAccent)try{localStorage.setItem('medbook-custom-accent',state.customAccent)}catch(_){}
        else try{localStorage.removeItem('medbook-custom-accent')}catch(_){}
        state.modal=null;state.drawer=null;state.page='overview';state.branch='All branches';state.navigationLoading=false;
        audit('backup.restored','all','Success','Database JSON restore','—');
        lastSavedFingerprint=JSON.stringify(snapshotState());await refreshServerAudit();render();toast('Clinic backup restored successfully.');
      }catch(error){toast(error.message||'Backup restore failed.');}

    }).catch(()=>toast('Could not read JSON backup.'));
    return;
  }
  if(t.id==='v24-accent-picker'){
    if(!/^#[0-9a-f]{6}$/i.test(t.value))return;
    state.customAccent=t.value;
    try{localStorage.setItem('medbook-custom-accent',t.value)}catch(_){}
    render();return;
  }
  if(t.id==='member-card-file'){t.value='';toast('Card selection discarded. No file uploaded or stored.');return}
 if(['report-practice','report-doctor','encounter-practice','encounter-doctor','superbill-practice','superbill-doctor'].includes(t.id)){
  const map={'report-practice':'reportPractice','report-doctor':'reportDoctor','encounter-practice':'encounterPractice','encounter-doctor':'encounterDoctor','superbill-practice':'superbillPractice','superbill-doctor':'superbillDoctor'};
  state[map[t.id]]=t.value;
  if(t.id.startsWith('report-')){state.reportStatus='idle';state.reportRows=[];state.reportRunId++}
  render();return;
 }
 if(t.id==='soap-template-filter'){state.soapTemplateFilter=t.value;render();return}
 if(t.id==='active-specialty'){themeEngine.switchTo(t.value);return}
 if(t.id==='audit-filter'){state.auditFilter=t.value;render();return}
 if(t.id==='audit-outcome'){state.auditOutcome=t.value;render();return}
 if(t.id==='audit-start-date'){state.auditStartDate=t.value;render();return}
 if(t.id==='audit-end-date'){state.auditEndDate=t.value;render();return}
 if(t.id==='active-doctor'){const d=matchingDoctors().find(x=>x.name===t.value);if(d){state.activeDoctor=d.name;render()}return}
  if(t.id==='report-start'||t.id==='report-end'){
   state[t.id==='report-start'?'reportStart':'reportEnd']=t.value;
   state.reportStatus='idle';state.reportRows=[];state.reportRunId++;render();
 }
});
document.addEventListener('input',e=>{
  const t=e.target;
  if(t.dataset.soapField){const p=activeEncounterPatient();if(!p)return;const en=encounterFor(p.id);if(en.status!=='Signed'&&['subjective','objective','assessment','plan'].includes(t.dataset.soapField))en[t.dataset.soapField]=t.value.slice(0,7000);return}
  if(t.id==='coding-search'){state.codingSearch=t.value;document.querySelectorAll('.coding-filterable').forEach(row=>row.hidden=!row.textContent.toLowerCase().includes(t.value.trim().toLowerCase()));return}
  if(t.id==='intake-dob'){
   const output=document.getElementById('intake-age');
   const age=ageFromDOB(t.value);
   if(output)output.textContent=age===null?'Invalid or missing DOB':`${age} years`;
   return;
 }
 if(t.id==='global-search-input'){
   const position=t.selectionStart;
   state.search=t.value;
   render();
   const input=document.getElementById('global-search-input');
   if(input){input.focus();try{input.setSelectionRange(position,position)}catch(_){/* search field may not support selection in some browsers */}}
 }
});
document.addEventListener('submit',e=>{
 if(e.target.id!=='form-integration')return;
 e.preventDefault();
 const data=new FormData(e.target),id=String(data.get('provider')||'');
 const names={availity:'Availity',change:'Change Healthcare',quest:'Quest Diagnostics','search-console':'Google Search Console',ga4:'Google Analytics 4'};
 if(!names[id])return;
 // Deliberately do not read or retain the submitted alias/key field.
 state.integrationConnections[id]=true;
 state.modal=null;
 render();toast('Connected to '+names[id]+' Sandbox. (Demo only; no provider contacted.)');
});

// Authentication and persistence hooks run after the legacy UI handlers so the
// complete workspace state is captured only after each interaction has finished.
document.addEventListener('submit',async e=>{
 if(e.target.id!=='login-form')return;
 e.preventDefault();
 const form=e.target,button=form.querySelector('button[type="submit"]'),errorNode=document.getElementById('login-error');
 const data=new FormData(form),email=String(data.get('email')||'').trim(),password=String(data.get('password')||'');
 if(button){button.disabled=true;button.textContent='Signing in…'}
 if(errorNode)errorNode.textContent='';
 try{
   let firebaseResult;
   try{firebaseResult=await MedBookAPI.firebaseLogin(email,password)}
   catch(firebaseError){
     // Legacy users remain able to sign in during the controlled migration.
     // Firebase-linked users are rejected by /api/auth/login, so this is not a bypass.
     await MedBookAPI.login(email,password);
   }
   if(firebaseResult&&!firebaseResult.configured)await MedBookAPI.login(email,password);
   await bootstrapApp()
 }
 catch(error){if(errorNode)errorNode.textContent=error.message||'Sign-in failed.';if(button){button.disabled=false;button.innerHTML=`Sign in securely ${icon('arrow')}`}}
});
document.addEventListener('click',e=>{
 if(e.target.closest('#auth-retry'))bootstrapApp();
});
['click','change','input','submit'].forEach(type=>document.addEventListener(type,()=>{
 if(typeof queueMicrotask==='function')queueMicrotask(scheduleStateSave);else Promise.resolve().then(scheduleStateSave);
}));
window.addEventListener('online',()=>{if(queuedSnapshot&&!saveConflict&&(!savePaused||savePauseReason==='network'))retryPendingSave()});
window.addEventListener('beforeunload',e=>{
 const pending=appReady&&isTrialActive()&&(saveInFlight||Boolean(saveTimer)||Boolean(queuedSnapshot)||(JSON.stringify(snapshotState())!==lastSavedFingerprint));
 if(pending){e.preventDefault();e.returnValue='';}
});

// A fresh tab can reopen seeded records; current-tab-only edits do not transfer.
try{
  const match=location.hash.match(/^#patient=(.+)$/);
  if(match){const id=decodeURIComponent(match[1]);if(eligiblePatients().some(p=>p.id===id)){state.drawer=id;state.drawerTab='overview';}}
}catch(_){/* Ignore malformed hashes. */}
bootstrapApp();
})();
