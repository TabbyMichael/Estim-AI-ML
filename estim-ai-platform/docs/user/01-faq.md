# Estim AI Platform - Frequently Asked Questions (FAQ)

## 1. Getting Started

### Q: How do I create an account?
**A:** Contact your platform administrator. They can create an account and assign you a role (admin, manager, or staff) via the Identity module.

### Q: I forgot my password. What should I do?
**A:** Use the "Forgot Password" link on the login page. You'll receive reset instructions via email. If you don't receive them, contact your administrator.

### Q: How long is my session valid?
**A:** Access tokens expire after 15 minutes. You'll be automatically prompted to log in again when the session expires. Refresh tokens last 7 days.

## 2. Data and Privacy

### Q: Who can see my data?
**A:** Access is controlled by roles and company membership:
- **Admin**: Full access to all data
- **Manager**: Access to owned companies' data
- **Staff**: Read access to own data only

### Q: How long is data retained?
**A:** 
- Active data: Current year
- Archived data: 2-3 years
- Audit logs: 7 years (compliance requirement)

### Q: Can I export my data?
**A:** Yes. Most modules have export functionality. Contact your administrator to request a full data export.

## 3. Procurement Module

### Q: How do I sync invoices from Odoo?
**A:** Navigate to **Procurement** → **Invoices** → **Sync**. Enter your Odoo credentials and initiate the sync. You only need to do this once per company.

### Q: Why are some invoices not syncing?
**A:** Common reasons:
- Odoo connection issues (check connection status)
- Invoice status is not in a syncable state
- Authentication failure (check Odoo credentials)

### Q: What does "Duplicate" mean in invoice analysis?
**A:** Duplicate invoices are those with matching or near-matching data (PO number, invoice number, amounts) that indicate they may be duplicate entries.

## 4. Cost Forecasting Module

### Q: How accurate are the forecasts?
**A:** Forecast accuracy depends on:
- Quality and completeness of historical data
- Model version used
- Number of data points available

The platform shows confidence intervals in forecasts to help you assess uncertainty.

### Q: How often are forecasts updated?
**A:** Forecasts are generated based on scheduled jobs or manual triggers:
- Scheduled: Daily at 02:00 UTC
- Manual: Via the UI when needed

### Q: What is EAC?
**A:** EAC (Estimate at Completion) is the predicted final cost of a project based on current performance and projections.



## 5. Inventory Module

### Q: How do reorder points work?
**A:** You set a minimum stock level for each item. When stock falls below this level, an alert is triggered and a reorder order can be created automatically or manually.

### Q: Can I track stock in multiple warehouses?
**A:** Yes. Inventory is tracked per warehouse location. You can view stock levels by warehouse in the item details.

### Q: Why is demand forecasting important?
**A:** Demand forecasting helps you:
- Avoid stockouts (lost sales)
- Reduce excess inventory (storage costs)
- Optimize ordering quantities and timing

## 6. Maintenance Module

### Q: How does predictive maintenance work?
**A:** The system analyzes historical maintenance data and equipment usage patterns to predict:
- Probability of equipment failure within a time window
- Recommended maintenance timing
- Priority ranking for maintenance actions

### Q: What equipment should I include?

## 9. Document Intelligence Module

### Q: What document formats are supported?
**A:** Common formats:
- PDF
- Word (.docx)
- Excel (.xlsx)
- Images (PNG, JPG)
- HTML

### Q: How does the search work?
**A:** The system uses RAG (Retrieval-Augmented Generation) to:
1. Index document content
2. Create semantic embeddings
3. Search for relevant documents based on query meaning

### Q: How long does it take to index a document?
**A:** Indexing time varies by:
- Document size
- Number of pages
- Processing load

Typical indexing time: 30 seconds to 2 minutes for most documents.

## 10. Reports and Analytics

### Q: How do I share reports with my team?
**A:** Options:
- Export and share files
- Schedule reports to be delivered via email
- Use the platform's built-in sharing (admin)

### Q: Can I create custom reports?
**A:** Basic reports can be customized in the UI. Advanced reports require administrator approval and configuration.

## 11. Integrations

### Q: What third-party integrations are available?
**A:** 
- **Odoo**: ERP integration for procurement
- **MLflow**: ML model tracking
- **Notification services**: Email and Slack notifications

### Q: Can I integrate with our internal systems?
**A:** Contact your administrator. Custom integrations can be developed based on business needs.

## 12. Platform Administration

### Q: How do I request new features?
**A:** Submit feature requests via the #estim-feedback Slack channel or contact your platform administrator.

### Q: How do I report security issues?
**A:** Contact the security team at security@estim.ai. Do not share sensitive security issues in public channels.

**A:** Include all equipment that:
- Requires regular maintenance
- Has parts that wear out
- Affects operations or production

### Q: How are failure predictions scored?
**A:** Predictions use historical patterns to generate a probability score (0-100%). Scores above your threshold trigger alerts.

## 7. Project Risk Module

### Q: What factors contribute to project risk scores?
**A:** Risk scoring considers:
- Schedule variance
- Resource availability
- Budget deviations
- External factors
- Historical project performance

### Q: How often should I review risks?
**A:** Review risks:
- Weekly as part of project meetings
- After major changes
- After significant incidents

### Q: Can I assign risks to specific team members?
**A:** Yes. Each risk can be assigned to a responsible person who owns the mitigation plan.

## 8. Visual Inspection Module

### Q: How does computer vision analysis work?
**A:** Upload inspection images; the system processes them using:
- Object detection (concrete, rebar, etc.)
- Defect classification (cracks, spalls, etc.)
- Severity assessment

### Q: Can I accept or reject results?
**A:** Yes. AI classifications are suggestions; you should review and accept/reject them based on your expertise.

### Q: How do I add custom defect categories?
**A:** Contact your administrator. Custom categories require model updates and can be requested through the support channel.
