import { ResumeContent } from './types'

export const mockResumeData: ResumeContent = {
  basics: {
    name: 'MAITREYA GOKHALE',
    headline: 'Mechanical Design Engineer | 6+ Years | NPI & End-to-End Product Development',
    email: 'mngokhale89@gmail.com',
    phone: '+91 940447 9387',
    location: '',
    website: '',
    picture: '',
  },
  summary:
    'Design and Manufacturing Engineer driving end to end product development across Home Appliances and Industrial Turbine Pump platforms, with proven expertise in plastic components, sheet metal, and castings, spanning chassis architecture, system packaging, design validation. Proficient in Ansys, UG NX, Creo Parametric, SolidWorks, CATIA, ANSYS, GD&T (ASME Y14.5), DFMEA, DFM/DFA, tolerance analysis (CETOL), and PLM (Windchill). Demonstrated impact in VAVE-driven cost reduction, V&V execution, and cross-functional leadership across Design, Quality, and Manufacturing, with growing capability in Python automation, AI-powered design tools, and digital workflows to accelerate productivity across NPI and sustaining programs.',
  experience: [
    {
      id: '1',
      company: 'Whirlpool Corporation',
      position: 'Mechanical Engineer NPD',
      startDate: 'Jul 2023',
      endDate: 'Present',
      summary:
        'End-to-End NPI Ownership - Led 6+ full-cycle programs (concept to DV to PV to SOP) across chassis, packaging, and system design via Creo and Windchill PLM; managed vendor prototyping schedules and coordinated ECR/ECO across operations, quality, and product design\n\nDesign Validation & V&V - Built FEA and thermal CFD digital twin framework; validated builds via rapid prototyping (PLA, SLA, ABS/FDM) for form, fit, and function; supported CMM-based dimensional validation and metrology workflows; reduced DV cycle 6 to 3 months, cut physical test iterations by 40%\n\nThermal Architecture - Developed ventilation concepts for built-in oven airflow, maintaining cabinet temps <65C; thermal CAE eliminated 40% empirical re-runs\n\nVAVE and Cost Optimization - Eliminated $3/unit material cost, ~$3M annual savings across 1M+ units; delivered additional $600K via VAVE initiatives\n\nDFMEA and Risk Mitigation - Reduced part complexity by 27% across 50+ SKUs, prevented approximately $1M product exchange exposure\n\nDFM/DFA and Manufacturability - Partnered with tooling, manufacturing, and quality teams across plastic components and sheet metal assemblies\n\nData-Driven Digital Design & AI Integration - Automated collection and structuring of field sensor data via vendor API using Python and VBA. Applied LLM-based workflows using GPT-4o mini and OpenRouter to convert raw measurements into actionable design recommendations.',
    },
    {
      id: '2',
      company: 'Whirlpool Corporation',
      position: 'CAE Engineer',
      startDate: 'Sep 2022',
      endDate: 'Jul 2023',
      summary:
        'Structural FEA & Simulation Validation - Executed structural FEA on refrigeration chassis; drove DTC and early-stage VE decisions; developed hyperelastic silicone material models improving simulation-to-test correlation\n\nMeasurement System Design & V&V - Engineered extraction force validation jig for glass trim assembly; standardized across DV gates and ECR/ECO change workflows',
    },
    {
      id: '3',
      company: 'Chinmay Infra',
      position: 'Mechanical Engineer',
      startDate: 'Jun 2020',
      endDate: 'Jul 2021',
      summary:
        'End-to-End Product Development - Owned full system design (concept to build to validation) for automated hydraulic machinery; delivered 150-ton hydraulic press at Rs. 14.75L vs Rs. 25L benchmark, 41% under cost target\n\nSystem Integration and Design Validation - Integrated mechanical, hydraulic, and control systems; applied GD&T, DFMEA, DFM/DFA',
    },
    {
      id: '4',
      company: 'Aditya Hydrotech',
      position: 'Associate Engineer (NPD/VAVE)',
      startDate: 'Jun 2019',
      endDate: 'Jun 2020',
      summary:
        'Product Design and Development - Designed and released VT pump assemblies (250 to 2500 HP); managed full lifecycle from concept to drawing release\n\nDFM/DFA and Cost Optimization - Eliminated in-house machining via external sourcing; reduced cost, lead time, and rejection risk\n\nField Validation and Commissioning - Performed hydraulic selection analysis; led overhaul of 20+-year-old VT pump installations',
    },
  ],
  education: [
    {
      id: '1',
      institution: 'Walchand College of Engineering',
      studyType: 'M.Tech',
      area: 'Design Engineering',
      startDate: '2021',
      endDate: '2023',
    },
    {
      id: '2',
      institution: 'Shivaji University',
      studyType: 'B.E.',
      area: 'Mechanical Engineering | First Class | Member, SAE BAJA Team',
      startDate: '2015',
      endDate: '2019',
    },
  ],
  skills: [
    {
      id: '1',
      name: 'CAD',
      level: 'Expert',
      keywords: [
        'Siemens NX (certified)',
        'Creo Parametric (certified)',
        'Creo Direct',
        'SolidWorks (certified)',
        'CATIA',
        'AutoCAD',
      ],
    },
    {
      id: '2',
      name: 'CAE / Simulation',
      level: 'Expert',
      keywords: ['ANSYS Workbench', 'HyperMesh', 'FEA (structural + thermal)', 'LS-DYNA (exposure)'],
    },
    {
      id: '3',
      name: 'Methods',
      level: 'Expert',
      keywords: ['GD&T (ASME Y14.5 & ISO)', 'tolerance stack-up', 'DFMEA', 'DFM/DFA', 'CETOL'],
    },
    {
      id: '4',
      name: 'PLM',
      level: 'Expert',
      keywords: ['Windchill (design data management, ECR/ECO workflows)'],
    },
    {
      id: '5',
      name: 'Languages / Automation',
      level: 'Intermediate',
      keywords: ['Python (engineering analysis, automation)', 'MATLAB', 'VBA', 'JavaScript', 'Node.js'],
    },
    {
      id: '6',
      name: 'Digital Design',
      level: 'Intermediate',
      keywords: ['AI-powered tools', 'workflow automation n8n'],
    },
  ],
  projects: [
    {
      id: '1',
      name: 'DOOT Service Robot',
      description:
        'Designed mechanical architecture for wireless-controlled COVID-19 ward service robot; integrated HMI, audio-visual, and remote operator interface; delivered 2 production units across mechanical, electronics, and software teams',
      url: '',
      startDate: '2020',
      endDate: '2020',
    },
    {
      id: '2',
      name: 'Emergency Ventilator',
      description:
        'Designed low-cost electromechanical ventilator from concept to fabrication; owned full lifecycle across mechanical, pneumatic, and electronics subsystems; prototyped and supplied 10 units during COVID-19 crisis',
      url: '',
      startDate: '2020',
      endDate: '2020',
    },
  ],
  certifications: [
    {
      id: '1',
      name: 'PMP (In progress)',
    },
    {
      id: '2',
      name: 'ASQ Green Belt (GB) - In Progress',
    },
  ],
  languages: ['Marathi (Native)', 'Hindi (Native)', 'English (Fluent)', 'Japanese (Beginner)'],
}
