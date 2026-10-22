/** Procurement fixtures: purchase orders and anomaly reviews. */

import type {
  AnomalyList,
  ProcurementAnomaly,
  PurchaseOrder,
  PurchaseOrderList,
} from '../api/procurement'
import { daysAgo, hoursAgo } from './seed'

type LineSeed = { material_id: string; material_name: string; quantity: number; unit_price: number }

function buildOrder(
  id: string,
  poNumber: string,
  supplierId: string,
  projectId: string,
  state: PurchaseOrder['state'],
  createdAt: string,
  lines: LineSeed[],
): PurchaseOrder {
  const lineItems = lines.map((line, index) => ({
    id: `${id}-line-${index + 1}`,
    ...line,
    subtotal: Math.round(line.quantity * line.unit_price * 100) / 100,
  }))
  const total = lineItems.reduce((sum, line) => sum + line.subtotal, 0)
  return {
    id,
    po_number: poNumber,
    supplier_id: supplierId,
    project_id: projectId,
    total_amount: Math.round(total * 100) / 100,
    state,
    line_items: lineItems,
    created_at: createdAt,
    updated_at: createdAt,
    approved_by: state === 'approved' || state === 'completed' ? 'usr-admin' : null,
    approved_at: state === 'approved' || state === 'completed' ? createdAt : null,
  }
}

export const DEMO_PURCHASE_ORDERS: PurchaseOrder[] = [
  buildOrder('po-8801', 'PO-2026-0418', 'SUP-014', 'prj-1001', 'approved', daysAgo(2), [
    { material_id: 'MAT-CONC-40', material_name: 'Concrete C40/50', quantity: 1800, unit_price: 128.5 },
    { material_id: 'MAT-REBAR-16', material_name: 'Rebar 16mm', quantity: 42, unit_price: 940 },
  ]),
  buildOrder('po-8802', 'PO-2026-0419', 'SUP-003', 'prj-1002', 'submitted', daysAgo(1), [
    { material_id: 'MAT-STEEL-IPE', material_name: 'Structural steel IPE 400', quantity: 260, unit_price: 1120 },
    { material_id: 'MAT-BOLT-M20', material_name: 'High-tensile bolts M20', quantity: 4200, unit_price: 2.35 },
  ]),
  buildOrder('po-8803', 'PO-2026-0420', 'SUP-021', 'prj-1004', 'submitted', hoursAgo(20), [
    { material_id: 'MAT-HVAC-AHU', material_name: 'AHU medical-grade', quantity: 6, unit_price: 48_500 },
    { material_id: 'MAT-DUCT-GI', material_name: 'Galvanised ducting', quantity: 720, unit_price: 84 },
  ]),
  buildOrder('po-8804', 'PO-2026-0421', 'SUP-009', 'prj-1003', 'approved', daysAgo(3), [
    { material_id: 'MAT-PIPE-HDPE', material_name: 'HDPE pipe 630mm', quantity: 980, unit_price: 312 },
  ]),
  buildOrder('po-8805', 'PO-2026-0422', 'SUP-014', 'prj-1004', 'draft', hoursAgo(6), [
    { material_id: 'MAT-GYPSUM', material_name: 'Gypsum board 15mm', quantity: 2400, unit_price: 18.4 },
  ]),
  buildOrder('po-8806', 'PO-2026-0423', 'SUP-030', 'prj-1005', 'completed', daysAgo(9), [
    { material_id: 'MAT-PILE-H', material_name: 'H-pile 300x300', quantity: 340, unit_price: 486 },
  ]),
  buildOrder('po-8807', 'PO-2026-0424', 'SUP-041', 'prj-1006', 'submitted', hoursAgo(30), [
    { material_id: 'MAT-BRG-BEAR', material_name: 'Bridge bearings', quantity: 24, unit_price: 7300 },
    { material_id: 'MAT-CABLE-PT', material_name: 'Post-tensioning cable', quantity: 1200, unit_price: 21.6 },
  ]),
  buildOrder('po-8808', 'PO-2026-0425', 'SUP-003', 'prj-1002', 'rejected', daysAgo(5), [
    { material_id: 'MAT-INSUL-PIR', material_name: 'PIR insulation board', quantity: 1500, unit_price: 26.8 },
  ]),
  buildOrder('po-8809', 'PO-2026-0426', 'SUP-009', 'prj-1001', 'approved', daysAgo(6), [
    { material_id: 'MAT-GLAZE-UNIT', material_name: 'Glazed curtain wall unit', quantity: 180, unit_price: 1290 },
  ]),
  buildOrder('po-8810', 'PO-2026-0427', 'SUP-021', 'prj-1005', 'draft', hoursAgo(2), [
    { material_id: 'MAT-INV-STR', material_name: 'Inverter station 2.5MW', quantity: 4, unit_price: 168_000 },
  ]),
]

export const DEMO_ANOMALIES: ProcurementAnomaly[] = [
  {
    id: 'anom-501',
    purchase_order_id: 'po-8803',
    po_number: 'PO-2026-0420',
    anomaly_type: 'price_variance',
    anomaly_score: 0.93,
    risk_level: 'high',
    status: 'pending',
    details: {
      material: 'MAT-HVAC-AHU',
      expected_unit_price: 39_800,
      quoted_unit_price: 48_500,
      variance_pct: 21.9,
      peer_median: 40_150,
    },
    created_at: hoursAgo(19),
    reviewed_by: null,
    reviewed_at: null,
    review_decision: null,
    review_notes: null,
  },
  {
    id: 'anom-502',
    purchase_order_id: 'po-8802',
    po_number: 'PO-2026-0419',
    anomaly_type: 'split_purchase',
    anomaly_score: 0.81,
    risk_level: 'high',
    status: 'pending',
    details: {
      related_orders: ['PO-2026-0412', 'PO-2026-0415'],
      combined_value: 812_400,
      threshold: 750_000,
      window_days: 14,
    },
    created_at: hoursAgo(26),
    reviewed_by: null,
    reviewed_at: null,
    review_decision: null,
    review_notes: null,
  },
  {
    id: 'anom-503',
    purchase_order_id: 'po-8808',
    po_number: 'PO-2026-0425',
    anomaly_type: 'duplicate_invoice',
    anomaly_score: 0.74,
    risk_level: 'medium',
    status: 'under_investigation',
    details: {
      matched_invoice: 'INV-99213',
      matched_order: 'PO-2026-0398',
      match_confidence: 0.91,
    },
    created_at: daysAgo(4),
    reviewed_by: 'usr-admin',
    reviewed_at: daysAgo(3),
    review_decision: 'investigate',
    review_notes: 'Awaiting supplier confirmation on duplicate billing.',
  },
  {
    id: 'anom-504',
    purchase_order_id: 'po-8807',
    po_number: 'PO-2026-0424',
    anomaly_type: 'quantity_mismatch',
    anomaly_score: 0.42,
    risk_level: 'low',
    status: 'approved',
    details: {
      ordered: 24,
      delivered: 22,
      shortage: 2,
      tolerance_pct: 5,
    },
    created_at: daysAgo(2),
    reviewed_by: 'usr-admin',
    reviewed_at: daysAgo(1),
    review_decision: 'approve',
    review_notes: 'Short delivery accepted with credit note.',
  },
  {
    id: 'anom-505',
    purchase_order_id: 'po-8810',
    po_number: 'PO-2026-0427',
    anomaly_type: 'off_contract_supplier',
    anomaly_score: 0.66,
    risk_level: 'medium',
    status: 'pending',
    details: {
      supplier: 'SUP-021',
      framework: 'FR-ELEC-2025',
      covered_categories: ['cabling', 'switchgear'],
      ordered_category: 'inverter stations',
    },
    created_at: hoursAgo(2),
    reviewed_by: null,
    reviewed_at: null,
    review_decision: null,
    review_notes: null,
  },
  {
    id: 'anom-506',
    purchase_order_id: 'po-8804',
    po_number: 'PO-2026-0421',
    anomaly_type: 'delivery_delay',
    anomaly_score: 0.38,
    risk_level: 'low',
    status: 'rejected',
    details: {
      promised_days: 21,
      actual_days: 29,
      delay_days: 8,
    },
    created_at: daysAgo(7),
    reviewed_by: 'usr-admin',
    reviewed_at: daysAgo(6),
    review_decision: 'reject',
    review_notes: 'Delay caused by port congestion — not supplier-attributable.',
  },
  {
    id: 'anom-507',
    purchase_order_id: 'po-8801',
    po_number: 'PO-2026-0418',
    anomaly_type: 'round_number_bias',
    anomaly_score: 0.55,
    risk_level: 'medium',
    status: 'pending',
    details: {
      line: 'MAT-CONC-40',
      quantity: 1800,
      unit_price: 128.5,
      peer_prices: [124.2, 129.8, 126.4],
    },
    created_at: daysAgo(1),
    reviewed_by: null,
    reviewed_at: null,
    review_decision: null,
    review_notes: null,
  },
]

export const DEMO_PURCHASE_ORDER_LIST: PurchaseOrderList = {
  orders: DEMO_PURCHASE_ORDERS,
  total: DEMO_PURCHASE_ORDERS.length,
  skip: 0,
  limit: 100,
}

export const DEMO_ANOMALY_LIST: AnomalyList = {
  anomalies: DEMO_ANOMALIES,
  total: DEMO_ANOMALIES.length,
  skip: 0,
  limit: 100,
}

/** Anomaly counts over the last 8 weeks (severity stacked chart). */
export const DEMO_ANOMALY_TREND = [
  { week: 'W31', high: 2, medium: 4, low: 3 },
  { week: 'W32', high: 1, medium: 3, low: 5 },
  { week: 'W33', high: 3, medium: 5, low: 2 },
  { week: 'W34', high: 2, medium: 2, low: 4 },
  { week: 'W35', high: 4, medium: 6, low: 3 },
  { week: 'W36', high: 3, medium: 4, low: 6 },
  { week: 'W37', high: 5, medium: 3, low: 2 },
  { week: 'W38', high: 3, medium: 5, low: 4 },
]
