import React, { forwardRef } from 'react';

const ResumePDF = forwardRef(({ sections }, ref) => {
  const getSection = (type) => sections.find(s => s.type === type)?.data || [];

  const personal = sections.find(s => s.type === 'personal_info')?.data || {};
  const profile = sections.find(s => s.type === 'profile')?.data || {};
  const experience = getSection('experience');
  const education = getSection('education');
  const certifications = getSection('certifications');
  const skills = getSection('skills');
  const softSkills = getSection('soft_skills');
  const languages = getSection('languages');

  const pageStyle = `
    @page { size: portrait; margin: 0; }
    @media print {
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .print-container { display: flex !important; flex-direction: row !important; min-height: 297mm; }
      .section-block { page-break-inside: avoid !important; margin-bottom: 25px; }
    }
  `;

  const sidebarTitleStyle = {
    fontSize: '13px',
    fontWeight: 'bold',
    borderBottom: '1px solid #475569',
    paddingBottom: '5px',
    marginBottom: '15px',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  };

  const mainTitleStyle = {
    fontSize: '13px',
    fontWeight: '900',
    color: '#1e293b',
    textTransform: 'uppercase',
    borderLeft: '4px solid #1e293b',
    paddingLeft: '12px',
    marginBottom: '15px'
  };

  return (
    <div ref={ref} style={{ width: '210mm', minHeight: '297mm', backgroundColor: 'white' }}>
      <style>{pageStyle}</style>
      <div className="print-container" style={{ display: 'flex', minHeight: '297mm' }}>

        {/* SIDEBAR (33%) */}
        <div style={{ width: '33%', backgroundColor: '#1e293b', color: 'white', padding: '40px 25px' }}>
          <div style={{ width: '80px', height: '80px', backgroundColor: '#334155', borderRadius: '50%', margin: '0 auto 30px', border: '2px solid #475569' }}></div>

          {education.length > 0 && (
            <div style={{ marginBottom: '35px' }}>
              <h2 style={sidebarTitleStyle}>Education</h2>
              {education.map((edu, i) => (
                <div key={i} style={{ marginBottom: '12px' }}>
                  <p style={{ fontSize: '9px', color: '#60a5fa', fontWeight: 'bold', margin: '0' }}>{edu.year}</p>
                  <p style={{ fontSize: '11px', fontWeight: 'bold', margin: '2px 0', textTransform: 'uppercase' }}>{edu.degree}</p>
                  <p style={{ fontSize: '9px', color: '#94a3b8', margin: '0' }}>{edu.school}</p>
                </div>
              ))}
            </div>
          )}

          {skills.length > 0 && (
            <div style={{ marginBottom: '35px' }}>
              <h2 style={sidebarTitleStyle}>Technical Skills</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                {skills.map((skill, i) => (
                  <span key={i} style={{ fontSize: '9px', backgroundColor: '#334155', padding: '3px 7px', borderRadius: '3px', border: '1px solid #475569' }}>
                    {skill.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {softSkills.length > 0 && (
            <div style={{ marginBottom: '35px' }}>
              <h2 style={sidebarTitleStyle}>Soft Skills</h2>
              <ul style={{ paddingLeft: '15px', margin: '0', fontSize: '10px', color: '#cbd5e1' }}>
                {softSkills.map((s, i) => <li key={i} style={{ marginBottom: '4px' }}>{s.name}</li>)}
              </ul>
            </div>
          )}

          {languages.length > 0 && (
            <div>
              <h2 style={sidebarTitleStyle}>Languages</h2>
              {languages.map((lang, i) => (
                <div key={i} style={{ marginBottom: '8px' }}>
                  <p style={{ fontSize: '10px', fontWeight: 'bold', margin: '0' }}>{lang.name}</p>
                  {lang.level && <p style={{ fontSize: '9px', color: '#94a3b8', margin: '0' }}>{lang.level}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* MAIN CONTENT (67%) */}
        <div style={{ width: '67%', padding: '45px', display: 'flex', flexDirection: 'column', gap: '30px' }}>
          <header style={{ border: '4px solid #1e293b', padding: '20px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '32px', fontWeight: '900', textTransform: 'uppercase', margin: '0', color: '#1e293b' }}>{personal.name || 'NAME'}</h1>
            <p style={{ fontSize: '16px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '4px', margin: '5px 0 0' }}>{personal.title || 'TITLE'}</p>
            {(personal.address || personal.email) && (
              <p style={{ fontSize: '9px', color: '#64748b', marginTop: '8px', letterSpacing: '1px' }}>
                {personal.address} {personal.email && ` | ${personal.email}`} {personal.phone && ` | ${personal.phone}`}
              </p>
            )}
          </header>

          {profile.text && (
            <div className="section-block">
              <h2 style={mainTitleStyle}>Profile</h2>
              <p style={{ fontSize: '10.5px', lineHeight: '1.6', color: '#334155', textAlign: 'justify' }}>{profile.text}</p>
            </div>
          )}

          {experience.length > 0 && (
            <div className="section-block">
              <h2 style={mainTitleStyle}>Experience</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '25px' }}>
                {experience.map((job, i) => (
                  <div key={i}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <h3 style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>{job.role}</h3>
                      <span style={{ fontSize: '9px', color: '#94a3b8', fontWeight: 'bold' }}>{job.duration}</span>
                    </div>
                    <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#2563eb', margin: '2px 0 8px' }}>{job.company}</p>
                    <ul style={{ margin: '0', paddingLeft: '18px' }}>
                      {job.activities?.map((act, aIdx) => (
                        act && <li key={aIdx} style={{ fontSize: '10px', color: '#475569', marginBottom: '4px', lineHeight: '1.4' }}>{act}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {certifications.length > 0 && (
            <div className="section-block">
              <h2 style={mainTitleStyle}>Certifications</h2>
              {certifications.map((cert, i) => (
                <div key={i} style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <p style={{ fontSize: '11px', fontWeight: 'bold', margin: '0' }}>{cert.name}</p>
                    <span style={{ fontSize: '9px', color: '#94a3b8' }}>{cert.year}</span>
                  </div>
                  <p style={{ fontSize: '10px', color: '#2563eb', margin: '0' }}>{cert.issuer}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default ResumePDF;