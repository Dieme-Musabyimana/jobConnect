import React, { forwardRef, Fragment } from 'react';
import './ResumePDF.css';

const ResumePDF = forwardRef(({ sections }, ref) => {
  // 1. Dynamic Section Controls: Filter out invisible sections
  const visibleSections = sections.filter(s => s.visible !== false);

  // Helper to find data for visible sections
  const getVisibleData = (type) => visibleSections.find(s => s.type === type)?.data;
  const getVisibleSection = (type) => visibleSections.find(s => s.type === type);


  const personal = getVisibleData('personal_info') || {};
  const profile = getVisibleData('profile') || {};
  const experience = getVisibleData('experience') || [];
  const education = getVisibleData('education') || [];
  const certifications = getVisibleData('certifications') || [];
  const techSkills = getVisibleData('skills') || [];
  const softSkills = getVisibleData('soft_skills') || [];
  const languages = getVisibleData('languages') || [];
  const projects = getVisibleData('projects') || [];

  // 3. Logic for "Add Custom Section" tool
  const standardTypes = [
    'personal_info', 'profile', 'experience', 'education',
    'certifications', 'skills', 'soft_skills', 'languages', 'projects'
  ];
  const customSections = visibleSections.filter(s => !standardTypes.includes(s.type));

  // 2. Flexible Contact & Social Headers: Render contact info with custom fields and separators
  const renderContactInfo = () => {
    const contactItems = [];
    if (personal.email) contactItems.push(<span>{personal.email}</span>);
    if (personal.phone) contactItems.push(<span>{personal.phone}</span>);
    if (personal.address) contactItems.push(<span>{personal.address}</span>);

    personal.customFields?.forEach(field => {
      if (field.label && field.value) {
        contactItems.push(<span key={field.label}>{field.label}: {field.value}</span>);
      }
    });

    return contactItems.map((item, index) => (
      <Fragment key={index}>
        {item}
        {index < contactItems.length - 1 && <span className="contact-separator">|</span>}
      </Fragment>
    ));
  };

  return (
    <div ref={ref} className="pdf-page">
      <div className="pdf-container">
        {/* 4. Fixed 2-Column Layout: Sidebar (Left 33%) */}
        <aside className="pdf-sidebar">
          {education.length > 0 && (
            <section className="sidebar-section">
              <h2 className="sidebar-title">Education</h2>
              {education.map((edu, i) => (
                <div key={i} className="sidebar-item item-block">
                  <div className="item-row">
                    <span className="item-main">{edu.degree || edu.school}</span>
                    <span className="item-date">{edu.year}</span>
                  </div>
                  {edu.degree && <p className="item-sub">{edu.school}</p>}
                </div>
              ))}
            </section>
          )}

          {techSkills.length > 0 && (
            <section className="sidebar-section">
              <h2 className="sidebar-title">Technical Skills</h2>
              <div className="skills-grid">
                {techSkills.map((skill, i) => (
                  <span key={i} className="skill-pill">{skill.name}</span>
                ))}
              </div>
            </section>
          )}

          {softSkills.length > 0 && (
            <section className="sidebar-section">
              <h2 className="sidebar-title">Soft Skills</h2>
              <ul className="sidebar-list">
                {softSkills.map((skill, i) => (
                  <li key={i}>{skill.name}</li>
                ))}
              </ul>
            </section>
          )}

          {languages.length > 0 && (
            <section className="sidebar-section">
              <h2 className="sidebar-title">Languages</h2>
              {languages.map((lang, i) => (
                <div key={i} className="sidebar-item">
                  <div className="item-row">
                    <span className="item-main">{lang.name}</span>
                    <span className="item-date">{lang.level}</span>
                  </div>
                </div>
              ))}
            </section>
          )}
        </aside>

        {/* 4. Fixed 2-Column Layout: Main Body (Right 67%) */}
        <main className="pdf-main">
          <header className="main-header">
            <h1 className="user-name">{personal.name || 'YOUR NAME'}</h1>
            {personal.title && <p className="user-title">{personal.title}</p>}

            {/* 2. Flexible Contact & Social Headers */}
            <div className="contact-info">
              {renderContactInfo()}
            </div>
          </header>

          {profile?.text && (
            <section className="section-block">
              <h2 className="main-section-title">Professional Profile</h2>
              <p className="profile-text">{profile.text}</p>
            </section>
          )}

          {experience.length > 0 && (
            <section className="section-block">
              <h2 className="main-section-title">Experience</h2>
              {experience.map((job, i) => (
                <div key={i} className="experience-item item-block">
                  <div className="item-row">
                    <h3 className="job-role">{job.role}</h3>
                    <span className="item-date">{job.duration}</span>
                  </div>
                  <p className="job-company">{job.company}</p>
                  <ul className="activity-list">
                    {job.activities?.map((act, aIdx) => act && <li key={aIdx}>{act}</li>)}
                  </ul>
                </div>
              ))}
            </section>
          )}

          {projects.length > 0 && (
            <section className="section-block">
              <h2 className="main-section-title">Projects</h2>
              {projects.map((proj, i) => (
                <div key={i} className="project-item item-block">
                  <div className="item-row">
                    <h3 className="project-name">{proj.name}</h3>
                    {proj.link && <a href={proj.link} target="_blank" rel="noopener noreferrer" className="project-link">Link</a>}
                  </div>
                  {proj.tech && <p className="project-tech">{proj.tech}</p>}
                  {proj.description && <p className="profile-text">{proj.description}</p>}
                </div>
              ))}
            </section>
          )}

          {certifications.length > 0 && (
            <section className="section-block">
              <h2 className="main-section-title">Certifications</h2>
              {certifications.map((cert, i) => (
                <div key={i} className="certification-item item-block">
                  <div className="item-row">
                    <span className="item-main">{cert.name}</span>
                    <span className="item-date">{cert.year}</span>
                  </div>
                  <p className="item-sub">{cert.issuer}</p>
                </div>
              ))}
            </section>
          )}

          {/* Render Custom Sections */}
          {customSections.map((section, i) => (
            <section key={i} className="section-block">
              <h2 className="main-section-title">{section.label}</h2>
              {Array.isArray(section.data) ? (
                <ul className="activity-list">
                  {section.data.map((item, idx) => item.text && <li key={idx}>{item.text}</li>)}
                </ul>
              ) : (
                <p className="profile-text">{section.data}</p>
              )}
            </section>
          ))}
        </main>
      </div>
    </div>
  );
});

export default ResumePDF;