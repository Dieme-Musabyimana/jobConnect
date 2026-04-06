import React, { useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import ResumePDF from './ResumePDF';
import './CVEditor.css';

const CVEditor = () => {
  const [sections, setSections] = useState([
    { id: 'personal', type: 'personal_info', label: '1. Identity & Contact', visible: true, data: { name: '', title: '', address: '', email: '', phone: '', customFields: [] } },
    { id: 'profile', type: 'profile', label: '2. Professional Summary', visible: true, data: { text: '' } },
    { id: 'experience', type: 'experience', label: '3. Work History', visible: true, data: [] },
    { id: 'projects', type: 'projects', label: '4. Key Projects', visible: true, data: [] },
    { id: 'education', type: 'education', label: '5. Education', visible: true, data: [] },
    { id: 'skills', type: 'skills', label: '6. Technical Skills', visible: true, data: [] },
    { id: 'soft_skills', type: 'soft_skills', label: '7. Soft Skills', visible: true, data: [] },
    { id: 'languages', type: 'languages', label: '8. Languages', visible: true, data: [] },
    { id: 'certifications', type: 'certifications', label: '9. Certifications', visible: true, data: [] },
  ]);

  const componentRef = useRef(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: 'My_Professional_CV',
  });

  const updateSectionData = (id, newData) => {
    setSections(prev => prev.map(s => (s.id === id ? { ...s, data: newData } : s)));
  };

  const toggleVisibility = (id) => {
    setSections(prev => prev.map(s => (s.id === id ? { ...s, visible: !s.visible } : s)));
  };

  const addItem = (id) => {
    const section = sections.find(s => s.id === id);
    let newItem;
    switch(section.type) {
      case 'experience': newItem = { company: '', role: '', duration: '', activities: [''] }; break;
      case 'projects': newItem = { name: '', tech: '', link: '', description: '' }; break;
      case 'education': newItem = { school: '', degree: '', year: '' }; break;
      case 'certifications': newItem = { name: '', issuer: '', year: '' }; break;
      case 'languages': newItem = { name: '', level: '' }; break;
      case 'custom': newItem = { text: '' }; break;
      default: newItem = { name: '' };
    }
    updateSectionData(id, [...section.data, newItem]);
  };

  const removeItem = (id, index) => {
    const section = sections.find(s => s.id === id);
    const newData = section.data.filter((_, i) => i !== index);
    updateSectionData(id, newData);
  };

  const addCustomField = () => {
    const section = sections.find(s => s.id === 'personal');
    updateSectionData('personal', { ...section.data, customFields: [...section.data.customFields, { label: '', value: '' }] });
  };

  const addCustomSection = () => {
    const newId = `custom_${Date.now()}`;
    setSections(prev => [...prev, { id: newId, type: 'custom', label: 'New Custom Section', visible: true, data: [] }]);
  };

  const removeSection = (id) => {
    setSections(prev => prev.filter(s => s.id !== id));
  };

  return (
    <div className="editor-container">
      <div className="editor-header">
        <h1 className="logo">JobConnect <span className="logo-accent">PRO</span></h1>
        <button onClick={handlePrint} className="download-btn">Download PDF</button>
      </div>

      <div className="sections-list">
        {sections.map((section) => (
          <div key={section.id} className={`section-card ${!section.visible ? 'section-hidden' : ''}`}>
            <div className="section-header-row">
              <h3 className="section-label">
                {section.type === 'custom' ? (
                  <input
                    className="custom-label-input"
                    value={section.label}
                    onChange={(e) => setSections(prev => prev.map(s => s.id === section.id ? { ...s, label: e.target.value } : s))}
                  />
                ) : section.label}
              </h3>
              <div className="section-controls">
                <label className="toggle-switch">
                  <input type="checkbox" checked={section.visible} onChange={() => toggleVisibility(section.id)} />
                  <span className="slider"></span>
                  <span className="toggle-text">{section.visible ? 'VISIBLE' : 'HIDDEN'}</span>
                </label>
                {section.type === 'custom' && (
                  <button onClick={() => removeSection(section.id)} className="delete-section-btn">Remove</button>
                )}
              </div>
            </div>

            {section.type === 'personal_info' && (
               <div className="input-grid">
                 <input type="text" placeholder="Full Name" onChange={(e) => updateSectionData(section.id, { ...section.data, name: e.target.value })} />
                 <input type="text" placeholder="Professional Title" onChange={(e) => updateSectionData(section.id, { ...section.data, title: e.target.value })} />
                 <input type="text" placeholder="Email Address" onChange={(e) => updateSectionData(section.id, { ...section.data, email: e.target.value })} />
                 <input type="text" placeholder="Phone Number" onChange={(e) => updateSectionData(section.id, { ...section.data, phone: e.target.value })} />
                 <input type="text" placeholder="Location" className="col-span-2" onChange={(e) => updateSectionData(section.id, { ...section.data, address: e.target.value })} />

                 <div className="custom-fields-area col-span-2">
                   {section.data.customFields.map((cf, idx) => (
                     <div key={idx} className="custom-field-row">
                       <input type="text" placeholder="Label (e.g. LinkedIn)" value={cf.label} onChange={(e) => {
                         const cfCopy = [...section.data.customFields];
                         cfCopy[idx].label = e.target.value;
                         updateSectionData(section.id, { ...section.data, customFields: cfCopy });
                       }} />
                       <input type="text" placeholder="URL / Value" value={cf.value} onChange={(e) => {
                         const cfCopy = [...section.data.customFields];
                         cfCopy[idx].value = e.target.value;
                         updateSectionData(section.id, { ...section.data, customFields: cfCopy });
                       }} />
                       <button onClick={() => {
                         const cfCopy = section.data.customFields.filter((_, i) => i !== idx);
                         updateSectionData(section.id, { ...section.data, customFields: cfCopy });
                       }} className="remove-btn">×</button>
                     </div>
                   ))}
                   <button onClick={addCustomField} className="add-sub-btn">+ ADD CUSTOM CONTACT FIELD</button>
                 </div>
               </div>
            )}

            {section.type === 'profile' && (
               <textarea placeholder="Professional background..." className="profile-textarea" onChange={(e) => updateSectionData(section.id, { text: e.target.value })} />
            )}

            {section.type === 'experience' && (
              <div className="items-container">
                {section.data.map((job, jIdx) => (
                  <div key={jIdx} className="item-block">
                    <div className="item-header">
                      <input type="text" placeholder="Company Name" className="font-bold" onChange={(e) => { const d = [...section.data]; d[jIdx].company = e.target.value; updateSectionData(section.id, d); }} />
                      <button onClick={() => removeItem(section.id, jIdx)} className="remove-btn">×</button>
                    </div>
                    <div className="input-grid">
                      <input type="text" placeholder="Job Role" onChange={(e) => { const d = [...section.data]; d[jIdx].role = e.target.value; updateSectionData(section.id, d); }} />
                      <input type="text" placeholder="Duration" onChange={(e) => { const d = [...section.data]; d[jIdx].duration = e.target.value; updateSectionData(section.id, d); }} />
                    </div>
                    {job.activities.map((act, aIdx) => (
                      <input key={aIdx} type="text" placeholder="Activity line..." onChange={(e) => {
                        const d = [...section.data]; d[jIdx].activities[aIdx] = e.target.value; updateSectionData(section.id, d);
                      }} />
                    ))}
                    <button onClick={() => {
                      const d = [...section.data]; d[jIdx].activities.push(''); updateSectionData(section.id, d);
                    }} className="add-sub-btn">+ ADD ACTIVITY</button>
                  </div>
                ))}
                <button onClick={() => addItem(section.id)} className="add-btn">+ ADD WORK EXPERIENCE</button>
              </div>
            )}

            {section.type === 'projects' && (
              <div className="items-container">
                {section.data.map((proj, pIdx) => (
                  <div key={pIdx} className="item-block">
                    <div className="item-header">
                      <input type="text" placeholder="Project Name" className="font-bold" onChange={(e) => { const d = [...section.data]; d[pIdx].name = e.target.value; updateSectionData(section.id, d); }} />
                      <button onClick={() => removeItem(section.id, pIdx)} className="remove-btn">×</button>
                    </div>
                    <div className="input-grid">
                      <input type="text" placeholder="Technologies Used" onChange={(e) => { const d = [...section.data]; d[pIdx].tech = e.target.value; updateSectionData(section.id, d); }} />
                      <input type="text" placeholder="Project Link (Optional)" onChange={(e) => { const d = [...section.data]; d[pIdx].link = e.target.value; updateSectionData(section.id, d); }} />
                    </div>
                    <textarea placeholder="Description..." onChange={(e) => { const d = [...section.data]; d[pIdx].description = e.target.value; updateSectionData(section.id, d); }} />
                  </div>
                ))}
                <button onClick={() => addItem(section.id)} className="add-btn">+ ADD PROJECT</button>
              </div>
            )}

            {(section.type === 'education' || section.type === 'certifications') && (
              <div className="items-container">
                {section.data.map((item, i) => (
                  <div key={i} className="item-block">
                    <div className="item-header">
                      <input type="text" placeholder="Name / Institution" className="font-bold" onChange={(e) => { const d = [...section.data]; section.type === 'education' ? d[i].school = e.target.value : d[i].name = e.target.value; updateSectionData(section.id, d); }} />
                      <button onClick={() => removeItem(section.id, i)} className="remove-btn">×</button>
                    </div>
                    <div className="input-grid">
                      <input type="text" placeholder="Degree / Issuer" onChange={(e) => { const d = [...section.data]; section.type === 'education' ? d[i].degree = e.target.value : d[i].issuer = e.target.value; updateSectionData(section.id, d); }} />
                      <input type="text" placeholder="Year" onChange={(e) => { const d = [...section.data]; d[i].year = e.target.value; updateSectionData(section.id, d); }} />
                    </div>
                  </div>
                ))}
                <button onClick={() => addItem(section.id)} className="add-btn">+ ADD {section.label.split('.')[1]?.trim().split(' ')[0] || 'ITEM'}</button>
              </div>
            )}

            {(section.type === 'skills' || section.type === 'soft_skills' || section.type === 'languages') && (
              <div className="items-container">
                <div className="skills-input-group">
                  {section.data.map((item, i) => (
                    <div key={i} className="skill-input-row">
                      <input type="text" placeholder={section.type === 'languages' ? 'Language' : 'Skill'} onChange={(e) => { const d = [...section.data]; d[i].name = e.target.value; updateSectionData(section.id, d); }} />
                      {section.type === 'languages' && <input type="text" placeholder="Level" onChange={(e) => { const d = [...section.data]; d[i].level = e.target.value; updateSectionData(section.id, d); }} />}
                      <button onClick={() => removeItem(section.id, i)} className="remove-btn">×</button>
                    </div>
                  ))}
                </div>
                <button onClick={() => addItem(section.id)} className="add-btn">+ ADD {section.type === 'skills' ? 'TECH SKILL' : section.type === 'soft_skills' ? 'SOFT SKILL' : 'LANGUAGE'}</button>
              </div>
            )}

            {section.type === 'custom' && (
               <div className="items-container">
                 {section.data.map((item, i) => (
                   <div key={i} className="item-block">
                     <textarea placeholder="Bullet point or text..." onChange={(e) => { const d = [...section.data]; d[i].text = e.target.value; updateSectionData(section.id, d); }} />
                     <button onClick={() => removeItem(section.id, i)} className="remove-btn">×</button>
                   </div>
                 ))}
                 <button onClick={() => addItem(section.id)} className="add-btn">+ ADD ITEM</button>
               </div>
            )}
          </div>
        ))}
        <button onClick={addCustomSection} className="add-section-master-btn">+ ADD NEW CUSTOM SECTION</button>
      </div>
      <div style={{ display: 'none' }}><ResumePDF ref={componentRef} sections={sections} /></div>
    </div>
  );
};

export default CVEditor;