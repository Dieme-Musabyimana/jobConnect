import React, { useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import ResumePDF from './ResumePDF';

const CVEditor = () => {
  const [sections, setSections] = useState([
    { id: 'personal', type: 'personal_info', label: '1. Identity & Contact', data: { name: '', title: '', address: '', email: '', phone: '' }, mandatory: true },
    { id: 'profile', type: 'profile', label: '2. Professional Summary', data: { text: '' }, mandatory: true },
    { id: 'experience', type: 'experience', label: '3. Work History', data: [], mandatory: true },
    { id: 'education', type: 'education', label: '4. Education', data: [], mandatory: true },
    { id: 'certifications', type: 'certifications', label: '5. Certifications', data: [], mandatory: false },
    { id: 'skills', type: 'skills', label: '6. Technical Skills', data: [], mandatory: true },
    { id: 'soft_skills', type: 'soft_skills', label: '7. Soft Skills', data: [], mandatory: false },
    { id: 'languages', type: 'languages', label: '8. Languages', data: [], mandatory: false },
  ]);

  const componentRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: 'My_Professional_CV'
  });

  const updateSectionData = (id, newData) => {
    setSections(prev => prev.map(s => (s.id === id ? { ...s, data: newData } : s)));
  };

  const addItem = (id) => {
    const section = sections.find(s => s.id === id);
    let newItem;
    switch(section.type) {
      case 'experience': newItem = { company: '', role: '', duration: '', activities: [''] }; break;
      case 'education': newItem = { school: '', degree: '', year: '' }; break;
      case 'certifications': newItem = { name: '', issuer: '', year: '' }; break;
      case 'languages': newItem = { name: '', level: '' }; break;
      default: newItem = { name: '' }; // For Skills and Soft Skills
    }
    updateSectionData(id, [...section.data, newItem]);
  };

  const addActivity = (jobIdx) => {
    const newData = [...sections.find(s => s.id === 'experience').data];
    newData[jobIdx].activities.push('');
    updateSectionData('experience', newData);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-slate-100 min-h-screen font-sans">
      <div className="flex justify-between items-center mb-6 bg-white p-5 rounded-xl shadow-sm border border-slate-200">
        <h1 className="text-xl font-black text-slate-800 uppercase tracking-tighter">JobConnect <span className="text-blue-600">PRO</span></h1>
        <button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-bold transition shadow-md">
          Download PDF
        </button>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-[10px] font-black text-blue-500 uppercase mb-4 tracking-widest border-b pb-2">{section.label}</h3>

            {section.type === 'personal_info' && (
               <div className="grid grid-cols-2 gap-3">
                 <input type="text" placeholder="Full Name" className="p-2 border rounded" onChange={(e) => updateSectionData(section.id, { ...section.data, name: e.target.value })} />
                 <input type="text" placeholder="Professional Title" className="p-2 border rounded" onChange={(e) => updateSectionData(section.id, { ...section.data, title: e.target.value })} />
                 <input type="text" placeholder="Email Address" className="p-2 border rounded" onChange={(e) => updateSectionData(section.id, { ...section.data, email: e.target.value })} />
                 <input type="text" placeholder="Phone Number" className="p-2 border rounded" onChange={(e) => updateSectionData(section.id, { ...section.data, phone: e.target.value })} />
                 <input type="text" placeholder="Location (City, Country)" className="p-2 border rounded col-span-2" onChange={(e) => updateSectionData(section.id, { ...section.data, address: e.target.value })} />
               </div>
            )}

            {section.type === 'profile' && (
               <textarea placeholder="Briefly describe your professional background..." className="w-full p-2 border rounded h-24 text-sm focus:ring-2 focus:ring-blue-100 outline-none" onChange={(e) => updateSectionData(section.id, { text: e.target.value })} />
            )}

            {section.type === 'experience' && (
              <div className="space-y-4">
                {section.data.map((job, jIdx) => (
                  <div key={jIdx} className="p-4 bg-slate-50 rounded-lg border">
                    <input type="text" placeholder="Company Name" className="w-full mb-2 p-2 border rounded font-bold" onChange={(e) => { const d = [...section.data]; d[jIdx].company = e.target.value; updateSectionData(section.id, d); }} />
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <input type="text" placeholder="Job Role" className="p-2 border rounded" onChange={(e) => { const d = [...section.data]; d[jIdx].role = e.target.value; updateSectionData(section.id, d); }} />
                      <input type="text" placeholder="Duration (e.g., 2024 - Present)" className="p-2 border rounded" onChange={(e) => { const d = [...section.data]; d[jIdx].duration = e.target.value; updateSectionData(section.id, d); }} />
                    </div>
                    <div className="space-y-2">
                      <p className="text-[9px] font-bold text-slate-400 uppercase">Responsibilities (Bullet Points)</p>
                      {job.activities.map((act, aIdx) => (
                        <input key={aIdx} type="text" placeholder="Activity line..." className="w-full p-2 border rounded text-xs" onChange={(e) => { const d = [...section.data]; d[jIdx].activities[aIdx] = e.target.value; updateSectionData(section.id, d); }} />
                      ))}
                      <button onClick={() => addActivity(jIdx)} className="text-[10px] font-bold text-blue-600 hover:underline">+ ADD ACTIVITY LINE</button>
                    </div>
                  </div>
                ))}
                <button onClick={() => addItem(section.id)} className="text-xs font-bold text-slate-500 hover:text-blue-600">+ ADD EXPERIENCE</button>
              </div>
            )}

            {(section.type === 'education' || section.type === 'certifications') && (
              <div className="space-y-3">
                {section.data.map((item, i) => (
                  <div key={i} className="p-3 bg-slate-50 rounded border grid grid-cols-2 gap-2">
                    <input type="text" placeholder={section.type === 'education' ? "School" : "Certification Name"} className="p-2 border rounded text-sm col-span-2" onChange={(e) => { const d = [...section.data]; section.type === 'education' ? d[i].school = e.target.value : d[i].name = e.target.value; updateSectionData(section.id, d); }} />
                    <input type="text" placeholder={section.type === 'education' ? "Degree" : "Issuing Organization"} className="p-2 border rounded text-sm" onChange={(e) => { const d = [...section.data]; section.type === 'education' ? d[i].degree = e.target.value : d[i].issuer = e.target.value; updateSectionData(section.id, d); }} />
                    <input type="text" placeholder="Year" className="p-2 border rounded text-sm" onChange={(e) => { const d = [...section.data]; d[i].year = e.target.value; updateSectionData(section.id, d); }} />
                  </div>
                ))}
                <button onClick={() => addItem(section.id)} className="text-xs font-bold text-slate-500 hover:text-blue-600">+ ADD {section.label.split(' ')[1].toUpperCase()}</button>
              </div>
            )}

            {(section.type === 'skills' || section.type === 'soft_skills') && (
              <div className="space-y-2">
                {section.data.map((item, i) => (
                  <input key={i} type="text" placeholder="Skill Name" className="w-full p-2 border rounded text-sm" onChange={(e) => { const d = [...section.data]; d[i].name = e.target.value; updateSectionData(section.id, d); }} />
                ))}
                <button onClick={() => addItem(section.id)} className="text-xs font-bold text-slate-500 hover:text-blue-600">+ ADD {section.type.replace('_', ' ').toUpperCase()}</button>
              </div>
            )}

            {section.type === 'languages' && (
              <div className="space-y-3">
                {section.data.map((lang, lIdx) => (
                  <div key={lIdx} className="flex gap-2">
                    <input type="text" placeholder="Language" className="flex-1 p-2 border rounded" onChange={(e) => { const d = [...section.data]; d[lIdx].name = e.target.value; updateSectionData(section.id, d); }} />
                    <select className="p-2 border rounded text-xs" onChange={(e) => { const d = [...section.data]; d[lIdx].level = e.target.value; updateSectionData(section.id, d); }}>
                      <option value="">Choose Level (Optional)</option>
                      <option value="Native/Bilingual">Native/Bilingual</option>
                      <option value="Full Professional">Full Professional</option>
                      <option value="Professional Working">Professional Working</option>
                      <option value="Intermediate">Intermediate</option>
                    </select>
                  </div>
                ))}
                <button onClick={() => addItem(section.id)} className="text-xs font-bold text-slate-500 hover:text-blue-600">+ ADD LANGUAGE</button>
              </div>
            )}
          </div>
        ))}
      </div>
      <div style={{ display: 'none' }}><ResumePDF ref={componentRef} sections={sections} /></div>
    </div>
  );
};

export default CVEditor;