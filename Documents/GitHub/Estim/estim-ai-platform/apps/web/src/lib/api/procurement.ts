'use client'

/** Procurement: /procurement/purchase-orders, /procurement/anomalies. */

import { http, type PageParams, type Paginated } from './client'

export type OrderState = 'draft' | 'submitted' | 'approved' | 'rejected' | 'completed'
export type ProcurementRiskLevel = 'low' | 'medium' | 'high'
export type AnomalyStatus = 'pending' | 'approved' | 'rejected' | 'under_investigation'
export type AnomalyDecision = 'approve' | 'reject' | 'investigate'

export type PurchaseOrderLine = {
  id?: string
  material_id: string
  material_name: string
  quantity: number
  unit_price: number
  subtotal: number
}

export type PurchaseOrder = {
  id: string
  po_number: string
  supplier_id: string
  project_id: string
  total_amount: number
  state: OrderState
  line_items: PurchaseOrderLine[]
  created_at: string
  updated_at: string
  approved_by?: string | null
  approved_at?: string | null
}

export type ProcurementAnomaly = {
  id: string
  purchase_order_id: string
  po_number: string
  anomaly_type: string
  anomaly_score: number
  risk_level: ProcurementRiskLevel
  status: AnomalyStatus
  details: Record<string, unknown>
  created_at: string
  reviewed_by?: string | null
  reviewed_at?: string | null
  review_decision?: AnomalyDecision | null
  review_notes?: string | null
}

export type PurchaseOrderList = Paginated<PurchaseOrder, 'orders'>
export type AnomalyList = Paginated<ProcurementAnomaly, 'anomalies'>

export type PurchaseOrderCreatePayload = {
  po_number: string
  supplier_id: string
  project_id: string
  line_items: {
    material_id: string
    material_name: string
    quantity: number
    unit_price: number
  }[]
}

export const procurementApi = {
  listPurchaseOrders: (params: PageParams & {
    supplier_id?: string
    project_id?: string
    state?: OrderState
  }) => http.get<PurchaseOrderList>('/procurement/purchase-orders', { params }),

  getPurchaseOrder: (orderId: string) =>
    http.get<PurchaseOrder>(`/procurement/purchase-orders/${orderId}`),

  createPurchaseOrder: (payload: PurchaseOrderCreatePayload) =>
    http.post<PurchaseOrder>('/procurement/purchase-orders', payload),

  approvePurchaseOrder: (orderId: string, userId: string) =>
    http.post<PurchaseOrder>(`/procurement/purchase-orders/${orderId}/approve`, undefined, {
      params: { user_id: userId },
    }),

  listAnomalies: (params: PageParams & { status?: AnomalyStatus }) =>
    http.get<AnomalyList>('/procurement/anomalies', { params }),

  reviewAnomaly: (
    anomalyId: string,
    payload: { decision: AnomalyDecision; reviewer_id: string; notes?: string },
  ) => http.post<ProcurementAnomaly>(`/procurement/anomalies/${anomalyId}/review`, payload),
}
