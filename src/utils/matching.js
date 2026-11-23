/**
 * JavaScript implementation of Opportunity Hub Matching Engine
 * Exact mirror of src/main/java/utils/MatchingEngine.java
 * Formula: S = 0.20*C + 0.25*F + 0.20*K + 0.20*E + 0.15*L
 */

export function getEducationRank(edu) {
  if (!edu) return 2;
  const s = edu.toLowerCase();
  if (s.includes('phd') || s.includes('doctor')) return 5;
  if (s.includes('master')) return 4;
  if (s.includes('bachelor') || s.includes('degree') || s.includes('university') || s.includes('a0')) return 3;
  if (s.includes('diploma') || s.includes('advanced diploma') || s.includes('a1') || s.includes('tvet')) return 2;
  if (s.includes('high school') || s.includes('secondary') || s.includes('a2')) return 1;
  return 2;
}

export function calculateEducationScore(userEdu, jobEdu) {
  if (!jobEdu || jobEdu.trim() === '' || jobEdu.toUpperCase() === 'OPEN' || jobEdu.toUpperCase() === 'NONE' || jobEdu.toLowerCase().includes('any')) {
    return 100.0;
  }
  if (!userEdu || userEdu.trim() === '') {
    return 45.0;
  }

  const userRank = getEducationRank(userEdu);
  const jobRank = getEducationRank(jobEdu);

  if (userRank >= jobRank) {
    return 100.0;
  } else if (userRank === jobRank - 1) {
    return 60.0;
  } else {
    return 20.0;
  }
}

export function calculateMatch(user, job) {
  if (!user || !job) {
    return {
      score: 0,
      eligibleNote: "Verify stated eligibility on official source.",
      reasons: []
    };
  }

  const reasons = [];

  // 1. Category Score (0.20)
  // Check both domain category and opportunity format type
  let cScore = 50.0;
  const preferredCategories = user.preferredCategories || [];
  const jobCategory = (job.domainCategory || job.category || 'IT').toUpperCase().trim();
  const jobFormat = (job.opportunityType || job.category || 'JOB').toUpperCase().trim();

  if (preferredCategories.length > 0) {
    const matchesCategory = preferredCategories.some(pref => {
      const p = pref.toUpperCase().trim();
      return p === 'ALL' || p === jobCategory || p === jobFormat || jobCategory.includes(p) || p.includes(jobCategory);
    });

    if (matchesCategory) {
      cScore = 100.0;
      reasons.push(`Category aligns with preferred interest (${job.domainCategory || job.category})`);
    } else {
      cScore = 15.0;
    }
  } else {
    cScore = 65.0;
  }

  // 2. Field of Study Score (0.25)
  let fScore = 20.0;
  const userField = (user.fieldOfStudy || '').toLowerCase().trim();
  const jobField = (job.fieldOfStudy || '').toLowerCase().trim();
  const jobTitle = (job.title || '').toLowerCase().trim();

  if (!userField) {
    fScore = 50.0;
  } else if (jobField && (jobField.includes(userField) || userField.includes(jobField))) {
    fScore = 100.0;
    reasons.push(`Field matches ${user.fieldOfStudy}`);
  } else if (jobTitle.includes(userField)) {
    fScore = 90.0;
    reasons.push("Specialization aligns with title");
  } else {
    const tokens = userField.split(/[\s,/]+/).filter(t => t.length > 2);
    let matchedTokens = 0;
    for (const tok of tokens) {
      if (jobField.includes(tok) || jobTitle.includes(tok)) {
        matchedTokens++;
      }
    }
    if (matchedTokens > 0) {
      fScore = 70.0;
      reasons.push(`Related discipline in ${user.fieldOfStudy}`);
    } else {
      fScore = 15.0;
    }
  }

  // 3. Skills Overlap Score (0.20)
  let kScore = 30.0;
  const userSkills = user.skills || [];
  const jobSkills = job.requiredSkills || [];

  if (jobSkills.length === 0) {
    kScore = 60.0;
  } else if (userSkills.length === 0) {
    kScore = 25.0;
  } else {
    const matchedSkillNames = [];
    jobSkills.forEach(js => {
      if (!js) return;
      const normalizedJs = js.toLowerCase().trim();
      const match = userSkills.find(us => {
        if (!us) return false;
        const normalizedUs = us.toLowerCase().trim();
        return normalizedJs.includes(normalizedUs) || normalizedUs.includes(normalizedJs);
      });
      if (match) {
        matchedSkillNames.push(js.trim());
      }
    });

    const ratio = matchedSkillNames.length / jobSkills.length;
    kScore = Math.max(10.0, Math.min(100.0, ratio * 100.0));
    if (matchedSkillNames.length > 0) {
      reasons.push(`Matching skills: ${matchedSkillNames.join(', ')}`);
    }
  }

  // 4. Education Eligibility Score (0.20)
  const eScore = calculateEducationScore(user.educationLevel, job.educationLevel);
  if (eScore >= 80.0) {
    const eduLabel = (job.educationLevel && job.educationLevel.trim() !== '') ? job.educationLevel : 'Open entry';
    reasons.push(`Education aligns with ${eduLabel}`);
  }

  // 5. Location Preference Score (0.15)
  let lScore = 30.0;
  const userLoc = (user.preferredLocation || '').toLowerCase().trim();
  const jobLoc = (job.location || '').toLowerCase().trim();

  if (!userLoc || userLoc.includes('all') || userLoc.includes('any')) {
    lScore = 80.0;
    reasons.push("Flexible location preference");
  } else if (jobLoc.includes('remote') || jobLoc.includes('nationwide') || jobLoc.includes('all rwanda')) {
    lScore = 95.0;
    reasons.push("Accessible nationwide or remote");
  } else if (jobLoc && (jobLoc.includes(userLoc.split(',')[0].trim()) || userLoc.includes(jobLoc.split(',')[0].trim()))) {
    lScore = 100.0;
    reasons.push(`Location matches ${job.location}`);
  } else {
    lScore = 15.0;
  }

  const rawScore = (0.20 * cScore) + (0.25 * fScore) + (0.20 * kScore) + (0.20 * eScore) + (0.15 * lScore);
  const score = Math.round(Math.max(0, Math.min(100, rawScore)) * 10) / 10;

  return {
    score,
    eligibleNote: "Note: Independent opportunity index. Verify all stated eligibility criteria and deadlines directly on the official source.",
    reasons
  };
}
