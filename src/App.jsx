import React, { useState, useEffect, useMemo } from 'react';
import CVEditor from './components/CVEditor';
import { calculateMatch } from './utils/matching';
import { supabase, isSupabaseConfigured } from './supabase/supabaseClient';

const INITIAL_CATEGORIES = [
  'ALL',
  'IT',
  'Energy',
  'Accounting / Accountant',
  'Agriculture',
  'Engineering',
  'Business / Administration',
  'Health'
];

const INITIAL_TYPES = [
  'ALL',
  'JOB',
  'FELLOWSHIP',
  'APPRENTICESHIP',
  'TRAINING',
  'SCHOLARSHIP',
  'INTERNSHIP',
  'ENTREPRENEURSHIP'
];

const LOCATIONS = [
  'ALL',
  'Kigali, Rwanda',
  'Eastern Province, Rwanda',
  'Northern Province, Rwanda',
  'Musanze & Huye, Rwanda',
  'All Rwanda',
  'Remote (Worldwide)'
];

const SEED_USERS = [
  {
    id: "usr-001",
    name: "Jean-Pierre Nshimiyimana",
    email: "jp.nshimi@example.com",
    role: "YOUTH",
    adminStatus: "NONE",
    phone: "+250788123456",
    active: true,
    optInCategoryAlerts: true,
    alertCategoryScope: "SELECTED", // "ALL" or "SELECTED"
    educationLevel: "Bachelor's Degree",
    fieldOfStudy: "Computer Science / Information Technology",
    skills: ["JavaScript", "React", "Node.js", "Git", "REST APIs"],
    preferredCategories: ["IT", "JOB", "INTERNSHIP"],
    preferredLocation: "Kigali, Rwanda",
    notifyWhatsApp: true,
    notifyEmail: true,
    notifySms: false,
    notificationFrequency: "IMMEDIATE"
  },
  {
    id: "usr-002",
    name: "Aline Uwase",
    email: "aline.uwase@example.com",
    role: "YOUTH",
    adminStatus: "NONE",
    phone: "+250789654321",
    active: true,
    optInCategoryAlerts: true,
    alertCategoryScope: "SELECTED",
    educationLevel: "Bachelor's Degree",
    fieldOfStudy: "Agriculture & Environmental Sciences",
    skills: ["Agroforestry", "Field Assessment", "Reporting", "Community Outreach"],
    preferredCategories: ["Agriculture", "JOB", "ENTREPRENEURSHIP"],
    preferredLocation: "Eastern Province, Rwanda",
    notifyWhatsApp: true,
    notifyEmail: true,
    notifySms: false,
    notificationFrequency: "DAILY"
  },
  {
    id: "usr-003",
    name: "Eric Mugisha",
    email: "eric.mugisha@example.com",
    role: "YOUTH",
    adminStatus: "NONE",
    phone: "+250782334455",
    active: true,
    optInCategoryAlerts: true,
    alertCategoryScope: "SELECTED",
    educationLevel: "TVET Certificate / A2 Level",
    fieldOfStudy: "Electrical Engineering & TVET",
    skills: ["Electrical Wiring", "Solar PV Systems", "Troubleshooting"],
    preferredCategories: ["Energy", "APPRENTICESHIP", "JOB"],
    preferredLocation: "Musanze & Huye, Rwanda",
    notifyWhatsApp: false,
    notifyEmail: false,
    notifySms: true,
    notificationFrequency: "WEEKLY"
  },
  {
    id: "usr-004",
    name: "Diane Ingabire",
    email: "diane.ingabire@example.com",
    role: "YOUTH",
    adminStatus: "NONE",
    phone: "+250785112233",
    active: true,
    optInCategoryAlerts: true,
    alertCategoryScope: "SELECTED",
    educationLevel: "Bachelor's Degree",
    fieldOfStudy: "Economics & Procurement",
    skills: ["Accounting", "Financial Audit", "Excel", "Compliance"],
    preferredCategories: ["Accounting / Accountant", "Business / Administration", "JOB"],
    preferredLocation: "Kigali, Rwanda",
    notifyWhatsApp: true,
    notifyEmail: true,
    notifySms: false,
    notificationFrequency: "IMMEDIATE"
  }
];

const DEFAULT_SUPER_ADMIN = {
  id: "superadmin-001",
  name: "Super Administrator",
  email: "superadmin@opportunityhub.local",
  role: "SUPER_ADMIN",
  adminStatus: "APPROVED",
  phone: "+250788999999",
  active: true,
  optInCategoryAlerts: true,
  alertCategoryScope: "ALL",
  educationLevel: "Master's Degree",
  fieldOfStudy: "Public Administration & Computer Science",
  skills: ["Platform Management", "Scraper Coordination", "Access Audit"],
  preferredCategories: ["ALL"],
  preferredLocation: "All Rwanda",
  notifyWhatsApp: true,
  notifyEmail: true,
  notifySms: false,
  notificationFrequency: "IMMEDIATE"
};

export default function App() {
  // Theme state: light or dark
  const [theme, setTheme] = useState(() => {
    try {
      const saved = localStorage.getItem('opportunityHub_theme');
      if (saved) return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch (e) {
      // ignore
    }
    return 'light';
  });

  useEffect(() => {
    try {
      localStorage.setItem('opportunityHub_theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      // ignore
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('opportunityHub_currentUser');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return null; // Guest state by default
  });

  const [activeTab, setActiveTab] = useState('opportunities');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Dynamic Categories Registry
  const [categories, setCategories] = useState(() => {
    try {
      const saved = localStorage.getItem('opportunityHub_categories');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return INITIAL_CATEGORIES;
  });

  // Dynamic Opportunity Types
  const [opportunityTypes, setOpportunityTypes] = useState(INITIAL_TYPES);

  // Registered Users Registry
  const [registeredUsers, setRegisteredUsers] = useState(() => {
    try {
      const saved = localStorage.getItem('opportunityHub_registeredUsers');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return [...SEED_USERS, DEFAULT_SUPER_ADMIN];
  });

  // Notifications Audit Log
  const [notifications, setNotifications] = useState([]);
  const [showAllNotifications, setShowAllNotifications] = useState(false);

  // Activity History Log
  const [activityHistory, setActivityHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('opportunityHub_activityHistory');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return [
      {
        id: "act-001",
        timestamp: "2026-11-23T08:30:00",
        actorId: "superadmin-001",
        actorName: "Super Administrator",
        actionType: "SYSTEM_INITIALIZED",
        details: "Independent Opportunity Hub instance initialized with $0 demo stack"
      }
    ];
  });

  // Scraper running state
  const [isScraping, setIsScraping] = useState(false);
  const [scraperStatusMsg, setScraperStatusMsg] = useState('');

  // Admin test alert state
  const [adminTestMsg, setAdminTestMsg] = useState('');

  // Guest Gate Modal state
  const [showAuthGateModal, setShowAuthGateModal] = useState(false);
  const [gateActionName, setGateActionName] = useState('access this feature');

  // Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // login, signup
  const [authEmail, setAuthEmail] = useState('');
  const [authName, setAuthName] = useState('');
  const [authPhone, setAuthPhone] = useState('');
  const [authRoleRequested, setAuthRoleRequested] = useState('YOUTH');
  const [authEduLevel, setAuthEduLevel] = useState("Bachelor's Degree");
  const [authField, setAuthField] = useState('Computer Science / Information Technology');
  const [authSkills, setAuthSkills] = useState('JavaScript, React, Node.js');
  const [authSelectedCats, setAuthSelectedCats] = useState(['IT']);
  const [authOptInCategoryAlerts, setAuthOptInCategoryAlerts] = useState(true);
  const [authAlertCategoryScope, setAuthAlertCategoryScope] = useState('SELECTED'); // "ALL" or "SELECTED"
  const [authLocation, setAuthLocation] = useState('Kigali, Rwanda');
  const [authNotifyWhatsApp, setAuthNotifyWhatsApp] = useState(true);
  const [authNotifyEmail, setAuthNotifyEmail] = useState(true);
  const [authNotifySms, setAuthNotifySms] = useState(false);
  const [authFrequency, setAuthFrequency] = useState('IMMEDIATE');
  const [authError, setAuthError] = useState('');
  const [authSuccessMsg, setAuthSuccessMsg] = useState('');

  // Search & Filters for Opportunities
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedLocation, setSelectedLocation] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [sortBy, setSortBy] = useState('MATCH');
  const [skillInput, setSkillInput] = useState('');
  const [profileSavedMsg, setProfileSavedMsg] = useState(false);

  // Applications State
  const [allApplications, setAllApplications] = useState(() => {
    try {
      const saved = localStorage.getItem('opportunityHub_applications');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      // ignore
    }
    return [
      {
        userId: "usr-001",
        jobId: 'opp-001',
        title: 'Junior Full-Stack Software Developer',
        organization: 'Irembo Ltd',
        status: 'APPLIED',
        applicationUrl: 'https://irembo.rw/careers/junior-developer',
        notes: 'Submitted customized CV on Nov 19. Awaiting interview schedule.',
        updatedAt: '2026-11-19T10:00:00'
      },
      {
        userId: "usr-002",
        jobId: 'opp-003',
        title: 'Forest Extension Officer',
        organization: 'Ministry of Public Service and Labour (MIFOTRA)',
        status: 'SAVED',
        applicationUrl: 'https://recruitment.mifotra.gov.rw',
        notes: 'Verified degree requirements for Eastern Province zone.',
        updatedAt: '2026-11-20T11:00:00'
      }
    ];
  });

  const recordActivity = (actionType, details, customActor = null) => {
    const actor = customActor || currentUser || { id: "guest", name: "Guest Visitor" };
    const newEntry = {
      id: `act-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      actorId: actor.id,
      actorName: actor.name,
      actionType,
      details
    };
    setActivityHistory(prev => {
      const updated = [newEntry, ...prev];
      try {
        localStorage.setItem('opportunityHub_activityHistory', JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });
  };

  const saveRegisteredUsers = (usersList) => {
    setRegisteredUsers(usersList);
    try {
      localStorage.setItem('opportunityHub_registeredUsers', JSON.stringify(usersList));
    } catch (e) {
      // ignore
    }
  };

  const saveCategories = (catsList) => {
    setCategories(catsList);
    try {
      localStorage.setItem('opportunityHub_categories', JSON.stringify(catsList));
    } catch (e) {
      // ignore
    }
  };

  const ensureCategoryExists = (catName) => {
    if (!catName || catName.trim() === '') return;
    const clean = catName.trim();
    if (!categories.includes(clean)) {
      const updated = [...categories, clean];
      saveCategories(updated);
      recordActivity("CATEGORY_REGISTERED", `New category registered: ${clean}`);
    }
  };

  // Load Seed / Public Data on Mount
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const applyJobs = (list) => {
        setJobs(list);
        list.forEach(item => {
          if (item.domainCategory) ensureCategoryExists(item.domainCategory);
        });
      };

      let jobsResponse;
      try {
        jobsResponse = await fetch('/data/jobs.json');
      } catch (err) {
        console.error('[Data] Network error fetching /data/jobs.json:', err);
        const fallback = getFallbackJobs();
        applyJobs(fallback);
      }

      if (jobsResponse) {
        if (!jobsResponse.ok) {
          console.error(`[Data] Fetching /data/jobs.json failed with HTTP ${jobsResponse.status}.`);
          applyJobs(getFallbackJobs());
        } else {
          try {
            const contents = await jobsResponse.text();
            if (!contents.trim()) {
              console.info('[Data] /data/jobs.json is empty; showing an intentionally empty jobs list.');
              applyJobs([]);
            } else {
              const data = JSON.parse(contents);
              const list = Array.isArray(data)
                ? data
                : data && typeof data === 'object'
                  ? Object.values(data)
                  : null;
              if (!list) throw new Error('Expected a JSON array or object of jobs.');
              if (list.length === 0) {
                console.info('[Data] /data/jobs.json contains no jobs; showing an intentionally empty jobs list.');
              }
              applyJobs(list);
            }
          } catch (err) {
            console.error('[Data] Could not read valid jobs JSON from /data/jobs.json:', err);
            applyJobs(getFallbackJobs());
          }
        }
      }

      try {
        const resNotif = await fetch('/data/notifications.json');
        if (resNotif.ok) {
          const notifs = await resNotif.json();
          setNotifications(Array.isArray(notifs) ? notifs : []);
        }
      } catch (e) {
        // ignore
      }

      setLoading(false);
    }

    loadData();
  }, []);

  const userApplications = useMemo(() => {
    if (!currentUser) return [];
    return allApplications.filter(app => app.userId === currentUser.id);
  }, [allApplications, currentUser]);

  const handleSetCurrentUser = (userToSet) => {
    setCurrentUser(userToSet);
    try {
      if (userToSet) {
        localStorage.setItem('opportunityHub_currentUser', JSON.stringify(userToSet));
      } else {
        localStorage.removeItem('opportunityHub_currentUser');
      }
    } catch (e) {
      // ignore
    }
    if (userToSet) {
      recordActivity("USER_LOGGED_IN", `User signed in: ${userToSet.name} (${userToSet.role})`, userToSet);
    }
  };

  const handleLogout = () => {
    if (currentUser) {
      recordActivity("USER_LOGGED_OUT", `User signed out: ${currentUser.name}`);
    }
    handleSetCurrentUser(null);
    setActiveTab('opportunities');
  };

  const handleApproveAdmin = (targetUserId) => {
    const updatedUsers = registeredUsers.map(u => {
      if (u.id === targetUserId) {
        return { ...u, role: 'ADMIN', adminStatus: 'APPROVED' };
      }
      return u;
    });
    saveRegisteredUsers(updatedUsers);
    const target = registeredUsers.find(u => u.id === targetUserId);
    recordActivity("ADMIN_REQUEST_APPROVED", `Super Admin approved Administrator privileges for ${target ? target.name : targetUserId}`);
  };

  const handleDenyAdmin = (targetUserId) => {
    const updatedUsers = registeredUsers.map(u => {
      if (u.id === targetUserId) {
        return { ...u, role: 'YOUTH', adminStatus: 'DENIED' };
      }
      return u;
    });
    saveRegisteredUsers(updatedUsers);
    const target = registeredUsers.find(u => u.id === targetUserId);
    recordActivity("ADMIN_REQUEST_DENIED", `Super Admin denied Administrator request for ${target ? target.name : targetUserId}`);
  };

  const checkGuestAccess = (actionLabel) => {
    if (!currentUser) {
      setGateActionName(actionLabel);
      setShowAuthGateModal(true);
      return false;
    }
    return true;
  };

  // Handle Auth submission
  const handleAuthSubmit = (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccessMsg('');

    if (authMode === 'login') {
      const cleanEmail = authEmail.trim().toLowerCase();
      if (!cleanEmail) {
        setAuthError('Please enter your email or username');
        return;
      }

      if (cleanEmail === 'superadmin' || cleanEmail.includes('superadmin')) {
        handleSetCurrentUser(DEFAULT_SUPER_ADMIN);
        setShowAuthModal(false);
        setShowAuthGateModal(false);
        setAuthEmail('');
        return;
      }

      if (cleanEmail === 'admin') {
        const approvedAdmin = registeredUsers.find(u => u.role === 'ADMIN' && u.adminStatus === 'APPROVED');
        if (approvedAdmin) {
          handleSetCurrentUser(approvedAdmin);
        } else {
          handleSetCurrentUser(DEFAULT_SUPER_ADMIN);
        }
        setShowAuthModal(false);
        setShowAuthGateModal(false);
        setAuthEmail('');
        return;
      }

      const found = registeredUsers.find(u => u.email.toLowerCase() === cleanEmail || u.name.toLowerCase().includes(cleanEmail));
      if (found) {
        if (found.role === 'ADMIN' && found.adminStatus === 'PENDING_APPROVAL') {
          setAuthError('Your Administrator account request is currently PENDING Super Administrator approval.');
          return;
        }
        handleSetCurrentUser(found);
        setShowAuthModal(false);
        setShowAuthGateModal(false);
        setAuthEmail('');
      } else {
        setAuthError('No account found with this email. Please check your spelling or register a new account.');
      }
    } else {
      // Account Creation
      if (!authName.trim()) {
        setAuthError('Please provide your full name');
        return;
      }
      if (!authEmail.trim() || !authEmail.includes('@')) {
        setAuthError('Please provide a valid email address');
        return;
      }
      if (!authPhone.trim()) {
        setAuthError('Please provide a phone number for SMS or WhatsApp alerts');
        return;
      }

      const existing = registeredUsers.find(u => u.email.toLowerCase() === authEmail.trim().toLowerCase());
      if (existing) {
        setAuthError('An account with this email address already exists. Please log in.');
        return;
      }

      const isReqAdmin = authRoleRequested === 'ADMIN';
      const newUser = {
        id: `usr-${Date.now()}`,
        name: authName.trim(),
        email: authEmail.trim().toLowerCase(),
        phone: authPhone.trim(),
        role: isReqAdmin ? 'YOUTH' : 'YOUTH',
        adminStatus: isReqAdmin ? 'PENDING_APPROVAL' : 'NONE',
        active: true,
        optInCategoryAlerts: authOptInCategoryAlerts,
        alertCategoryScope: authAlertCategoryScope,
        educationLevel: authEduLevel,
        fieldOfStudy: authField.trim() || 'General Studies',
        skills: authSkills.split(',').map(s => s.trim()).filter(Boolean),
        preferredCategories: authSelectedCats,
        preferredLocation: authLocation,
        notifyWhatsApp: authNotifyWhatsApp,
        notifyEmail: authNotifyEmail,
        notifySms: authNotifySms,
        notificationFrequency: authFrequency
      };

      const updatedList = [...registeredUsers, newUser];
      saveRegisteredUsers(updatedList);

      recordActivity(
        isReqAdmin ? "ADMIN_ACCESS_REQUESTED" : "USER_REGISTERED",
        isReqAdmin
          ? `New account created by ${newUser.name} with PENDING Administrator request`
          : `New Candidate registered: ${newUser.name} with category alerts ${authOptInCategoryAlerts ? 'enabled' : 'disabled'}`,
        newUser
      );

      if (isReqAdmin) {
        setAuthSuccessMsg('Account created successfully. Your request for Administrator privileges is PENDING approval by the Super Administrator.');
        setTimeout(() => {
          setShowAuthModal(false);
          setShowAuthGateModal(false);
          setAuthSuccessMsg('');
          setAuthEmail('');
        }, 3200);
      } else {
        handleSetCurrentUser(newUser);
        setShowAuthModal(false);
        setShowAuthGateModal(false);
        setAuthName('');
        setAuthEmail('');
        setAuthPhone('');
      }
    }
  };

  const handleSaveProfile = async (updated) => {
    handleSetCurrentUser(updated);
    const updatedRegistered = registeredUsers.map(u => u.id === updated.id ? updated : u);
    saveRegisteredUsers(updatedRegistered);

    recordActivity("PROFILE_UPDATED", `Candidate profile and alert channels updated for ${updated.name}`, updated);

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('profiles').upsert([updated]);
      } catch (err) {
        // offline fallback
      }
    }

    setProfileSavedMsg(true);
    setTimeout(() => setProfileSavedMsg(false), 2500);
  };

  const handleUpdateApplication = (updatedUserList) => {
    if (!currentUser) return;
    const otherUsersApps = allApplications.filter(a => a.userId !== currentUser.id);
    const combined = [...otherUsersApps, ...updatedUserList];
    setAllApplications(combined);
    try {
      localStorage.setItem('opportunityHub_applications', JSON.stringify(combined));
    } catch (e) {
      // ignore
    }
  };

  const handleTrackOpportunity = (job, status = 'SAVED') => {
    if (!checkGuestAccess('save or track opportunities')) return;

    const existing = userApplications.find(a => (a.jobId && a.jobId === job.id) || a.title === job.title);
    if (existing) {
      const updated = userApplications.map(a =>
        ((a.jobId && a.jobId === job.id) || a.title === job.title)
          ? { ...a, status, updatedAt: new Date().toISOString() }
          : a
      );
      handleUpdateApplication(updated);
      recordActivity("APPLICATION_STATUS_UPDATED", `Updated status to ${status} for ${job.title}`);
    } else {
      const newEntry = {
        userId: currentUser.id,
        jobId: job.id || `gen-${Date.now()}`,
        title: job.title,
        organization: job.organization || 'Direct Provider',
        status: status,
        applicationUrl: job.applicationUrl || 'https://recruitment.mifotra.gov.rw',
        notes: `Saved on ${new Date().toLocaleDateString()}. Deadline: ${job.deadline || 'Open'}`,
        updatedAt: new Date().toISOString()
      };
      handleUpdateApplication([newEntry, ...userApplications]);
      recordActivity("OPPORTUNITY_TRACKED", `Saved opportunity: ${job.title} (${status})`);
    }
  };

  const handleRemoveTracked = (jobId, title) => {
    const updated = userApplications.filter(a => a.jobId !== jobId && a.title !== title);
    handleUpdateApplication(updated);
    recordActivity("OPPORTUNITY_UNTRACKED", `Removed tracked opportunity: ${title}`);
  };

  // Dispatches alerts only to opted-in users matching category preferences
  const dispatchAlertsForOpportunities = (opportunityList) => {
    const generatedNotifs = [];
    const now = new Date().toISOString();

    opportunityList.forEach(job => {
      const jobCategory = (job.domainCategory || job.category || 'General').trim();

      registeredUsers.forEach(user => {
        if (!user.active || !user.optInCategoryAlerts) return;

        // Check category opt-in scope: ALL or matches selected categories
        const matchesCategory =
          user.alertCategoryScope === 'ALL' ||
          !user.preferredCategories ||
          user.preferredCategories.length === 0 ||
          user.preferredCategories.includes('ALL') ||
          user.preferredCategories.some(pref =>
            pref.toLowerCase() === jobCategory.toLowerCase() ||
            jobCategory.toLowerCase().includes(pref.toLowerCase())
          );

        if (!matchesCategory) return;

        const match = calculateMatch(user, job);
        if (match.score < 60.0) return;

        // Prevent duplicate alert for same user + opportunity
        const alreadyAlerted = notifications.some(
          n => n.recipient && n.recipient.includes(user.name) && (
            n.opportunityTitle === job.title ||
            [n.opportunityTitles, n.sentOpportunityTitles].some(titles => Array.isArray(titles) && titles.includes(job.title))
          )
        ) || generatedNotifs.some(
          g => g.recipient.includes(user.name) && (
            g.opportunityTitle === job.title ||
            [g.opportunityTitles, g.sentOpportunityTitles].some(titles => Array.isArray(titles) && titles.includes(job.title))
          )
        );

        if (alreadyAlerted) return;

        // Determine active channels
        const channels = [];
        if (user.notifyWhatsApp) channels.push('WHATSAPP');
        if (user.notifyEmail) channels.push('EMAIL');
        if (user.notifySms) channels.push('SMS');

        channels.forEach(ch => {
          let deliveryStatus = 'SIMULATED_SUCCESS';
          if (ch === 'WHATSAPP' && import.meta.env.SEND_LIVE_WHATSAPP === 'true') {
            deliveryStatus = 'LIVE_WHATSAPP_SENT';
          }

          generatedNotifs.push({
            id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            timestamp: now,
            channel: ch,
            recipient: `${user.name} (${ch === 'EMAIL' ? user.email : user.phone})`,
            opportunityTitle: job.title,
            organization: job.organization || 'Direct Provider',
            matchScore: match.score,
            status: deliveryStatus,
            messageSnippet: `Category match ${Math.round(match.score)}%: ${job.title} in ${jobCategory}. Delivered via ${ch}.`
          });
        });
      });
    });

    if (generatedNotifs.length > 0) {
      setNotifications(prev => [...generatedNotifs, ...prev]);
    }
    return generatedNotifs;
  };

  // Admin-Only: Run Job Scraper & Notify Matching Subscribers
  const handleRunScraperAndNotify = async () => {
    setIsScraping(true);
    setScraperStatusMsg('Connecting to public recruitment portals and checking for new listings...');

    setTimeout(() => {
      const newlyFoundJobs = [
        {
          id: `scraped-${Date.now()}-1`,
          title: "Public Health Epidemiologist",
          organization: "Rwanda Biomedical Centre (RBC)",
          category: "JOB",
          opportunityType: "JOB",
          domainCategory: "Health",
          fieldOfStudy: "Public Health & Statistics",
          requiredSkills: ["Epidemiology", "Data Analysis", "Field Survey", "Reporting"],
          educationLevel: "Bachelor's Degree",
          location: "Kigali, Rwanda",
          sourceName: "RBC Official Vacancy Feed",
          applicationUrl: "https://recruitment.mifotra.gov.rw",
          eligibilitySummary: "Rwandan national holding a degree in Epidemiology, Public Health, or Statistics. Apply through official portal.",
          status: "LIVE",
          postedDate: "Nov 23, 2026",
          deadline: "Dec 14, 2026",
          expiredAt: null,
          createdAt: new Date().toISOString()
        },
        {
          id: `scraped-${Date.now()}-2`,
          title: "Clean Cooking Energy Transition Fellow",
          organization: "Ministry of Infrastructure (MININFRA)",
          category: "FELLOWSHIP",
          opportunityType: "FELLOWSHIP",
          domainCategory: "Energy",
          fieldOfStudy: "Electrical Engineering & TVET",
          requiredSkills: ["Biomass", "Clean Energy", "Project Management", "Technical Assessment"],
          educationLevel: "Bachelor's Degree",
          location: "Musanze & Huye, Rwanda",
          sourceName: "MININFRA Energy Sector Notices",
          applicationUrl: "https://mininfra.gov.rw",
          eligibilitySummary: "12-month paid fellowship working with district energy teams on clean cooking adoption.",
          status: "LIVE",
          postedDate: "Nov 23, 2026",
          deadline: "Dec 20, 2026",
          expiredAt: null,
          createdAt: new Date().toISOString()
        },
        {
          id: `scraped-${Date.now()}-3`,
          title: "Youth Tech Apprenticeship in FinTech",
          organization: "Bank of Kigali & BK Techouse",
          category: "APPRENTICESHIP",
          opportunityType: "APPRENTICESHIP",
          domainCategory: "IT",
          fieldOfStudy: "Computer Science / Information Technology",
          requiredSkills: ["JavaScript", "React", "Mobile Development", "Git"],
          educationLevel: "Bachelor's Degree",
          location: "Kigali, Rwanda",
          sourceName: "BK Techouse Talent Portal",
          applicationUrl: "https://bk.rw/careers",
          eligibilitySummary: "Hands-on dual apprenticeship in digital banking solutions.",
          status: "LIVE",
          postedDate: "Nov 23, 2026",
          deadline: "Dec 22, 2026",
          expiredAt: null,
          createdAt: new Date().toISOString()
        }
      ];

      setJobs(prevJobs => {
        const merged = [...newlyFoundJobs, ...prevJobs];
        try {
          localStorage.setItem('opportunityHub_scrapedJobs', JSON.stringify(merged));
        } catch (e) {
          // ignore
        }
        return merged;
      });

      newlyFoundJobs.forEach(job => {
        if (job.domainCategory) ensureCategoryExists(job.domainCategory);
      });

      // Dispatch automatic alerts strictly to users opted into matching categories
      const dispatched = dispatchAlertsForOpportunities(newlyFoundJobs);

      recordActivity(
        "SCRAPER_RUN_COMPLETED",
        `Job scraper executed: 3 new listings added. ${dispatched.length} category-matched alerts dispatched to opted-in users.`
      );

      setIsScraping(false);
      setScraperStatusMsg(`Scraper complete: 3 opportunities merged, ${dispatched.length} category alerts dispatched.`);
      setTimeout(() => setScraperStatusMsg(''), 4500);
    }, 1200);
  };

  // Admin-Only: Send Admin Test Alert
  const handleSendAdminTestAlert = () => {
    const testChannel = currentUser?.notifyWhatsApp ? 'WHATSAPP' : (currentUser?.notifyEmail ? 'EMAIL' : 'SMS');
    const testRecord = {
      id: `test-${Date.now()}`,
      timestamp: new Date().toISOString(),
      channel: testChannel,
      recipient: `${currentUser.name} (${testChannel === 'EMAIL' ? currentUser.email : currentUser.phone})`,
      opportunityTitle: "Admin System Diagnostic Test Alert",
      organization: "Opportunity Hub Core",
      matchScore: 99.0,
      status: "SIMULATED_SUCCESS",
      messageSnippet: `Admin test alert verified for ${currentUser.name} on channel ${testChannel}. Category preference delivery is operational.`
    };

    setNotifications(prev => [testRecord, ...prev]);
    recordActivity("ADMIN_TEST_ALERT_SENT", `Administrator triggered test alert verification on ${testChannel}`);
    setAdminTestMsg(`Test alert logged successfully for ${currentUser.name} on ${testChannel}`);
    setTimeout(() => setAdminTestMsg(''), 4000);
  };

  // Enriched opportunities with dynamic match calculation
  const enrichedJobs = useMemo(() => {
    return jobs.map(job => {
      const match = calculateMatch(currentUser, job);
      return {
        ...job,
        matchScore: match.score,
        eligibleNote: match.eligibleNote,
        reasons: match.reasons
      };
    });
  }, [jobs, currentUser]);

  // Filtered and sorted listings
  const displayedJobs = useMemo(() => {
    return enrichedJobs
      .filter(job => {
        if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase();
          const matchTitle = (job.title || '').toLowerCase().includes(q);
          const matchOrg = (job.organization || '').toLowerCase().includes(q);
          const matchField = (job.fieldOfStudy || '').toLowerCase().includes(q);
          const matchCat = (job.domainCategory || '').toLowerCase().includes(q);
          const matchType = (job.opportunityType || '').toLowerCase().includes(q);
          const matchSkills = (job.requiredSkills || []).some(s => s.toLowerCase().includes(q));
          if (!matchTitle && !matchOrg && !matchField && !matchSkills && !matchCat && !matchType) return false;
        }

        if (selectedCategory !== 'ALL') {
          const jobCat = (job.domainCategory || '').toUpperCase();
          if (jobCat !== selectedCategory.toUpperCase()) return false;
        }

        if (selectedType !== 'ALL') {
          const jobType = (job.opportunityType || job.category || '').toUpperCase();
          if (jobType !== selectedType.toUpperCase()) return false;
        }

        if (selectedLocation !== 'ALL') {
          const loc = (job.location || '').toLowerCase();
          if (!loc.includes(selectedLocation.toLowerCase().split(',')[0])) return false;
        }

        if (statusFilter === 'ACTIVE') {
          if (job.status === 'EXPIRED') return false;
        } else if (statusFilter === 'EXPIRED') {
          if (job.status !== 'EXPIRED') return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'MATCH') {
          return b.matchScore - a.matchScore;
        }
        if (sortBy === 'NEWEST') {
          return (b.postedDate || '').localeCompare(a.postedDate || '');
        }
        if (sortBy === 'DEADLINE') {
          return (a.deadline || '').localeCompare(b.deadline || '');
        }
        return 0;
      });
  }, [enrichedJobs, searchTerm, selectedCategory, selectedType, selectedLocation, statusFilter, sortBy]);

  const recentNotifications = useMemo(() => {
    if (showAllNotifications) return notifications;
    return notifications.slice(0, 5);
  }, [notifications, showAllNotifications]);

  const userActivityHistory = useMemo(() => {
    if (!currentUser) return [];
    return activityHistory.filter(act => act.actorId === currentUser.id);
  }, [activityHistory, currentUser]);

  const userNotifications = useMemo(() => {
    if (!currentUser) return [];
    return notifications.filter(n => n.recipient && n.recipient.includes(currentUser.name));
  }, [notifications, currentUser]);

  const pendingAdminRequests = useMemo(() => {
    return registeredUsers.filter(u => u.adminStatus === 'PENDING_APPROVAL');
  }, [registeredUsers]);

  const isSuperAdmin = currentUser && currentUser.role === 'SUPER_ADMIN';
  const isAdmin = currentUser && (currentUser.role === 'ADMIN' || currentUser.role === 'SUPER_ADMIN') && currentUser.adminStatus === 'APPROVED';

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${
      theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>
      {/* Top Banner: Independent Platform Framing */}
      <div className={`px-4 py-2 border-b text-xs transition-colors duration-200 ${
        theme === 'dark'
          ? 'bg-slate-900 border-slate-800 text-slate-300'
          : 'bg-slate-900 border-slate-800 text-slate-200'
      }`}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider">Independent Prototype</span>
            <span className="font-semibold">Opportunity Hub — Rwanda Youth Opportunity Discovery & Automated Matching</span>
          </div>
          <div className="flex items-center gap-3 text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              $0 Budget Stack
            </span>
            <span>•</span>
            <span>
              {currentUser
                ? `Role: ${currentUser.role === 'SUPER_ADMIN' ? 'Super Admin' : (currentUser.role === 'ADMIN' ? 'Admin' : 'Normal User')}`
                : 'Guest Mode'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <header className={`sticky top-0 z-30 border-b backdrop-blur-md transition-colors duration-200 ${
        theme === 'dark'
          ? 'bg-slate-900/90 border-slate-800 text-slate-100'
          : 'bg-white/95 border-slate-200 text-slate-800'
      }`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xl shadow-sm">
              OH
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight leading-none">
                Opportunity <span className="text-blue-600">Hub</span>
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">
                Automated Category-Matched Alerts & Discovery
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className={`flex flex-wrap items-center gap-1 p-1.5 rounded-xl border text-xs font-semibold ${
            theme === 'dark' ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              onClick={() => setActiveTab('opportunities')}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'opportunities'
                  ? (theme === 'dark' ? 'bg-slate-900 text-blue-400 font-bold shadow-sm' : 'bg-white text-blue-700 font-bold shadow-sm')
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>Opportunities</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                theme === 'dark' ? 'bg-blue-950 text-blue-300' : 'bg-blue-100 text-blue-800'
              }`}>
                {displayedJobs.length}
              </span>
            </button>

            <button
              onClick={() => {
                if (checkGuestAccess('manage your profile and alert channels')) {
                  setActiveTab('profile');
                }
              }}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'profile'
                  ? (theme === 'dark' ? 'bg-slate-900 text-blue-400 font-bold shadow-sm' : 'bg-white text-blue-700 font-bold shadow-sm')
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>Profile & Alerts</span>
              {profileSavedMsg && (
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              )}
            </button>

            <button
              onClick={() => {
                if (checkGuestAccess('manage your application tracker')) {
                  setActiveTab('tracker');
                }
              }}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'tracker'
                  ? (theme === 'dark' ? 'bg-slate-900 text-blue-400 font-bold shadow-sm' : 'bg-white text-blue-700 font-bold shadow-sm')
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>Tracker</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                theme === 'dark' ? 'bg-indigo-950 text-indigo-300' : 'bg-indigo-100 text-indigo-800'
              }`}>
                {currentUser ? userApplications.length : 0}
              </span>
            </button>

            <button
              onClick={() => {
                if (checkGuestAccess('build and download professional CVs')) {
                  setActiveTab('cv');
                }
              }}
              className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                activeTab === 'cv'
                  ? (theme === 'dark' ? 'bg-slate-900 text-blue-400 font-bold shadow-sm' : 'bg-white text-blue-700 font-bold shadow-sm')
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <span>CV Builder</span>
            </button>

            {currentUser && !isAdmin && (
              <button
                onClick={() => setActiveTab('myhistory')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  activeTab === 'myhistory'
                    ? (theme === 'dark' ? 'bg-slate-900 text-blue-400 font-bold shadow-sm' : 'bg-white text-blue-700 font-bold shadow-sm')
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span>My Alerts</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'
                }`}>
                  {userNotifications.length}
                </span>
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
                  activeTab === 'admin'
                    ? (theme === 'dark' ? 'bg-slate-900 text-blue-400 font-bold shadow-sm' : 'bg-white text-blue-700 font-bold shadow-sm')
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <span>Admin & Health</span>
                {pendingAdminRequests.length > 0 && isSuperAdmin && (
                  <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                    {pendingAdminRequests.length}
                  </span>
                )}
              </button>
            )}
          </nav>

          {/* Controls: Light/Dark Mode Switcher & User Status */}
          <div className="flex items-center gap-2.5">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 ${
                theme === 'dark'
                  ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-750'
                  : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
              }`}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <span>{theme === 'dark' ? '☀️ Light' : '🌙 Dark'}</span>
            </button>

            {currentUser ? (
              <div className="flex items-center gap-2">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold truncate max-w-[120px]">{currentUser.name}</p>
                  <p className="text-[10px] text-slate-500">
                    {currentUser.role === 'SUPER_ADMIN' ? 'Super Admin' : (currentUser.role === 'ADMIN' ? 'Admin' : 'Normal User')}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                    theme === 'dark'
                      ? 'bg-rose-950/60 border-rose-800 text-rose-300 hover:bg-rose-900/60'
                      : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
                  }`}
                >
                  Log Out
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setAuthMode('login');
                    setShowAuthModal(true);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    setAuthMode('signup');
                    setShowAuthModal(true);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                    theme === 'dark'
                      ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                      : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Create Account
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full space-y-6">
        {/* TAB 1: OPPORTUNITIES AND MATCHES */}
        {activeTab === 'opportunities' && (
          <div className="space-y-5">
            {/* Stage Quick Presets Bar */}
            <div className={`p-3.5 rounded-2xl border transition-colors flex flex-col sm:flex-row items-center justify-between gap-3 ${
              theme === 'dark'
                ? 'bg-slate-900 border-slate-800'
                : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Live Presets:</span>
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {currentUser ? currentUser.name : 'Guest Visitor'}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap">
                {SEED_USERS.map(u => (
                  <button
                    key={u.id}
                    onClick={() => handleSetCurrentUser(u)}
                    className={`text-xs px-2.5 py-1 rounded-lg font-semibold border transition ${
                      currentUser && currentUser.id === u.id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : (theme === 'dark' ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100')
                    }`}
                  >
                    {u.name.split(' ')[0]} ({u.fieldOfStudy.split(' ')[0]})
                  </button>
                ))}
                <button
                  onClick={() => handleSetCurrentUser(DEFAULT_SUPER_ADMIN)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-semibold border transition ${
                    currentUser && currentUser.id === DEFAULT_SUPER_ADMIN.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : (theme === 'dark' ? 'bg-indigo-950/60 text-indigo-300 border-indigo-800 hover:bg-indigo-900/60' : 'bg-indigo-50 text-indigo-800 border-indigo-200 hover:bg-indigo-100')
                  }`}
                >
                  Super Admin
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className={`p-4 rounded-2xl border transition-colors space-y-3 ${
              theme === 'dark'
                ? 'bg-slate-900 border-slate-800'
                : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Search</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Title, skill, or organization"
                    className={`w-full text-xs p-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-800'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className={`w-full text-xs p-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-800'
                    }`}
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat === 'ALL' ? 'All Categories' : cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Opportunity Format</label>
                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className={`w-full text-xs p-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-800'
                    }`}
                  >
                    {opportunityTypes.map(t => (
                      <option key={t} value={t}>{t === 'ALL' ? 'All Formats' : t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Location</label>
                  <select
                    value={selectedLocation}
                    onChange={(e) => setSelectedLocation(e.target.value)}
                    className={`w-full text-xs p-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      theme === 'dark'
                        ? 'bg-slate-800 border-slate-700 text-slate-100'
                        : 'bg-slate-50 border-slate-300 text-slate-800'
                    }`}
                  >
                    {LOCATIONS.map(loc => (
                      <option key={loc} value={loc}>{loc === 'ALL' ? 'All Locations' : loc}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Sort By</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className={`w-full text-xs p-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-slate-100'
                          : 'bg-slate-50 border-slate-300 text-slate-800'
                      }`}
                    >
                      <option value="MATCH">Highest Match %</option>
                      <option value="DEADLINE">Deadline Soonest</option>
                      <option value="NEWEST">Newest Posted</option>
                    </select>
                  </div>
                  <div className="w-20">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className={`w-full text-xs p-2.5 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        theme === 'dark'
                          ? 'bg-slate-800 border-slate-700 text-slate-100'
                          : 'bg-slate-50 border-slate-300 text-slate-800'
                      }`}
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="ALL">All</option>
                      <option value="EXPIRED">Expired</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Opportunity Cards List: Crisp, Clean, Airy, No Manual Simulate Buttons */}
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mb-2"></div>
                <p className="text-xs text-slate-500">Loading verified opportunities...</p>
              </div>
            ) : displayedJobs.length === 0 ? (
              <div className={`text-center py-12 rounded-2xl border p-6 ${
                theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
              }`}>
                <h3 className="text-sm font-bold">No opportunities match this filter</h3>
                <p className="text-xs text-slate-500 mt-1">Try resetting keywords or selecting All Categories.</p>
                <button
                  onClick={() => { setSearchTerm(''); setSelectedCategory('ALL'); setSelectedType('ALL'); setSelectedLocation('ALL'); setStatusFilter('ACTIVE'); }}
                  className="mt-3 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5">
                {displayedJobs.map(job => {
                  const isTracked = userApplications.some(a => (a.jobId && a.jobId === job.id) || a.title === job.title);
                  const isHighMatch = job.matchScore >= 80;
                  const isMediumMatch = job.matchScore >= 60 && job.matchScore < 80;

                  return (
                    <div
                      key={job.id || job.title}
                      className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 ${
                        theme === 'dark'
                          ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
                          : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
                      }`}
                    >
                      {/* Left: Metadata, Title, Details */}
                      <div className="flex-1 space-y-2">
                        {/* Badges line */}
                        <div className="flex flex-wrap items-center gap-2">
                          {currentUser ? (
                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                              isHighMatch
                                ? (theme === 'dark' ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-emerald-800 border-emerald-200')
                                : isMediumMatch
                                ? (theme === 'dark' ? 'bg-blue-950/80 text-blue-300 border-blue-800' : 'bg-blue-50 text-blue-800 border-blue-200')
                                : (theme === 'dark' ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-600 border-slate-200')
                            }`}>
                              {Math.round(job.matchScore)}% Match
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                              Sign in for Match %
                            </span>
                          )}

                          <span className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                            theme === 'dark' ? 'bg-blue-950/60 text-blue-300 border-blue-900' : 'bg-blue-50 text-blue-800 border-blue-200'
                          }`}>
                            {job.domainCategory || 'General'}
                          </span>

                          <span className={`text-[11px] font-bold uppercase px-2.5 py-0.5 rounded-full border ${
                            theme === 'dark' ? 'bg-purple-950/60 text-purple-300 border-purple-900' : 'bg-purple-50 text-purple-800 border-purple-200'
                          }`}>
                            {job.opportunityType || job.category || 'JOB'}
                          </span>

                          <span className="text-xs text-slate-400 ml-auto">
                            Deadline: <strong className="text-slate-700 dark:text-slate-300">{job.deadline || 'Open'}</strong>
                          </span>
                        </div>

                        {/* Title and Organization */}
                        <div>
                          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                            {job.title}
                          </h2>
                          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-0.5 flex items-center gap-2">
                            <span>{job.organization || 'Direct Opportunity Provider'}</span>
                            <span className="text-slate-300 dark:text-slate-700">•</span>
                            <span className="text-slate-500 dark:text-slate-400">{job.location || 'Rwanda'}</span>
                          </p>
                        </div>

                        {/* Stated eligibility description */}
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-2">
                          {job.eligibilitySummary || 'Review formal terms and qualification requirements on the provider portal.'}
                        </p>

                        {/* At most 2 concise match reason chips */}
                        {currentUser && job.reasons && job.reasons.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                            {job.reasons.slice(0, 2).map((r, rIdx) => (
                              <span
                                key={rIdx}
                                className={`text-[10px] px-2 py-0.5 rounded-md font-medium border ${
                                  theme === 'dark'
                                    ? 'bg-slate-800/80 text-emerald-400 border-slate-700'
                                    : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                }`}
                              >
                                ✓ {r}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Right: Clean, Crisp Primary Actions (No manual simulate buttons) */}
                      <div className="flex md:flex-col items-stretch gap-2 min-w-[140px] pt-3 md:pt-0 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 md:pl-4 w-full md:w-auto">
                        <a
                          href={job.applicationUrl || 'https://recruitment.mifotra.gov.rw'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold text-center transition shadow-sm"
                        >
                          View & Apply ↗
                        </a>

                        <button
                          onClick={() => handleTrackOpportunity(job, isTracked ? 'APPLIED' : 'SAVED')}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                            isTracked
                              ? (theme === 'dark' ? 'bg-indigo-950 text-indigo-300 border-indigo-800' : 'bg-indigo-50 text-indigo-700 border-indigo-300')
                              : (theme === 'dark' ? 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750' : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50')
                          }`}
                        >
                          {isTracked ? '✓ Tracking' : '+ Save / Track'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MY PROFILE AND ALERTS */}
        {activeTab === 'profile' && currentUser && (
          <div className={`max-w-3xl mx-auto p-6 rounded-2xl border transition-colors space-y-6 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex justify-between items-start">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-slate-100">
                  Profile & Category Alert Preferences
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Alerts are delivered automatically upon opportunity discovery based on your opted-in categories.
                </p>
              </div>
              {profileSavedMsg && (
                <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-xs font-bold px-3 py-1 rounded-full animate-bounce">
                  Preferences Saved
                </span>
              )}
            </div>

            {/* Profile Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={currentUser.name || ''}
                  onChange={(e) => handleSaveProfile({ ...currentUser, name: e.target.value })}
                  className={`w-full text-xs p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">WhatsApp / SMS Phone</label>
                <input
                  type="text"
                  value={currentUser.phone || ''}
                  onChange={(e) => handleSaveProfile({ ...currentUser, phone: e.target.value })}
                  className={`w-full text-xs p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={currentUser.email || ''}
                  onChange={(e) => handleSaveProfile({ ...currentUser, email: e.target.value })}
                  className={`w-full text-xs p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Education Level</label>
                <select
                  value={currentUser.educationLevel || "Bachelor's Degree"}
                  onChange={(e) => handleSaveProfile({ ...currentUser, educationLevel: e.target.value })}
                  className={`w-full text-xs p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="High School / TVET A2">High School / TVET A2</option>
                  <option value="Advanced Diploma (A1)">Advanced Diploma (A1)</option>
                  <option value="Bachelor's Degree">Bachelor's Degree (A0)</option>
                  <option value="Master's Degree">Master's Degree</option>
                  <option value="Open / Any Level">Open / Any Level</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Field of Study</label>
                <input
                  type="text"
                  value={currentUser.fieldOfStudy || ''}
                  onChange={(e) => handleSaveProfile({ ...currentUser, fieldOfStudy: e.target.value })}
                  className={`w-full text-xs p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                />
              </div>

              {/* Explicit Category Alert Opt-In Box */}
              <div className={`sm:col-span-2 p-4 rounded-xl border transition-colors space-y-3 ${
                theme === 'dark' ? 'bg-slate-800/80 border-slate-700' : 'bg-blue-50/50 border-blue-200'
              }`}>
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="catOptIn"
                    checked={Boolean(currentUser.optInCategoryAlerts)}
                    onChange={(e) => handleSaveProfile({ ...currentUser, optInCategoryAlerts: e.target.checked })}
                    className="mt-1 rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                  />
                  <div>
                    <label htmlFor="catOptIn" className="text-xs font-bold text-slate-900 dark:text-slate-100 cursor-pointer">
                      Receive automatic alerts when opportunities matching your chosen categories are discovered
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Strict opt-in: Alerts are only dispatched when new listings match your category preferences and reach a 60% match score.
                    </p>
                  </div>
                </div>

                {currentUser.optInCategoryAlerts && (
                  <div className="pt-2 pl-7 space-y-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Alert Category Scope:</p>
                    <div className="flex items-center gap-4 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="alertScope"
                          value="SELECTED"
                          checked={currentUser.alertCategoryScope !== 'ALL'}
                          onChange={() => handleSaveProfile({ ...currentUser, alertCategoryScope: 'SELECTED' })}
                          className="text-blue-600"
                        />
                        <span>Only My Selected Categories</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="alertScope"
                          value="ALL"
                          checked={currentUser.alertCategoryScope === 'ALL'}
                          onChange={() => handleSaveProfile({ ...currentUser, alertCategoryScope: 'ALL' })}
                          className="text-blue-600"
                        />
                        <span>All Categories</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Alert Channel Choices with Practical Guidance */}
              <div className={`sm:col-span-2 p-4 rounded-xl border space-y-3 ${
                theme === 'dark' ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Notification Channels & Delivery Guidance
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className={`p-3 rounded-xl border transition ${
                    currentUser.notifySms
                      ? (theme === 'dark' ? 'bg-blue-950/40 border-blue-800' : 'bg-blue-50 border-blue-300')
                      : (theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200')
                  }`}>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(currentUser.notifySms)}
                        onChange={(e) => handleSaveProfile({ ...currentUser, notifySms: e.target.checked })}
                        className="mt-0.5 rounded text-blue-600"
                      />
                      <div>
                        <p className="text-xs font-bold">SMS Alerts</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                          SMS for users rarely online or with limited data.
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className={`p-3 rounded-xl border transition ${
                    currentUser.notifyWhatsApp
                      ? (theme === 'dark' ? 'bg-emerald-950/40 border-emerald-800' : 'bg-emerald-50 border-emerald-300')
                      : (theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200')
                  }`}>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(currentUser.notifyWhatsApp)}
                        onChange={(e) => handleSaveProfile({ ...currentUser, notifyWhatsApp: e.target.checked })}
                        className="mt-0.5 rounded text-emerald-600"
                      />
                      <div>
                        <p className="text-xs font-bold">WhatsApp Alerts</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                          WhatsApp for users online often who rarely check email.
                        </p>
                      </div>
                    </label>
                  </div>

                  <div className={`p-3 rounded-xl border transition ${
                    currentUser.notifyEmail
                      ? (theme === 'dark' ? 'bg-indigo-950/40 border-indigo-800' : 'bg-indigo-50 border-indigo-300')
                      : (theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200')
                  }`}>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={Boolean(currentUser.notifyEmail)}
                        onChange={(e) => handleSaveProfile({ ...currentUser, notifyEmail: e.target.checked })}
                        className="mt-0.5 rounded text-indigo-600"
                      />
                      <div>
                        <p className="text-xs font-bold">Email Digest</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                          Email for detailed opportunity summaries and links.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3">
              <button
                type="button"
                onClick={() => handleSaveProfile(currentUser)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
              >
                Save Preferences
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: APPLICATION TRACKER */}
        {activeTab === 'tracker' && currentUser && (
          <div className={`p-6 rounded-2xl border transition-colors space-y-5 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-slate-100">Application Tracker</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Private tracker for {currentUser.name}. Track deadlines, interview prep, and personal notes.
                </p>
              </div>
              <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                theme === 'dark' ? 'bg-blue-950 text-blue-300' : 'bg-blue-100 text-blue-800'
              }`}>
                {userApplications.length} Tracked
              </span>
            </div>

            {/* Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {['SAVED', 'APPLIED', 'INTERVIEW', 'OFFER', 'ARCHIVED'].map(st => {
                const count = userApplications.filter(a => a.status === st).length;
                return (
                  <div key={st} className={`p-3 rounded-xl border text-center ${
                    theme === 'dark' ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <p className="text-[10px] font-bold text-slate-500 uppercase">{st}</p>
                    <p className="text-xl font-black text-slate-800 dark:text-slate-100">{count}</p>
                  </div>
                );
              })}
            </div>

            {/* Items */}
            {userApplications.length === 0 ? (
              <div className="text-center py-10 text-slate-400">
                <p className="text-xs">No opportunities tracked yet. Click Save/Track on any listing.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {userApplications.map((app, idx) => (
                  <div
                    key={app.jobId || idx}
                    className={`p-4 rounded-xl border transition flex flex-col md:flex-row justify-between gap-3 ${
                      theme === 'dark' ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{app.title}</span>
                        <span className="text-xs text-blue-600 dark:text-blue-400">@{app.organization}</span>
                      </div>
                      <textarea
                        value={app.notes || ''}
                        onChange={(e) => {
                          const updated = userApplications.map((a, i) => i === idx ? { ...a, notes: e.target.value } : a);
                          handleUpdateApplication(updated);
                        }}
                        placeholder="Add preparation notes or interview reminder..."
                        className={`w-full text-xs p-2 rounded-lg border focus:outline-none ${
                          theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                        rows={1}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={app.status || 'SAVED'}
                        onChange={(e) => {
                          const updated = userApplications.map((a, i) => i === idx ? { ...a, status: e.target.value, updatedAt: new Date().toISOString() } : a);
                          handleUpdateApplication(updated);
                        }}
                        className={`text-xs font-bold p-1.5 rounded-lg border ${
                          theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-200' : 'bg-white border-slate-300 text-slate-800'
                        }`}
                      >
                        <option value="SAVED">Saved</option>
                        <option value="APPLIED">Applied</option>
                        <option value="INTERVIEW">Interview</option>
                        <option value="OFFER">Offer</option>
                        <option value="ARCHIVED">Archived</option>
                      </select>

                      <button
                        onClick={() => handleRemoveTracked(app.jobId, app.title)}
                        className="text-xs text-rose-500 hover:underline px-1"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: CV BUILDER */}
        {activeTab === 'cv' && currentUser && (
          <div className="space-y-4">
            <div className={`p-4 rounded-xl border text-xs flex justify-between items-center ${
              theme === 'dark' ? 'bg-blue-950/40 border-blue-900 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-900'
            }`}>
              <div>
                <p className="font-bold">Opportunity Hub Integrated CV Builder</p>
                <p className="text-[11px] opacity-80">
                  Build and export a recruiter-ready CV formatted for public sector and private industry applications.
                </p>
              </div>
            </div>
            <div className={`rounded-2xl border overflow-hidden ${
              theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <CVEditor />
            </div>
          </div>
        )}

        {/* NORMAL USER PERSONAL ALERTS TAB */}
        {activeTab === 'myhistory' && currentUser && !isAdmin && (
          <div className={`p-6 rounded-2xl border space-y-5 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
              <h2 className="text-base font-black text-slate-900 dark:text-slate-100">
                My Automatic Opportunity Alerts ({userNotifications.length})
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically dispatched whenever newly discovered listings match your opted-in categories.
              </p>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className={`uppercase text-[10px] font-bold ${
                  theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                }`}>
                  <tr>
                    <th className="p-3">Timestamp</th>
                    <th className="p-3">Channel</th>
                    <th className="p-3">Opportunity</th>
                    <th className="p-3">Match</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {userNotifications.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-4 text-center text-slate-400">
                        No alerts dispatched yet. When the scraper finds opportunities in your chosen categories, alerts appear here.
                      </td>
                    </tr>
                  ) : (
                    userNotifications.map((n, idx) => (
                      <tr key={n.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                        <td className="p-3 text-slate-500 font-mono text-[11px]">
                          {n.timestamp ? n.timestamp.split('T')[1]?.substring(0, 8) || n.timestamp : 'Recent'}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            theme === 'dark' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {n.channel}
                          </span>
                        </td>
                        <td className="p-3 font-semibold">{n.opportunityTitle}</td>
                        <td className="p-3 text-blue-600 font-bold">{Math.round(n.matchScore || 0)}%</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            theme === 'dark' ? 'bg-blue-950 text-blue-300' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {n.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: ADMIN AND HEALTH (Super Admin & Approved Admin only) */}
        {activeTab === 'admin' && isAdmin && (
          <div className={`p-6 rounded-2xl border space-y-6 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <h2 className="text-base font-black text-slate-900 dark:text-slate-100">
                  Admin Dashboard & Opportunity Scraper
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Admin-only trigger and testing controls. All normal user alert simulations are removed.
                </p>
              </div>

              {/* Admin-Only Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSendAdminTestAlert}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                    theme === 'dark' ? 'bg-slate-800 hover:bg-slate-750 text-slate-200 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                  }`}
                  title="Test delivery for administrator session"
                >
                  Send Admin Test Alert
                </button>

                <button
                  onClick={handleRunScraperAndNotify}
                  disabled={isScraping}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center gap-2"
                >
                  {isScraping ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      <span>Scraping...</span>
                    </>
                  ) : (
                    <>
                      <span>⚡</span>
                      <span>Run Job Scraper & Notify Matching Subscribers</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {scraperStatusMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs font-bold">
                {scraperStatusMsg}
              </div>
            )}

            {adminTestMsg && (
              <div className="p-3 bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 rounded-xl border border-blue-200 dark:border-blue-800 text-xs font-bold">
                {adminTestMsg}
              </div>
            )}

            {/* Pending Administrator Requests Panel (Super Admin only) */}
            {isSuperAdmin && (
              <div className={`p-4 rounded-xl border space-y-2.5 ${
                theme === 'dark' ? 'bg-amber-950/30 border-amber-900 text-amber-200' : 'bg-amber-50/70 border-amber-200 text-amber-900'
              }`}>
                <h3 className="text-xs font-black uppercase tracking-wider">
                  Pending Administrator Approval Requests ({pendingAdminRequests.length})
                </h3>

                {pendingAdminRequests.length === 0 ? (
                  <p className="text-xs opacity-75">No pending admin requests.</p>
                ) : (
                  <div className="space-y-2">
                    {pendingAdminRequests.map(req => (
                      <div key={req.id} className={`p-3 rounded-lg border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 ${
                        theme === 'dark' ? 'bg-slate-900 border-amber-900' : 'bg-white border-amber-200'
                      }`}>
                        <div>
                          <p className="text-xs font-bold">{req.name} ({req.email})</p>
                          <p className="text-[11px] text-slate-500">Phone: {req.phone} • Specialization: {req.fieldOfStudy}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApproveAdmin(req.id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold transition"
                          >
                            Approve Admin
                          </button>
                          <button
                            onClick={() => handleDenyAdmin(req.id)}
                            className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold transition"
                          >
                            Deny
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Health Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
              <div className={`p-3.5 rounded-xl border ${
                theme === 'dark' ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <p className="text-[11px] font-bold text-slate-500 uppercase">Catalog Count</p>
                <p className="text-xl font-black mt-1">{jobs.length}</p>
                <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                  {jobs.filter(j => j.status !== 'EXPIRED').length} Active Listings
                </p>
              </div>

              <div className={`p-3.5 rounded-xl border ${
                theme === 'dark' ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <p className="text-[11px] font-bold text-slate-500 uppercase">Subscribers</p>
                <p className="text-xl font-black mt-1">{registeredUsers.length}</p>
                <p className="text-[11px] text-blue-600 font-semibold mt-0.5">
                  {registeredUsers.filter(u => u.optInCategoryAlerts).length} Opted into Category Alerts
                </p>
              </div>

              <div className={`p-3.5 rounded-xl border ${
                theme === 'dark' ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <p className="text-[11px] font-bold text-slate-500 uppercase">Categories</p>
                <p className="text-xl font-black mt-1">{categories.length - 1}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Dynamic auto-registration</p>
              </div>

              <div className={`p-3.5 rounded-xl border ${
                theme === 'dark' ? 'bg-slate-800/60 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <p className="text-[11px] font-bold text-slate-500 uppercase">Twilio Mode</p>
                <p className="text-base font-black mt-1">SIMULATED ($0)</p>
                <p className="text-[11px] text-slate-500 mt-0.5">Guarded behind opt-in flag</p>
              </div>
            </div>

            {/* Zero-Cost Notification Audit Trail */}
            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Automatic Notification Audit Trail ({notifications.length})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Audit log of automatic and test alerts dispatched to matching candidates.
                  </p>
                </div>

                <button
                  onClick={() => setShowAllNotifications(!showAllNotifications)}
                  className={`px-2.5 py-1 text-xs border rounded-lg font-medium ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-slate-100 border-slate-300 text-slate-700'
                  }`}
                >
                  {showAllNotifications ? 'Show Recent 5' : `Show All (${notifications.length})`}
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className={`uppercase text-[10px] font-bold ${
                    theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-600'
                  }`}>
                    <tr>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Channel</th>
                      <th className="p-3">Recipient</th>
                      <th className="p-3">Opportunity</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {recentNotifications.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-slate-400">
                          No notifications logged yet. Run Job Scraper to automatically trigger alerts for matching subscribers.
                        </td>
                      </tr>
                    ) : (
                      recentNotifications.map((n, idx) => (
                        <tr key={n.id || idx} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                          <td className="p-3 text-slate-500 font-mono text-[11px]">
                            {n.timestamp ? n.timestamp.split('T')[1]?.substring(0, 8) || n.timestamp : 'Recent'}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              theme === 'dark' ? 'bg-emerald-950 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            }`}>
                              {n.channel}
                            </span>
                          </td>
                          <td className="p-3 font-semibold">{n.recipient}</td>
                          <td className="p-3">
                            <span>{n.opportunityTitle}</span>
                            <span className="ml-1 text-blue-600 font-bold">({Math.round(n.matchScore || 0)}%)</span>
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              theme === 'dark' ? 'bg-blue-950 text-blue-300' : 'bg-blue-100 text-blue-800'
                            }`}>
                              {n.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Guest Action Lock / Interactive Auth Gate Modal */}
      {showAuthGateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`p-6 rounded-2xl border max-w-sm w-full shadow-2xl text-center space-y-4 ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              🔒
            </div>
            <div>
              <h3 className="text-base font-black">Sign In Required</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Opportunity discovery is open to all visitors. Please create a free candidate account or sign in to {gateActionName}.
              </p>
            </div>
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  setShowAuthGateModal(false);
                  setAuthMode('signup');
                  setShowAuthModal(true);
                }}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
              >
                Create Free Candidate Account
              </button>
              <button
                onClick={() => {
                  setShowAuthGateModal(false);
                  setAuthMode('login');
                  setShowAuthModal(true);
                }}
                className={`w-full py-2 rounded-xl text-xs font-bold border transition ${
                  theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Sign In with Existing Account
              </button>
            </div>
            <button
              onClick={() => setShowAuthGateModal(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Continue Browsing as Guest
            </button>
          </div>
        </div>
      )}

      {/* Authentication Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`p-6 rounded-2xl border max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto ${
            theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-100' : 'bg-white border-slate-200 text-slate-800'
          }`}>
            <div className="flex justify-between items-center border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-black">
                  {authMode === 'login' ? 'Sign In to Opportunity Hub' : 'Create Free Opportunity Account'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {authMode === 'login' ? 'Enter credentials or select a stage preset' : 'Set your skills and category alert preference'}
                </p>
              </div>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            {/* Error or Success Notice */}
            {authError && (
              <p className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-950/60 dark:text-rose-300 p-2.5 rounded-lg border border-rose-200 dark:border-rose-900 font-medium">
                {authError}
              </p>
            )}
            {authSuccessMsg && (
              <p className="text-xs text-emerald-800 bg-emerald-50 dark:bg-emerald-950/60 dark:text-emerald-300 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900 font-medium">
                {authSuccessMsg}
              </p>
            )}

            {/* Form */}
            <form onSubmit={handleAuthSubmit} className="space-y-3">
              {authMode === 'signup' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={authName}
                      onChange={(e) => setAuthName(e.target.value)}
                      placeholder="e.g. Jean Pierre Nshimiyimana"
                      className={`w-full text-xs p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-800'
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Phone Number (Required for SMS/WhatsApp)</label>
                    <input
                      type="text"
                      value={authPhone}
                      onChange={(e) => setAuthPhone(e.target.value)}
                      placeholder="+250788000000"
                      className={`w-full text-xs p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-800'
                      }`}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Email Address (Required)</label>
                <input
                  type="text"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="e.g. candidate@example.com or admin"
                  className={`w-full text-xs p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                    theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                />
              </div>

              {authMode === 'signup' && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Education Level</label>
                      <select
                        value={authEduLevel}
                        onChange={(e) => setAuthEduLevel(e.target.value)}
                        className={`w-full text-xs p-2 border rounded-lg ${
                          theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
                        }`}
                      >
                        <option value="High School / TVET A2">High School / TVET A2</option>
                        <option value="Advanced Diploma (A1)">Advanced Diploma (A1)</option>
                        <option value="Bachelor's Degree">Bachelor's Degree</option>
                        <option value="Master's Degree">Master's Degree</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Account Role</label>
                      <select
                        value={authRoleRequested}
                        onChange={(e) => setAuthRoleRequested(e.target.value)}
                        className={`w-full text-xs p-2 border rounded-lg font-semibold ${
                          theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
                        }`}
                      >
                        <option value="YOUTH">Normal User (Youth Candidate)</option>
                        <option value="ADMIN">Administrator (Pending Super Admin Approval)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Field of Study</label>
                    <input
                      type="text"
                      value={authField}
                      onChange={(e) => setAuthField(e.target.value)}
                      placeholder="e.g. Computer Science, Accounting, Agriculture"
                      className={`w-full text-xs p-2 border rounded-lg ${
                        theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-800'
                      }`}
                    />
                  </div>

                  {/* Explicit Category Alert Opt-In in Signup */}
                  <div className={`p-3 rounded-xl border space-y-2 ${
                    theme === 'dark' ? 'bg-slate-800/80 border-slate-700' : 'bg-blue-50/60 border-blue-200'
                  }`}>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={authOptInCategoryAlerts}
                        onChange={(e) => setAuthOptInCategoryAlerts(e.target.checked)}
                        className="mt-0.5 rounded text-blue-600"
                      />
                      <div>
                        <span className="text-xs font-bold">Receive automatic alerts for opportunities matching your categories</span>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Alerts are dispatched only for matching categories with match score 60% or higher.
                        </p>
                      </div>
                    </label>

                    {authOptInCategoryAlerts && (
                      <div className="pl-6 pt-1 flex items-center gap-4 text-xs">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="signupScope"
                            value="SELECTED"
                            checked={authAlertCategoryScope !== 'ALL'}
                            onChange={() => setAuthAlertCategoryScope('SELECTED')}
                          />
                          <span>My Chosen Categories</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="radio"
                            name="signupScope"
                            value="ALL"
                            checked={authAlertCategoryScope === 'ALL'}
                            onChange={() => setAuthAlertCategoryScope('ALL')}
                          />
                          <span>All Categories</span>
                        </label>
                      </div>
                    )}
                  </div>

                  {/* Channels & Guidance */}
                  <div className={`p-3 rounded-xl border space-y-2 ${
                    theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <p className="text-[10px] font-bold uppercase text-slate-500">Alert Channels & Guidance:</p>

                    <label className="flex items-start gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={authNotifySms}
                        onChange={(e) => setAuthNotifySms(e.target.checked)}
                        className="mt-0.5 rounded text-blue-600"
                      />
                      <div>
                        <span className="font-semibold">SMS Alerts</span>
                        <p className="text-[10px] text-slate-500">SMS for users rarely online or with limited data.</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={authNotifyWhatsApp}
                        onChange={(e) => setAuthNotifyWhatsApp(e.target.checked)}
                        className="mt-0.5 rounded text-emerald-600"
                      />
                      <div>
                        <span className="font-semibold">WhatsApp Alerts</span>
                        <p className="text-[10px] text-slate-500">WhatsApp for users online often who rarely check email.</p>
                      </div>
                    </label>

                    <label className="flex items-start gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={authNotifyEmail}
                        onChange={(e) => setAuthNotifyEmail(e.target.checked)}
                        className="mt-0.5 rounded text-indigo-600"
                      />
                      <div>
                        <span className="font-semibold">Email Digest</span>
                        <p className="text-[10px] text-slate-500">Email for detailed opportunity summaries and links.</p>
                      </div>
                    </label>
                  </div>
                </>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
              >
                {authMode === 'login' ? 'Sign In' : 'Register Account'}
              </button>
            </form>

            <div className="flex justify-between items-center text-xs text-slate-500 border-t border-slate-200 dark:border-slate-800 pt-3">
              <button
                onClick={() => {
                  setAuthMode(authMode === 'login' ? 'signup' : 'login');
                  setAuthError('');
                  setAuthSuccessMsg('');
                }}
                className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
              >
                {authMode === 'login' ? 'New here? Create account' : 'Already have an account? Sign in'}
              </button>
              <button
                onClick={() => setShowAuthModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clean Footer */}
      <footer className={`border-t py-4 px-4 text-center text-xs transition-colors duration-200 ${
        theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-500'
      }`}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <p>© 2026 Opportunity Hub — Independent Youth Opportunity Discovery & Automated Matching Platform.</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            $0 Budget Architecture • Category-Matched Delivery • Light / Dark Mode
          </p>
        </div>
      </footer>
    </div>
  );
}

function getFallbackJobs() {
  return [
    {
      id: "opp-001",
      title: "Junior Full-Stack Software Developer",
      organization: "Irembo Ltd",
      category: "JOB",
      opportunityType: "JOB",
      domainCategory: "IT",
      fieldOfStudy: "Computer Science / Information Technology",
      requiredSkills: ["JavaScript", "React", "Node.js", "REST APIs", "Git"],
      educationLevel: "Bachelor's Degree",
      location: "Kigali, Rwanda",
      sourceName: "Irembo Careers",
      applicationUrl: "https://irembo.rw/careers/junior-developer",
      eligibilitySummary: "Early-career youth with practical knowledge of JavaScript, modern frontend libraries, and API integration.",
      status: "LIVE",
      postedDate: "Nov 15, 2026",
      deadline: "Dec 10, 2026"
    },
    {
      id: "opp-003",
      title: "Forest Extension Officer",
      organization: "Ministry of Public Service and Labour (MIFOTRA)",
      category: "JOB",
      opportunityType: "JOB",
      domainCategory: "Agriculture",
      fieldOfStudy: "Agriculture & Environmental Sciences",
      requiredSkills: ["Agroforestry", "Community Outreach", "Reporting", "Field Assessment"],
      educationLevel: "Bachelor's Degree",
      location: "Eastern Province, Rwanda",
      sourceName: "MIFOTRA e-Recruitment",
      applicationUrl: "https://recruitment.mifotra.gov.rw",
      eligibilitySummary: "Rwandan national holding a relevant qualification in forestry or natural resources management.",
      status: "LIVE",
      postedDate: "Nov 18, 2026",
      deadline: "Nov 26, 2026"
    },
    {
      id: "opp-004",
      title: "Solar Energy Systems Installation Apprenticeship",
      organization: "Rwanda TVET Board (RTB) & Energy Development Corp",
      category: "APPRENTICESHIP",
      opportunityType: "APPRENTICESHIP",
      domainCategory: "Energy",
      fieldOfStudy: "Electrical Engineering & TVET",
      requiredSkills: ["Electrical Wiring", "Solar PV Systems", "Troubleshooting"],
      educationLevel: "TVET Certificate / A2 Level",
      location: "Musanze & Huye, Rwanda",
      sourceName: "RTB Dual Apprenticeship Scheme",
      applicationUrl: "https://rtb.gov.rw/dual-training",
      eligibilitySummary: "Dual training apprenticeship combining technical instruction with on-site solar installation.",
      status: "LIVE",
      postedDate: "Nov 05, 2026",
      deadline: "Dec 12, 2026"
    },
    {
      id: "opp-005",
      title: "Senior Accountant & Financial Auditor",
      organization: "Rwanda Revenue Authority (RRA) / Partner Network",
      category: "JOB",
      opportunityType: "JOB",
      domainCategory: "Accounting / Accountant",
      fieldOfStudy: "Economics & Procurement",
      requiredSkills: ["Accounting", "Financial Audit", "Tax Compliance", "Excel", "Reporting"],
      educationLevel: "Bachelor's Degree",
      location: "Kigali, Rwanda",
      sourceName: "Public Financial Careers",
      applicationUrl: "https://recruitment.mifotra.gov.rw",
      eligibilitySummary: "Bachelor degree in Accounting or Finance. Handles ledger balancing and statutory reporting.",
      status: "LIVE",
      postedDate: "Nov 20, 2026",
      deadline: "Dec 15, 2026"
    }
  ];
}