/**
 * Ana Petrova — the CV from Ana_Petrova_CV.pdf, in the app's own CvData shape
 * (src/lib/cv-types.ts). Seeded into localStorage by the live harnesses so the
 * real app renders it, rather than a copy of the template.
 */
export const ana = {
  fullName: 'Ana Petrova',
  title: 'Licensed Clinical Social Worker & Human-AI Interaction Specialist',
  summary:
    'Ana is a licensed clinical social worker with more than five years of direct client practice and deep experience in qualitative research and human-computer interaction. She elicits missing context from diverse populations, synthesizes social, psychological, and practical factors to shape personalized recommendations. Recent work involved designing and running AI evaluation pilots that test language model alignment with user context. She pairs analytical rigor with empathetic communication, delivering clear feedback and actionable insights. Fluent in English and comfortable collaborating across Latin America, Southeast Europe, Asia, and Africa.',
  experience: [
    {
      id: 'e1',
      role: 'Text Situated Alignment Specialist — BA (Contract)',
      company: 'Turing AI Labs',
      location: 'Sofia, Bulgaria',
      startDate: '2023-09',
      endDate: 'Present',
      bullets: [
        'Worked with AI research engineers to create evaluation scenarios that add social context before user requests, raising model relevance 27%.',
        'Assessed language model responses for relevance, usefulness, personalization, clarity and alignment, reaching 92% inter-rater reliability.',
        'Wrote detailed feedback that explained rating rationale, cutting ambiguity in later model fine-tuning cycles.',
        'Led weekly debriefs with multidisciplinary teams, refining project guidelines and keeping the timeline on track.',
        'Synthesized qualitative coding of model interactions, spotting key context cues that lifted recommendation accuracy 18%.',
        'Built a structured case review workflow, slashing data entry time 35% while preserving documentation standards.',
      ],
    },
    {
      id: 'e2',
      role: 'Licensed Clinical Social Worker',
      company: 'Global Health Services',
      location: 'Sofia, Bulgaria',
      startDate: '2020-06',
      endDate: '2023-08',
      bullets: [
        'Delivered individual counseling to more than 350 clients, achieving a 94% satisfaction rating.',
        'Elicited missing context in intake interviews, boosting treatment planning completeness 22%.',
        'Authored case notes with structured qualitative coding, enabling cross-team analysis of psychosocial factors.',
        'Ran multidisciplinary case conferences that wove biological, psychological, social and spiritual dimensions together.',
        'Implemented a resource-mapping tool, linking 78 clients to financial and educational support services.',
        'Mentored junior social workers in client-centered communication, lifting team productivity 15%.',
      ],
    },
    {
      id: 'e3',
      role: 'Qualitative Researcher & HCI Consultant',
      company: 'TechInsights Lab',
      location: 'Sofia, Bulgaria',
      startDate: '2018-01',
      endDate: '2020-05',
      bullets: [
        'Conducted mixed-methods studies on user interaction with conversational agents, shaping design recommendations for four AI prototypes.',
        'Created interview protocols that revealed hidden user needs, raising identified pain points 31%.',
        'Analyzed transcripts in Nvivo, generating thematic models that guided product roadmaps.',
        'Presented findings to engineering and product teams, turning qualitative insights into actionable UI changes.',
        'Co-created a contextual scenario library used in usability testing for three multinational projects.',
        'Managed project timelines and deliverables, meeting milestones 10% ahead of schedule.',
      ],
    },
  ],
  education: [
    {
      id: 'd1',
      degree: 'Master of Social Work (MSW) – Licensed Clinical Social Worker (LCSW)',
      institution: 'University of Sofia – Faculty of Social Sciences',
      location: 'Sofia, Bulgaria',
      startDate: '2015-09',
      endDate: '2018-06',
      details:
        'Thesis: "Contextual Factors in Client Engagement: A Qualitative Study of Social Work Practice", GPA 3.9/4.0.',
    },
    {
      id: 'd2',
      degree: 'Bachelor of Arts in Psychology',
      institution: 'University of Sofia – Faculty of Philosophy',
      location: 'Sofia, Bulgaria',
      startDate: '2011-09',
      endDate: '2015-06',
      details: 'Thesis: "Self-Efficacy and Help-Seeking Behaviour", GPA 3.7/4.0.',
    },
  ],
  skills: [
    { id: 's1', category: 'Clinical Practice', items: ['Licensed Clinical Social Worker (LCSW)', 'Client intake & assessment', 'Context elicitation techniques', 'Crisis intervention', 'Resource navigation', 'Multidisciplinary case coordination'] },
    { id: 's2', category: 'Qualitative Research', items: ['Interview protocol design', 'Thematic analysis', 'NVivo & ATLAS.ti coding', 'Case review synthesis', 'Structured feedback generation', 'Mixed-methods reporting'] },
    { id: 's3', category: 'Human-AI Interaction', items: ['Evaluation pilot design', 'Language model alignment assessment', 'Social context scenario creation', 'Relevance & personalization metrics', 'Feedback loop documentation', 'User-centric AI testing'] },
    { id: 's4', category: 'Data Analysis & Project Management', items: ['Statistical significance testing', 'Inter-rater reliability calculation', 'Timeline & milestone tracking', 'Agile sprint coordination', 'Stakeholder communication', 'Process optimization'] },
    { id: 's5', category: 'Communication & Coaching', items: ['Active listening', 'Motivational interviewing', 'Cross-cultural counseling', 'Professional writing & documentation', 'Team facilitation', 'Training & mentorship'] },
  ],
  projects: [
    { id: 'p1', title: 'AI Contextual Alignment Pilot', subtitle: 'Turing AI Labs – Human-AI Interaction Evaluation', date: '2023-09 to Present', description: 'Designed and ran a short-term pilot to test if providing social context before user requests improves language model recommendations. Created realistic social scenarios, carried out systematic evaluations, and delivered detailed feedback that guided model fine-tuning.' },
    { id: 'p2', title: 'Resource-Mapping Platform for Underserved Communities', subtitle: 'Global Health Services', date: '2021-03 to 2022-11', description: 'Built a web-based tool that matched client needs with local financial, educational and health resources, cutting referral time 35% and raising service uptake 28%.' },
  ],
  certifications: [
    { id: 'c1', title: 'Licensed Clinical Social Worker (LCSW)', subtitle: 'Bulgarian Ministry of Health', date: '2019-07', description: 'State-licensed professional credential permitting independent clinical practice.' },
    { id: 'c2', title: 'Certified Qualitative Researcher (CQR)', subtitle: 'International Institute for Qualitative Methods', date: '2020-11', description: 'Validated expertise in designing, coding, and interpreting qualitative data.' },
  ],
  awards: [
    { id: 'a1', title: 'Outstanding Service Award', subtitle: 'Global Health Services', date: '2022-12', description: 'Recognized for exceptional client outcomes and an innovative resource-mapping initiative.' },
  ],
  languages: [
    { id: 'l1', name: 'English', level: 'Fluent' },
    { id: 'l2', name: 'Bulgarian', level: 'Native' },
    { id: 'l3', name: 'Spanish', level: 'Intermediate' },
  ],
  volunteer: [
    { id: 'v1', title: 'Community Mental Health Volunteer', subtitle: 'Sofia Open Care Initiative', date: '2018-04 to 2020-12', description: 'Provided pro-bono counseling sessions and led group workshops on stress management for underserved populations.' },
  ],
  references: [
    { id: 'r1', title: 'Dr. Elena Markov', subtitle: 'Director, Global Health Services', description: 'Available upon request.' },
  ],
}

export const SEED = JSON.stringify({
  data: ana,
  settings: { template: 'modern', accent: '#1F4E79', fontScale: 1 },
})

/**
 * A deliberately awkward CV for stressing pagination.
 *
 * The failure mode: a heading that must keep with what follows, where that
 * next block is TALL and unsplittable (a big skills group, a long bullet).
 * The reservation for "what follows" is then larger than the space left, so
 * the heading AND its block both jump to the next page and the remainder of
 * the current one is left blank. Real CVs hit this with dense skill lists and
 * wordy bullets.
 */
export const stressCv = {
  fullName: 'Ana Petrova',
  title: 'Licensed Clinical Social Worker & Human-AI Interaction Specialist',
  summary:
    'Ana is a licensed clinical social worker with more than five years of direct client practice and deep experience in qualitative research and human-computer interaction. She elicits missing context from diverse populations, synthesizes social, psychological, and practical factors to shape personalized recommendations. Recent work involved designing and running AI evaluation pilots that test language model alignment with user context.',
  experience: [
    {
      id: 'e1',
      role: 'Text Situated Alignment Specialist — BA (Contract)',
      company: 'Turing AI Labs',
      location: 'Sofia, Bulgaria',
      startDate: '2023-09',
      endDate: 'Present',
      bullets: [
        'Worked with AI research engineers to create evaluation scenarios that add social context before user requests, raising model relevance 27%.',
        'Owned the end-to-end evaluation programme: designed the rubric, ran the pilot across four model families, and wrote the findings that guided two rounds of fine-tuning, while also mentoring two junior colleagues through the same pipeline and keeping the workstream inside its quarterly budget.',
        'Wrote detailed feedback that explained rating rationale, cutting ambiguity in later model fine-tuning cycles.',
        'Led weekly debriefs with multidisciplinary teams, refining project guidelines and keeping the timeline on track.',
      ],
    },
    {
      id: 'e2',
      role: 'Licensed Clinical Social Worker',
      company: 'Global Health Services',
      location: 'Sofia, Bulgaria',
      startDate: '2020-06',
      endDate: '2023-08',
      bullets: [
        'Delivered individual counseling to more than 350 clients, achieving a 94% satisfaction rating.',
        'Elicited missing context in intake interviews, boosting treatment planning completeness 22%.',
        'Authored case notes with structured qualitative coding, enabling cross-team analysis of psychosocial factors.',
        'Implemented a resource-mapping tool, linking 78 clients to financial and educational support services.',
      ],
    },
  ],
  education: [
    {
      id: 'd1',
      degree: 'Master of Social Work (MSW) – Licensed Clinical Social Worker (LCSW)',
      institution: 'University of Sofia – Faculty of Social Sciences',
      location: 'Sofia, Bulgaria',
      startDate: '2015-09',
      endDate: '2018-06',
      details: 'Thesis: "Contextual Factors in Client Engagement", GPA 3.9/4.0.',
    },
  ],
  // One very large group: a skills list this long renders as a single
  // unsplittable block ~half a page tall, which is what strands a page.
  skills: [
    {
      id: 's1',
      category: 'Clinical Practice',
      items: [
        'Licensed Clinical Social Worker (LCSW)', 'Client intake & assessment',
        'Context elicitation techniques', 'Crisis intervention',
        'Resource navigation', 'Multidisciplinary case coordination',
        'Trauma-informed care planning', 'Safeguarding and risk assessment',
        'Motivational interviewing', 'Cognitive behavioural techniques',
        'Relapse prevention planning', 'Group facilitation',
        'Discharge planning', 'Family systems work',
        'Documentation to regulatory standard', 'Inter-agency referrals',
        'Adoption and foster care practice', 'Domestic abuse response',
        'Child protection casework', 'Mental health triage',
        'Substance misuse counselling', 'Dementia care planning',
        'Palliative care support', 'HIV counselling',
        'LGBTQ+ affirming practice', 'Disability assessment',
        'Care coordination', 'Clinical supervision',
        'Reflective practice', 'Evidence-based interventions',
        'Service design for clinics', 'Quality improvement',
        'Patient advocacy', 'Health literacy coaching',
        'Wound care basics', 'Pain management',
        'Sleep hygiene coaching', 'Stress management',
        'Grief and loss support', 'Anger management',
        'Conflict resolution', 'Medication adherence support',
        'Sexual health advice', 'Contraception counselling',
        'Reproductive health support', 'Menopause support',
        'Weight management coaching', 'Smoking cessation',
      ],
    },
    {
      id: 's2',
      category: 'Research, Data and Technology',
      items: [
        'Interview protocol design', 'Thematic analysis',
        'NVivo & ATLAS.ti coding', 'Case review synthesis',
        'Structured feedback generation', 'Mixed-methods reporting',
      ],
    },
  ],
  projects: [
    {
      id: 'p1',
      title: 'AI Contextual Alignment Pilot',
      subtitle: 'Turing AI Labs',
      date: '2023-09 to Present',
      description: 'Designed and ran a short-term pilot to test if providing social context before user requests improves language model recommendations.',
    },
  ],
  certifications: [],
  awards: [],
  languages: [
    { id: 'l1', name: 'English', level: 'Fluent' },
    { id: 'l2', name: 'Bulgarian', level: 'Native' },
  ],
  volunteer: [],
  references: [{ id: 'r1', title: 'Dr. Elena Markov', subtitle: 'Director', description: 'Available upon request.' }],
}

export const STRESS_SEED = JSON.stringify({
  data: stressCv,
  settings: { template: 'minimal', accent: '#1F4E79', fontScale: 1 },
})

