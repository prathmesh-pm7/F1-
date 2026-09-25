import { TechnicalUpdate } from '../types/f1';

export const VERIFIED_TECHNICAL_UPDATES: TechnicalUpdate[] = [
  {
    id: 'tech-01',
    team: 'McLaren',
    teamColor: '#FF8000',
    component: 'Floor & Venturi',
    updateType: 'Aerodynamic',
    weekend: 'Italian Grand Prix (Monza)',
    submissionDate: '2024-08-30',
    summary: 'Low-drag high-efficiency floor edge wing and modified diffuser sidewalls',
    technicalDescription: 'McLaren introduced a revised floor edge geometry with reduced fences to optimize pressure recovery in Monza’s long straights while maintaining high-speed balance through the Curva Grande and Parabolica.',
    source: 'FIA Technical Delegate Car Presentation Submission (Doc 14)',
    status: 'VERIFIED',
    sourceDocNumber: 'FIA-DOC-14-ITA'
  },
  {
    id: 'tech-02',
    team: 'Ferrari',
    teamColor: '#E8002D',
    component: 'Rear Wing / Beam',
    updateType: 'Aerodynamic',
    weekend: 'Italian Grand Prix (Monza)',
    submissionDate: '2024-08-30',
    summary: 'Extreme low-downforce monoplane rear wing and single-element beam wing',
    technicalDescription: 'Custom Monza wing profile with trimmed trailing edge and reduced camber. Enabled 350+ km/h top speeds and contributed to low tyre degradation on the one-stop hard compound strategy.',
    source: 'FIA Technical Delegate Submissions',
    status: 'VERIFIED',
    sourceDocNumber: 'FIA-DOC-16-ITA'
  },
  {
    id: 'tech-03',
    team: 'Red Bull Racing',
    teamColor: '#3671C6',
    component: 'Front Wing',
    updateType: 'Aerodynamic',
    weekend: 'Italian Grand Prix (Monza)',
    submissionDate: '2024-08-30',
    summary: 'Trimmed flap chord and aggressive trailing edge cutouts',
    technicalDescription: 'To match the lower rear wing level, the upper flap of the front wing was trimmed to balance front-to-rear aero balance and eliminate high-speed understeer.',
    source: 'FIA Technical Delegate Report',
    status: 'VERIFIED',
    sourceDocNumber: 'FIA-DOC-18-ITA'
  },
  {
    id: 'tech-04',
    team: 'Mercedes',
    teamColor: '#27F4D2',
    component: 'Sidepods',
    updateType: 'Cooling',
    weekend: 'Italian Grand Prix (Monza)',
    submissionDate: '2024-08-30',
    summary: 'Reduced cooling louver exits to minimize parasitic aerodynamic drag',
    technicalDescription: 'Mercedes ran closed cooling options along the engine cover spine given the cooler expected ambient conditions and straight-line speed requirement.',
    source: 'FIA Technical Delegate Submission',
    status: 'VERIFIED',
    sourceDocNumber: 'FIA-DOC-20-ITA'
  },
  {
    id: 'tech-05',
    team: 'Williams',
    teamColor: '#64C4FF',
    component: 'Chassis & Weight',
    updateType: 'Weight Saving',
    weekend: 'Italian Grand Prix (Monza)',
    submissionDate: '2024-08-30',
    summary: 'Lightweight sidepod bodywork and revised floor structural tie rods',
    technicalDescription: 'Williams brought chassis weight optimization that brought the FW46 under the minimum weight threshold, allowing optimal ballast distribution.',
    source: 'FIA Technical Delegate Document',
    status: 'VERIFIED',
    sourceDocNumber: 'FIA-DOC-22-ITA'
  }
];
