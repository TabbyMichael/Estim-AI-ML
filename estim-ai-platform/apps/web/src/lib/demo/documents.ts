/** Document intelligence fixtures. */

import type { AskResponse, DocumentList, DocumentRecord } from '../api/documents'
import { daysAgo, hoursAgo } from './seed'

export const DEMO_DOCUMENTS: DocumentRecord[] = [
  {
    id: 'doc-201',
    project_id: 'prj-1001',
    filename: 'Riverside_Tower_Structural_Specs_R7.pdf',
    storage_key: 'projects/prj-1001/specs/structural-r7.pdf',
    content_type: 'application/pdf',
    status: 'indexed',
    created_by: 'usr-admin',
    created_at: daysAgo(21),
  },
  {
    id: 'doc-202',
    project_id: 'prj-1001',
    filename: 'Riverside_Geotech_Report.pdf',
    storage_key: 'projects/prj-1001/reports/geotech.pdf',
    content_type: 'application/pdf',
    status: 'indexed',
    created_by: 'usr-admin',
    created_at: daysAgo(34),
  },
  {
    id: 'doc-203',
    project_id: 'prj-1002',
    filename: 'Northgate_Steel_Erection_Method.pdf',
    storage_key: 'projects/prj-1002/methods/steel-erection.pdf',
    content_type: 'application/pdf',
    status: 'processing',
    created_by: 'usr-admin',
    created_at: hoursAgo(4),
  },
  {
    id: 'doc-204',
    project_id: 'prj-1004',
    filename: 'Meridian_Medical_Gas_ITP.xlsx',
    storage_key: 'projects/prj-1004/itp/medical-gas.xlsx',
    content_type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    status: 'indexed',
    created_by: 'usr-admin',
    created_at: daysAgo(12),
  },
  {
    id: 'doc-205',
    project_id: 'prj-1003',
    filename: 'Harbor_RO_Commissioning_Plan.pdf',
    storage_key: 'projects/prj-1003/commissioning/ro-plan.pdf',
    content_type: 'application/pdf',
    status: 'indexed',
    created_by: 'usr-admin',
    created_at: daysAgo(8),
  },
  {
    id: 'doc-206',
    project_id: 'prj-1006',
    filename: 'Cedar_Ridge_Load_Rating_Calc.pdf',
    storage_key: 'projects/prj-1006/design/load-rating.pdf',
    content_type: 'application/pdf',
    status: 'failed',
    created_by: 'usr-admin',
    created_at: daysAgo(3),
  },
  {
    id: 'doc-207',
    project_id: 'prj-1005',
    filename: 'Atlas_PV_Site_Layout.dwg',
    storage_key: 'projects/prj-1005/design/site-layout.dwg',
    content_type: 'application/acad',
    status: 'uploaded',
    created_by: 'usr-admin',
    created_at: daysAgo(2),
  },
  {
    id: 'doc-208',
    project_id: 'prj-1001',
    filename: 'Riverside_Monthly_Progress_Sep.pdf',
    storage_key: 'projects/prj-1001/progress/september.pdf',
    content_type: 'application/pdf',
    status: 'indexed',
    created_by: 'usr-admin',
    created_at: daysAgo(6),
  },
  {
    id: 'doc-209',
    project_id: 'prj-1004',
    filename: 'Meridian_Infection_Control_Risk_Assessment.pdf',
    storage_key: 'projects/prj-1004/hse/icra.pdf',
    content_type: 'application/pdf',
    status: 'indexed',
    created_by: 'usr-admin',
    created_at: daysAgo(15),
  },
  {
    id: 'doc-210',
    project_id: 'prj-1002',
    filename: 'Northgate_Supplier_Framework_Agreement.pdf',
    storage_key: 'projects/prj-1002/contracts/framework.pdf',
    content_type: 'application/pdf',
    status: 'uploaded',
    created_by: 'usr-admin',
    created_at: daysAgo(1),
  },
]

export const DEMO_DOCUMENT_LIST: DocumentList = {
  documents: DEMO_DOCUMENTS,
  total: DEMO_DOCUMENTS.length,
  skip: 0,
  limit: 100,
}

export const DEMO_ASK_RESPONSE: AskResponse = {
  query: 'What are the concrete cover requirements for the Level 12 slab?',
  answer:
    'Based on 3 retrieved passages: the structural specification (R7) requires a nominal concrete cover of 40 mm for slab soffits exposed to the weather and 25 mm for internal slabs. Section 4.3.2 adds that cover must be verified with a cover meter before the pre-pour inspection, and any reading below 20 mm must be raised as a non-conformance. The geotech report notes aggressive chloride exposure at the podium level, so the 40 mm class applies there as well.',
  sources: [
    {
      chunk_id: 'chunk-8821',
      document_id: 'doc-201',
      score: 0.94,
      text: 'Section 4.3.2 — Cover: nominal cover to slab soffits shall be 40 mm where exposed, 25 mm internal. Verify with cover meter prior to pre-pour inspection.',
    },
    {
      chunk_id: 'chunk-8834',
      document_id: 'doc-201',
      score: 0.89,
      text: 'Readings below 20 mm constitute a non-conformance and require engineer review before pour.',
    },
    {
      chunk_id: 'chunk-9102',
      document_id: 'doc-202',
      score: 0.81,
      text: 'Chloride exposure classification at podium level: XS2 — aggressive. Increased cover applies.',
    },
  ],
}

/** Simple doc status counters for the KPI row. */
export const DEMO_DOCUMENT_STATS = {
  total: DEMO_DOCUMENTS.length,
  indexed: DEMO_DOCUMENTS.filter((doc) => doc.status === 'indexed').length,
  processing: DEMO_DOCUMENTS.filter((doc) => doc.status === 'processing').length,
  failed: DEMO_DOCUMENTS.filter((doc) => doc.status === 'failed').length,
}
